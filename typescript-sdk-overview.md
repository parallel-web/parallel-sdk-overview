I can do that, but I can’t access external URLs from here, so I can’t read `https://uithub.com/parallel-web/parallel-sdk-typescript/tree/main/src` directly.

If you paste the contents of the `src/` tree (or upload a zip / paste key files), I’ll generate a **single consolidated `index.d.ts`** that summarizes the public API footprint and **copies doc-comments 1:1**.

### What I need from you
Pick one of these:

1) **Upload/paste the repo files**
- Easiest: paste a directory listing + contents of all `.ts` files under `src/`.
- Or upload a zip of the `src` folder.

2) **If you can run commands locally**, paste outputs:
- `ls -R src`
- `sed -n '1,200p' src/<file>.ts` (repeat for each file)  
  (Or just paste the whole files.)

3) **If you can run a script**, I can give you one that prints all source files in one block.

### What I will produce
- A single `.d.ts` file (e.g. `parallel-sdk.d.ts`) that:
  - re-exports the public entrypoints
  - includes all exported classes/interfaces/types/functions/enums
  - preserves JSDoc/doc-comments **verbatim**
  - flattens internal module structure into one file (or keeps namespaces if needed)
  - removes implementation bodies, keeping only type signatures

### Two quick questions (so I format it correctly)
1) What is the package entrypoint—`src/index.ts` (or something else)?
2) Do you want **only exported/public** symbols, or literally everything in `src` (including internal non-exported types)?

If you paste the `src/index.ts` (and any barrel files it re-exports), I can start immediately and then iterate until the consolidated `.d.ts` matches the full surface area.