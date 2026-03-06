# Contributing to Basalt

Thank you for taking the time to contribute to Basalt. This document outlines how to get involved, report issues, and submit changes.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and constructive environment. Be kind, patient, and considerate of others — regardless of experience level, background, or opinion.

---

## Getting Started

Before contributing, please:

1. Search [existing issues](https://github.com/FernuDev/basalt/issues) to avoid duplicates
2. Read this document fully
3. Check the [Roadmap](README.md#roadmap) in the README to understand planned work

If you're unsure about something, open a [Discussion](https://github.com/FernuDev/basalt/discussions) first.

---

## Reporting Bugs

If you find a bug, please [open an issue](https://github.com/FernuDev/basalt/issues/new) and include:

- **OS and version** (e.g. macOS 15.3, Ubuntu 24.04)
- **Basalt version**
- **Steps to reproduce** — be as specific as possible
- **Expected behavior**
- **Actual behavior**
- **Screenshots or logs** if applicable

> For security vulnerabilities, do **not** open a public issue. Email directly or use GitHub's [private vulnerability reporting](https://github.com/FernuDev/basalt/security/advisories/new).

---

## Suggesting Features

Feature requests are welcome. To propose one:

1. [Open an issue](https://github.com/FernuDev/basalt/issues/new) with the label `enhancement`
2. Describe the problem you're trying to solve, not just the solution
3. Explain why this would be useful to other users

---

## Development Setup

**Prerequisites:**

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

**Setup:**

```bash
git clone https://github.com/FernuDev/basalt.git
cd basalt
pnpm install
pnpm tauri dev
```

The app will launch in development mode with hot reload for the frontend. Rust changes require a full restart.

**Recommended editor:** VS Code with the following extensions:
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

---

## Making Changes

1. **Fork** the repository and clone your fork
2. **Create a branch** from `master`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-description
   ```
3. **Make your changes** — keep them focused and scoped to one thing
4. **Test** your changes manually before submitting
5. **Commit** using the conventions below
6. **Push** your branch and open a Pull Request

---

## Pull Request Process

- PRs should target the `master` branch
- Describe **what** changed and **why**
- Reference any related issues with `Closes #123` or `Fixes #123`
- Keep PRs small and focused — one feature or fix per PR is ideal
- Screenshots are appreciated for UI changes
- Be responsive to review feedback

PRs will be reviewed as soon as possible. Please allow a few days for a response.

---

## Coding Standards

### Frontend (TypeScript / React)

- Use **functional components** with hooks — no class components
- Prefer explicit types over `any`
- Keep components small and single-responsibility
- Use Tailwind CSS utility classes for styling — avoid inline styles
- Use Radix UI primitives for accessible interactive components
- Follow existing file/folder structure under `src/components/`

### Backend (Rust)

- Use `async/await` with Tokio — no blocking calls in async context
- Handle errors explicitly — avoid `.unwrap()` in production paths
- Expose new functionality through Tauri commands in `src-tauri/src/commands/`
- Keep DB logic in `src-tauri/src/db/`

---

## Commit Messages

Use short, descriptive commit messages in the imperative form:

```
feat: add query history panel
fix: resolve connection timeout on reconnect
refactor: extract table pagination logic
docs: update contributing guide
chore: bump Tauri to v2.1
```

Prefixes:
| Prefix | Use for |
|--------|---------|
| `feat` | New features |
| `fix` | Bug fixes |
| `refactor` | Code restructuring without behavior change |
| `docs` | Documentation changes |
| `chore` | Tooling, deps, config |
| `style` | Formatting, whitespace |
| `test` | Tests |

---

Thank you for helping make Basalt better.
