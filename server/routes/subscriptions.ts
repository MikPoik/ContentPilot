import type { Express } from "express";
import express from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { updateUserSubscriptionSchema } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export function registerSubscriptionRoutes(app: Express) {
  // Subscription management routes
  app.get("/api/subscriptions/plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription plans" });
    }
  });

  app.post("/api/subscriptions/create-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.email) {
        return res.status(400).json({ message: "User email required" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Create or get Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        });
        stripeCustomerId = customer.id;
        await storage.updateUserSubscription(userId, { stripeCustomerId });
      }

      // Determine if this is a message pack or subscription
      const isMessagePack = (plan as any).planType === 'message_pack';

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price: plan.stripePriceId,
          quantity: 1,
        }],
        mode: isMessagePack ? 'payment' : 'subscription',
        success_url: `${process.env.REPLIT_DOMAINS ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/profile-settings?success=true`,
        cancel_url: `${process.env.REPLIT_DOMAINS ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/profile-settings?canceled=true`,
        metadata: {
          userId,
          planId,
          planType: isMessagePack ? 'message_pack' : 'subscription',
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout creation error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Update subscription plan (upgrade/downgrade)
  app.post("/api/subscriptions/update-plan", isAuthenticated, async (req: any, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription to update" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Get the current subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      // Update the subscription with the new price
      const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: plan.stripePriceId,
        }],
        proration_behavior: 'create_prorations', // Automatically handle prorated charges
      });

      // Update our database - preserve message packs when changing subscription tier
      const existingPacks = user.messagePacks || 0;
      await storage.updateUserSubscription(userId, {
        subscriptionPlanId: planId,
        messagesLimit: plan.messagesLimit,
        messagePacks: existingPacks, // Preserve message packs
        subscriptionStatus: 'active',
      });

      res.json({ success: true, subscription: updatedSubscription });
    } catch (error: any) {
      console.error("Update subscription error:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // Cancel subscription at period end
  app.post("/api/subscriptions/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription to cancel" });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update our user record to reflect pending cancellation while keeping access through period end
      await storage.updateUserSubscription(userId, {
        subscriptionStatus: 'cancels_at_period_end',
      });

      const currentPeriodEndRaw = (subscription as any).current_period_end;
      const currentPeriodEnd = currentPeriodEndRaw ? new Date(currentPeriodEndRaw * 1000) : null;

      res.json({ cancelAtPeriodEnd: true, currentPeriodEnd });
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Resume subscription (undo cancel at period end)
  app.post("/api/subscriptions/resume", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No subscription to resume" });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update our user record to reflect active subscription again
      await storage.updateUserSubscription(userId, {
        subscriptionStatus: 'active',
      });

      res.json({ resumed: true });
    } catch (error: any) {
      console.error("Resume subscription error:", error);
      res.status(500).json({ message: "Failed to resume subscription" });
    }
  });

  app.post("/api/subscriptions/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return res.status(500).send('Webhook secret not configured');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as any;
          const userId = session.metadata?.userId;
          const planId = session.metadata?.planId;
          const planType = session.metadata?.planType;
          
          if (userId && planId) {
            const plan = await storage.getSubscriptionPlan(planId);
            
            if (planType === 'message_pack' && plan) {
              // Handle message pack purchase - add messages to user's message pack balance
              const user = await storage.getUser(userId);
              if (user) {
                const currentPacks = user.messagePacks || 0;
                const newPacks = currentPacks + plan.messagesLimit;
                
                await storage.updateUserSubscription(userId, {
                  messagePacks: newPacks,
                });
                
                console.log(`💳 Message pack purchased: +${plan.messagesLimit} messages for user ${userId} (total packs: ${newPacks})`);
              }
            } else {
              // Handle subscription - set base limit but preserve message packs
              const user = await storage.getUser(userId);
              const existingPacks = user?.messagePacks || 0;
              
              await storage.updateUserSubscription(userId, {
                stripeSubscriptionId: session.subscription,
                subscriptionPlanId: planId,
                subscriptionStatus: 'active',
                subscriptionStartedAt: new Date(),
              });

              // Update message limit based on plan, preserving message packs
              if (plan) {
                await storage.updateUserSubscription(userId, {
                  messagesLimit: plan.messagesLimit,
                  messagePacks: existingPacks, // Preserve message packs
                  messagesUsed: 0,
                });
              }
            }
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as any;
          const customer = await stripe.customers.retrieve(subscription.customer);
          
          if (customer && !customer.deleted && customer.email) {
            // For now, log the event - getUserByEmail method needs to be added to storage interface
            console.log(`Subscription ${event.type} for customer: ${customer.email}`);
          }
          break;

        case 'invoice.payment_succeeded': {
          // Reset messagesUsed to 0 for recurring subscription renewals
          const invoice = event.data.object as any;
          if (invoice.subscription && invoice.customer) {
            // Find user by stripeSubscriptionId
            const user = await storage.findUserByStripeSubscriptionId?.(invoice.subscription);
            if (user) {
              await storage.updateUserSubscription(user.id, { messagesUsed: 0 });
              console.log(`🔄 Reset messagesUsed for user ${user.id} after subscription renewal`);
            }
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });
}