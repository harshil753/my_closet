/**
 * Clothing Item Types and Models
 * TypeScript definitions for clothing items and related entities
 */

/**
 * Clothing category enumeration
 */
export type ClothingCategory =
  | 'shirts_tops'
  | 'pants_bottoms'
  | 'shoes'
  | 'dresses'
  | 'jackets'
  | 'accessories'
  | 'underwear'
  | 'sportswear';

/**
 * Clothing size enumeration
 */
export type ClothingSize =
  | 'XS'
  | 'S'
  | 'M'
  | 'L'
  | 'XL'
  | 'XXL'
  | 'XXXL'
  | '28'
  | '30'
  | '32'
  | '34'
  | '36'
  | '38'
  | '40'
  | '42'
  | '44'
  | '46'
  | '48'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'
  | '15'
  | 'one-size';

/**
 * Clothing color enumeration
 */
export type ClothingColor =
  | 'black'
  | 'white'
  | 'gray'
  | 'brown'
  | 'beige'
  | 'navy'
  | 'blue'
  | 'red'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'burgundy'
  | 'maroon'
  | 'olive'
  | 'teal'
  | 'turquoise'
  | 'coral'
  | 'salmon'
  | 'cream'
  | 'ivory'
  | 'tan'
  | 'khaki'
  | 'charcoal'
  | 'silver'
  | 'gold'
  | 'multicolor'
  | 'patterned'
  | 'striped'
  | 'polka-dot'
  | 'floral'
  | 'animal-print'
  | 'plaid'
  | 'checkered'
  | 'solid';

/**
 * Clothing brand enumeration
 */
export type ClothingBrand =
  | 'nike'
  | 'adidas'
  | 'puma'
  | 'under-armour'
  | 'lululemon'
  | 'zara'
  | 'h&m'
  | 'uniqlo'
  | 'gap'
  | 'old-navy'
  | 'levis'
  | 'wrangler'
  | 'calvin-klein'
  | 'tommy-hilfiger'
  | 'ralph-lauren'
  | 'polo'
  | 'lacoste'
  | 'champion'
  | 'vans'
  | 'converse'
  | 'new-balance'
  | 'reebok'
  | 'gucci'
  | 'prada'
  | 'versace'
  | 'armani'
  | 'dior'
  | 'chanel'
  | 'louis-vuitton'
  | 'hermes'
  | 'burberry'
  | 'other'
  | 'unknown';

/**
 * Clothing condition enumeration
 */
export type ClothingCondition = 'new' | 'like-new' | 'good' | 'fair' | 'poor';

/**
 * Clothing season enumeration
 */
export type ClothingSeason =
  | 'spring'
  | 'summer'
  | 'fall'
  | 'winter'
  | 'all-season';

/**
 * Clothing material enumeration
 */
export type ClothingMaterial =
  | 'cotton'
  | 'polyester'
  | 'wool'
  | 'silk'
  | 'linen'
  | 'denim'
  | 'leather'
  | 'suede'
  | 'cashmere'
  | 'spandex'
  | 'lycra'
  | 'nylon'
  | 'rayon'
  | 'viscose'
  | 'modal'
  | 'bamboo'
  | 'hemp'
  | 'jute'
  | 'acrylic'
  | 'polyamide'
  | 'elastane'
  | 'blend'
  | 'other';

/**
 * Clothing item metadata interface
 */
export interface ClothingMetadata {
  // Basic information
  brand?: ClothingBrand;
  size?: ClothingSize;
  color?: ClothingColor;
  material?: ClothingMaterial[];
  condition?: ClothingCondition;
  season?: ClothingSeason[];

  // Purchase information
  purchaseDate?: string;
  purchasePrice?: number;
  purchaseLocation?: string;

  // Physical attributes
  weight?: number; // in grams
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };

  // Care instructions
  careInstructions?: {
    washing?: string[];
    drying?: string[];
    ironing?: string[];
    dryCleaning?: boolean;
  };

  // Tags and notes
  tags?: string[];
  notes?: string;

  // AI detection results
  aiDetected?: {
    category?: ClothingCategory;
    confidence?: number;
    colors?: ClothingColor[];
    brand?: ClothingBrand;
    style?: string[];
  };

  // Custom fields
  customFields?: Record<string, any>;
}

/**
 * Clothing item interface
 */
export interface ClothingItem {
  // Core fields
  id: string;
  user_id: string;
  category: ClothingCategory;
  name: string;
  image_url: string;
  thumbnail_url: string;
  uploaded_at: string;
  is_active: boolean;
  metadata: ClothingMetadata;

  // Optional fields
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

/**
 * Clothing item creation input
 */
export interface CreateClothingItemInput {
  category: ClothingCategory;
  name: string;
  image_url: string;
  thumbnail_url: string;
  metadata?: Partial<ClothingMetadata>;
}

/**
 * Clothing item update input
 */
export interface UpdateClothingItemInput {
  name?: string;
  category?: ClothingCategory;
  metadata?: Partial<ClothingMetadata>;
  is_active?: boolean;
}

/**
 * Clothing item query parameters
 */
export interface ClothingItemQuery {
  category?: ClothingCategory;
  brand?: ClothingBrand;
  color?: ClothingColor;
  size?: ClothingSize;
  condition?: ClothingCondition;
  season?: ClothingSeason;
  material?: ClothingMaterial;
  tags?: string[];
  search?: string;
  is_active?: boolean;
  sort_by?: 'name' | 'uploaded_at' | 'category' | 'brand';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Clothing item response
 */
export interface ClothingItemResponse {
  items: ClothingItem[];
  total: number;
  has_more: boolean;
  next_offset?: number;
}

/**
 * Clothing item statistics
 */
export interface ClothingItemStats {
  total_items: number;
  items_by_category: Record<ClothingCategory, number>;
  items_by_brand: Record<ClothingBrand, number>;
  items_by_color: Record<ClothingColor, number>;
  items_by_condition: Record<ClothingCondition, number>;
  total_value: number;
  average_price: number;
  most_used_category: ClothingCategory;
  least_used_category: ClothingCategory;
}

/**
 * Clothing item validation result
 */
export interface ClothingItemValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Clothing item search result
 */
export interface ClothingItemSearchResult {
  item: ClothingItem;
  relevance_score: number;
  matched_fields: string[];
  highlights: Record<string, string[]>;
}

/**
 * Clothing item bulk operation result
 */
export interface ClothingItemBulkResult {
  successful: number;
  failed: number;
  errors: Array<{
    item_id: string;
    error: string;
  }>;
}

/**
 * Clothing item export format
 */
export interface ClothingItemExport {
  format: 'json' | 'csv' | 'xlsx';
  items: ClothingItem[];
  metadata: {
    export_date: string;
    total_items: number;
    user_id: string;
  };
}

/**
 * Clothing item import format
 */
export interface ClothingItemImport {
  format: 'json' | 'csv' | 'xlsx';
  items: CreateClothingItemInput[];
  validation_results: ClothingItemValidation[];
}

/**
 * Clothing item comparison
 */
export interface ClothingItemComparison {
  item1: ClothingItem;
  item2: ClothingItem;
  similarities: {
    category_match: boolean;
    color_match: boolean;
    brand_match: boolean;
    size_match: boolean;
    style_similarity: number;
  };
  differences: {
    category_different: boolean;
    color_different: boolean;
    brand_different: boolean;
    size_different: boolean;
    style_differences: string[];
  };
}

/**
 * Clothing item recommendation
 */
export interface ClothingItemRecommendation {
  item: ClothingItem;
  reason: string;
  confidence: number;
  based_on: string[];
}

/**
 * Clothing item outfit suggestion
 */
export interface ClothingItemOutfitSuggestion {
  items: ClothingItem[];
  occasion: string;
  season: ClothingSeason;
  style: string;
  confidence: number;
  reasoning: string;
}

/**
 * Type guards for clothing items
 */
export function isClothingCategory(value: string): value is ClothingCategory {
  return [
    'shirts_tops',
    'pants_bottoms',
    'shoes',
    'dresses',
    'jackets',
    'accessories',
    'underwear',
    'sportswear',
  ].includes(value);
}

export function isClothingSize(value: string): value is ClothingSize {
  return [
    'XS',
    'S',
    'M',
    'L',
    'XL',
    'XXL',
    'XXXL',
    '28',
    '30',
    '32',
    '34',
    '36',
    '38',
    '40',
    '42',
    '44',
    '46',
    '48',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    'one-size',
  ].includes(value);
}

export function isClothingColor(value: string): value is ClothingColor {
  return [
    'black',
    'white',
    'gray',
    'brown',
    'beige',
    'navy',
    'blue',
    'red',
    'green',
    'yellow',
    'orange',
    'purple',
    'pink',
    'burgundy',
    'maroon',
    'olive',
    'teal',
    'turquoise',
    'coral',
    'salmon',
    'cream',
    'ivory',
    'tan',
    'khaki',
    'charcoal',
    'silver',
    'gold',
    'multicolor',
    'patterned',
    'striped',
    'polka-dot',
    'floral',
    'animal-print',
    'plaid',
    'checkered',
    'solid',
  ].includes(value);
}

export function isClothingBrand(value: string): value is ClothingBrand {
  return [
    'nike',
    'adidas',
    'puma',
    'under-armour',
    'lululemon',
    'zara',
    'h&m',
    'uniqlo',
    'gap',
    'old-navy',
    'levis',
    'wrangler',
    'calvin-klein',
    'tommy-hilfiger',
    'ralph-lauren',
    'polo',
    'lacoste',
    'champion',
    'vans',
    'converse',
    'new-balance',
    'reebok',
    'gucci',
    'prada',
    'versace',
    'armani',
    'dior',
    'chanel',
    'louis-vuitton',
    'hermes',
    'burberry',
    'other',
    'unknown',
  ].includes(value);
}

/**
 * Utility functions for clothing items
 */
export const ClothingUtils = {
  /**
   * Get category display name
   */
  getCategoryDisplayName(category: ClothingCategory): string {
    const displayNames: Record<ClothingCategory, string> = {
      shirts_tops: 'Shirts & Tops',
      pants_bottoms: 'Pants & Bottoms',
      shoes: 'Shoes',
      dresses: 'Dresses',
      jackets: 'Jackets',
      accessories: 'Accessories',
      underwear: 'Underwear',
      sportswear: 'Sportswear',
    };
    return displayNames[category] || category;
  },

  /**
   * Get color display name
   */
  getColorDisplayName(color: ClothingColor): string {
    return color.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  },

  /**
   * Get brand display name
   */
  getBrandDisplayName(brand: ClothingBrand): string {
    const displayNames: Record<ClothingBrand, string> = {
      nike: 'Nike',
      adidas: 'Adidas',
      puma: 'Puma',
      'under-armour': 'Under Armour',
      lululemon: 'Lululemon',
      zara: 'Zara',
      'h&m': 'H&M',
      uniqlo: 'Uniqlo',
      gap: 'Gap',
      'old-navy': 'Old Navy',
      levis: "Levi's",
      wrangler: 'Wrangler',
      'calvin-klein': 'Calvin Klein',
      'tommy-hilfiger': 'Tommy Hilfiger',
      'ralph-lauren': 'Ralph Lauren',
      polo: 'Polo',
      lacoste: 'Lacoste',
      champion: 'Champion',
      vans: 'Vans',
      converse: 'Converse',
      'new-balance': 'New Balance',
      reebok: 'Reebok',
      gucci: 'Gucci',
      prada: 'Prada',
      versace: 'Versace',
      armani: 'Armani',
      dior: 'Dior',
      chanel: 'Chanel',
      'louis-vuitton': 'Louis Vuitton',
      hermes: 'Hermès',
      burberry: 'Burberry',
      other: 'Other',
      unknown: 'Unknown',
    };
    return displayNames[brand] || brand.toUpperCase();
  },

  /**
   * Validate clothing item
   */
  validateClothingItem(item: Partial<ClothingItem>): ClothingItemValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields validation
    if (!item.name || item.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (item.name.length > 100) {
      errors.push('Name must be 100 characters or less');
    }

    if (!item.category) {
      errors.push('Category is required');
    } else if (!isClothingCategory(item.category)) {
      errors.push('Invalid category');
    }

    if (!item.image_url) {
      errors.push('Image URL is required');
    }

    if (!item.thumbnail_url) {
      errors.push('Thumbnail URL is required');
    }

    // Metadata validation
    if (item.metadata) {
      if (item.metadata.brand && !isClothingBrand(item.metadata.brand)) {
        warnings.push('Invalid brand specified');
      }

      if (item.metadata.color && !isClothingColor(item.metadata.color)) {
        warnings.push('Invalid color specified');
      }

      if (item.metadata.size && !isClothingSize(item.metadata.size)) {
        warnings.push('Invalid size specified');
      }

      if (item.metadata.purchasePrice && item.metadata.purchasePrice < 0) {
        warnings.push('Purchase price should be positive');
      }
    }

    // Suggestions
    if (!item.metadata?.brand) {
      suggestions.push('Consider adding brand information');
    }

    if (!item.metadata?.color) {
      suggestions.push('Consider adding color information');
    }

    if (!item.metadata?.size) {
      suggestions.push('Consider adding size information');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  },

  /**
   * Generate search keywords
   */
  generateSearchKeywords(item: ClothingItem): string[] {
    const keywords: string[] = [];

    keywords.push(item.name.toLowerCase());
    keywords.push(item.category);

    if (item.metadata.brand) {
      keywords.push(item.metadata.brand);
    }

    if (item.metadata.color) {
      keywords.push(item.metadata.color);
    }

    if (item.metadata.tags) {
      keywords.push(...item.metadata.tags.map((tag) => tag.toLowerCase()));
    }

    return [...new Set(keywords)]; // Remove duplicates
  },
};
