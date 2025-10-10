-- My Closet Virtual Try-On - Storage Setup
-- Migration: 006_storage_setup
-- Description: Creates storage bucket and policies for image uploads

-- Create storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'closet-images',
  'closet-images',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for closet-images bucket (drop existing first)
DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

CREATE POLICY "Users can upload own images" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'closet-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own images" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'closet-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own images" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'closet-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own images" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'closet-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
