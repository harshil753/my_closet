-- My Closet Virtual Try-On - Fix Storage Policies
-- Migration: 008_fix_storage_policies
-- Description: Fixes storage policies to allow uploads

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Create simpler storage policies
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'closet-images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to view images" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'closet-images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to update images" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'closet-images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete images" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'closet-images' AND 
  auth.role() = 'authenticated'
);
