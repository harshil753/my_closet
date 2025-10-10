# Quickstart Guide: My Closet Virtual Try-On

**Feature**: My Closet Virtual Try-On  
**Date**: 2025-01-27  
**Purpose**: Get the application running locally for development

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Python 3.11+
- Supabase account and project
- Google AI API key (Gemini)

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd my-closet

# Install frontend dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
UPLOAD_MAX_SIZE=52428800  # 50MB in bytes
```

### 3. Supabase Setup

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

#### Run Database Migrations
```sql
-- Copy and run the SQL from data-model.md
-- This creates all tables, indexes, and RLS policies
```

#### Configure Storage Buckets
```bash
# Create storage buckets in Supabase dashboard
# 1. Go to Storage in your Supabase project
# 2. Create bucket: "closet-images"
# 3. Set public access to false
# 4. Configure RLS policies for user isolation
```

### 4. Google AI Setup

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create a new API key
3. Add the key to your `.env.local` file

## Development Server

### Start Frontend (Next.js)
```bash
npm run dev
```
Application will be available at `http://localhost:3000`

### Start Backend Services (Python)
```bash
# Start AI processing service
python services/ai_processor.py

# Start image processing service
python services/image_processor.py
```

## First-Time Setup

### 1. Create User Account
1. Navigate to `http://localhost:3000/register`
2. Create a new account with email/password
3. Verify email if required

### 2. Upload Base Photos
1. Go to user profile settings
2. Upload 1-2 reference photos:
   - Front view (full body)
   - Side view (optional)
3. Ensure good lighting and clear visibility

### 3. Add Clothing Items
1. Click "Add Things to My Closet"
2. Select category (Shirts/Tops, Pants/Bottoms, Shoes)
3. Upload multiple clothing images
4. Verify items appear in your closet

### 4. Test Virtual Try-On
1. Click "Lets Try On Clothes"
2. Select clothing categories
3. Choose specific items
4. Wait for AI processing (30-60 seconds)
5. View generated result

## Project Structure

```
my-closet/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Main app pages
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities and configs
├── services/              # Python backend services
├── public/                # Static assets
└── tests/                 # Test files
```

## Key Features

### User Authentication
- Email/password registration
- Social login (Google, GitHub)
- Session management
- Password reset
- Tier-based access control (Free/Premium)

### Virtual Closet
- Upload clothing items by category
- Automatic image compression
- Thumbnail generation
- Item management (edit, delete)
- Tier-based limits (Free: 100 items, Premium: 1000 items)

### Virtual Try-On
- Select multiple clothing items
- AI-powered image generation
- Real-time processing status
- Download results
- Monthly limits (Free: 100 try-ons, Premium: 1000 try-ons)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### User Base Photos
- `GET /api/user/base-photos` - Get user photos
- `POST /api/user/base-photos` - Upload photo
- `DELETE /api/user/base-photos/{id}` - Delete photo

### Clothing Items
- `GET /api/clothing-items` - Get user items
- `POST /api/clothing-items` - Upload items
- `GET /api/clothing-items/{id}` - Get item details
- `DELETE /api/clothing-items/{id}` - Delete item

### Try-On Sessions
- `POST /api/try-on/sessions` - Create session
- `GET /api/try-on/sessions` - Get user sessions
- `GET /api/try-on/sessions/{id}` - Get session details
- `GET /api/try-on/sessions/{id}/result` - Get result image

## Troubleshooting

### Common Issues

**"Supabase connection failed"**
- Verify SUPABASE_URL and SUPABASE_ANON_KEY
- Check Supabase project is active
- Ensure RLS policies are configured

**"Gemini API error"**
- Verify GEMINI_API_KEY is correct
- Check API quota and billing
- Ensure model access permissions

**"Image upload fails"**
- Check file size limits (50MB max)
- Verify supported formats (JPEG, PNG, WebP)
- Check Supabase storage bucket permissions

**"AI processing timeout"**
- Check Python services are running
- Verify Gemini API connectivity
- Check processing queue status

### Debug Mode

Enable debug logging:
```env
DEBUG=true
LOG_LEVEL=debug
```

### Performance Optimization

**Image Processing**
- Images are automatically compressed to 80% quality
- Thumbnails generated for grid display
- WebP conversion for modern browsers

**Database Queries**
- All queries use proper indexes
- RLS policies ensure data isolation
- Connection pooling for performance

**AI Processing**
- Streaming responses for real-time updates
- Progress tracking for long operations
- Error handling and retry logic

## Next Steps

1. **Customize UI**: Modify components in `/components`
2. **Add Features**: Extend API routes in `/app/api`
3. **Improve AI**: Enhance prompts in `/services/ai_processor.py`
4. **Add Tests**: Write tests in `/tests`
5. **Deploy**: Follow deployment guide for production

## Support

- **Documentation**: Check `/docs` folder
- **Issues**: Report bugs in GitHub issues
- **Community**: Join Discord for help
- **Email**: support@mycloset.app
