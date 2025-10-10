# API Documentation

## Authentication

All API endpoints require authentication via Supabase Auth. Include the session token in the Authorization header:

```
Authorization: Bearer <session_token>
```

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Endpoints

### User Management

#### GET /api/user/profile
Get current user profile information.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "tier": "free",
  "tier_limits": {
    "clothing_items": 100,
    "try_ons_per_month": 100,
    "current_month_usage": 5,
    "current_month": "2025-01"
  },
  "created_at": "2025-01-27T10:00:00Z"
}
```

#### PUT /api/user/profile
Update user profile information.

**Request Body:**
```json
{
  "display_name": "John Smith",
  "preferences": {
    "notifications": true,
    "theme": "light"
  }
}
```

### Clothing Items

#### GET /api/clothing-items
Get user's clothing items with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category (shirts, pants, shoes, etc.)
- `limit` (optional): Number of items to return (default: 50)
- `offset` (optional): Number of items to skip (default: 0)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Blue Shirt",
      "category": "shirts",
      "image_url": "https://storage.supabase.co/...",
      "created_at": "2025-01-27T10:00:00Z"
    }
  ],
  "total": 25,
  "has_more": false
}
```

#### POST /api/clothing-items
Upload new clothing items.

**Request Body (multipart/form-data):**
- `images`: Array of image files
- `category`: Clothing category
- `name`: Item name (optional)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Blue Shirt",
      "category": "shirts",
      "image_url": "https://storage.supabase.co/...",
      "created_at": "2025-01-27T10:00:00Z"
    }
  ],
  "compression_stats": {
    "original_size": 2048000,
    "compressed_size": 512000,
    "compression_ratio": 0.75
  }
}
```

#### DELETE /api/clothing-items/:id
Delete a clothing item.

**Response:**
```json
{
  "success": true,
  "message": "Clothing item deleted successfully"
}
```

### Virtual Try-On

#### POST /api/try-on/sessions
Create a new virtual try-on session.

**Request Body:**
```json
{
  "clothing_item_ids": ["uuid1", "uuid2"],
  "user_base_photo_ids": ["uuid3", "uuid4"]
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "processing",
  "estimated_completion": "2025-01-27T10:02:00Z"
}
```

#### GET /api/try-on/sessions/:id
Get try-on session status and results.

**Response:**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "result_image_url": "https://storage.supabase.co/...",
  "created_at": "2025-01-27T10:00:00Z",
  "completed_at": "2025-01-27T10:01:30Z"
}
```

#### POST /api/try-on/sessions/:id/retry
Retry a failed try-on session.

**Response:**
```json
{
  "session_id": "uuid",
  "status": "processing",
  "retry_count": 1
}
```

### User Base Photos

#### GET /api/user/base-photos
Get user's base photos for virtual try-on.

**Response:**
```json
{
  "photos": [
    {
      "id": "uuid",
      "type": "front",
      "image_url": "https://storage.supabase.co/...",
      "created_at": "2025-01-27T10:00:00Z"
    }
  ]
}
```

#### POST /api/user/base-photos
Upload new base photos.

**Request Body (multipart/form-data):**
- `images`: Array of image files
- `types`: Array of photo types (front, side)

**Response:**
```json
{
  "photos": [
    {
      "id": "uuid",
      "type": "front",
      "image_url": "https://storage.supabase.co/...",
      "created_at": "2025-01-27T10:00:00Z"
    }
  ]
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid image format. Please use JPEG, PNG, or WebP.",
    "details": {
      "field": "image",
      "value": "document.pdf"
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid request data
- `AUTHENTICATION_REQUIRED`: User not authenticated
- `TIER_LIMIT_EXCEEDED`: User has reached tier limits
- `IMAGE_PROCESSING_ERROR`: Failed to process image
- `AI_PROCESSING_ERROR`: Failed to generate try-on image
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Unexpected server error

## Rate Limits

- **Free Tier**: 100 try-ons per month
- **Premium Tier**: 1000 try-ons per month
- **API Calls**: 1000 requests per hour per user

## File Upload Limits

- **Image Size**: Maximum 50MB per file
- **Image Formats**: JPEG, PNG, WebP
- **Image Dimensions**: Minimum 512x512 pixels
- **Batch Upload**: Maximum 10 files per request
