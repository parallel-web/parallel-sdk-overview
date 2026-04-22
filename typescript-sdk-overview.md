I can do this, but I can’t directly fetch that GitHub URL from here. If you paste (or upload) the TypeScript source from `src/` (or a zip of the repo), I’ll generate a single consolidated `index.d.ts` that reflects the public API footprint and will copy doc-comments over verbatim.

To make this easy, here are two options:

## Option A (fastest): upload a zip
1. Download the repo as a zip (or `git clone` and zip it).
2. Upload the zip here.
3. Tell me whether you want:
   - **Only the public API** (exports from the package entry), or
   - **Everything in src** (even internal modules).

## Option B: paste file contents
Paste:
- `src/**` files, and also
- `package.json` and any `src/index.ts` (or whatever the entry file is).

---

## If you want to generate it locally (I can still refine it)
If you *can* run commands locally, you can generate a single `.d.ts` bundle and paste it back for me to clean up / ensure it preserves comments:

### 1) Create a temporary `tsconfig.build.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "emitDeclarationOnly": true,
    "declarationMap": false,
    "stripInternal": false,
    "removeComments": false,
    "outDir": "dist-types"
  },
  "include": ["src/**/*"]
}
```

### 2) Build declarations
```bash
npx tsc -p tsconfig.build.json
```

### 3) Bundle into one .d.ts
Use `dts-bundle-generator`:
```bash
npx dts-bundle-generator -o parallel-sdk.d.ts src/index.ts
```

Then paste `parallel-sdk.d.ts` here and I’ll:
- ensure it’s a clean “API footprint” (minimal but complete),
- preserve doc-comments 1:1 where present,
- remove implementation-only artifacts, and
- optionally add a top-level `declare module "parallel-sdk"` wrapper if you want it.

---

### Quick clarification (so I produce the right thing)
1) What’s the package name you want in `declare module "…"` (from `package.json`)?  
2) Do you want **only what’s exported** from the entrypoint, or **every type/class in src**?

Send the code/zip and your preference, and I’ll return the single consolidated `.d.ts`.