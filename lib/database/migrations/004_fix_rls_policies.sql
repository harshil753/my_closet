-- My Closet Virtual Try-On - Fix RLS Policies
-- Migration: 004_fix_rls_policies
-- Description: Updates RLS policies to allow user profile creation

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create new policy that allows users to insert their own profile
-- This policy checks if the user ID matches the auth.uid()
CREATE POLICY "Users can insert own profile" ON users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Also ensure the policy allows the user to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users 
FOR SELECT 
USING (auth.uid() = id);

-- Update policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE 
USING (auth.uid() = id);
