-- My Closet Virtual Try-On - Create User Profile Function
-- Migration: 003_create_user_profile_function
-- Description: Creates an RPC function to create user profiles that bypasses RLS

-- Function to create user profile (bypasses RLS)
CREATE OR REPLACE FUNCTION create_user_profile(
    user_id UUID,
    user_email TEXT,
    display_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Insert user profile
    INSERT INTO users (
        id,
        email,
        display_name,
        created_at,
        updated_at,
        tier,
        tier_limits
    ) VALUES (
        user_id,
        user_email,
        display_name,
        NOW(),
        NOW(),
        'free',
        jsonb_build_object(
            'clothing_items', 100,
            'try_ons_per_month', 100,
            'current_month_usage', 0,
            'current_month', to_char(NOW(), 'YYYY-MM')
        )
    );
    
    -- Return the created user data
    SELECT to_jsonb(u.*) INTO result
    FROM users u
    WHERE u.id = user_id;
    
    RETURN result;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, return existing user
        SELECT to_jsonb(u.*) INTO result
        FROM users u
        WHERE u.id = user_id;
        RETURN result;
    WHEN OTHERS THEN
        -- Return error information
        RETURN jsonb_build_object(
            'error', true,
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
