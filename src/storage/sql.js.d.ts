/**
 * Type declarations for sql.js
 *
 * sql.js is a WebAssembly-based SQLite implementation.
 * These are minimal type definitions for our usage.
 */

declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  export interface Database {
    run(sql: string, params?: unknown[]): void;
    prepare(sql: string): Statement;
    close(): void;
    export(): Uint8Array;
  }

  export interface Statement {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
    reset(): void;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}

