I can do that, but I can’t directly fetch that GitHub URL from here. If you paste the contents of the `src/` directory (or upload a zip / paste key files), I’ll generate a single consolidated `.d.ts` that summarizes the public API footprint and I’ll copy doc-comments over **verbatim**.

In the meantime, here are two fast ways to get me what I need:

## Option A (best): Paste the generated `.d.ts` from your local build
If the project already produces type declarations:

1. Ensure `tsconfig.json` has:
   ```json
   {
     "compilerOptions": {
       "declaration": true,
       "emitDeclarationOnly": true,
       "declarationMap": false,
       "outDir": "dist-types"
     }
   }
   ```
2. Run:
   ```bash
   npx tsc -p tsconfig.json
   ```
3. Zip or paste the emitted `.d.ts` files from `dist-types/`.

Then I’ll merge them into a single `index.d.ts` “API surface” file.

## Option B: Paste the `src/` files
Run one of these and paste the output.

**Mac/Linux:**
```bash
python - << 'PY'
import os
root="src"
for dirpath,_,files in os.walk(root):
  for f in sorted(files):
    if f.endswith((".ts",".tsx")) and not f.endswith((".test.ts",".spec.ts")):
      p=os.path.join(dirpath,f)
      print("\n\n// ===== FILE:",p,"=====\n")
      print(open(p,"r",encoding="utf-8").read())
PY
```

**Windows (PowerShell):**
```powershell
Get-ChildItem -Recurse src -Include *.ts,*.tsx |
  Where-Object { $_.Name -notmatch '\.(test|spec)\.ts$' } |
  ForEach-Object {
    "`n`n// ===== FILE: $($_.FullName) =====`n"
    Get-Content $_.FullName -Raw
  }
```

---

## What I will produce
A single `parallel-sdk-typescript.d.ts` that:

- Exports the same public entrypoints as the SDK (e.g. what `src/index.ts` exports)
- Includes all public classes/functions/types/interfaces/enums
- Preserves JSDoc/doc-comments **1:1** (no edits)
- Collapses internal/private implementation details where possible (LLM-friendly footprint)
- Keeps module structure if needed (either as one flat module or `declare module` blocks)

---

## Quick question (so I format it correctly)
Which style do you want?

1. **Flat** (single module): `export ...` from one file (best for LLMs)
2. **Module-declared**: `declare module "@parallel/..."`
3. Match **exact package name** as used on npm (tell me the import path you use, e.g. `import { Parallel } from "parallel-sdk"`)

Reply with either:
- the `src/index.ts` + any exported files, or
- the full `src/` dump,
and your preferred style (1/2/3).