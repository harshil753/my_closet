-- Analytics Tables Migration
-- Creates tables for tracking user analytics, performance metrics, and engagement

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID,
    properties JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User engagement table
CREATE TABLE IF NOT EXISTS user_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_count INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    features_used TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event ON analytics_events(user_id, event);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric ON performance_metrics(metric);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_last_active ON user_engagement(last_active);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own analytics data
CREATE POLICY "Users can view own analytics" ON analytics_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own performance metrics" ON performance_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own engagement" ON user_engagement
    FOR SELECT USING (auth.uid() = user_id);

-- Allow system to insert analytics data
CREATE POLICY "System can insert analytics" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert performance metrics" ON performance_metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can upsert engagement" ON user_engagement
    FOR ALL USING (true);

-- Function to update user engagement
CREATE OR REPLACE FUNCTION update_user_engagement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update engagement when analytics events are inserted
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO user_engagement (user_id, session_count, last_active, features_used)
        VALUES (NEW.user_id, 1, NEW.timestamp, ARRAY[NEW.event])
        ON CONFLICT (user_id) DO UPDATE SET
            session_count = user_engagement.session_count + 1,
            last_active = GREATEST(user_engagement.last_active, NEW.timestamp),
            features_used = CASE 
                WHEN NEW.event = ANY(user_engagement.features_used) 
                THEN user_engagement.features_used
                ELSE user_engagement.features_used || NEW.event
            END,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update engagement
CREATE TRIGGER update_engagement_trigger
    AFTER INSERT ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION update_user_engagement();

-- Function to clean up old analytics data (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
    -- Delete analytics events older than 1 year
    DELETE FROM analytics_events 
    WHERE timestamp < NOW() - INTERVAL '1 year';
    
    -- Delete performance metrics older than 6 months
    DELETE FROM performance_metrics 
    WHERE timestamp < NOW() - INTERVAL '6 months';
    
    -- Log cleanup
    INSERT INTO analytics_events (event, properties)
    VALUES ('cleanup_completed', jsonb_build_object(
        'deleted_events', (SELECT COUNT(*) FROM analytics_events WHERE timestamp < NOW() - INTERVAL '1 year'),
        'deleted_metrics', (SELECT COUNT(*) FROM performance_metrics WHERE timestamp < NOW() - INTERVAL '6 months')
    ));
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (this would typically be done by a cron job)
-- For now, we'll create a function that can be called manually
