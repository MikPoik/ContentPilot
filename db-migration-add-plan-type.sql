-- Migration to add plan_type column to subscription_plans table
-- Run this SQL in your PostgreSQL database

-- Add plan_type column with default value 'subscription'
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'subscription';

-- Update existing plans to be 'subscription' type
UPDATE subscription_plans 
SET plan_type = 'subscription' 
WHERE plan_type IS NULL;

-- Example: Update a specific plan to be a message pack
-- Replace 'Premium' with your actual plan name or use the plan ID
-- UPDATE subscription_plans 
-- SET plan_type = 'message_pack',
--     description = 'One-time purchase of 1000 messages that never expire'
-- WHERE name = 'Premium';

-- Or update by ID (replace with actual ID):
-- UPDATE subscription_plans 
-- SET plan_type = 'message_pack',
--     description = 'One-time purchase of messages that never expire'
-- WHERE id = 'your-plan-id-here';
