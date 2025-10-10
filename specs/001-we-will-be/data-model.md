# Data Model: My Closet Virtual Try-On

**Feature**: My Closet Virtual Try-On  
**Date**: 2025-01-27  
**Purpose**: Define data entities, relationships, and validation rules

## Core Entities

### Users
**Purpose**: Store user account information and preferences

**Fields**:
- `id` (UUID, Primary Key): Unique user identifier
- `email` (String, Unique): User email address
- `display_name` (String): User's display name
- `created_at` (Timestamp): Account creation date
- `updated_at` (Timestamp): Last profile update
- `preferences` (JSON): User settings and preferences
- `tier` (Enum): 'free', 'premium' - User subscription tier
- `tier_limits` (JSON): Current tier limits and usage tracking

**Validation Rules**:
- Email must be valid format
- Display name must be 2-50 characters
- Email must be unique across all users

**Relationships**:
- One-to-many with ClothingItems
- One-to-many with UserBasePhotos
- One-to-many with TryOnSessions

### UserBasePhotos
**Purpose**: Store user reference images for AI processing

**Fields**:
- `id` (UUID, Primary Key): Unique photo identifier
- `user_id` (UUID, Foreign Key): Reference to Users table
- `image_url` (String): Supabase Storage URL
- `image_type` (Enum): 'front', 'side', 'full_body'
- `uploaded_at` (Timestamp): Upload date
- `is_active` (Boolean): Currently used for AI processing
- `metadata` (JSON): Image dimensions, file size, etc.

**Validation Rules**:
- User must have at least 1 base photo
- Maximum 3 base photos per user
- Image must be JPEG/PNG format
- File size must be under 10MB
- Image must be at least 512x512 pixels

**Relationships**:
- Many-to-one with Users
- One-to-many with TryOnSessions

### ClothingItems
**Purpose**: Store individual clothing pieces in user's virtual closet

**Fields**:
- `id` (UUID, Primary Key): Unique item identifier
- `user_id` (UUID, Foreign Key): Reference to Users table
- `category` (Enum): 'shirts_tops', 'pants_bottoms', 'shoes'
- `name` (String): User-defined item name
- `image_url` (String): Supabase Storage URL
- `thumbnail_url` (String): Optimized thumbnail URL
- `uploaded_at` (Timestamp): Upload date
- `is_active` (Boolean): Item is available for try-on
- `metadata` (JSON): Color, brand, size, etc.

**Validation Rules**:
- Category must be one of the defined enum values
- Name must be 1-100 characters
- Image must be JPEG/PNG format
- File size must be under 50MB
- Free tier: maximum 100 items, Premium tier: maximum 1000 items

**Relationships**:
- Many-to-one with Users
- Many-to-many with TryOnSessions (through TryOnSessionItems)

### TryOnSessions
**Purpose**: Track AI processing requests and results

**Fields**:
- `id` (UUID, Primary Key): Unique session identifier
- `user_id` (UUID, Foreign Key): Reference to Users table
- `status` (Enum): 'pending', 'processing', 'completed', 'failed'
- `created_at` (Timestamp): Session creation
- `completed_at` (Timestamp): Processing completion
- `result_image_url` (String): Generated image URL
- `processing_time` (Integer): Processing duration in seconds
- `error_message` (String): Error details if failed
- `metadata` (JSON): AI model parameters, prompt used

**Validation Rules**:
- Status must be one of the defined enum values
- User must have active base photos
- At least one clothing item must be selected
- Free tier: 100 try-ons/month, Premium tier: 1000 try-ons/month
- Maximum 3 concurrent sessions per user

**Relationships**:
- Many-to-one with Users
- One-to-many with TryOnSessionItems

### TryOnSessionItems
**Purpose**: Junction table for session-to-clothing-item relationships

**Fields**:
- `id` (UUID, Primary Key): Unique relationship identifier
- `session_id` (UUID, Foreign Key): Reference to TryOnSessions
- `clothing_item_id` (UUID, Foreign Key): Reference to ClothingItems
- `created_at` (Timestamp): Relationship creation

**Validation Rules**:
- Session must exist and be active
- Clothing item must belong to same user
- Maximum 5 items per session
- No duplicate items in same session

**Relationships**:
- Many-to-one with TryOnSessions
- Many-to-one with ClothingItems

## Database Schema

### Supabase Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL CHECK (length(display_name) >= 2 AND length(display_name) <= 50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}'::jsonb,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
    tier_limits JSONB DEFAULT '{"clothing_items": 100, "try_ons_per_month": 100, "current_month_usage": 0, "current_month": "2025-01"}'::jsonb
);

-- User base photos table
CREATE TABLE user_base_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL CHECK (image_type IN ('front', 'side', 'full_body')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Clothing items table
CREATE TABLE clothing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('shirts_tops', 'pants_bottoms', 'shoes')),
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Try-on sessions table
CREATE TABLE try_on_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    result_image_url TEXT,
    processing_time INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Try-on session items junction table
CREATE TABLE try_on_session_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES try_on_sessions(id) ON DELETE CASCADE,
    clothing_item_id UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, clothing_item_id)
);
```

### Row-Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_base_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE try_on_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE try_on_session_items ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own base photos" ON user_base_photos 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own clothing items" ON clothing_items 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own try-on sessions" ON try_on_sessions 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own session items" ON try_on_session_items 
    FOR ALL USING (auth.uid() = (SELECT user_id FROM try_on_sessions WHERE id = session_id));
```

### Indexes for Performance

```sql
-- Indexes for common queries
CREATE INDEX idx_user_base_photos_user_id ON user_base_photos(user_id);
CREATE INDEX idx_user_base_photos_active ON user_base_photos(user_id, is_active);

CREATE INDEX idx_clothing_items_user_id ON clothing_items(user_id);
CREATE INDEX idx_clothing_items_category ON clothing_items(user_id, category);
CREATE INDEX idx_clothing_items_active ON clothing_items(user_id, is_active);

CREATE INDEX idx_try_on_sessions_user_id ON try_on_sessions(user_id);
CREATE INDEX idx_try_on_sessions_status ON try_on_sessions(user_id, status);
CREATE INDEX idx_try_on_sessions_created_at ON try_on_sessions(created_at DESC);

CREATE INDEX idx_try_on_session_items_session_id ON try_on_session_items(session_id);
CREATE INDEX idx_try_on_session_items_clothing_item_id ON try_on_session_items(clothing_item_id);

-- Function to update tier limits when user upgrades
CREATE OR REPLACE FUNCTION update_user_tier_limits()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tier = 'premium' AND OLD.tier = 'free' THEN
        NEW.tier_limits = jsonb_set(
            jsonb_set(NEW.tier_limits, '{clothing_items}', '1000'),
            '{try_ons_per_month}', '1000'
        );
    ELSIF NEW.tier = 'free' AND OLD.tier = 'premium' THEN
        NEW.tier_limits = jsonb_set(
            jsonb_set(NEW.tier_limits, '{clothing_items}', '100'),
            '{try_ons_per_month}', '100'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update tier limits
CREATE TRIGGER update_tier_limits_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tier_limits();
```

## Data Validation Rules

### Upload Validation
- **Image Files**: Only JPEG, PNG, WebP formats allowed
- **File Size**: Base photos max 10MB, clothing items max 50MB
- **Dimensions**: Minimum 512x512 pixels for all images
- **User Limits**: Max 3 base photos, Free tier: 100 clothing items, Premium tier: 1000 clothing items

### Business Logic Validation
- **Try-On Sessions**: User must have at least 1 active base photo
- **Clothing Selection**: Maximum 5 items per try-on session
- **Concurrent Sessions**: Maximum 3 active sessions per user
- **Session Timeout**: Sessions expire after 1 hour if not completed
- **Monthly Limits**: Free tier: 100 try-ons/month, Premium tier: 1000 try-ons/month

### Data Integrity
- **Cascade Deletes**: User deletion removes all associated data
- **Foreign Key Constraints**: All relationships properly enforced
- **Unique Constraints**: Prevent duplicate relationships
- **Check Constraints**: Enforce enum values and data ranges

## State Transitions

### Try-On Session States
```
pending → processing → completed
   ↓         ↓           ↓
 failed ← failed ← failed
```

**State Rules**:
- Sessions start in 'pending' state
- Move to 'processing' when AI processing begins
- Move to 'completed' on successful generation
- Move to 'failed' on any error
- Failed sessions can be retried (new session)

### User Base Photo States
```
uploaded → active
    ↓        ↓
 inactive ← inactive
```

**State Rules**:
- Photos start as 'active' when uploaded
- Only one photo per type can be 'active'
- Users can deactivate/reactivate photos
- Inactive photos are not used for AI processing
