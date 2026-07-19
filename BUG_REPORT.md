# Bug report draft — paste into Bun's 🐛 Bug Report issue form

**Suggested title:** Second `Bun.build()` inside `bun test` fails reading an already-imported dependency (isolated linker only)

## What version of Bun is running?

1.3.14+0d9b296af

## What platform is your computer?

Linux 6.8.0-117-generic aarch64 unknown
(also hit on macOS arm64 in the project this reproduction was extracted from)

## What steps can reproduce the bug?

Full reproduction with controls: https://github.com/khromov/bun-second-build-eisdir-repro — `bun install && bun run repro`.

Self-contained version:

```sh
mkdir repro && cd repro
echo '{"dependencies":{"@noble/ciphers":"2.2.0"}}' > package.json
bun install --linker isolated
```

```ts
// entry.ts
import { aessiv } from '@noble/ciphers/aes.js';
export const kind = typeof aessiv;
```

```ts
// repro.test.ts
import '@noble/ciphers/aes.js';
import { test, expect } from 'bun:test';

test('second Bun.build inside bun test', async () => {
  const first = await Bun.build({ entrypoints: ['./entry.ts'], target: 'bun', outdir: './out/one', throw: false });
  expect(first.success).toBe(true);

  const second = await Bun.build({ entrypoints: ['./entry.ts'], target: 'bun', outdir: './out/two', throw: false });
  for (const log of second.logs) console.error(String(log));
  expect(second.success).toBe(true); // <-- fails
});
```

```sh
bun test repro.test.ts
```

Three conditions are all required; removing any one makes it pass:

1. **`bun test` runtime** — running the identical double build via plain `bun file.ts` passes.
2. **The dep is imported by the test process before the builds run** — delete the top-level `import '@noble/ciphers/aes.js'` and it passes.
3. **The isolated install linker** (symlinked `node_modules/.bun` store) — reinstall with `bun install --linker hoisted` and it passes.

The first `Bun.build()` always succeeds; only the second (and later) call fails. Nothing is special about `@noble/ciphers` — any dependency in the intersection of "already loaded by the test runtime" and "in the second build's module graph" reproduces it, and when several qualify, the file named in the error rotates between runs.

## What is the expected behavior?

The second `Bun.build()` succeeds exactly like the first — the input file is a plain, readable `.js` file that the previous build (and the test runtime) just read successfully.

## What do you see instead?

```
BuildMessage: Unexpected reading file: "/.../repro/node_modules/.bun/@noble+ciphers@2.2.0/node_modules/@noble/ciphers/aes.js"
```

`second.success` is `false`. In a larger project (Svelte SSR framework, plugin + `splitting: true`, more dependencies in the intersection) the same failure surfaces as:

```
EISDIR reading file: "/.../node_modules/.bun/@joint-ops+hitlimit-bun@1.5.0/node_modules/@joint-ops/hitlimit-bun/dist/index.js"
EISDIR reading file: "/.../node_modules/.bun/@noble+ciphers@2.2.0/node_modules/@noble/ciphers/aes.js"
EISDIR reading file: "/.../node_modules/.bun/ipaddr.js@2.4.0/node_modules/ipaddr.js/lib/ipaddr.js"
```

— `EISDIR` on regular files (no directory shadows them; the packages' `exports` maps are plain file mappings), with the victim set rotating between runs. Historically the same project also saw this under `bun --hot` / `--watch` instead of `bun test`, so it appears tied to the runtime module loader sharing state with the bundler rather than to `bun test` specifically.

## Additional information

- Looks related to #22941 (`Bun.build` inside `bun test` failing to resolve imports that resolve fine under `bun run`) — same "bundler behaves differently inside the test runtime" class, different error.
- The failure mode suggests the second build reads poisoned per-process resolver/file state for paths the runtime loader already resolved through the `.bun` symlink store: dependencies that reach the build via absolute realpaths (e.g. paths pre-resolved with `Bun.resolveSync`) are never affected, only bare specifiers resolved through the store.
- Workaround that fully resolves it for us: `bunfig.toml` with `[install] linker = "hoisted"`.
