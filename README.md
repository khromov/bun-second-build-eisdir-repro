# Bun: second `Bun.build()` inside `bun test` fails reading a dependency (isolated linker)

Minimal reproduction for a Bun **1.3.14** bug: inside a `bun test` process, the **second** `Bun.build()` call fails with a spurious file-read error (`Unexpected reading file` / `EISDIR reading file`) on a node_modules file that

1. the test process's module loader has already imported, **and**
2. appears in that build's module graph, **and**
3. resolves through the **isolated install linker**'s symlinked `node_modules/.bun` store.

All three conditions are required. The first build always succeeds; the same code under plain `bun run` always succeeds; the hoisted linker always succeeds.

## Run

```sh
bun install          # bunfig.toml pins linker = "isolated" (the bug's precondition)

bun run repro                # ❌ FAILS — second build errors on @noble/ciphers/aes.js
bun run control:no-preload   # ✅ passes — same double build, dep not imported by the test process
bun run control:run          # ✅ passes — same code + preload, plain `bun` instead of `bun test`

rm -rf node_modules && bun install --linker hoisted
bun run repro                # ✅ passes — same everything, hoisted layout
```

## What happens

`repro.test.ts` imports `@noble/ciphers/aes.js` at the top level (so the test runtime loads it through the `.bun` store symlinks), then runs two identical `Bun.build()` calls. The first succeeds; the second fails:

```
BuildMessage: Unexpected reading file: "<repo>/node_modules/.bun/@noble+ciphers@2.2.0/node_modules/@noble/ciphers/aes.js"
```

The file is a plain, readable file — no directory shadows it, and the identical build one line earlier read it fine. In larger projects the error string is often `EISDIR reading file` (sometimes `Unseekable`), and when several dependencies sit in the loaded-and-bundled intersection, the file named rotates between runs. There is nothing special about `@noble/ciphers` — any package reproduces it.

Validated on Bun 1.3.14 (`1.3.14+0d9b296af`), Linux arm64; the underlying failure was also hit on macOS in the project this was extracted from. Possibly related: [oven-sh/bun#22941](https://github.com/oven-sh/bun/issues/22941) (`Bun.build` resolver failures that also occur only inside `bun test`).

`BUG_REPORT.md` contains this write-up formatted for Bun's bug-report issue template.
