-- GDPR Data Retention Policies and Triggers
-- Implements automatic data cleanup based on retention policies

-- Create tables for tracking data requests and consent
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    format TEXT NOT NULL DEFAULT 'json',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    download_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    essential BOOLEAN NOT NULL DEFAULT true,
    analytics BOOLEAN NOT NULL DEFAULT false,
    marketing BOOLEAN NOT NULL DEFAULT false,
    ai_processing BOOLEAN NOT NULL DEFAULT false,
    data_retention BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_consent_preferences_user_id ON consent_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created_at ON usage_tracking(created_at);

-- Enable RLS on new tables
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "Users can view own deletion requests" ON data_deletion_requests 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own export requests" ON data_export_requests 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own consent preferences" ON consent_preferences 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage tracking" ON usage_tracking 
    FOR SELECT USING (auth.uid() = user_id);

-- Data retention configuration
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type TEXT NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,
    auto_delete BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (data_type, retention_days, auto_delete, description) VALUES
('user_base_photos', 365, true, 'User base photos - 1 year retention'),
('clothing_items', 365, true, 'Clothing items - 1 year retention'),
('try_on_sessions', 90, true, 'Try-on sessions - 90 days retention'),
('try_on_results', 30, true, 'Try-on result images - 30 days retention'),
('usage_analytics', 730, true, 'Usage analytics - 2 years retention (anonymized)'),
('support_tickets', 1095, true, 'Support tickets - 3 years retention'),
('audit_logs', 2555, true, 'Audit logs - 7 years retention')
ON CONFLICT (data_type) DO NOTHING;

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE (
    data_type TEXT,
    deleted_count INTEGER,
    cleanup_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    policy RECORD;
    deleted_count INTEGER;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Loop through all retention policies
    FOR policy IN SELECT * FROM data_retention_policies WHERE auto_delete = true LOOP
        cutoff_date := NOW() - INTERVAL '1 day' * policy.retention_days;
        
        -- Clean up based on data type
        CASE policy.data_type
            WHEN 'user_base_photos' THEN
                -- Delete expired base photos and their storage files
                WITH deleted_photos AS (
                    DELETE FROM user_base_photos 
                    WHERE created_at < cutoff_date
                    RETURNING id, image_url
                )
                SELECT COUNT(*) INTO deleted_count FROM deleted_photos;
                
            WHEN 'clothing_items' THEN
                -- Delete expired clothing items and their storage files
                WITH deleted_items AS (
                    DELETE FROM clothing_items 
                    WHERE uploaded_at < cutoff_date
                    RETURNING id, image_url, thumbnail_url
                )
                SELECT COUNT(*) INTO deleted_count FROM deleted_items;
                
            WHEN 'try_on_sessions' THEN
                -- Delete expired try-on sessions
                WITH deleted_sessions AS (
                    DELETE FROM try_on_sessions 
                    WHERE created_at < cutoff_date
                    RETURNING id
                )
                SELECT COUNT(*) INTO deleted_count FROM deleted_sessions;
                
            WHEN 'try_on_results' THEN
                -- Delete expired try-on result images
                WITH deleted_results AS (
                    UPDATE try_on_sessions 
                    SET result_image_url = NULL 
                    WHERE completed_at < cutoff_date 
                    AND result_image_url IS NOT NULL
                    RETURNING id
                )
                SELECT COUNT(*) INTO deleted_count FROM deleted_results;
                
            WHEN 'usage_analytics' THEN
                -- Anonymize usage tracking data
                WITH anonymized_usage AS (
                    UPDATE usage_tracking 
                    SET user_id = NULL, metadata = '{"anonymized": true}'::jsonb
                    WHERE created_at < cutoff_date 
                    AND user_id IS NOT NULL
                    RETURNING id
                )
                SELECT COUNT(*) INTO deleted_count FROM anonymized_usage;
                
            WHEN 'support_tickets' THEN
                -- Delete expired support tickets (if support system exists)
                -- This would be implemented when support system is added
                deleted_count := 0;
                
            WHEN 'audit_logs' THEN
                -- Delete expired audit logs
                WITH deleted_logs AS (
                    DELETE FROM audit_logs 
                    WHERE created_at < cutoff_date
                    RETURNING id
                )
                SELECT COUNT(*) INTO deleted_count FROM deleted_logs;
                
            ELSE
                deleted_count := 0;
        END CASE;
        
        -- Return cleanup results
        data_type := policy.data_type;
        deleted_count := COALESCE(deleted_count, 0);
        cleanup_date := NOW();
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle user data deletion
CREATE OR REPLACE FUNCTION handle_user_data_deletion()
RETURNS TRIGGER AS $$
DECLARE
    photo_urls TEXT[];
    item_urls TEXT[];
    session_urls TEXT[];
BEGIN
    -- Collect all file URLs that need to be deleted from storage
    SELECT ARRAY_AGG(image_url) INTO photo_urls 
    FROM user_base_photos 
    WHERE user_id = OLD.id;
    
    SELECT ARRAY_AGG(image_url), ARRAY_AGG(thumbnail_url) INTO item_urls, item_urls
    FROM clothing_items 
    WHERE user_id = OLD.id;
    
    SELECT ARRAY_AGG(result_image_url) INTO session_urls
    FROM try_on_sessions 
    WHERE user_id = OLD.id AND result_image_url IS NOT NULL;
    
    -- Log the deletion request
    INSERT INTO data_deletion_requests (user_id, reason, status, completed_at)
    VALUES (OLD.id, 'User account deleted', 'completed', NOW());
    
    -- Note: Actual storage file deletion would be handled by the application
    -- This trigger ensures database consistency
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to track user consent changes
CREATE OR REPLACE FUNCTION track_consent_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log consent changes for audit purposes
    INSERT INTO usage_tracking (user_id, action_type, resource_type, metadata)
    VALUES (
        NEW.user_id, 
        'consent_updated', 
        'privacy_settings',
        jsonb_build_object(
            'previous_consent', OLD,
            'new_consent', NEW,
            'changed_at', NOW()
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to anonymize user data for GDPR compliance
CREATE OR REPLACE FUNCTION anonymize_user_data(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    anonymized_count INTEGER := 0;
BEGIN
    -- Anonymize user profile
    UPDATE users 
    SET 
        email = 'anonymized_' || user_uuid || '@deleted.local',
        display_name = 'Deleted User',
        preferences = '{"anonymized": true}'::jsonb
    WHERE id = user_uuid;
    
    -- Anonymize base photos metadata
    UPDATE user_base_photos 
    SET metadata = jsonb_set(metadata, '{anonymized}', 'true')
    WHERE user_id = user_uuid;
    
    -- Anonymize clothing items metadata
    UPDATE clothing_items 
    SET 
        name = 'Deleted Item',
        metadata = jsonb_set(metadata, '{anonymized}', 'true')
    WHERE user_id = user_uuid;
    
    -- Anonymize try-on sessions
    UPDATE try_on_sessions 
    SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{anonymized}', 'true')
    WHERE user_id = user_uuid;
    
    -- Anonymize usage tracking
    UPDATE usage_tracking 
    SET 
        user_id = NULL,
        metadata = jsonb_set(metadata, '{anonymized}', 'true')
    WHERE user_id = user_uuid;
    
    GET DIAGNOSTICS anonymized_count = ROW_COUNT;
    
    RETURN anonymized_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER user_deletion_trigger
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_data_deletion();

CREATE TRIGGER consent_change_trigger
    AFTER UPDATE ON consent_preferences
    FOR EACH ROW
    EXECUTE FUNCTION track_consent_changes();

-- Create scheduled cleanup job (requires pg_cron extension)
-- This would be set up in production with a cron job
CREATE OR REPLACE FUNCTION schedule_data_cleanup()
RETURNS VOID AS $$
BEGIN
    -- This function would be called by a scheduled job
    -- For now, it can be called manually or via application logic
    PERFORM cleanup_expired_data();
END;
$$ LANGUAGE plpgsql;

-- Create view for data retention monitoring
CREATE OR REPLACE VIEW data_retention_status AS
SELECT 
    policy.data_type,
    policy.retention_days,
    policy.auto_delete,
    COUNT(*) as current_count,
    COUNT(*) FILTER (WHERE 
        CASE policy.data_type
            WHEN 'user_base_photos' THEN user_base_photos.created_at < NOW() - INTERVAL '1 day' * policy.retention_days
            WHEN 'clothing_items' THEN clothing_items.uploaded_at < NOW() - INTERVAL '1 day' * policy.retention_days
            WHEN 'try_on_sessions' THEN try_on_sessions.created_at < NOW() - INTERVAL '1 day' * policy.retention_days
            WHEN 'usage_analytics' THEN usage_tracking.created_at < NOW() - INTERVAL '1 day' * policy.retention_days
            ELSE false
        END
    ) as expired_count,
    NOW() as last_checked
FROM data_retention_policies policy
LEFT JOIN user_base_photos ON policy.data_type = 'user_base_photos'
LEFT JOIN clothing_items ON policy.data_type = 'clothing_items'
LEFT JOIN try_on_sessions ON policy.data_type = 'try_on_sessions'
LEFT JOIN usage_tracking ON policy.data_type = 'usage_analytics'
GROUP BY policy.data_type, policy.retention_days, policy.auto_delete;

-- Grant necessary permissions
GRANT SELECT ON data_retention_status TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_data() TO service_role;
GRANT EXECUTE ON FUNCTION anonymize_user_data(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION schedule_data_cleanup() TO service_role;
