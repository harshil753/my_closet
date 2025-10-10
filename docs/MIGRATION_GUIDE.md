# Migration Guide: Deprecated Dependencies

This document outlines the changes made to replace deprecated dependencies with modern alternatives.

## Changes Made

### 1. Supabase Auth Helpers → Supabase SSR

**Before:**
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
```

**After:**
```typescript
import { createBrowserClient } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
```

**Impact:**
- Updated `lib/config/supabase.ts` to use new SSR package
- Updated Jest mocks in `jest.setup.js`
- All authentication flows now use the modern SSR approach

### 2. Deprecated Node.js Packages

**Removed:**
- `inflight` → Replaced with `lru-cache` for caching
- `glob@7` → Updated to `glob@11` for modern glob patterns
- `abab` → Using native `atob()`/`btoa()` functions
- `domexception` → Using native `DOMException`

**Added:**
- `lru-cache@10.2.0` for efficient caching
- `glob@11.0.0` for modern glob pattern matching
- Native browser API helpers in `lib/utils/native-helpers.ts`

### 3. Package.json Updates

**Dependencies:**
```json
{
  "@supabase/ssr": "^0.5.1",
  "lru-cache": "^10.2.0"
}
```

**DevDependencies:**
```json
{
  "glob": "^11.0.0"
}
```

**Removed:**
- `@supabase/auth-helpers-nextjs`
- `@supabase/auth-helpers-react`
- `@supabase/auth-helpers-shared`

## Migration Steps

### 1. Install New Dependencies

```bash
npm install @supabase/ssr lru-cache
npm install --save-dev glob@11
```

### 2. Update Imports

Replace all imports of deprecated auth helpers:

```typescript
// OLD
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

// NEW
import { createBrowserClient } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
```

### 3. Update Client Creation

**Client Component:**
```typescript
// OLD
const supabase = createClientComponentClient();

// NEW
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Server Component:**
```typescript
// OLD
const supabase = createServerComponentClient({ cookies });

// NEW
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return cookies().get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookies().set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookies().set({ name, value: '', ...options });
      },
    },
  }
);
```

### 4. Update Native APIs

Use the new native helpers:

```typescript
import { base64, createDOMException, LRUCache } from '@/lib/utils/native-helpers';

// Base64 encoding/decoding
const encoded = base64.encode('hello world');
const decoded = base64.decode(encoded);

// DOMException
const error = createDOMException('Something went wrong', 'CustomError');

// LRU Cache
const cache = new LRUCache<string, any>(100);
cache.set('key', 'value');
const value = cache.get('key');
```

## Benefits

1. **Future-proof**: Using actively maintained packages
2. **Performance**: Native APIs are faster than polyfills
3. **Security**: Reduced dependency surface area
4. **Bundle size**: Smaller bundle with native alternatives
5. **Compatibility**: Better support for modern browsers

## Testing

After migration, run the test suite to ensure everything works:

```bash
npm run test
npm run test:e2e
npm run type-check
```

## Rollback Plan

If issues arise, you can temporarily rollback by:

1. Reverting package.json changes
2. Restoring old import statements
3. Running `npm install` to restore previous dependencies

However, this is not recommended as the deprecated packages will eventually stop working.
