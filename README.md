# check-barrel-import-violation

Ensure that files inside a folder with a barrel are not imported outside this folder.

## Installation

```bash
npm install --save-dev check-barrel-import-violation
```

Then run it against your project's `tsconfig.json`:

```bash
npx check-barrel-import-violation tsconfig.json
```

To check only specific files instead of the whole project:

```bash
npx check-barrel-import-violation tsconfig.json src/foo.ts src/bar.tsx
```

To check only uncommitted files:

```bash
npx check-barrel-import-violation tsconfig.json $(git diff --name-only --diff-filter=d HEAD)
```

You can also add it as a script in your `package.json`:

```json
{
  "scripts": {
    "check-barrels": "check-barrel-import-violation tsconfig.json"
  }
}
```

## Development

```bash
git clone https://github.com/tolokoban/check-barrel-import-violation.git
cd check-barrel-import-violation
npm install
npm run build
```

The project compiles TypeScript from `src/` into `dist/` via `tsc`. After building, you can test locally:

```bash
node dist/index.js path/to/tsconfig.json
```
