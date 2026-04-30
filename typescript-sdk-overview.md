I can, but I can’t access external URLs from here, so I can’t read that repo directly.

If you paste the contents of the `src/` directory (or upload a zip / paste key files), I’ll generate a single consolidated `index.d.ts` that captures the full public API surface. I will also copy doc-comments **verbatim (1:1)** from the source into the `.d.ts`.

### What I need from you
Please provide one of the following:

1) **Paste all TypeScript files under `src/`** (recommended), or  
2) Upload a **zip** of `src/`, or  
3) Paste:
   - `src/index.ts` (or package entry file)
   - all exported modules it re-exports
   - any `types.ts`, `client.ts`, `api/*.ts`, `models/*.ts` etc.

### Minimal instructions to get a correct output
Also tell me:

- The intended output filename (default: `parallel-sdk.d.ts`)
- Whether you want:
  - **Only public exports** (what consumers import), or
  - **Everything in src** (including internal types)

### What I will produce
A single `.d.ts` file that:

- Re-exports the same symbols as the package entry
- Includes interfaces/types/classes/functions with signatures
- Includes namespaces/modules if used
- Preserves **JSDoc/doc-comments exactly** as in source (no edits)
- Uses `declare` appropriately, with `export` structure matching the SDK

### Quick way to paste
If it’s a lot of files, you can paste them in multiple messages like:

```text
// FILE: src/index.ts
...content...

// FILE: src/client.ts
...content...
```

Send the first batch whenever ready, and I’ll start building the consolidated `.d.ts`.