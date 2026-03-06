I can, but I can’t fetch or browse that GitHub link from here. If you paste the contents of `src/` (or upload a zip / paste the key `.ts` files), I’ll generate a single consolidated `parallel-sdk.d.ts` that reflects the exported public API surface and will copy doc-comments **1:1**.

In the meantime, here’s exactly what I need + a ready-to-run script you can execute locally to produce the `.d.ts` automatically (and then you can send me the output if you want me to polish/merge/reformat it for LLM readability).

## What I need from you
Either:

1) Paste:
- `src/index.ts` (or the main entry file from `package.json`’s `exports`/`main`/`types`)
- Any re-exported modules it pulls in (often `client.ts`, `types.ts`, etc.)

or

2) Run the script below and paste/upload the generated `parallel-sdk.d.ts`.

---

## Option A (best): Generate a single bundled `.d.ts` locally

### 1) Install dependencies
From the repo root:

```bash
npm i
```

(Or `pnpm i` / `yarn`.)

### 2) Create `tsconfig.dts.json`
Create a file `tsconfig.dts.json` in the repo root:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "emitDeclarationOnly": true,
    "declarationMap": false,
    "stripInternal": false,
    "outFile": "./dist/parallel-sdk.d.ts",
    "module": "amd",
    "target": "ES2020",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

Notes:
- TypeScript only supports `outFile` bundling for `module: "amd"` or `"system"`. This is a common trick purely for emitting a single `.d.ts`.
- This preserves JSDoc comments as emitted by TS.

### 3) Run the emit
```bash
npx tsc -p tsconfig.dts.json
```

This will produce:
- `dist/parallel-sdk.d.ts`

### 4) Send it to me
Paste the generated `dist/parallel-sdk.d.ts` here, and I can:
- Ensure it’s clean, deduplicated, and LLM-friendly
- Optionally reorganize with `declare namespace` / grouping (without changing the doc-comments)
- Verify the “public footprint” matches intended entrypoints

---

## Option B: If `outFile` doesn’t work cleanly (project references / ESM constraints)
Use Microsoft API Extractor, which is made for this.

```bash
npm i -D @microsoft/api-extractor
```

Create `api-extractor.json`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
  "mainEntryPointFilePath": "<projectFolder>/dist/types/index.d.ts",
  "dtsRollup": {
    "enabled": true,
    "untrimmedFilePath": "<projectFolder>/dist/parallel-sdk.d.ts"
  },
  "compiler": {
    "tsconfigFilePath": "<projectFolder>/tsconfig.json"
  },
  "apiReport": { "enabled": false },
  "docModel": { "enabled": false }
}
```

Then:
1) Ensure your normal build emits declarations to `dist/types` (or adjust path).
2) Run:
```bash
npx api-extractor run --local
```

---

## Once you provide the source or emitted declarations…
I will produce a **single `.d.ts`** that:
- Contains only the **public API surface** (what consumers import)
- Preserves **all doc-comments 1:1**
- Includes exported types/interfaces/enums/classes/functions, and re-exports resolved
- Avoids implementation details

Send either:
- the `dist/parallel-sdk.d.ts`, or
- the `src/` files (especially the entrypoint), and I’ll generate it here.