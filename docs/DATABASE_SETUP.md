# Database Setup Guide

This guide will help you set up the complete database schema for the My Closet Virtual Try-On application.

## Prerequisites

- Supabase project created and configured
- Environment variables set up (see `env.example`)
- Node.js and npm installed

## Quick Setup

Run the automated database setup script:

```bash
npm run setup:db
```

This will:
1. Test database connectivity
2. Execute the complete database schema
3. Verify all tables, indexes, and policies
4. Provide storage setup instructions

## Manual Setup

If you prefer to set up the database manually:

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**

### Step 2: Execute Database Schema

1. Copy the contents of `lib/database/migrations/001_initial_schema.sql`
2. Paste into the SQL Editor
3. Click **Run** to execute the schema

### Step 3: Verify Schema

Check that all tables were created:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

## Database Schema Overview

### Tables Created

1. **users** - User accounts and profiles
2. **user_base_photos** - User reference images for AI
3. **clothing_items** - Virtual closet items
4. **try_on_sessions** - AI processing sessions
5. **try_on_session_items** - Session-to-item relationships

### Key Features

- **Row-Level Security (RLS)** - Users can only access their own data
- **Tier Management** - Free/Premium tier limits and usage tracking
- **Comprehensive Indexing** - Optimized for performance
- **Data Validation** - Constraints and checks at database level
- **Audit Trail** - Created/updated timestamps on all records

### Database Functions

- `check_tier_limits()` - Validates user tier limits
- `update_monthly_usage()` - Tracks monthly usage
- `get_user_stats()` - Returns user statistics
- `update_user_tier_limits()` - Handles tier upgrades

## Storage Setup

### Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Configure:
   - **Name**: `closet-images`
   - **Public bucket**: ✅ (checked)
   - **File size limit**: 50MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp`

### Storage Policies

Create these policies in **Storage** > **Policies**:

```sql
-- Users can upload own images
CREATE POLICY "Users can upload own images" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view own images
CREATE POLICY "Users can view own images" ON storage.objects FOR SELECT USING (
    bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update own images
CREATE POLICY "Users can update own images" ON storage.objects FOR UPDATE USING (
    bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete own images
CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE USING (
    bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Testing the Setup

### Test Database Connection

```bash
npm run setup:env
```

This will validate your environment variables and database connectivity.

### Test Schema

Run the schema validator:

```typescript
import { schemaValidator } from '@/lib/database/schema-validator';

const results = await schemaValidator.validateSchema();
console.log('Schema validation results:', results);
```

### Test RLS Policies

1. Create a test user account
2. Try to access another user's data (should be blocked)
3. Verify you can only access your own data

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure you're using the service role key
   - Check that RLS policies are correctly configured

2. **Table Already Exists**
   - Drop existing tables if needed
   - Use `DROP TABLE IF EXISTS` statements

3. **Function Errors**
   - Ensure all required extensions are enabled
   - Check function syntax and dependencies

4. **Storage Upload Errors**
   - Verify bucket exists and is public
   - Check storage policies are correctly set

### Debug Commands

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check functions
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%tier%' OR proname LIKE '%usage%';
```

## Production Considerations

### Security

1. **Never expose service role keys** in client-side code
2. **Use environment variables** for all sensitive data
3. **Regularly audit** RLS policies
4. **Monitor database access** and usage

### Performance

1. **Monitor query performance** using Supabase dashboard
2. **Add additional indexes** based on usage patterns
3. **Consider connection pooling** for high traffic
4. **Set up database backups** and point-in-time recovery

### Scaling

1. **Plan for data growth** - consider partitioning large tables
2. **Monitor storage usage** - implement cleanup policies
3. **Set up monitoring** for database performance
4. **Plan for geographic distribution** if needed

## Maintenance

### Regular Tasks

1. **Monitor database size** and growth
2. **Check for unused indexes** and remove them
3. **Update statistics** for query optimization
4. **Review and update** RLS policies as needed

### Backup Strategy

1. **Enable automatic backups** in Supabase
2. **Test restore procedures** regularly
3. **Document recovery processes**
4. **Store backups securely**

## Next Steps

After completing the database setup:

1. Test all functionality thoroughly
2. Set up monitoring and alerts
3. Configure backups
4. Plan for scaling
5. Document any customizations

## Support

If you encounter issues:

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review the application logs
3. Test with a fresh Supabase project
4. Contact support if needed
