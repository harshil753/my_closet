import '@testing-library/jest-dom';

// Polyfill fetch for Jest test environment
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
  global.Request = class Request {};
  global.Response = class Response {};
  global.Headers = class Headers {};
}

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const { src, alt, onLoad, onError, fill, ...otherProps } = props;
    // Simulate successful image load
    if (onLoad && src) {
      setTimeout(() => onLoad(), 0);
    }
    // Don't render if src is empty
    if (!src) {
      if (onError) {
        setTimeout(() => onError(new Error('Empty src')), 0);
      }
      return null;
    }
    return <img src={src} alt={alt} {...otherProps} data-testid="next-image" />;
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

// Mock Auth Context
const React = require('react');
const mockAuthContextValue = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
};

jest.mock('@/lib/auth/auth-context', () => {
  const React = require('react');
  const AuthContext = React.createContext(mockAuthContextValue);

  return {
    AuthContext,
    AuthProvider: ({ children }) => {
      return React.createElement(
        AuthContext.Provider,
        { value: mockAuthContextValue },
        children
      );
    },
    useAuth: () => mockAuthContextValue,
  };
});

// Helper to build a chainable query mock that supports awaiting and mockResolvedValue
const buildQueryable = () => {
  const query = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    // Allow directly awaiting the chain
    then: undefined,
    mockResolvedValue: undefined,
  };
  // Implement promise-like behavior used in some tests
  query.mockResolvedValue = (value) => {
    query.then = (onFulfilled) => {
      onFulfilled(value);
      return Promise.resolve(value);
    };
    return query;
  };
  return query;
};

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => buildQueryable()),
    storage: {
      from: jest.fn(() => ({
        upload: jest
          .fn()
          .mockResolvedValue({ data: { path: 'path' }, error: null }),
        download: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com' },
        })),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed' },
          error: null,
        }),
      })),
    },
  })),
}));

// Mock Supabase SSR
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => buildQueryable()),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
      })),
    },
  })),
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => buildQueryable()),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
      })),
    },
  })),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';

// Mock Google GenAI packages to avoid ESM import issues in Jest
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: {
      generateContentStream: jest.fn(async () => ({
        // Async iterable that yields no image parts so code uses fallback
        [Symbol.asyncIterator]: async function* () {},
      })),
    },
  })),
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn(async () => ({ response: { candidates: [] } })),
    })),
  })),
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
