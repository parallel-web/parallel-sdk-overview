I can do this, but I can’t access external URLs from here, so I can’t read the repo contents at that link directly.

If you paste (or upload) the source tree for `src/parallel/` (or a zip of the repo), I’ll generate a **single consolidated `parallel.pyi`** that mirrors the full public API surface, and I’ll **copy docstrings/comments 1:1** wherever they exist.

### What I need from you
Any one of these works:

1. **Upload a zip** of the repository (best), or  
2. Paste the contents of all `.py` files under:
   - `src/parallel/**/*.py`
3. If the package uses re-exports, also include:
   - `src/parallel/__init__.py`
   - any `py.typed` / typing-related files
   - `pyproject.toml` (optional, helps determine package name/exports)

### What I will produce
- A **single file** (e.g., `parallel.pyi`) containing:
  - all public modules/classes/functions/constants
  - method signatures, overloads, async defs, properties
  - exported names as seen from `parallel` top-level (including re-exports)
  - imports for typing (e.g., `typing`, `typing_extensions`)
  - **doc-comments/docstrings copied verbatim** (I will not rewrite them)

### Quick question (so I output the right “footprint”)
Should the `.pyi` represent:
1) **Only what’s publicly exported** from `parallel` (what users import), or  
2) **Everything under `src/parallel/`**, including internal modules?

Reply with (1) or (2), and upload/paste the code, and I’ll generate the consolidated `.pyi`.