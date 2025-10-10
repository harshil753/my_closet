# My Closet Virtual Try-On

An AI-powered virtual try-on application that allows users to upload clothing photos to build a virtual closet and see how they would look wearing selected items using Google Gemini AI.

## Features

- **Virtual Closet**: Upload and organize clothing items by category
- **AI-Powered Try-On**: Generate realistic images of yourself wearing selected clothing
- **Tier System**: Free (100 items, 100 try-ons/month) and Premium (1000 items, 1000 try-ons/month)
- **Image Processing**: Automatic compression and optimization
- **User Management**: Secure authentication with Supabase

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Python services for AI processing
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Storage**: Supabase Storage for images
- **AI**: Google Gemini 2.5 Flash Image
- **Image Processing**: Pillow (PIL)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account
- Google AI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd my-closet
```

2. Install dependencies:
```bash
npm install
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp env.example .env.local
# Edit .env.local with your actual values
```

4. Set up Supabase:
- Create a new Supabase project
- Run the database migrations from `specs/001-we-will-be/data-model.md`
- Configure storage buckets

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
my-closet/
├── app/                     # Next.js App Router
│   ├── (auth)/             # Authentication pages
│   ├── (dashboard)/        # Main app pages
│   └── api/                # API routes
├── components/             # React components
├── lib/                    # Utilities and configurations
├── services/               # Python backend services
├── public/                 # Static assets
└── tests/                  # Test files
```

## Development

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npx prettier --write .
```

## Deployment

The application is designed to be deployed on Vercel with Python services running separately.

## License

Private project - All rights reserved.
