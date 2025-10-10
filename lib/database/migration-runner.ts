/**
 * Database migration runner
 * Handles database schema migrations and updates
 */

import { supabaseAdmin } from '@/lib/config/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  migrationName: string;
  error?: string;
  executionTime?: number;
}

/**
 * Migration runner class
 */
export class MigrationRunner {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = join(process.cwd(), 'lib', 'database', 'migrations');
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];

    try {
      // Get list of migration files
      const migrations = ['001_initial_schema.sql'];

      for (const migration of migrations) {
        const result = await this.runMigration(migration);
        results.push(result);

        if (!result.success) {
          console.error(`Migration ${migration} failed:`, result.error);
          break; // Stop on first failure
        }
      }

      return results;
    } catch (error) {
      console.error('Migration runner error:', error);
      return [
        {
          success: false,
          migrationName: 'migration_runner',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ];
    }
  }

  /**
   * Run a specific migration
   */
  async runMigration(migrationName: string): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      // Read migration file
      const migrationPath = join(this.migrationsPath, migrationName);
      const migrationSQL = readFileSync(migrationPath, 'utf8');

      // Execute migration
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: migrationSQL,
      });

      if (error) {
        return {
          success: false,
          migrationName,
          error: error.message,
          executionTime: Date.now() - startTime,
        };
      }

      return {
        success: true,
        migrationName,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        migrationName,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if migrations table exists
   */
  async checkMigrationsTable(): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('migrations')
        .select('*')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Create migrations table
   */
  async createMigrationsTable(): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
      });

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('migrations')
        .select('name')
        .order('executed_at');

      if (error) {
        return [];
      }

      return (data as any[]).map((row: any) => row.name);
    } catch {
      return [];
    }
  }

  /**
   * Mark migration as executed
   */
  async markMigrationExecuted(migrationName: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('migrations')
        .insert({ name: migrationName });

      return !error;
    } catch {
      return false;
    }
  }
}

/**
 * Run database setup
 */
export async function setupDatabase(): Promise<MigrationResult[]> {
  const runner = new MigrationRunner();

  console.log('🚀 Starting database setup...');

  // Check if migrations table exists
  const hasMigrationsTable = await runner.checkMigrationsTable();
  if (!hasMigrationsTable) {
    console.log('📋 Creating migrations table...');
    await runner.createMigrationsTable();
  }

  // Get executed migrations
  const executedMigrations = await runner.getExecutedMigrations();
  console.log('✅ Executed migrations:', executedMigrations);

  // Run migrations
  const results = await runner.runMigrations();

  // Log results
  for (const result of results) {
    if (result.success) {
      console.log(
        `✅ Migration ${result.migrationName} completed in ${result.executionTime}ms`
      );
    } else {
      console.error(
        `❌ Migration ${result.migrationName} failed:`,
        result.error
      );
    }
  }

  return results;
}

// Create global instance
export const migrationRunner = new MigrationRunner();
