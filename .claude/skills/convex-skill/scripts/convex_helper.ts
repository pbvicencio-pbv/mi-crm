#!/usr/bin/env npx tsx
/**
 * Convex Helper Script — Reusable utilities for common Convex patterns.
 *
 * Usage as module:
 *   Copy the functions you need into your convex/ directory.
 *   These are reference implementations, not an installable package.
 *
 * Usage as CLI:
 *   npx tsx convex_helper.ts --action validate-env --keys OPENAI_API_KEY,STRIPE_SECRET_KEY
 *   npx tsx convex_helper.ts --action generate-seed --count 10 --template user
 *   npx tsx convex_helper.ts --action generate-migration --table posts --columns 'id:uuid,title:text,user_id:uuid'
 */

// ============================================================================
// §1 Paginated Query Wrapper
// ============================================================================

import type { PaginationResult, PaginationOptions } from "convex/server";

/**
 * Collects ALL pages from a paginated query into a single array.
 * Useful for server-side actions or scripts that need the full dataset.
 *
 * @example
 * ```typescript
 * // In an action:
 * const allUsers = await paginatedQuery(ctx, internal.users.listPaginated, {}, 100);
 * ```
 */
export async function paginatedQuery<T>(
  ctx: { runQuery: (ref: any, args: any) => Promise<PaginationResult<T>> },
  queryRef: any,
  args: Record<string, unknown>,
  numItems: number = 100,
): Promise<T[]> {
  const results: T[] = [];
  let cursor: string | null = null;
  let isDone = false;

  while (!isDone) {
    const page: PaginationResult<T> = await ctx.runQuery(queryRef, {
      ...args,
      paginationOpts: { numItems, cursor } as PaginationOptions,
    });
    results.push(...page.page);
    cursor = page.continueCursor;
    isDone = page.isDone;
  }

  return results;
}

// ============================================================================
// §2 Retry with Exponential Backoff
// ============================================================================

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Wraps an async operation with exponential backoff retry logic.
 * Intended for use in Convex actions calling external APIs.
 *
 * @example
 * ```typescript
 * const response = await withRetry(() =>
 *   fetch("https://api.example.com/data"),
 *   { maxRetries: 3, baseDelayMs: 500 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 500, maxDelayMs = 10_000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }

  throw lastError;
}

// ============================================================================
// §3 Batch Mutation Helper
// ============================================================================

/**
 * Splits a large array of items into chunks and runs a mutation for each chunk.
 * Respects Convex's ~8KB argument size limit by batching items.
 *
 * @example
 * ```typescript
 * // In an action:
 * await batchMutation(ctx, internal.users.insertBatch, users, 50);
 * ```
 */
export async function batchMutation<T>(
  ctx: { runMutation: (ref: any, args: any) => Promise<void> },
  mutationRef: any,
  items: T[],
  chunkSize: number = 50,
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await ctx.runMutation(mutationRef, { items: chunk });
  }
}

// ============================================================================
// §4 Environment Variable Validation
// ============================================================================

/**
 * Validates that all required environment variables are set.
 * Call at the top of actions that depend on external API keys.
 *
 * @example
 * ```typescript
 * validateEnv("OPENAI_API_KEY", "STRIPE_SECRET_KEY");
 * ```
 */
export function validateEnv(...keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of keys) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else {
      result[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Set them with: npx convex env set ${missing[0]} <value>`,
    );
  }

  return result;
}

// ============================================================================
// §5 Test Data Seeder
// ============================================================================

/**
 * Generates typed seed data for convex-test. Returns an array of objects
 * matching the provided factory function.
 *
 * @example
 * ```typescript
 * const testUsers = seedTestData(10, (i) => ({
 *   name: `User ${i}`,
 *   email: `user${i}@test.com`,
 *   role: i % 2 === 0 ? "admin" : "member" as const,
 * }));
 *
 * // In convex-test:
 * for (const user of testUsers) {
 *   await t.run(async (ctx) => { await ctx.db.insert("users", user); });
 * }
 * ```
 */
export function seedTestData<T>(
  count: number,
  factory: (index: number) => T,
): T[] {
  return Array.from({ length: count }, (_, i) => factory(i));
}

// ============================================================================
// §6 Circuit Breaker Pattern
// ============================================================================

/** Estados del circuit breaker. */
enum CircuitBreakerState {
  CLOSED = 'closed',       // Normal: calls pass through
  OPEN = 'open',           // Failing: calls rejected
  HALF_OPEN = 'half_open', // Testing recovery
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMax: number;
}

interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  halfOpenCalls: number;
  lastFailureTime: number;
  timeUntilRecoveryMs: number;
}

/** Thrown when the circuit breaker is open and rejecting calls. */
class CircuitBreakerOpenError extends Error {
  public readonly state: CircuitBreakerState;
  public readonly failureCount: number;
  public readonly timeUntilRecoveryMs: number;

  constructor(message: string, state: CircuitBreakerState, failureCount: number, timeUntilRecoveryMs: number) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.state = state;
    this.failureCount = failureCount;
    this.timeUntilRecoveryMs = timeUntilRecoveryMs;
  }
}

/**
 * Circuit Breaker implementation to protect against cascading failures.
 *
 * Flow: CLOSED -> (failures >= threshold) -> OPEN -> (timeout) -> HALF_OPEN -> (success) -> CLOSED
 *                                                                             -> (failure) -> OPEN
 *
 * @example
 * ```typescript
 * const cb = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 30000, halfOpenMax: 3 });
 * const result = await cb.execute(() => externalApiCall());
 * ```
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private halfOpenCalls = 0;
  private lastFailureTime = 0;
  private lastStateChange: number = Date.now();

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMax: number;

  constructor(options: CircuitBreakerOptions = { failureThreshold: 5, resetTimeoutMs: 30000, halfOpenMax: 3 }) {
    this.failureThreshold = options.failureThreshold;
    this.resetTimeoutMs = options.resetTimeoutMs;
    this.halfOpenMax = options.halfOpenMax;
  }

  /** Execute a function through the circuit breaker. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getCurrentState();

    if (currentState === CircuitBreakerState.OPEN) {
      const remaining = this.timeUntilRecovery();
      throw new CircuitBreakerOpenError(
        `Circuit breaker OPEN. ${this.failureCount} consecutive failures. ` +
        `Retry in ${Math.ceil(remaining / 1000)}s`,
        currentState,
        this.failureCount,
        remaining,
      );
    }

    if (currentState === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.halfOpenMax) {
        this.transitionToOpen();
        throw new CircuitBreakerOpenError(
          `Circuit breaker re-opened: half-open call limit reached`,
          CircuitBreakerState.OPEN,
          this.failureCount,
          this.resetTimeoutMs,
        );
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successCount >= this.halfOpenMax) {
        this.transitionToClosed();
      }
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.transitionToOpen();
    }
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToOpen();
    }
  }

  private getCurrentState(): CircuitBreakerState {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenCalls = 0;
        this.successCount = 0;
        this.lastStateChange = Date.now();
      }
    }
    return this.state;
  }

  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.lastStateChange = Date.now();
  }

  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    this.lastStateChange = Date.now();
  }

  private timeUntilRecovery(): number {
    if (this.state !== CircuitBreakerState.OPEN) return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.resetTimeoutMs - elapsed);
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.getCurrentState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      halfOpenCalls: this.halfOpenCalls,
      lastFailureTime: this.lastFailureTime,
      timeUntilRecoveryMs: this.timeUntilRecovery(),
    };
  }
}


// ============================================================================
// §7 CLI Interface
// ============================================================================

/** Minimal argument parser — no external dependencies. */
function parseArgs(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];
      if (nextArg !== undefined && !nextArg.startsWith('--')) {
        parsed[key] = nextArg;
        i++;
      } else {
        parsed[key] = 'true';
      }
    }
  }
  return parsed;
}

function printResult(data: unknown, format: 'json' | 'table' = 'json'): void {
  if (format === 'table' && typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      console.table(data);
    } else {
      const flat: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        flat[k] = typeof v === 'object' ? JSON.stringify(v) : v;
      }
      console.table(flat);
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function printHelp(): void {
  const help = `
convex_helper.ts -- Convex utilities with circuit breaker and retry logic.

Usage:
  npx tsx convex_helper.ts --action <action> [options]

Actions:
  validate-env        Validate environment variables
                      --keys <comma-separated keys>

  generate-seed       Generate seed data JSON
                      --count <int> --template <user|post|task>

  diagnostics         Show circuit breaker stats

Global Options:
  --format <json|table>  Output format (default: json)
`.trim();
  console.log(help);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.action) {
    printHelp();
    process.exit(0);
  }

  const format = (args.format as 'json' | 'table') || 'json';

  try {
    let result: unknown;

    switch (args.action) {
      case 'validate-env': {
        const keys = (args.keys || '').split(',').filter(Boolean);
        if (keys.length === 0) {
          process.stderr.write('Error: --keys required (comma-separated)\n');
          process.exit(1);
        }
        result = validateEnv(...keys);
        break;
      }

      case 'generate-seed': {
        const count = parseInt(args.count || '10', 10);
        const template = args.template || 'user';
        const factories: Record<string, (i: number) => Record<string, unknown>> = {
          user: (i) => ({ name: `User ${i}`, email: `user${i}@test.com`, role: i % 2 === 0 ? 'admin' : 'member' }),
          post: (i) => ({ title: `Post ${i}`, body: `Content for post ${i}`, published: i % 3 !== 0 }),
          task: (i) => ({ title: `Task ${i}`, done: false, priority: ['low', 'medium', 'high'][i % 3] }),
        };
        const factory = factories[template];
        if (!factory) {
          process.stderr.write(`Error: Unknown template '${template}'. Available: ${Object.keys(factories).join(', ')}\n`);
          process.exit(1);
        }
        result = seedTestData(count, factory);
        break;
      }

      case 'diagnostics': {
        const cb = new CircuitBreaker();
        result = { circuitBreaker: cb.getStats() };
        break;
      }

      default:
        process.stderr.write(`Unknown action: ${args.action}\n`);
        process.stderr.write(`Run without --action to see help.\n`);
        process.exit(1);
    }

    printResult(result, format);
  } catch (err) {
    if (err instanceof CircuitBreakerOpenError) {
      process.stderr.write(JSON.stringify({
        error: true,
        type: 'CircuitBreakerOpen',
        message: err.message,
        state: err.state,
        failureCount: err.failureCount,
        timeUntilRecoveryMs: err.timeUntilRecoveryMs,
      }, null, 2) + '\n');
    } else {
      process.stderr.write(String(err) + '\n');
    }
    process.exit(1);
  }
}


// ============================================================================
// Exports
// ============================================================================

export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitBreakerState,
};

export type { CircuitBreakerOptions, CircuitBreakerStats };

// Run CLI if invoked directly
if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('convex_helper.ts') || process.argv[1].endsWith('convex_helper'))
) {
  main().catch((err) => {
    process.stderr.write(`Fatal: ${err}\n`);
    process.exit(1);
  });
}
