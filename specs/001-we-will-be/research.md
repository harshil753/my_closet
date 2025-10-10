# Research: My Closet Virtual Try-On

**Feature**: My Closet Virtual Try-On  
**Date**: 2025-01-27  
**Purpose**: Resolve technical unknowns and establish best practices

## Authentication & User Management

**Decision**: Supabase Auth with email/password and social login options, plus tier-based access control

**Rationale**: 
- Supabase Auth provides built-in user management, session handling, and security
- Supports multiple authentication methods (email, Google, GitHub)
- Integrates seamlessly with Supabase database and storage
- Handles user registration, login, password reset, and session management
- Tier system enables freemium model with clear upgrade paths

**Alternatives considered**:
- Custom JWT implementation: Too complex for MVP, security risks
- NextAuth.js: Additional dependency, Supabase Auth is sufficient
- Clerk: Additional cost, Supabase Auth covers requirements

## Image Storage Strategy

**Decision**: Supabase Storage with optimized bucket structure

**Rationale**:
- Native integration with Supabase database for metadata
- Built-in CDN and global distribution
- Automatic image optimization and resizing
- Row-level security for user data isolation
- Cost-effective for MVP scale

**Bucket Structure**:
```
closet-images/
├── users/{user_id}/
│   ├── base-photos/          # User reference images
│   ├── clothing/            # Clothing item images
│   │   ├── shirts-tops/
│   │   ├── pants-bottoms/
│   │   └── shoes/
│   └── try-on-results/      # Generated AI images
```

**Alternatives considered**:
- Cloudflare R2: Future migration option, not needed for MVP
- AWS S3: More complex setup, Supabase Storage sufficient
- Local storage: Not scalable, no cloud benefits

## AI Integration Architecture

**Decision**: Python service with Gemini 2.5 Flash Image model

**Rationale**:
- Gemini 2.5 Flash Image provides high-quality image generation
- Python service allows for complex image processing with Pillow
- Streaming API support for real-time progress updates
- Cost-effective for virtual try-on use cases

**Implementation Pattern**:
```python
# Process flow
1. Receive user base photos + selected clothing items
2. Compress and optimize images with Pillow
3. Send to Gemini AI with structured prompt
4. Stream response back to frontend
5. Store result in Supabase Storage
```

**Alternatives considered**:
- Direct frontend integration: Security risks, API key exposure
- Serverless functions: Cold start issues, timeout limitations
- Other AI models: Gemini provides best quality/cost ratio

## Image Processing Pipeline

**Decision**: Pillow (PIL) for compression, Next.js API routes for orchestration

**Rationale**:
- Pillow provides comprehensive image processing capabilities
- Automatic format conversion to optimized JPEG
- Quality and size optimization for web delivery
- Integration with Python AI service

**Processing Steps**:
1. Upload validation (file type, size limits)
2. Automatic compression to 80% quality JPEG
3. Resize to max 1920x1080 for clothing items
4. Generate thumbnails (300x300) for grid display
5. Store original + optimized versions

**Alternatives considered**:
- Sharp.js: Node.js alternative, but Python service already needed
- Browser-based compression: Limited control, inconsistent results
- Third-party services: Additional cost, complexity

## Database Schema Design

**Decision**: Supabase PostgreSQL with optimized tables and RLS

**Rationale**:
- PostgreSQL provides robust relational data management
- Row-level security ensures user data isolation
- Real-time subscriptions for live updates
- Full-text search capabilities for clothing items

**Key Tables**:
- `users`: User profiles, preferences, and tier information
- `clothing_items`: Individual clothing pieces with metadata
- `try_on_sessions`: AI generation requests and results
- `user_base_photos`: Reference images for AI processing

**Tier System**:
- **Free Tier**: 100 clothing items, 100 try-ons per month
- **Premium Tier**: 1000 clothing items, 1000 try-ons per month
- Usage tracking in user tier_limits JSON field
- Automatic enforcement via database constraints and application logic

**Alternatives considered**:
- NoSQL databases: Less structured, harder to query
- File-based storage: No metadata management, poor performance
- External databases: Additional complexity, Supabase sufficient

## Frontend Architecture

**Decision**: Next.js 14 with App Router and TypeScript

**Rationale**:
- App Router provides modern React patterns and better performance
- TypeScript ensures type safety and better developer experience
- Built-in API routes eliminate need for separate backend
- Excellent Supabase integration support

**Key Patterns**:
- Server Components for data fetching
- Client Components for interactivity
- Custom hooks for state management
- Tailwind CSS for styling consistency

**Alternatives considered**:
- React with Vite: More setup, less built-in features
- Vue.js: Team preference for React ecosystem
- Svelte: Smaller ecosystem, less Supabase integration

## Performance Optimization

**Decision**: Multi-layered caching and optimization strategy

**Rationale**:
- Image optimization critical for user experience
- API response times must be under 500ms
- AI processing needs progress feedback

**Optimization Layers**:
1. **CDN**: Supabase Storage with global distribution
2. **Image Processing**: Automatic WebP conversion, responsive images
3. **Caching**: Redis for API responses, browser caching for static assets
4. **Database**: Indexed queries, connection pooling
5. **Frontend**: Code splitting, lazy loading, image optimization

**Alternatives considered**:
- No caching: Poor performance, high costs
- Complex caching: Over-engineering for MVP
- External CDN: Additional cost, Supabase sufficient

## Security Considerations

**Decision**: Comprehensive security with Supabase RLS and API protection

**Rationale**:
- User data must be completely isolated
- API endpoints need proper authentication
- Image uploads require validation and sanitization

**Security Measures**:
- Row-level security on all database tables
- API route authentication middleware
- Image upload validation (type, size, content)
- Rate limiting on AI processing endpoints
- Environment variable protection

**Alternatives considered**:
- Basic authentication: Insufficient security
- Complex security: Over-engineering for MVP
- Third-party security: Additional cost, Supabase sufficient
