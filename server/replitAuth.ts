import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import logger from "./logger";

// Required Auth0 env vars
if (!process.env.AUTH0_DOMAIN) {
  throw new Error("Environment variable AUTH0_DOMAIN not provided");
}
if (!process.env.AUTH0_CLIENT_ID) {
  throw new Error("Environment variable AUTH0_CLIENT_ID not provided");
}
if (!process.env.AUTH0_CLIENT_SECRET) {
  throw new Error("Environment variable AUTH0_CLIENT_SECRET not provided");
}
if (!process.env.SESSION_SECRET) {
  throw new Error("Environment variable SESSION_SECRET not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(`https://${process.env.AUTH0_DOMAIN}`),
      process.env.AUTH0_CLIENT_ID!,
      process.env.AUTH0_CLIENT_SECRET!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Prefer not to overwrite user-provided names if already present
  const existing = await storage.getUser(claims["sub"]);

  const upsertPayload: any = {
    id: claims["sub"],
    email: claims["email"],
    profileImageUrl: claims["picture"],
  };

  if (!existing || !existing.firstName) {
    upsertPayload.firstName = claims["given_name"];
  }
  if (!existing || !existing.lastName) {
    upsertPayload.lastName = claims["family_name"];
  }

  await storage.upsertUser(upsertPayload);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      logger.error("Auth verification error:", error);
      verified(error as any, null as any);
    }
  };

  const callbackURL = process.env.APP_URL
    ? `${process.env.APP_URL}/api/callback`
    : `http://localhost:5000/api/callback`;
  logger.log(`[AUTH] Using callback URL: ${callbackURL}`);
  logger.log(`[AUTH] APP_URL environment variable: ${process.env.APP_URL || 'not set'}`);

  const strategy = new Strategy(
    {
      name: "auth0",
      config,
      scope: "openid email profile offline_access",
      callbackURL,
    },
    verify,
  );
  passport.use(strategy);

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate("auth0", {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(
      "auth0",
      {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      },
      (err: any, user: any, info: any) => {
        if (err) {
          logger.error("Auth0 callback error:", err);
          logger.error("Error details:", JSON.stringify(err, null, 2));
          return res.status(500).json({ error: "Authentication failed", details: err.message });
        }
        if (!user) {
          logger.error("Auth0 callback failed - no user:", info);
          return res.redirect("/api/login");
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            logger.error("Login session error:", loginErr);
            return res.status(500).json({ error: "Session creation failed" });
          }
          res.redirect("/");
        });
      }
    )(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      const returnTo = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const logoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(returnTo)}`;
      res.redirect(logoutUrl);
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};