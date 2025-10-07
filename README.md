# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# meta_control_plane

Lightweight React + TypeScript + Vite workspace used for schema-driven editors (JSON Forms)

This repository contains an editor for entity drafts based on JSON Schema + JSON Forms. The UI uses BlueprintJS components and custom JSON Forms renderers. The codebase is structured to be both human-readable and assistant-friendly.

---

## Quick metadata (machine-friendly)

```json
{
  "name": "meta_control_plane",
  "stack": ["react", "typescript", "vite", "jsonforms", "blueprintjs"],
  "defaultBranch": "main",
  "currentBranch": "copilot/refactor-react-rendering-approach"
}
```

---

## Table of contents

- [Quickstart](#quickstart)
- [Project overview](#project-overview)
- [AppToaster (global toast notifications)](#app-toaster-global-toast-notifications)
- [Agent manifest (short)](#agent-manifest-short)
- [ESLint / TypeScript tips](#eslint--typescript-tips)
- [Contributing](#contributing)
- [Docs](#docs)

---

## Quickstart

Requirements: Node 18+ (or the version the project uses), yarn (or npm).

1. Install dependencies

```powershell
yarn install
# or
# npm install
```

2. Run the dev server

```powershell
yarn dev
```

3. Open http://localhost:5173/ and use the app. HMR is enabled via Vite.

---

## Project overview

- src/: application source
  - `src/renderers`: custom JSON Forms renderers (Blueprint-based)
  - `src/jsonforms`: schema helpers and default generation utilities
  - `src/shared/api`: thin HTTP layer + a facade that parses stored draft content
  - `src/components`: UI components (including `NewDraftDrawer` and `AppToaster`)

- data/: sample data and schemas used by the app

Design goals:
- Keep file-level responsibilities small and obvious.
- Prefer explicit types (`unknown` instead of `any`) where appropriate.
- Centralize shared utilities (parsing, schema tooling, toasts).

---

## AppToaster (global toast notifications)

Why this exists
- React 18 changes portal creation semantics. BlueprintJS provides `OverlayToaster.createAsync()` which returns a Promise that resolves to a toaster instance once the portal is ready. Creating multiple toasters from different components can cause race conditions or duplicate overlay roots.

What `AppToaster` provides
- A single, cached async factory for the Blueprint `OverlayToaster`.
- A small async-friendly API: `show`, `dismiss`, `clear`, `getToasts`.

File: `src/components/AppToaster.ts`

Usage (examples)

```ts
// schedule a toast (no need to await if you don't need confirmation)
AppToaster.show({ message: 'Saved', intent: 'success' });

// await when you need to ensure the toast was created/scheduled
await AppToaster.show({ message: 'Saved', intent: 'success' });
```

Notes
- Keeping an app-wide toaster avoids duplicated portal creation and makes testing and automation easier.

---

## Agent manifest (short)

This project includes a concise, machine-oriented manifest to speed up contributions and automated assistants. Read `docs/AGENT_MANIFEST.md` for the full manifest.

Highlights
- UI stack: JSON Forms with custom Blueprint.js renderers
- Validation: AJV (draft-07) + `ajv-formats` and a small custom TimeSpan format
- Important folders: `src/renderers`, `src/jsonforms`, `src/shared/api`

When changing behavior, include a short comment and prefer small assumptions rather than large implicit ones.

---

## ESLint / TypeScript tips

For a production application enable type-aware lint rules (this example shows how to extend an existing config):

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

Style notes
- Prefer `unknown` over `any` unless you intentionally opt-out of type-safety.

---

## Contributing

- Read `docs/AGENT_MANIFEST.md` before making non-trivial changes.
- Run `yarn lint` and `yarn dev` to verify changes locally.
- Keep PR descriptions explicit about any assumptions or incomplete decisions.

---

## Docs

Full agent manifest and development notes: `docs/AGENT_MANIFEST.md`

If something in this README is unclear (or you want it more machine-readable), open a small PR with the change — the project aims to be both human- and AI-friendly.
