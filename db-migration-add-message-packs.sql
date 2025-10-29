-- Migration to add message_packs column to users table
-- This separates purchased message pack credits from subscription limits

-- Add message_packs column with default value 0
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS message_packs INTEGER DEFAULT 0;

-- For existing users who may have purchased message packs already:
-- You'll need to calculate and set their message_packs value manually
-- based on the difference between their current messagesLimit and their subscription plan's limit

-- Example: If a user has messagesLimit=1100 but their subscription plan is Basic (100 messages),
-- then they have 1000 from message packs:
-- UPDATE users 
-- SET message_packs = 1000 
-- WHERE id = 'user-id-here';

-- After running this migration, the system will:
-- - Store subscription base limit in messagesLimit
-- - Store purchased pack credits in messagePacks
-- - Total available = messagesLimit + messagePacks
-- - Subscription changes preserve messagePacks
