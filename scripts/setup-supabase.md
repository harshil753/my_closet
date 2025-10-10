# Supabase Setup Guide

This guide will help you set up Supabase for the My Closet Virtual Try-On application.

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- Node.js and npm installed
- Environment variables configured

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `my-closet-virtual-try-on`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be ready (2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (for `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role** key (for `SUPABASE_SERVICE_ROLE_KEY`)

## Step 3: Configure Environment Variables

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Step 4: Set Up Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Copy the contents of `scripts/setup-database.sql`
3. Paste and run the SQL script
4. Verify that all tables are created successfully

## Step 5: Configure Storage

1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Create bucket with these settings:
   - **Name**: `closet-images`
   - **Public bucket**: ✅ (checked)
   - **File size limit**: 50MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp`

## Step 6: Set Up Storage Policies

1. Go to **Storage** > **Policies**
2. Click "New Policy" and create these policies:

### Policy 1: Users can upload own images
```sql
CREATE POLICY "Users can upload own images" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 2: Users can view own images
```sql
CREATE POLICY "Users can view own images" ON storage.objects FOR SELECT USING (
    bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 3: Users can update own images
```sql
CREATE POLICY "Users can update own images" ON storage.objects FOR UPDATE USING (
    bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 4: Users can delete own images
```sql
CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE USING (
    bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 7: Configure Authentication

1. Go to **Authentication** > **Settings**
2. Configure the following settings:

### Site URL
- **Site URL**: `http://localhost:3000` (for development)
- **Redirect URLs**: Add `http://localhost:3000/auth/callback`

### Email Settings
- **Enable email confirmations**: ✅ (recommended)
- **Enable email change confirmations**: ✅ (recommended)

### Social Providers (Optional)
- Configure Google OAuth if desired
- Configure GitHub OAuth if desired

## Step 8: Test the Setup

1. Run the environment setup script:
   ```bash
   npm run setup:env
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Visit `http://localhost:3000` and test:
   - User registration
   - User login
   - Image upload
   - Database operations

## Step 9: Production Setup

For production deployment:

1. Update environment variables with production values
2. Set up custom domain in Supabase
3. Configure production redirect URLs
4. Set up monitoring and backups
5. Configure rate limiting if needed

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Ensure all tables have RLS enabled
   - Check that policies are correctly configured
   - Verify user authentication is working

2. **Storage Upload Errors**
   - Check bucket permissions
   - Verify storage policies
   - Ensure file size limits are appropriate

3. **Authentication Issues**
   - Verify environment variables
   - Check redirect URLs
   - Ensure CORS settings are correct

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Visit the [Supabase Community](https://github.com/supabase/supabase/discussions)
- Review the application logs for specific error messages

## Security Considerations

1. **Never commit service role keys** to version control
2. **Use environment variables** for all sensitive data
3. **Enable RLS** on all tables
4. **Regularly rotate** API keys
5. **Monitor usage** and set up alerts
6. **Backup your database** regularly

## Next Steps

After completing this setup:

1. Test all functionality thoroughly
2. Set up monitoring and logging
3. Configure backups
4. Plan for scaling
5. Set up CI/CD pipeline
