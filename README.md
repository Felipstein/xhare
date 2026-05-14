# Xhare

App desktop de compartilhamento de arquivos em tempo real entre PCs na mesma rede local (LAN).

Built with Tauri 2 (Rust + WebView), React 19, TypeScript, and Tailwind CSS v4.

---

## Prerequisites

### 1. Node.js

Install via [Volta](https://volta.sh/) (recommended) or directly from [nodejs.org](https://nodejs.org/).

```bash
# With Volta
volta install node
```

### 2. pnpm

```bash
npm install -g pnpm
# or with Volta
volta install pnpm
```

### 3. Rust

Install via [rustup](https://rustup.rs/):

**macOS / Linux**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Windows**
```powershell
winget install Rustlang.Rustup
```

After installing, restart your terminal so `cargo` is available in PATH.

### 4. Tauri system dependencies

**macOS** — no extra steps needed.

**Windows** — install the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload, or install Visual Studio with that workload.

---

## Setup

```bash
cd app
pnpm install

# pnpm 10+ requires explicit approval for packages with build scripts
pnpm approve-builds   # approve esbuild and unrs-resolver when prompted
```

---

## Running

```bash
cd app
pnpm tauri dev
```

---

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Vite dev server only (no Tauri shell) |
| `pnpm tauri dev` | Full app in dev mode with hot reload |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check without building |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
