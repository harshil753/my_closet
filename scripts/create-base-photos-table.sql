-- Create user_base_photos table for base photo management
-- Run this SQL in your Supabase SQL editor

-- Drop existing table if it exists (for development)
DROP TABLE IF EXISTS user_base_photos CASCADE;

-- Create updated user_base_photos table
CREATE TABLE user_base_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_primary BOOLEAN DEFAULT false,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX idx_user_base_photos_user_id ON user_base_photos(user_id);
CREATE INDEX idx_user_base_photos_primary ON user_base_photos(user_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_user_base_photos_created_at ON user_base_photos(created_at DESC);

-- Create function to ensure only one primary photo per user
CREATE OR REPLACE FUNCTION ensure_single_primary_photo()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a photo as primary, unset all other primary photos for this user
    IF NEW.is_primary = true THEN
        UPDATE user_base_photos 
        SET is_primary = false 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single primary photo
DROP TRIGGER IF EXISTS trigger_ensure_single_primary_photo ON user_base_photos;
CREATE TRIGGER trigger_ensure_single_primary_photo
    BEFORE INSERT OR UPDATE ON user_base_photos
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_photo();

-- Create RLS policies
ALTER TABLE user_base_photos ENABLE ROW LEVEL SECURITY;

-- Users can only see their own base photos
DROP POLICY IF EXISTS "Users can view own base photos" ON user_base_photos;
CREATE POLICY "Users can view own base photos" ON user_base_photos
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own base photos
DROP POLICY IF EXISTS "Users can insert own base photos" ON user_base_photos;
CREATE POLICY "Users can insert own base photos" ON user_base_photos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own base photos
DROP POLICY IF EXISTS "Users can update own base photos" ON user_base_photos;
CREATE POLICY "Users can update own base photos" ON user_base_photos
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own base photos
DROP POLICY IF EXISTS "Users can delete own base photos" ON user_base_photos;
CREATE POLICY "Users can delete own base photos" ON user_base_photos
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_base_photos_updated_at ON user_base_photos;
CREATE TRIGGER trigger_user_base_photos_updated_at
    BEFORE UPDATE ON user_base_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
