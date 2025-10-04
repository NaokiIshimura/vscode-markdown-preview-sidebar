# Repository Guidelines

## Project Structure & Module Organization
- `src/extension.ts` registers the sidebar webview, command hooks, and event listeners.
- `src/markdownPreviewProvider.ts` renders Markdown via `markdown-it` and manages the webview lifecycle.
- Compiled JavaScript and sourcemaps live in `out/`; treat it as build output only and keep edits in `src/`.
- Workspace manifest and compiler settings (`package.json`, `tsconfig.json`) define the extension surface and TypeScript options.

## Build, Test, and Development Commands
- `npm install` installs dependencies; rerun whenever `package.json` changes.
- `npm run compile` performs a one-shot TypeScript build to `out/` and is required before packaging or publishing.
- `npm run watch` runs `tsc -watch`; pair it with the VS Code Extension Host (`F5`) for rapid feedback.
- For distributing a VSIX, compile first and either trigger the "Release VSIX" workflow or run `npx vsce package` locally.

## Coding Style & Naming Conventions
- TypeScript uses strict mode, 4-space indentation, and single quotes for strings to match existing files.
- Exported classes stay `PascalCase` (`MarkdownPreviewProvider`), while functions, variables, and commands follow `camelCase`.
- Keep embedded webview HTML/CSS templates consistently indented and scoped; prefer descriptive helper names over comments.
- No formatter or linter runs automatically—document any new tooling in `package.json` and add scripts when introducing it.

## Testing Guidelines
- Automated tests are absent today; prioritize integration coverage with `@vscode/test-electron` when adding tests.
- Co-locate new specs under `src/test/` (or `tests/`) and expose them through an `npm test` script for CI reuse.
- Before each PR, manually verify Markdown editing, refresh command handling, and non-markdown safeguards in the Extension Host.

## Commit & Pull Request Guidelines
- Commits should stay short, imperative, and focused, mirroring history (`Align VSIX filenames with new package name`).
- PRs need a concise summary, linked issues, and manual verification notes; attach screenshots when webview output changes.
- Exclude build artifacts from commits—only check in `src/` source and configuration updates.
- Release bumps should follow `npm version <type>` and push tags so the GitHub action can produce the VSIX.
