<div align="center">
  <img src="branding/logo.png" alt="Basalt Logo" width="560" />

  <br />
  <br />

  <p>
    <strong>A fast, minimal PostgreSQL desktop client built for developers.</strong><br />
    Native performance. Clean interface. Zero bloat.
  </p>

  <p>
    <a href="https://github.com/FernuDev/basalt/releases">
      <img src="https://img.shields.io/github/v/release/FernuDev/basalt?style=flat-square&color=7C4FD4&label=release" alt="Latest Release" />
    </a>
    <a href="https://github.com/FernuDev/basalt/blob/master/LICENSE">
      <img src="https://img.shields.io/github/license/FernuDev/basalt?style=flat-square&color=7C4FD4" alt="License" />
    </a>
    <a href="https://github.com/FernuDev/basalt/stargazers">
      <img src="https://img.shields.io/github/stars/FernuDev/basalt?style=flat-square&color=7C4FD4" alt="Stars" />
    </a>
    <a href="https://github.com/FernuDev/basalt/issues">
      <img src="https://img.shields.io/github/issues/FernuDev/basalt?style=flat-square&color=7C4FD4" alt="Issues" />
    </a>
    <a href="https://github.com/FernuDev/basalt/pulls">
      <img src="https://img.shields.io/github/issues-pr/FernuDev/basalt?style=flat-square&color=7C4FD4" alt="Pull Requests" />
    </a>
  </p>

  <p>
    <a href="#features">Features</a> ·
    <a href="#installation">Installation</a> ·
    <a href="#getting-started">Getting Started</a> ·
    <a href="#tech-stack">Tech Stack</a> ·
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## Overview

**Basalt** is an open-source desktop client for PostgreSQL, designed with a developer-first philosophy. Built on [Tauri v2](https://tauri.app/) with a React + TypeScript frontend and a Rust backend, it delivers native performance with a polished, minimal interface.

No Electron. No overhead. Just a fast, focused tool.

---

## Features

- **Connection Manager** — Save, organize, and switch between multiple PostgreSQL connections with color labels
- **Table Browser** — Explore your schema, view row counts and sizes at a glance
- **Data Viewer** — Paginated, sortable table data with inline row editing
- **SQL Query Editor** — Write and execute raw queries with execution time feedback
- **Relations View** — Visualize foreign key relationships across your schema
- **Splash Screen** — Clean startup experience with smooth transitions
- **Local Persistence** — Connections stored locally, nothing sent to the cloud

---

## Tech Stack

<table>
  <tr>
    <td align="center" width="120">
      <img src="https://img.shields.io/badge/Tauri-v2-24C8D8?style=flat-square&logo=tauri&logoColor=white" /><br />
      <sub>Desktop runtime</sub>
    </td>
    <td align="center" width="120">
      <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" /><br />
      <sub>UI framework</sub>
    </td>
    <td align="center" width="120">
      <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" /><br />
      <sub>Language</sub>
    </td>
    <td align="center" width="120">
      <img src="https://img.shields.io/badge/Rust-stable-CE422B?style=flat-square&logo=rust&logoColor=white" /><br />
      <sub>Backend</sub>
    </td>
    <td align="center" width="120">
      <img src="https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" /><br />
      <sub>Styling</sub>
    </td>
    <td align="center" width="120">
      <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" /><br />
      <sub>Bundler</sub>
    </td>
  </tr>
</table>

**UI Components:** [Radix UI](https://www.radix-ui.com/) · **Icons:** [Lucide](https://lucide.dev/) · **Notifications:** [Sonner](https://sonner.emilkowal.ski/)

---

## Installation

### Pre-built Binaries

Download the latest release for your platform from the [Releases page](https://github.com/FernuDev/basalt/releases):

| Platform | Installer |
|----------|-----------|
| macOS | `.dmg` |
| Windows | `.msi` / `.exe` |
| Linux | `.AppImage` / `.deb` |

### Build from Source

**Prerequisites:**

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

```bash
# Clone the repository
git clone https://github.com/FernuDev/basalt.git
cd basalt

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

---

## Getting Started

1. Launch Basalt
2. Click **New Connection** in the sidebar
3. Enter your PostgreSQL connection URI (e.g. `postgresql://user:password@localhost:5432/mydb`)
4. Give it a name and a color label
5. Click **Connect**

Once connected, you can browse tables, run SQL queries, inspect foreign keys, and edit rows — all from the same window.

---

## Project Structure

```
basalt/
├── src/                    # React frontend
│   ├── components/
│   │   ├── db/             # Database UI components
│   │   └── ui/             # Generic UI primitives
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Types, utilities, DB bridge
├── src-tauri/              # Rust backend
│   └── src/
│       ├── commands/       # Tauri command handlers
│       ├── db/             # PostgreSQL connection logic
│       └── types/          # Shared Rust types
└── branding/               # Brand assets
```

---

## Contributing

Contributions are welcome. Basalt is an open-source project and we appreciate bug reports, feature suggestions, and pull requests.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting anything.

---

## Roadmap

- [ ] MySQL / MariaDB support
- [ ] SQLite support
- [ ] Query history
- [ ] Schema diff tool
- [ ] Dark / Light theme toggle
- [ ] Export to CSV / JSON
- [ ] Keyboard-first navigation

---

## License

Basalt is open-source software licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with care by <a href="https://github.com/FernuDev">FernuDev</a></sub>
</div>
