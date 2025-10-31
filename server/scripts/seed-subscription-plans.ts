import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import {
  subscriptionPlans,
  type InsertSubscriptionPlan,
  type SubscriptionPlan,
} from "@shared/schema";

/**
 * Seed or update subscription plans and message packs in the database.
 *
 * Contract:
 * - Reads Stripe Price IDs from environment variables (see below)
 * - Upserts by `name` to keep IDs stable across runs
 * - Creates both recurring subscription tiers and one-time message packs
 *
 * Required env:
 *   - DATABASE_URL (PostgreSQL connection string)
 *
 * Optional env (recommended to enable Stripe checkout):
 *   - STRIPE_PRICE_BASIC
 *   - STRIPE_PRICE_PRO
 *   - STRIPE_PRICE_PACK_SMALL
 *   - STRIPE_PRICE_PACK_MEDIUM
 *   - STRIPE_PRICE_PACK_LARGE
 *
 * Notes:
 * - If a STRIPE price env is missing, a placeholder will be used so the row exists;
 *   checkout will fail until you update the price ID. You can safely rerun this script
 *   after setting envs to update the rows.
 */

function price(idEnv: string | undefined, placeholder: string) {
  return idEnv && idEnv.trim().length > 0 ? idEnv.trim() : placeholder;
}

const seedPlans: InsertSubscriptionPlan[] = [
  // Subscriptions
  {
    name: "Basic",
    description: "Great for getting started with AI content creation.",
    stripePriceId: price(process.env.STRIPE_PRICE_BASIC, "price_basic_placeholder"),
    messagesLimit: 200,
    priceAmount: 1000, // $10.00
    priceCurrency: "usd",
    isActive: true,
    planType: "subscription",
  },
  {
    name: "Pro",
    description: "For power users who want unlimited messages and priority support.",
    stripePriceId: price(process.env.STRIPE_PRICE_PRO, "price_pro_placeholder"),
    messagesLimit: -1, // Unlimited
    priceAmount: 2900, // $29.00
    priceCurrency: "usd",
    isActive: true,
    planType: "subscription",
  },

  // Message Packs (one-time purchases)
  {
    name: "Message Pack • 100",
    description: "+100 one-time messages. Never expires; used before subscription messages.",
    stripePriceId: price(process.env.STRIPE_PRICE_PACK_SMALL, "price_pack_small_placeholder"),
    messagesLimit: 100,
    priceAmount: 500, // $5.00
    priceCurrency: "usd",
    isActive: true,
    planType: "message_pack",
  },
  {
    name: "Message Pack • 500",
    description: "+500 one-time messages. Never expires; used before subscription messages.",
    stripePriceId: price(process.env.STRIPE_PRICE_PACK_MEDIUM, "price_pack_medium_placeholder"),
    messagesLimit: 500,
    priceAmount: 2000, // $20.00
    priceCurrency: "usd",
    isActive: true,
    planType: "message_pack",
  },
  {
    name: "Message Pack • 2000",
    description: "+2000 one-time messages. Never expires; used before subscription messages.",
    stripePriceId: price(process.env.STRIPE_PRICE_PACK_LARGE, "price_pack_large_placeholder"),
    messagesLimit: 2000,
    priceAmount: 6000, // $60.00
    priceCurrency: "usd",
    isActive: true,
    planType: "message_pack",
  },
];

async function upsertByName(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
  const [existing] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.name, plan.name));

  if (existing) {
    const [updated] = await db
      .update(subscriptionPlans)
      .set({
        description: plan.description,
        stripePriceId: plan.stripePriceId,
        messagesLimit: plan.messagesLimit,
        priceAmount: plan.priceAmount,
        priceCurrency: plan.priceCurrency ?? "usd",
        isActive: plan.isActive ?? true,
        planType: (plan as any).planType ?? "subscription",
      })
      .where(eq(subscriptionPlans.id, existing.id))
      .returning();
    return updated;
  } else {
    const [inserted] = await db
      .insert(subscriptionPlans)
      .values(plan)
      .returning();
    return inserted;
  }
}

async function main() {
  console.log("🔧 Seeding subscription plans...");

  const results: SubscriptionPlan[] = [];
  for (const plan of seedPlans) {
    const updated = await upsertByName(plan);
    results.push(updated);
    console.log(`• ${updated.name} → $${(updated.priceAmount / 100).toFixed(2)} (${(updated as any).planType})`);
  }

  console.log(`✅ Seeded ${results.length} plans.`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch {}
  });
