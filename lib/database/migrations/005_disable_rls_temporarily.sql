-- My Closet Virtual Try-On - Temporarily Disable RLS
-- Migration: 005_disable_rls_temporarily
-- Description: Temporarily disables RLS on users table for development

-- WARNING: This is for development only!
-- In production, you should use proper RLS policies

-- Temporarily disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Note: You can re-enable RLS later with:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
