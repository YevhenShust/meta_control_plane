# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
## AppToaster (global toast notifications)

This project uses a centralized `AppToaster` helper located at `src/components/AppToaster.ts`.

- Why: React 18 requires portals to be created with the new createRoot API. BlueprintJS exposes
  `OverlayToaster.createAsync()` which returns a Promise that resolves when the portal is ready.
  `AppToaster` centralizes creation, caches the promise/instance, and provides a small API
  (`show`, `dismiss`, `clear`, `getToasts`) so all parts of the app use the same toaster.

- Usage examples:

```ts
// show a success toast (no need to await unless you need to)
AppToaster.show({ message: 'Saved', intent: 'success' });

// await if you need to ensure the toast was scheduled
await AppToaster.show({ message: 'Saved', intent: 'success' });
```

Keeping the toaster centralized avoids duplicated overlay instances and race conditions when
multiple components try to create a portal at the same time.

## Agent Manifest (summary)

This project follows a short, machine-readable development manifest used by contributors and automated assistants.

- UI stack: Eclipse JSON Forms with custom Blueprint.js renderers.
- Validation: AJV (draft-07), with ajv-formats and a small custom TimeSpan format.
- Renderers: all JSON Forms renderers and related UI code live under `src/renderers` (and optional `src/jsonforms`).
- Entity flow: `EntityHost` routes to `EntityEditor` which resolves schema, uischema and data and chooses `FormRenderer` or `TableRenderer`.
- Logging: use clear tags in console logs: `[Host]`, `[Editor]`, `[Form]`, `[Table]`, `[AJV]`, `[Schema]`.
- Types: avoid `any`; prefer `unknown` or explicit types.

If anything is ambiguous, prefer small, explicit assumptions and document them in the PR description or a short comment.

Full manifest: `docs/AGENT_MANIFEST.md`

Assistants: read `docs/AGENT_MANIFEST.md` before making code changes.
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
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
      // other options...
    },
  },
])
```
