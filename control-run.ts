// Identical logic to repro.test.ts, executed with plain `bun control-run.ts`
// instead of `bun test`. Passes.
import '@noble/ciphers/aes.js';

const first = await Bun.build({ entrypoints: ['./entry.ts'], target: 'bun', outdir: './out/one', throw: false });
const second = await Bun.build({ entrypoints: ['./entry.ts'], target: 'bun', outdir: './out/two', throw: false });
for (const log of second.logs) console.error(String(log));
console.log(`first: ${first.success}, second: ${second.success}`);
process.exit(first.success && second.success ? 0 : 1);
