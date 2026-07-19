// Identical to repro.test.ts EXCEPT the dep is never imported by the test
// process itself — only bundled. Passes.
import { test, expect } from 'bun:test';

test('second Bun.build without runtime preload', async () => {
  const first = await Bun.build({ entrypoints: ['./entry.ts'], target: 'bun', outdir: './out/one', throw: false });
  const second = await Bun.build({ entrypoints: ['./entry.ts'], target: 'bun', outdir: './out/two', throw: false });
  expect(first.success).toBe(true);
  expect(second.success).toBe(true);
});
