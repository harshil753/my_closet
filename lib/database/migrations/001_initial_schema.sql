-- My Closet Virtual Try-On - Initial Database Schema
-- Migration: 001_initial_schema
-- Description: Creates all tables, indexes, RLS policies, and functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL CHECK (length(display_name) >= 2 AND length(display_name) <= 50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}'::jsonb,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
    tier_limits JSONB DEFAULT '{"clothing_items": 100, "try_ons_per_month": 100, "current_month_usage": 0, "current_month": "2025-01"}'::jsonb
);

-- User base photos table
CREATE TABLE user_base_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL CHECK (image_type IN ('front', 'side', 'full_body')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Clothing items table
CREATE TABLE clothing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('shirts_tops', 'pants_bottoms', 'shoes')),
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Try-on sessions table
CREATE TABLE try_on_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    result_image_url TEXT,
    processing_time INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Try-on session items junction table
CREATE TABLE try_on_session_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES try_on_sessions(id) ON DELETE CASCADE,
    clothing_item_id UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, clothing_item_id)
);

-- =============================================
-- INDEXES
-- =============================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User base photos table indexes
CREATE INDEX idx_user_base_photos_user_id ON user_base_photos(user_id);
CREATE INDEX idx_user_base_photos_active ON user_base_photos(is_active);
CREATE INDEX idx_user_base_photos_type ON user_base_photos(image_type);
CREATE INDEX idx_user_base_photos_uploaded_at ON user_base_photos(uploaded_at);

-- Clothing items table indexes
CREATE INDEX idx_clothing_items_user_id ON clothing_items(user_id);
CREATE INDEX idx_clothing_items_category ON clothing_items(category);
CREATE INDEX idx_clothing_items_active ON clothing_items(is_active);
CREATE INDEX idx_clothing_items_uploaded_at ON clothing_items(uploaded_at);
CREATE INDEX idx_clothing_items_user_category ON clothing_items(user_id, category);

-- Try-on sessions table indexes
CREATE INDEX idx_try_on_sessions_user_id ON try_on_sessions(user_id);
CREATE INDEX idx_try_on_sessions_status ON try_on_sessions(status);
CREATE INDEX idx_try_on_sessions_created_at ON try_on_sessions(created_at);
CREATE INDEX idx_try_on_sessions_user_status ON try_on_sessions(user_id, status);

-- Try-on session items table indexes
CREATE INDEX idx_try_on_session_items_session_id ON try_on_session_items(session_id);
CREATE INDEX idx_try_on_session_items_clothing_item_id ON try_on_session_items(clothing_item_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_base_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE try_on_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE try_on_session_items ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- User base photos table policies
CREATE POLICY "Users can view own base photos" ON user_base_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own base photos" ON user_base_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own base photos" ON user_base_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own base photos" ON user_base_photos FOR DELETE USING (auth.uid() = user_id);

-- Clothing items table policies
CREATE POLICY "Users can view own clothing items" ON clothing_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clothing items" ON clothing_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clothing items" ON clothing_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clothing items" ON clothing_items FOR DELETE USING (auth.uid() = user_id);

-- Try-on sessions table policies
CREATE POLICY "Users can view own try-on sessions" ON try_on_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own try-on sessions" ON try_on_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own try-on sessions" ON try_on_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Try-on session items table policies
CREATE POLICY "Users can view own session items" ON try_on_session_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM try_on_sessions 
        WHERE try_on_sessions.id = try_on_session_items.session_id 
        AND try_on_sessions.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert own session items" ON try_on_session_items FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM try_on_sessions 
        WHERE try_on_sessions.id = try_on_session_items.session_id 
        AND try_on_sessions.user_id = auth.uid()
    )
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update tier limits when user upgrades
CREATE OR REPLACE FUNCTION update_user_tier_limits()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tier = 'premium' AND OLD.tier = 'free' THEN
        NEW.tier_limits = jsonb_set(
            jsonb_set(NEW.tier_limits, '{clothing_items}', '1000'),
            '{try_ons_per_month}', '1000'
        );
    ELSIF NEW.tier = 'free' AND OLD.tier = 'premium' THEN
        NEW.tier_limits = jsonb_set(
            jsonb_set(NEW.tier_limits, '{clothing_items}', '100'),
            '{try_ons_per_month}', '100'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check tier limits
CREATE OR REPLACE FUNCTION check_tier_limits(
    p_user_id UUID,
    p_limit_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_tier TEXT;
    user_limits JSONB;
    current_usage INTEGER;
    max_limit INTEGER;
BEGIN
    -- Get user tier and limits
    SELECT tier, tier_limits INTO user_tier, user_limits
    FROM users WHERE id = p_user_id;
    
    IF user_tier IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check specific limit
    IF p_limit_type = 'clothing_items' THEN
        max_limit := (user_limits->>'clothing_items')::INTEGER;
        SELECT COUNT(*) INTO current_usage
        FROM clothing_items 
        WHERE user_id = p_user_id AND is_active = true;
        
        RETURN current_usage < max_limit;
        
    ELSIF p_limit_type = 'try_ons_per_month' THEN
        max_limit := (user_limits->>'try_ons_per_month')::INTEGER;
        current_usage := (user_limits->>'current_month_usage')::INTEGER;
        
        RETURN current_usage < max_limit;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to update monthly usage
CREATE OR REPLACE FUNCTION update_monthly_usage(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_month TEXT;
    user_limits JSONB;
BEGIN
    current_month := to_char(NOW(), 'YYYY-MM');
    
    SELECT tier_limits INTO user_limits
    FROM users WHERE id = p_user_id;
    
    -- Check if month has changed
    IF (user_limits->>'current_month')::TEXT != current_month THEN
        -- Reset usage for new month
        UPDATE users 
        SET tier_limits = jsonb_set(
            jsonb_set(tier_limits, '{current_month_usage}', '0'),
            '{current_month}', to_jsonb(current_month)
        )
        WHERE id = p_user_id;
    ELSE
        -- Increment usage
        UPDATE users 
        SET tier_limits = jsonb_set(
            tier_limits, 
            '{current_month_usage}', 
            to_jsonb(((tier_limits->>'current_month_usage')::INTEGER + 1))
        )
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
    clothing_count INTEGER;
    base_photos_count INTEGER;
    try_on_sessions_count INTEGER;
    current_month_try_ons INTEGER;
BEGIN
    -- Get clothing items count
    SELECT COUNT(*) INTO clothing_count
    FROM clothing_items 
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Get base photos count
    SELECT COUNT(*) INTO base_photos_count
    FROM user_base_photos 
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Get total try-on sessions count
    SELECT COUNT(*) INTO try_on_sessions_count
    FROM try_on_sessions 
    WHERE user_id = p_user_id;
    
    -- Get current month try-ons
    SELECT COUNT(*) INTO current_month_try_ons
    FROM try_on_sessions 
    WHERE user_id = p_user_id 
    AND created_at >= date_trunc('month', NOW());
    
    -- Build stats object
    stats := jsonb_build_object(
        'clothing_items_count', clothing_count,
        'base_photos_count', base_photos_count,
        'total_try_on_sessions', try_on_sessions_count,
        'current_month_try_ons', current_month_try_ons
    );
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to automatically update tier limits
CREATE TRIGGER update_tier_limits_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tier_limits();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STORAGE SETUP (COMMENTS FOR REFERENCE)
-- =============================================

-- Note: Storage buckets and policies should be created via Supabase Dashboard or API
-- The following are reference commands that should be run in Supabase:

-- Create storage bucket:
-- INSERT INTO storage.buckets (id, name, public) VALUES 
-- ('closet-images', 'closet-images', true);

-- Storage policies:
-- CREATE POLICY "Users can upload own images" ON storage.objects FOR INSERT WITH CHECK (
--     bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
-- );
-- CREATE POLICY "Users can view own images" ON storage.objects FOR SELECT USING (
--     bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
-- );
-- CREATE POLICY "Users can update own images" ON storage.objects FOR UPDATE USING (
--     bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
-- );
-- CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE USING (
--     bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
-- );
