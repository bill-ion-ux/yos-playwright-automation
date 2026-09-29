# `tsconfig.json`, in plain language

Written for someone who is not deep in TypeScript. It explains the
`tsconfig.json` at the repo root and why each line is there.

## Big picture

Think of TypeScript as a **spellchecker + grammar checker for code**. It
reads the `.ts` files and underlines mistakes in your editor before you run
anything. `tsconfig.json` is that checker's **settings file** — it answers
*which files do I check?* and *how strict, which rules?*

Important for **this** repo: the checker here **only checks**. It never turns
`.ts` into runnable `.js` — Playwright does that itself when you run tests.
So most of these settings are "keep the checker happy," not "change how the
tests run."

You could delete `tsconfig.json` entirely and **the tests would still run
exactly the same**. It exists so the editor shows red squiggles on real
mistakes, and so you *can* run one command in CI (`npx tsc --noEmit`) to
catch type errors before merging.

## The current file

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "preserve",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "types": ["node"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["tests", "incoming-scripts", "playwright.config.ts"]
}
```

## Line by line

**`target: "ES2022"`**
"Assume the code runs on a fairly modern engine." Lets you use newer
JavaScript features (top-level `await`, `Array.at()`, ...) without the
checker calling them too new. Node 25 is well past this, so it's a safe
floor.

**`module: "preserve"` + `moduleResolution: "bundler"`**
These two are about `import` statements. Together they say: when you write
`import { x } from '../support/identity'`, find that file the way modern
build tools (and Playwright's own loader) do — no need to write `.ts` or
`.js` on the end. The old value for this was `"node"` / `"node10"`, which
TypeScript now warns is deprecated and will be removed in TS 7.0 — these
two are the current, no-warning pair. `bundler` cannot be combined with the
older `"module": "commonjs"`, which is why `module` is `"preserve"`.

**`lib: ["ES2022", "DOM"]`**
"Which built-in vocabulary should the checker know?"
- `ES2022` — normal JavaScript (arrays, promises, dates, ...).
- `DOM` — browser globals (`document`, `window`, `HTMLElement`, ...).
  Needed because Playwright can run snippets *inside the browser*
  (`page.evaluate(() => document...)`), and the checker must know those
  names exist.
Listing `lib` yourself **replaces** the default set, so `ES2022` has to be
named here too or you'd lose it.

**`types: ["node"]`**
"Also teach the checker Node.js words like `process`, `Buffer`, `fs`,
`path`." Without this line the editor showed *"Cannot find name 'process'"*
in `playwright.config.ts`. The `["node"]` list also means "load **only**
Node's definitions, nothing else," which keeps behaviour predictable.
`@playwright/test` types are not affected — they come from its normal
`import`, not from `@types/*`.

**`strict: true`**
"Turn on all the careful checks." The big one: it forces you to handle
values that might be missing (`null` / `undefined`) instead of crashing
later. This is why some code has extra `if (x)` guards or `try / catch`.

**`esModuleInterop: true`**
A small compatibility switch so `import fs from 'node:fs'` works cleanly
(instead of `import * as fs`). Standard; leave it on.

**`skipLibCheck: true`**
"Don't re-check the code inside installed libraries — trust them." Faster,
and avoids errors that aren't ours to fix.

**`resolveJsonModule: true`**
"Allow importing a `.json` file directly." Not used yet; harmless.

**`noEmit: true`**
"Check only — never write output files." This is the line that makes the
whole config just a checker.

**`include: ["tests", "incoming-scripts", "playwright.config.ts"]`**
"Only look at these": the test folders and the config file itself. It
ignores `agents/` (that's Python) and, by default, `node_modules/`.

## If you ever see these errors again

- **`Option 'module' must be set to 'Node16' when 'moduleResolution' is set
  to 'Node16'`** — the two `module` / `moduleResolution` values don't match.
  Use a known-good pair: `"preserve"` + `"bundler"` (current choice), or set
  both to `"NodeNext"` (stricter — then every relative import needs a `.js`
  on the end).
- **`Option 'moduleResolution=node10' is deprecated`** — you're back on the
  old `"node"` value. Switch to `"bundler"` (keep `module: "preserve"`).
