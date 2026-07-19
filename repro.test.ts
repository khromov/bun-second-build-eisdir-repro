// FAILS on Bun 1.3.14: the second Bun.build() in this process errors with
//   BuildMessage: Unexpected reading file: ".../node_modules/.bun/@noble+ciphers@2.2.0/node_modules/@noble/ciphers/aes.js"
// (the errno wording varies — "EISDIR reading file" / "Unseekable" in larger
// projects — but it is always a read failure on a real, readable file).
//
// All three conditions are required; removing any one makes it pass:
//   1. `bun test` runtime (control-run.ts runs the same code under plain `bun` — passes)
//   2. the dep is imported by the test process before building (control-no-preload.test.ts — passes)
//   3. the isolated install linker / symlinked node_modules/.bun store
//      (reinstall with `--linker hoisted` — passes)
import '@noble/ciphers/aes.js';
import { test, expect } from 'bun:test';

test('second Bun.build inside bun test', async () => {
  const first = await Bun.build({ entrypoints: ['./entry.ts'], target: 'bun', outdir: './out/one', throw: false });
  expect(first.success).toBe(true);

  const second = await Bun.build({ entrypoints: ['./entry.ts'], target: 'bun', outdir: './out/two', throw: false });
  for (const log of second.logs) console.error(String(log));
  expect(second.success).toBe(true); // <-- fails
});
