# Xhare

**Real-time file sharing between Macs and PCs on the same local network.**
Drag, drop, done.

Xhare is a small desktop app that finds every other Xhare instance on your Wi‑Fi
or wired LAN and lets you push files to all of them at once — no accounts, no
cloud round-trips, no chat-app compression. Files travel directly between
machines over TCP at LAN speeds (think: hundreds of MB/s on gigabit Ethernet).

Built with [Tauri 2](https://tauri.app/) (Rust + WebView), React 19,
TypeScript, and Tailwind CSS v4. Lives in your menu bar / system tray.

---

## ✨ Features

- **Zero‑config LAN discovery** — mDNS-based, peers show up automatically the
  moment they launch Xhare. Falls back to manual IP entry when needed.
- **Direct TCP transfer** — 256 KB chunks with CRC32 per chunk, broadcast to
  every online peer in parallel. No server in the middle.
- **Folder support** — drop a folder and Xhare auto-zips it in the background
  with progress feedback ("Zipping… 47%") before transmitting.
- **Clipboard‑aware** — `⌘V` / `Ctrl+V` pastes a file straight from Finder or
  Explorer (including screenshots and image data from the system clipboard);
  `⌘C` / `Ctrl+C` copies selected received files as real file references so
  pasting in Finder / Explorer / WhatsApp / iMessage drops the actual file.
- **Smart received files**
  - Browser-style name dedupe: `notes.txt`, `notes (1).txt`, …
  - Saved-to-disk indicator, hover actions for save / open / reveal
  - Batched OS notifications (one toast per burst, suppressed while window
    is focused)
- **Multi-select with bulk actions** — `⌘A` / `Ctrl+A` toggles select-all,
  click anywhere on a row to toggle, floating action bar to save or delete
  selected files in one go.
- **Native tray icon** — closing the window keeps the app alive in the menu
  bar (macOS) or system tray (Windows), Docker-style. The macOS dock icon
  hides itself in that state and comes back when the window is reopened.
- **Cross-platform UX parity** — keyboard, drag-drop, clipboard, and reveal
  behaviors all map to native OS conventions on both platforms.

---

## 📥 Download

Pre-built installers are published on the
[Releases page](https://github.com/Felipstein/xhare/releases):

- **macOS** — universal `.dmg` (Intel + Apple Silicon)
- **Windows** — `.exe` NSIS installer (no admin required, auto-detects pt-BR)

### First launch

Builds are **unsigned**, so the OS will complain the first time you open them.

**macOS:** double-click is blocked. Go to **System Settings → Privacy &
Security**, scroll to the bottom and click **"Open Anyway"** next to the
Xhare entry. First time only — subsequent launches are normal.

**Windows:** SmartScreen may warn. Click **"More info"** → **"Run anyway"**.

---

## 🚀 Quick start (after installing)

1. Launch Xhare on every machine you want to share between.
2. They show up in the **Devices** sidebar within ~2 seconds.
3. Drag any file or folder onto the window — or `⌘V` / `Ctrl+V` to paste —
   and it streams to every online peer.
4. Received files land in the feed. Click **Save** to copy them to your
   download folder, or open them straight from cache.

The cache is wiped on app exit, so anything you don't explicitly save is
discarded — your real copies live wherever you chose to save them.

---

## 🛠 Development

### Prerequisites

| | macOS | Windows |
|---|---|---|
| Node.js 20+ | `volta install node` or [nodejs.org](https://nodejs.org/) | same |
| pnpm 9+ | `npm i -g pnpm` | same |
| Rust (stable) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | `winget install Rustlang.Rustup` |
| C/C++ toolchain | — | [MSVC Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload |

After installing Rust, restart your terminal so `cargo` is on PATH.

### Setup

```bash
cd app
pnpm install

# pnpm 10+ requires explicit approval for packages with build scripts
pnpm approve-builds   # approve esbuild and unrs-resolver when prompted
```

### Run

```bash
cd app
pnpm tauri dev
```

The first launch builds the Rust crate (a couple of minutes); subsequent
launches are near-instant thanks to incremental compilation.

### Commands

| Command | What it does |
|---|---|
| `pnpm tauri dev` | Full app in dev mode with hot reload |
| `pnpm dev` | Vite dev server only (no Tauri shell) |
| `pnpm build` | Production frontend build |
| `pnpm tauri build` | Build native installers locally (`.dmg` / `.exe`) |
| `pnpm typecheck` | TypeScript check, no emit |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm test` / `pnpm test:watch` | Vitest |

---

## 🏛 Architecture

```
app/
├── src/
│   ├── components/        UI primitives (Button, Dialog, Toast, …)
│   ├── features/
│   │   ├── devices/       Peer list + manual-add dialog
│   │   ├── file-feed/     File rows, drag overlay, bulk action bar
│   │   ├── logs/          In-app log viewer
│   │   └── settings/      Download folder + cache TTL
│   ├── hooks/             Cross-cutting hooks (paste, drag-drop, shortcuts)
│   ├── services/          Thin wrappers around Tauri invokes
│   ├── stores/            Zustand stores (devices, files, settings, …)
│   ├── types/             Shared TS types
│   └── utils/             Small helpers (formatSize, uniqueName, cn)
└── src-tauri/
    └── src/
        ├── discovery.rs   mDNS browse + ARP scan + heartbeat reconciliation
        ├── transfer.rs    TCP file protocol, folder zip, clipboard ops
        ├── lan_scan.rs    Cross-platform `arp -a` parser
        ├── settings.rs    Persistent JSON settings (atomic writes)
        ├── tray.rs        Native tray icon + unread badge
        └── logger.rs      File + terminal logging with daily rotation
```

### Wire protocol (TCP, port 9876)

```
┌──────────────────────┬──────────────────────────────┐
│ u32  header length   │ header bytes (JSON, UTF-8)   │
└──────────────────────┴──────────────────────────────┘
┌──────────────────────┬──────────┬───────────────────┐
│ u32  chunk length    │ u32 crc32│ chunk bytes       │   ← repeats
└──────────────────────┴──────────┴───────────────────┘
┌─────────────────┐
│ u32 length = 0  │ ← EOF sentinel
└─────────────────┘
```

Header schema: `{ fileId, name, size, from }`. Chunks are 256 KB; CRC mismatch
or short read aborts the transfer with a structured error event.

### State of the art on each platform

| Concern | macOS | Windows |
|---|---|---|
| Cache dir | `~/Library/Caches/Xhare/` | `%LOCALAPPDATA%\Xhare\` |
| Logs | `~/Library/Application Support/com.felipe.xhare/logs/` | `%APPDATA%\com.felipe.xhare\logs\` |
| Settings | `~/Library/Application Support/com.felipe.xhare/settings.json` | `%APPDATA%\com.felipe.xhare\settings.json` |
| Tray | Menu bar (top) | System tray (bottom right) |
| Reveal in folder | `open -R` | `explorer /select,` |
| Clipboard files | `NSPasteboard` via AppleScriptObjC | `Get-Clipboard -Format FileDropList` |

---

## 📦 Releasing

Use the helper script — it bumps every manifest, commits, tags, and pushes in
one shot:

```bash
cd app
pnpm release:patch    # 0.1.0 → 0.1.1   bug fixes
pnpm release:minor    # 0.1.5 → 0.2.0   new feature, backward compatible
pnpm release:major    # 0.4.2 → 1.0.0   breaking change
```

The script ([`app/scripts/release.mjs`](app/scripts/release.mjs)):

1. Refuses to run if you're not on `main`, the working tree is dirty, or
   `main` is out of sync with `origin`.
2. Bumps the version in `package.json`, `tauri.conf.json`, and `Cargo.toml`
   (plus refreshes `Cargo.lock`).
3. Commits with `release: vX.Y.Z` and creates an annotated tag.
4. Pushes both the commit and the tag.

The tag push triggers
[`.github/workflows/release.yml`](.github/workflows/release.yml), which builds
the macOS universal `.dmg` and Windows `.exe` (NSIS) in parallel and publishes
a GitHub Release with both binaries attached (~15-25 min end-to-end).

> **First release:** since `package.json` already starts at `0.1.0`, cut the
> very first tag manually instead of bumping:
> ```bash
> git tag v0.1.0 && git push --tags
> ```
> Every release after that goes through `pnpm release:*`.

You can also dispatch the workflow manually from the Actions tab (no new tag
needed) to rebuild after fixing a CI issue.

---

## 🧪 Testing

Unit tests run with Vitest (`pnpm test`). Components use
`@testing-library/react`; Tauri APIs are mocked in `src/test/setup.ts`.

The Rust side has `cargo test` (mostly small unit tests for path helpers and
parsers).

---

## 🛣 Roadmap

- [ ] Image / video thumbnails in the feed
- [ ] Pause / resume / cancel mid-transfer
- [ ] Global hotkey (`⌘Shift+X` / `Ctrl+Shift+X`) to summon the window
- [ ] Drag onto the tray icon to send (native, hard cross-platform)
- [ ] Code signing + notarization for friction-free first launch
- [ ] Auto-update via Tauri updater

---

## 📜 License

MIT — see [LICENSE](LICENSE) if present, otherwise treat as MIT.

---

## 🙋 FAQ

**Does it work across networks?**
No — both devices must be on the same LAN (same Wi-Fi, same router). Xhare
doesn't punch through NAT or proxy through a server.

**Why are notifications coming from "Terminal" / "PowerShell"?**
That's expected in **dev mode** (`pnpm tauri dev`): the OS attributes the
notification to the parent process. Run a build (`pnpm tauri build`) and
install the produced `.dmg` / `.exe` — the bundled app registers properly and
notifications come from "Xhare" with the right icon.

**Where do received files go?**
Into the OS cache dir (see [State of the art](#state-of-the-art-on-each-platform)
above), until you either save them explicitly or quit the app — quitting wipes
the cache so nothing accumulates.

**Can I add a peer manually if mDNS isn't working?**
Yes — there's a "+" button at the top of the device list that takes an IP.
The peer needs to be running Xhare for the transfer port (`9876/tcp`) to be
open.
