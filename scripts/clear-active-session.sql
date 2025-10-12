-- Clear the active session that's causing the tier limit error
-- Run this in your Supabase SQL editor

-- First, check what sessions exist
SELECT 
    id, 
    user_id, 
    status, 
    created_at
FROM try_on_sessions 
WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99'
ORDER BY created_at DESC;

-- Clear ALL sessions for this user
UPDATE try_on_sessions 
SET status = 'completed'
WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99';

-- Verify the result
SELECT 
    id, 
    user_id, 
    status, 
    created_at
FROM try_on_sessions 
WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99'
ORDER BY created_at DESC;
