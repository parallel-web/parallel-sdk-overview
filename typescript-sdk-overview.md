I can do that, but I can’t access external URLs from here, so I can’t read that repo directly.

If you paste the contents of the `src/` folder (or upload a zip / provide the files here), I’ll generate a **single consolidated `index.d.ts`** that summarizes the public API surface. I’ll also **copy doc-comments 1:1** exactly as written (including formatting), and I’ll avoid “improving” or rewording them.

### What I need from you
Pick one of these:

1) **Paste file tree + file contents**  
   - `src/**/*.ts` (and any existing `*.d.ts`)  
   - plus `package.json` and `tsconfig.json` if available (helps resolve exports/types)

2) **Paste just the public entrypoints** (faster)  
   - whatever `package.json` points to (`main`, `module`, `types`, `exports`)  
   - and any `src/index.ts` / `src/public.ts` / barrel files they re-export from

### What I will produce
- A **single** `parallel-sdk-typescript.d.ts` (or `index.d.ts`) containing:
  - all exported types/classes/functions/interfaces/enums
  - namespaces/modules if used
  - re-export resolution (flattened into one file)
  - doc comments copied **verbatim** (no edits)
- I’ll keep internal/private items out unless they’re part of the exported API.

### Quick question (so I format it correctly)
Do you want the output shaped as:
- **Global `declare module "parallel-sdk"`** style (best for LLM “overview”), or
- **Standard `.d.ts` with `export ...`** matching the package’s real module name(s)?

If you paste the files here, I’ll start immediately.