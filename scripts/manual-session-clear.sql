-- Manual Session Clear SQL Script
-- Run this directly in your Supabase SQL editor if the API approaches fail

-- Manual Session Clear SQL Script
-- Run this directly in your Supabase SQL editor if the API approaches fail

-- First, check what sessions exist for your user
-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT 
    id, 
    user_id, 
    status, 
    created_at
FROM try_on_sessions 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- Option 1: Update all sessions to completed
UPDATE try_on_sessions 
SET 
    status = 'completed'
WHERE user_id = 'YOUR_USER_ID';

-- Option 2: Delete all sessions (more aggressive)
-- WARNING: This will permanently delete all sessions
-- DELETE FROM try_on_sessions WHERE user_id = 'YOUR_USER_ID';

-- Check the result
SELECT 
    id, 
    user_id, 
    status, 
    created_at
FROM try_on_sessions 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
