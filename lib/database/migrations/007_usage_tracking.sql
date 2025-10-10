-- My Closet Virtual Try-On - Usage Tracking Functions
-- Migration: 007_usage_tracking
-- Description: Creates functions for tracking user usage and tier limits

-- Function to increment usage tracking
CREATE OR REPLACE FUNCTION increment_usage_tracking(
    increment_amount INTEGER,
    resource_type TEXT,
    user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    user_tier TEXT;
    user_limits JSONB;
    current_usage INTEGER;
    max_limit INTEGER;
    new_usage INTEGER;
    result JSONB;
BEGIN
    -- Get user tier and limits
    SELECT tier, tier_limits INTO user_tier, user_limits
    FROM users WHERE users.id = user_id;
    
    IF user_tier IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Check specific limit based on resource type
    IF resource_type = 'clothing_items' THEN
        max_limit := (user_limits->>'clothing_items')::INTEGER;
        SELECT COUNT(*) INTO current_usage
        FROM clothing_items 
        WHERE clothing_items.user_id = user_id AND is_active = true;
        
    ELSIF resource_type = 'try_ons_per_month' THEN
        max_limit := (user_limits->>'try_ons_per_month')::INTEGER;
        current_usage := (user_limits->>'current_month_usage')::INTEGER;
        
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid resource type'
        );
    END IF;
    
    -- Check if user would exceed limit
    new_usage := current_usage + increment_amount;
    IF new_usage > max_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usage limit exceeded',
            'current_usage', current_usage,
            'max_limit', max_limit,
            'tier', user_tier
        );
    END IF;
    
    -- Update usage for try_ons_per_month
    IF resource_type = 'try_ons_per_month' THEN
        UPDATE users 
        SET tier_limits = jsonb_set(
            tier_limits, 
            '{current_month_usage}', 
            to_jsonb(new_usage)
        )
        WHERE users.id = user_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'current_usage', new_usage,
        'max_limit', max_limit,
        'tier', user_tier
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user tier status
CREATE OR REPLACE FUNCTION get_user_tier_status(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_tier TEXT;
    user_limits JSONB;
    clothing_count INTEGER;
    current_month_try_ons INTEGER;
    result JSONB;
BEGIN
    -- Get user tier and limits
    SELECT tier, tier_limits INTO user_tier, user_limits
    FROM users WHERE users.id = user_id;
    
    IF user_tier IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Get current usage
    SELECT COUNT(*) INTO clothing_count
    FROM clothing_items 
    WHERE clothing_items.user_id = user_id AND is_active = true;
    
    current_month_try_ons := (user_limits->>'current_month_usage')::INTEGER;
    
    RETURN jsonb_build_object(
        'success', true,
        'tier', user_tier,
        'limits', user_limits,
        'usage', jsonb_build_object(
            'clothing_items', clothing_count,
            'current_month_try_ons', current_month_try_ons
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
