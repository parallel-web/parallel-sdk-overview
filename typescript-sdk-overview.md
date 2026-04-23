I can, but I can’t directly fetch or crawl that URL from here. If you paste the contents of the `src/` files (or upload a zip / give me the repo files in chat), I’ll produce a single consolidated `index.d.ts` that reflects the exported public API surface and **copies doc-comments 1:1**.

In the meantime, here’s exactly what I will generate (and the constraints I’ll follow), plus a ready-to-run script you can use locally to produce a first-pass single-file `.d.ts` that you can then paste back here for me to refine.

---

## What I will produce

A single file (e.g. `parallel-sdk.d.ts`) that:

- Represents the **public footprint** of the SDK (what a consumer can import).
- Preserves **JSDoc/doc-comments verbatim (1:1)** wherever they exist in the source.
- Flattens/re-exports types so an LLM can read one file and understand the API.
- Avoids implementation details (only declarations, not bodies).
- Includes all exported:
  - classes, functions, constants
  - interfaces, types, enums
  - namespaces (if used)
  - module augmentations (if any)

---

## What I need from you

Choose one option:

### Option A (best): Paste the source files
Paste the full contents of all `src/**/*.ts` files (or at least the barrel exports and all public modules). I’ll return the final `.d.ts`.

### Option B: Run a local script to extract a single `.d.ts`
Run the script below in the repo and paste the generated `parallel-sdk.d.ts` here. I’ll then ensure it matches the real public API and **re-insert any missing doc-comments 1:1** from source.

---

## Local generator script (first-pass single-file .d.ts)

This uses TypeScript’s compiler to emit declarations, then rolls them up. It won’t always preserve every comment perfectly across rollup tools, but it’s a good baseline.

1) Ensure dependencies:

```bash
npm i
npm i -D typescript dts-bundle-generator
```

2) Create `tools/build-dts.mjs`:

```js
import { generateDtsBundle } from "dts-bundle-generator";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

// Try common entrypoints; adjust if your package exports a different module.
const candidates = [
  "src/index.ts",
  "src/main.ts",
  "src/client.ts",
];

const entry = candidates
  .map(p => path.join(repoRoot, p))
  .find(p => fs.existsSync(p));

if (!entry) {
  console.error("Could not find an entry file. Please set entry manually in tools/build-dts.mjs");
  process.exit(1);
}

const outFile = path.join(repoRoot, "parallel-sdk.d.ts");

const [dts] = generateDtsBundle(
  [{ filePath: entry }],
  {
    preferredConfigPath: path.join(repoRoot, "tsconfig.json"),
    // Keep declarations fairly readable for LLMs:
    exportReferencedTypes: true,
    // Try to keep docs when possible:
    // (Note: exact preservation depends on source + toolchain.)
  }
);

fs.writeFileSync(outFile, dts, "utf8");
console.log("Wrote", outFile);
```

3) Run:

```bash
node tools/build-dts.mjs
```

4) Paste `parallel-sdk.d.ts` back here, and I’ll:
- verify it matches exports
- correct any missing/incorrect shapes
- **copy doc-comments 1:1** from the TS sources into the right declarations
- ensure it’s a single coherent module surface (no broken `import()` types, etc.)

---

## One key question (so I generate the right module shape)

How do you want consumers to import it?

1. `import { Parallel } from "parallel-sdk";` style (named exports), or  
2. `import Parallel from "parallel-sdk";` style (default export), or  
3. Both.

If you’re not sure, paste `package.json` (especially `exports`, `main`, `types`) and the `src/index.ts` (or equivalent entry).

---

## Send me this and I’ll return the final single `.d.ts`

Minimum set to paste:

- `src/index.ts` (or whatever entry file is exported)
- any files it re-exports publicly
- `package.json`
- `tsconfig.json` (optional but helpful)

Once I have that, I’ll generate the single `.d.ts` in one response.