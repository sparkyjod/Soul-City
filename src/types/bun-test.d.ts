/**
 * Minimal ambient typings for bun's built-in test runner.
 *
 * The project deliberately has no test-framework dependency (Stage 2 uses
 * `bun test`), and `tsc --noEmit` would otherwise fail to resolve 'bun:test'.
 * This shim covers only the API surface our tests use. If richer typings are
 * ever wanted, run `bun add -d @types/bun` locally and delete this file.
 */
declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void): void;

  interface Assertion {
    readonly not: Assertion;
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeDefined(): void;
    toBeNull(): void;
    toContain(item: unknown): void;
    toBeGreaterThan(n: number): void;
    toBeGreaterThanOrEqual(n: number): void;
    toBeLessThan(n: number): void;
    toBeLessThanOrEqual(n: number): void;
    toBeCloseTo(n: number, precision?: number): void;
  }

  export function expect(actual: unknown, message?: string): Assertion;
}
