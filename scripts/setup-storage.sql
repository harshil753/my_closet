-- Setup Supabase Storage buckets and policies for My Closet Virtual Try-On
-- Run this script in your Supabase SQL editor

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('clothing-images', 'clothing-images', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('base-photos', 'base-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('try-on-results', 'try-on-results', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('thumbnails', 'thumbnails', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for clothing-images bucket
CREATE POLICY "Users can upload their own clothing images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clothing-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own clothing images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'clothing-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own clothing images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'clothing-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own clothing images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'clothing-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for base-photos bucket
CREATE POLICY "Users can upload their own base photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'base-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own base photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'base-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own base photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'base-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own base photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'base-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for try-on-results bucket
CREATE POLICY "Users can view their own try-on results" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'try-on-results' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "System can upload try-on results" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'try-on-results' AND 
    auth.role() = 'service_role'
  );

CREATE POLICY "System can update try-on results" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'try-on-results' AND 
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can delete their own try-on results" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'try-on-results' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for thumbnails bucket (public read access)
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
  FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "System can manage thumbnails" ON storage.objects
  FOR ALL USING (
    bucket_id = 'thumbnails' AND 
    auth.role() = 'service_role'
  );

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create function to clean up orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS void AS $$
BEGIN
  -- Delete clothing images that don't have corresponding database records
  DELETE FROM storage.objects 
  WHERE bucket_id = 'clothing-images' 
    AND id NOT IN (
      SELECT image_url FROM clothing_items 
      WHERE image_url IS NOT NULL
    );
    
  -- Delete base photos that don't have corresponding database records
  DELETE FROM storage.objects 
  WHERE bucket_id = 'base-photos' 
    AND id NOT IN (
      SELECT image_url FROM user_base_photos 
      WHERE image_url IS NOT NULL
    );
    
  -- Delete try-on results that don't have corresponding database records
  DELETE FROM storage.objects 
  WHERE bucket_id = 'try-on-results' 
    AND id NOT IN (
      SELECT result_image_url FROM try_on_sessions 
      WHERE result_image_url IS NOT NULL
    );
    
  -- Delete thumbnails that don't have corresponding database records
  DELETE FROM storage.objects 
  WHERE bucket_id = 'thumbnails' 
    AND id NOT IN (
      SELECT thumbnail_url FROM clothing_items 
      WHERE thumbnail_url IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get storage usage for a user
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS TABLE (
  bucket_name TEXT,
  file_count BIGINT,
  total_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.bucket_id as bucket_name,
    COUNT(*) as file_count,
    COALESCE(SUM(so.metadata->>'size')::BIGINT, 0) as total_size
  FROM storage.objects so
  WHERE so.bucket_id IN ('clothing-images', 'base-photos', 'try-on-results', 'thumbnails')
    AND (storage.foldername(so.name))[1] = user_uuid::text
  GROUP BY so.bucket_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to enforce storage limits
CREATE OR REPLACE FUNCTION check_storage_limits(user_uuid UUID, file_size BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage BIGINT;
  tier_limit BIGINT;
  user_tier TEXT;
BEGIN
  -- Get user's current tier
  SELECT tier INTO user_tier FROM users WHERE id = user_uuid;
  
  -- Set tier limits (in bytes)
  IF user_tier = 'free' THEN
    tier_limit := 100 * 50 * 1024 * 1024; -- 100 items * 50MB
  ELSE
    tier_limit := 1000 * 50 * 1024 * 1024; -- 1000 items * 50MB
  END IF;
  
  -- Get current storage usage
  SELECT COALESCE(SUM((so.metadata->>'size')::BIGINT), 0) INTO current_usage
  FROM storage.objects so
  WHERE so.bucket_id IN ('clothing-images', 'base-photos', 'try-on-results')
    AND (storage.foldername(so.name))[1] = user_uuid::text;
  
  -- Check if adding this file would exceed limits
  RETURN (current_usage + file_size) <= tier_limit;
END;
$$ LANGUAGE plpgsql;
