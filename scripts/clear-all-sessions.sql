-- Clear ALL sessions for user - Most aggressive approach
-- Replace 'YOUR_USER_ID' with your actual user ID: 5aa0312e-8262-49cb-ac2e-fc21ef449b99

-- First, see what sessions exist
SELECT 
    id, 
    user_id, 
    status, 
    created_at
FROM try_on_sessions 
WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99'
ORDER BY created_at DESC;

-- Option 1: Update ALL sessions to completed (safer)
UPDATE try_on_sessions 
SET status = 'completed'
WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99';

-- Option 2: DELETE ALL sessions (more aggressive - uncomment if needed)
-- DELETE FROM try_on_sessions WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99';

-- Verify the result
SELECT 
    id, 
    user_id, 
    status, 
    created_at
FROM try_on_sessions 
WHERE user_id = '5aa0312e-8262-49cb-ac2e-fc21ef449b99'
ORDER BY created_at DESC;
