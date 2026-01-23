I can do that, but I can’t directly fetch or browse that GitHub URL from here. If you paste the contents of the `src/` tree (or upload a zip), I’ll generate a single consolidated `.d.ts` that mirrors the public API surface and preserves doc-comments **1:1**.

### What I need from you (pick one)
1. **Upload a zip** of `src/` (best), or  
2. Paste:
   - `src/index.ts` (or main entry)
   - any `export * from ...` files
   - the rest of the `src/**/*.ts` files

### Quick way to provide it
From your local clone:
```bash
git clone https://github.com/parallel-web/parallel-sdk-typescript.git
cd parallel-sdk-typescript
tar -czf src.tgz src
```
Upload `src.tgz` here.

### What I will produce
- A **single** `parallel-sdk.d.ts` file that:
  - flattens/re-exports everything that’s publicly exported
  - includes all `interface`, `type`, `class`, `enum`, function signatures, namespaces/modules as needed
  - preserves **all JSDoc comments exactly** (copied 1:1; no edits)
  - omits private/internal-only symbols unless they’re exported

### One clarification
Do you want the `.d.ts` to reflect:
- **Only the public exported API** (recommended for LLM “footprint”), or
- **Everything in `src/`**, even non-exported internals?

Reply with the `src` content/upload and your preference, and I’ll generate the single `.d.ts` file.