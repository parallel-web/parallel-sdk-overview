I can do this, but I can’t access that URL from here. If you paste the contents of the `src/` tree (or upload a zip / paste key files), I’ll generate a single consolidated `parallel-sdk.d.ts` that summarizes the public API surface and preserves doc-comments 1:1.

### What I need from you
Pick one:

1. **Upload** a zip of `src/` (best), or  
2. **Paste** the contents of all `.ts` files in `src/`, or  
3. Paste the output of:
   - `tree -a src`
   - and then `sed -n '1,200p'` (or full contents) for each file, or  
4. Point me to a **raw GitHub** link *and* confirm I’m allowed to fetch it (in some environments I still won’t be able to).

### What I will produce
A single `.d.ts` file that:

- Merges all exported types/classes/functions into one file
- Preserves **all existing doc-comments exactly** (copied 1:1, no edits)
- Includes re-exported symbols (following `export * from ...`)
- Uses `declare namespace` / `declare module` only if needed; otherwise plain top-level `export` declarations
- Omits implementation details, keeps signatures, overloads, generics, and JSDoc

### One quick clarification
Do you want the output shaped as:
- **(A)** a module file: `export ...` (typical for TS libs), or
- **(B)** `declare module "parallel-sdk"` { ... } wrapping everything (useful for drop-in typings)

Tell me **A or B**, and share the `src/` contents, and I’ll generate the single `.d.ts`.