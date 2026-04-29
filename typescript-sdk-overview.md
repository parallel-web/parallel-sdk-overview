I can do that, but I can’t access external URLs from here, so I can’t read `uithub.com/parallel-web/parallel-sdk-typescript/tree/main/src` directly.

If you paste (or upload) the contents of that `src/` directory (or a zip), I’ll generate a single consolidated `index.d.ts` that summarizes the whole exported API surface, and I’ll copy doc-comments over **1:1** (unaltered) wherever they exist.

To make this easy, pick one of these options:

## Option A (best): upload a zip
1. Download the repo (or just `src/`).
2. Zip `src/`.
3. Upload it here.

## Option B: paste file contents
Paste:
- the list of files in `src/`
- then each file’s content (one by one)

## Option C: run a script and paste output
From the repo root, run:

```bash
python - <<'PY'
import os
root="src"
for dirpath, _, filenames in os.walk(root):
    for fn in sorted(filenames):
        if fn.endswith((".ts",".tsx")):
            path=os.path.join(dirpath, fn)
            print("\n" + "="*80)
            print(path)
            print("="*80)
            with open(path, "r", encoding="utf-8") as f:
                print(f.read())
PY
```

Paste the output here.

---

### A couple quick clarifications (so the `.d.ts` is what you want)
1. Do you want the `.d.ts` to reflect **only what the package exports publicly** (from `package.json` `exports` / main entry), or **everything in `src/`**?
2. Do you want it to be:
   - **Flattened** into one namespace-like file (single module), or
   - **Preserve module paths** via `declare module "…"` blocks (still one physical file, but multiple declared modules)?

If you don’t specify, I’ll default to: **public exports only**, and **preserve module paths** in one `.d.ts` file (best for LLMs and also most accurate for TS consumers).

Send the code/zip and I’ll produce the single consolidated `.d.ts`.