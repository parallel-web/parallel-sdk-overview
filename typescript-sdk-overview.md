I can do that, but I can’t directly access external URLs from here. If you paste the contents of that `src/` directory (or upload a zip / paste key files like `index.ts` + any exported modules), I’ll generate a single consolidated `.d.ts` that reflects the public API surface, and I’ll copy over doc-comments 1:1.

To make this quick, here are two easy options:

## Option A (best): paste an auto-bundle of the repo’s exported TS
Run this locally and paste the output:

```bash
# from the repo root
git ls-files "src/**/*.ts" "src/**/*.tsx" | sort | xargs -I{} sh -c 'echo "\n\n// FILE: {}\n"; cat "{}"' > /tmp/parallel-src.txt
cat /tmp/parallel-src.txt
```

Or, if there are many files, upload `/tmp/parallel-src.txt`.

## Option B: paste only the public surface
If there’s a single barrel file, paste:
- `src/index.ts` (and any re-exported barrels)
- any `src/**/index.ts` files
- the referenced types/classes/modules they export

---

### What I will produce
A single file, e.g. `parallel-sdk.d.ts`, that:
- includes `declare module "..."` blocks as needed (or a flat global module, depending on package style)
- contains only the *publicly exported* types/classes/functions/interfaces
- preserves doc-comments exactly as-is (including tags like `@deprecated`, `@example`, etc.)
- resolves re-exports into one coherent declaration footprint (LLM-friendly)

---

If you want, tell me the intended module name for the declarations (e.g. `"@parallel-web/sdk"`), and whether you prefer:
1) `declare module "<pkg-name>" { ... }` style, or  
2) just top-level `export ...` declarations (TS “module” style).

Send the code (Option A or B), and I’ll return the single `.d.ts` in one response.