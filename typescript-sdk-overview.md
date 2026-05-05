I can, but I can’t access that URL directly from here. If you paste the contents of `src/` (or upload a zip / tarball of the folder), I’ll generate a single consolidated `parallel-sdk.d.ts` that:

- Exports the full public surface (classes, functions, types, interfaces, namespaces, enums)
- Preserves **all existing doc-comments 1:1** (copied verbatim, not rewritten)
- Flattens/re-exports modules so an LLM can “see” the whole API in one file
- Marks internal/private items as non-exported (unless they’re part of the public API)

### What I need from you
Pick one:

1) **Upload** the repository (or just `src/`) as an attachment here, or  
2) Paste:
   - `src/**` TypeScript files
   - `package.json`
   - `tsconfig.json` (if present)
   - `src/index.ts` (or whatever the entrypoint is)

### Quick check (so I export the right things)
Also tell me which you want as the “public API” basis:

- **A. Entry-point exports only** (recommended): only what `src/index.ts` (and its re-exports) exposes  
- **B. Everything under `src/`**: even internal modules

Reply with the files + A or B, and I’ll return a single `.d.ts` file.