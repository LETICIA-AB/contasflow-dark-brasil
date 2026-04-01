

## Fix: White Screen from `useRef` null error (TooltipProvider)

### Root Cause
The `xlsx` (SheetJS) package is eagerly imported at the top level via `xlsxParser.ts → registry.ts → fileParser.ts`. SheetJS has a complex module structure that can confuse Vite's dependency pre-bundling, potentially pulling in a duplicate React copy or breaking the module graph. This manifests as the classic "Cannot read properties of null (reading 'useRef')" error from Radix UI components.

### Fix (2 changes)

**1. Add `optimizeDeps` to `vite.config.ts`**

Add `optimizeDeps.include` for `react`, `react-dom`, and `xlsx` to force Vite to pre-bundle them correctly and avoid duplicate instances:

```ts
optimizeDeps: {
  include: ['react', 'react-dom', 'xlsx'],
},
```

**2. Lazy-import `xlsx` in `xlsxParser.ts`**

Change from top-level `import * as XLSX from "xlsx"` to dynamic `import()` inside the `parse` and `getXlsxHeaders` functions. This prevents SheetJS from loading at app startup and potentially interfering with React's module resolution:

```ts
// Before
import * as XLSX from "xlsx";

// After — inside parse() and getXlsxHeaders()
const XLSX = await import("xlsx");
```

### Files Modified
- `vite.config.ts` — add `optimizeDeps.include`
- `src/data/parsers/xlsxParser.ts` — lazy import of `xlsx`

