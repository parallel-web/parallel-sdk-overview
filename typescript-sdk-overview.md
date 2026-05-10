I can do this, but I can’t directly fetch URLs from GitHub/uithub in this chat. If you paste the contents of that `src/` directory (or upload a zip / paste key files), I’ll generate a single consolidated `index.d.ts` with the public API surface and copy doc-comments 1:1.

In the meantime, here are two practical ways to get me the exact inputs I need, plus a ready-to-use script that will generate a single `.d.ts` from the repo on your machine (and optionally bundle it). If you run it and paste the resulting file here, I can also verify/clean it and ensure the footprint is “LLM-readable”.

---

## Option A (best): generate a single `.d.ts` locally and paste it here

### 1) Build TypeScript declarations
From the repo root:

```bash
npm i
```

Ensure `tsconfig.json` has (or temporarily add):

```json
{
  "compilerOptions": {
    "declaration": true,
    "emitDeclarationOnly": true,
    "declarationMap": false,
    "stripInternal": false,
    "outDir": "dist-types"
  },
  "include": ["src"]
}
```

Then run:

```bash
npx tsc -p tsconfig.json
```

This outputs many `.d.ts` files under `dist-types/`.

### 2) Bundle into a single `parallel-sdk.d.ts`
Install API Extractor (Microsoft’s tool for exactly this):

```bash
npm i -D @microsoft/api-extractor
```

Create `api-extractor.json`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
  "mainEntryPointFilePath": "<projectFolder>/dist-types/index.d.ts",
  "dtsRollup": {
    "enabled": true,
    "untrimmedFilePath": "<projectFolder>/parallel-sdk.d.ts"
  },
  "apiReport": { "enabled": false },
  "docModel": { "enabled": false },
  "messages": {
    "compilerMessageReporting": { "default": { "logLevel": "none" } },
    "extractorMessageReporting": { "default": { "logLevel": "warning" } },
    "tsdocMessageReporting": { "default": { "logLevel": "none" } }
  }
}
```

Run:

```bash
npx api-extractor run --local
```

Now you’ll have `parallel-sdk.d.ts`. Paste that file here and I’ll:
- ensure it reflects the full exported API footprint (no private internals),
- preserve doc-comments 1:1,
- optionally reformat to maximize “LLM readability” (without changing content).

---

## Option B: paste source files (or just the public entrypoints)

If you can’t run tools, paste:
- `src/index.ts` (or whatever the package’s main entry is),
- any files it exports from (often `src/client.ts`, `src/resources/*`, `src/types.ts`, etc.),
- and `package.json` (to find `main` / `exports`).

With that, I can manually synthesize a single `.d.ts` that mirrors the exports.

---

## What I need from you

Reply with **one** of the following:

1) **Paste `parallel-sdk.d.ts`** produced by the steps above, **or**
2) Upload/paste the `src/` tree contents (or a zip), **or**
3) Tell me the package entrypoint file (`package.json` `exports`/`main`) and paste those exported modules.

Once I have the code/declarations, I’ll return a single consolidated `.d.ts` file and nothing else (unless you ask for extras).