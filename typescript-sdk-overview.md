I can do that, but I can’t directly fetch or browse that GitHub URL from here.

If you give me either:

1) a zip of the repo (or just `src/`), or  
2) paste the contents of the `src/**/*.ts` files (or the built `.d.ts` if it exists),  

…I’ll generate a single consolidated `index.d.ts` that represents the whole public footprint, and I’ll copy doc-comments over 1:1 wherever they appear.

### What I need from you
Please provide one of the following:

- **Option A (best):** Upload a **zip** of `src/` (or the whole repo).
- **Option B:** Paste the file list and contents of all `src/**/*.ts` files.
- **Option C:** If the package already builds types, paste `dist/**/*.d.ts` (or `types/`).

### What I will produce
A single `parallel-sdk.d.ts` that:

- Exposes the SDK’s **public API surface** (classes, functions, interfaces, types, enums, namespaces, module exports).
- Preserves **JSDoc/doc-comments exactly as written** (copied 1:1, no edits).
- Resolves internal re-exports into one file so an LLM can read it without jumping between modules.
- Keeps type-only exports and overloads.
- Avoids implementation details (no function bodies).

### One quick clarification
Do you want the output as:

- `declare module "parallel-sdk"` style (module wrapper), **or**
- a “flat” global `.d.ts` matching the repo’s actual package entrypoints (recommended)?

Tell me the intended package name / import path (e.g. `import { Parallel } from "parallel-sdk"` vs `import ... from "@parallel/...") and I’ll match it.

Upload the `src/` and I’ll generate the single `.d.ts` in one shot.