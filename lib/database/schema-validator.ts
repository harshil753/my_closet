/**
 * Database schema validator
 * Validates database schema integrity and constraints
 */

import { supabaseAdmin } from '@/lib/config/supabase';

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  success: boolean;
  table: string;
  checks: {
    tableExists: boolean;
    columnsExist: boolean;
    indexesExist: boolean;
    policiesExist: boolean;
    functionsExist: boolean;
  };
  errors: string[];
}

/**
 * Schema validator class
 */
export class SchemaValidator {
  /**
   * Validate complete database schema
   */
  async validateSchema(): Promise<SchemaValidationResult[]> {
    const results: SchemaValidationResult[] = [];

    const tables = [
      'users',
      'user_base_photos',
      'clothing_items',
      'try_on_sessions',
      'try_on_session_items',
    ];

    for (const table of tables) {
      const result = await this.validateTable(table);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a specific table
   */
  async validateTable(tableName: string): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      success: true,
      table: tableName,
      checks: {
        tableExists: false,
        columnsExist: false,
        indexesExist: false,
        policiesExist: false,
        functionsExist: false,
      },
      errors: [],
    };

    try {
      // Check if table exists
      const tableExists = await this.checkTableExists(tableName);
      result.checks.tableExists = tableExists;

      if (!tableExists) {
        result.errors.push(`Table ${tableName} does not exist`);
        result.success = false;
        return result;
      }

      // Check columns
      const columnsValid = await this.checkTableColumns(tableName);
      result.checks.columnsExist = columnsValid;
      if (!columnsValid) {
        result.errors.push(
          `Table ${tableName} has missing or incorrect columns`
        );
        result.success = false;
      }

      // Check indexes
      const indexesValid = await this.checkTableIndexes(tableName);
      result.checks.indexesExist = indexesValid;
      if (!indexesValid) {
        result.errors.push(`Table ${tableName} has missing indexes`);
        result.success = false;
      }

      // Check RLS policies
      const policiesValid = await this.checkTablePolicies(tableName);
      result.checks.policiesExist = policiesValid;
      if (!policiesValid) {
        result.errors.push(`Table ${tableName} has missing RLS policies`);
        result.success = false;
      }

      // Check functions (only for users table)
      if (tableName === 'users') {
        const functionsValid = await this.checkDatabaseFunctions();
        result.checks.functionsExist = functionsValid;
        if (!functionsValid) {
          result.errors.push('Database functions are missing');
          result.success = false;
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return result;
  }

  /**
   * Check if table exists
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Check table columns
   */
  private async checkTableColumns(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (error || !data) {
        return false;
      }

      const columnNames = (data as any[]).map((row: any) => row.column_name);

      // Define expected columns for each table
      const expectedColumns: Record<string, string[]> = {
        users: [
          'id',
          'email',
          'display_name',
          'created_at',
          'updated_at',
          'preferences',
          'tier',
          'tier_limits',
        ],
        user_base_photos: [
          'id',
          'user_id',
          'image_url',
          'image_type',
          'uploaded_at',
          'is_active',
          'metadata',
        ],
        clothing_items: [
          'id',
          'user_id',
          'category',
          'name',
          'image_url',
          'thumbnail_url',
          'uploaded_at',
          'is_active',
          'metadata',
        ],
        try_on_sessions: [
          'id',
          'user_id',
          'status',
          'created_at',
          'completed_at',
          'result_image_url',
          'processing_time',
          'error_message',
          'metadata',
        ],
        try_on_session_items: [
          'id',
          'session_id',
          'clothing_item_id',
          'created_at',
        ],
      };

      const expected = expectedColumns[tableName] || [];
      const missing = expected.filter((col) => !columnNames.includes(col));

      return missing.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Check table indexes
   */
  private async checkTableIndexes(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', tableName)
        .eq('schemaname', 'public');

      if (error || !data) {
        return false;
      }

      const indexNames = (data as any[]).map((row: any) => row.indexname);

      // Define expected indexes for each table
      const expectedIndexes: Record<string, string[]> = {
        users: ['idx_users_email', 'idx_users_tier', 'idx_users_created_at'],
        user_base_photos: [
          'idx_user_base_photos_user_id',
          'idx_user_base_photos_active',
          'idx_user_base_photos_type',
          'idx_user_base_photos_uploaded_at',
        ],
        clothing_items: [
          'idx_clothing_items_user_id',
          'idx_clothing_items_category',
          'idx_clothing_items_active',
          'idx_clothing_items_uploaded_at',
          'idx_clothing_items_user_category',
        ],
        try_on_sessions: [
          'idx_try_on_sessions_user_id',
          'idx_try_on_sessions_status',
          'idx_try_on_sessions_created_at',
          'idx_try_on_sessions_user_status',
        ],
        try_on_session_items: [
          'idx_try_on_session_items_session_id',
          'idx_try_on_session_items_clothing_item_id',
        ],
      };

      const expected = expectedIndexes[tableName] || [];
      const missing = expected.filter((idx) => !indexNames.includes(idx));

      return missing.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Check RLS policies
   */
  private async checkTablePolicies(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('pg_policies')
        .select('policyname')
        .eq('tablename', tableName)
        .eq('schemaname', 'public');

      if (error || !data) {
        return false;
      }

      const policyNames = (data as any[]).map((row: any) => row.policyname);

      // Define expected policies for each table
      const expectedPolicies: Record<string, string[]> = {
        users: [
          'Users can view own profile',
          'Users can update own profile',
          'Users can insert own profile',
        ],
        user_base_photos: [
          'Users can view own base photos',
          'Users can insert own base photos',
          'Users can update own base photos',
          'Users can delete own base photos',
        ],
        clothing_items: [
          'Users can view own clothing items',
          'Users can insert own clothing items',
          'Users can update own clothing items',
          'Users can delete own clothing items',
        ],
        try_on_sessions: [
          'Users can view own try-on sessions',
          'Users can insert own try-on sessions',
          'Users can update own try-on sessions',
        ],
        try_on_session_items: [
          'Users can view own session items',
          'Users can insert own session items',
        ],
      };

      const expected = expectedPolicies[tableName] || [];
      const missing = expected.filter(
        (policy) => !policyNames.includes(policy)
      );

      return missing.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Check database functions
   */
  private async checkDatabaseFunctions(): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'check_tier_limits');

      if (error || !data || data.length === 0) {
        return false;
      }

      // Check for other required functions
      const requiredFunctions = [
        'check_tier_limits',
        'update_monthly_usage',
        'get_user_stats',
        'update_user_tier_limits',
      ];

      for (const funcName of requiredFunctions) {
        const { data: funcData, error: funcError } = await supabaseAdmin
          .from('pg_proc')
          .select('proname')
          .eq('proname', funcName)
          .single();

        if (funcError || !funcData) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test database connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<Record<string, number>> {
    try {
      const stats: Record<string, number> = {};

      // Get table row counts
      const tables = [
        'users',
        'user_base_photos',
        'clothing_items',
        'try_on_sessions',
        'try_on_session_items',
      ];

      for (const table of tables) {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          stats[table] = count || 0;
        }
      }

      return stats;
    } catch {
      return {};
    }
  }
}

// Create global instance
export const schemaValidator = new SchemaValidator();
