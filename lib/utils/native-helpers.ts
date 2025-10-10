/**
 * Native browser API helpers
 * Replaces deprecated packages with native browser APIs
 */

/**
 * Native base64 encoding/decoding
 * Replaces deprecated 'abab' package
 */
export const base64 = {
  /**
   * Encode string to base64
   */
  encode: (str: string): string => {
    if (typeof window !== 'undefined' && window.btoa) {
      return window.btoa(str);
    }
    // Fallback for Node.js
    return Buffer.from(str, 'utf8').toString('base64');
  },

  /**
   * Decode base64 to string
   */
  decode: (str: string): string => {
    if (typeof window !== 'undefined' && window.atob) {
      return window.atob(str);
    }
    // Fallback for Node.js
    return Buffer.from(str, 'base64').toString('utf8');
  },
};

/**
 * Native DOMException
 * Replaces deprecated 'domexception' package
 */
export const createDOMException = (message: string, name: string = 'Error'): DOMException => {
  if (typeof window !== 'undefined' && window.DOMException) {
    return new DOMException(message, name);
  }
  // Fallback for Node.js
  const error = new Error(message) as any;
  error.name = name;
  error.code = name;
  return error;
};

/**
 * LRU Cache implementation
 * Replaces deprecated 'inflight' package
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey!);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Modern glob pattern matching
 * Replaces deprecated glob@7 with native alternatives where possible
 */
export const glob = {
  /**
   * Simple glob pattern matching for basic use cases
   * For complex patterns, use the glob package
   */
  match: (pattern: string, str: string): boolean => {
    const regex = new RegExp(
      pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\./g, '\\.')
    );
    return regex.test(str);
  },

  /**
   * Check if pattern is simple enough for native matching
   */
  isSimplePattern: (pattern: string): boolean => {
    // Simple patterns: no complex syntax, just * and ? wildcards
    return !pattern.includes('{') && !pattern.includes('[') && !pattern.includes('!');
  },
};
