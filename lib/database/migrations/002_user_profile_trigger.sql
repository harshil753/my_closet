-- My Closet Virtual Try-On - User Profile Creation Trigger
-- Migration: 002_user_profile_trigger
-- Description: Automatically creates user profile when Supabase Auth user is created

-- Function to create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    display_name, 
    created_at, 
    updated_at,
    tier,
    tier_limits
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'User'),
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
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User profile already exists, do nothing
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
