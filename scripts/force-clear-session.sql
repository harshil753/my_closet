-- Force clear session for user - Most direct approach
-- This will clear the specific session that's causing the tier limit

-- First, see what sessions exist
SELECT 
    id, 
    user_id, 
    status, 
    created_at
FROM try_on_sessions 
WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99'
ORDER BY created_at DESC;

-- Force update ALL sessions to completed (this will clear the tier limit)
UPDATE try_on_sessions 
SET status = 'completed'
WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99';

-- Verify the result - should show all sessions as 'completed'
SELECT 
    id, 
    user_id, 
    status, 
    created_at
FROM try_on_sessions 
WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99'
ORDER BY created_at DESC;
