// Script to seed initial subscription plans
import { storage } from "./storage";

async function seedPlans() {
  try {
    console.log("Seeding subscription plans...");

    // Basic plan
    await storage.createSubscriptionPlan({
      name: "Basic",
      description: "Perfect for casual users who want to explore AI-powered content creation",
      stripePriceId: "price_basic_monthly", // This should be replaced with actual Stripe price IDs
      messagesLimit: 100,
      priceAmount: 999, // $9.99 in cents
      priceCurrency: "usd",
      isActive: true,
    });

    // Pro plan  
    await storage.createSubscriptionPlan({
      name: "Pro",
      description: "Great for content creators who need more messages and priority support",
      stripePriceId: "price_pro_monthly", // This should be replaced with actual Stripe price IDs
      messagesLimit: 500,
      priceAmount: 1999, // $19.99 in cents
      priceCurrency: "usd",
      isActive: true,
    });

    // Premium plan
    await storage.createSubscriptionPlan({
      name: "Premium",
      description: "Unlimited access for professional content creators and marketers",
      stripePriceId: "price_premium_monthly", // This should be replaced with actual Stripe price IDs
      messagesLimit: -1, // -1 for unlimited
      priceAmount: 3999, // $39.99 in cents
      priceCurrency: "usd",
      isActive: true,
    });

    console.log("Subscription plans seeded successfully!");
  } catch (error) {
    console.error("Error seeding plans:", error);
  }
}

// Run if called directly
if (require.main === module) {
  seedPlans().then(() => process.exit(0));
}

export { seedPlans };