# Xhare — CLAUDE.md

App desktop de compartilhamento de arquivos em tempo real entre Macs e PCs na
mesma LAN. Código em `~/js/xhare/app/`. Tauri 2 (Rust + WebView) + React 19 +
TypeScript + Tailwind v4.

---

## Como trabalhar neste projeto

### Modo de execução
Sempre trabalhe em **versões pequenas e validáveis**. Cada mudança tem escopo
fechado, tests passando e app rodando antes de avançar pra próxima.

### Regras de qualidade
- **Nunca declare uma mudança pronta sem:** tests passando + TypeScript sem
  erros + `cargo check` limpo + app rodando.
- **Zero `any` no TypeScript** — tipe tudo corretamente.
- **Zero code smells** — sem duplicação, sem funções gigantes, sem lógica
  misturada com UI.
- **Cada arquivo faz uma coisa só.**
- Rode `pnpm typecheck`, `pnpm lint`, `pnpm test` antes de marcar como concluído.

### Package manager
**SEMPRE `pnpm`.** Nunca `bun`, `npm` ou `yarn` — o lockfile é `pnpm-lock.yaml`
e o CI assume isso.

---

## Compatibilidade obrigatória

O app **deve rodar identicamente em macOS e Windows**. Nunca use APIs
exclusivas de um SO sem o equivalente no outro.

| Concern | macOS | Windows |
|---|---|---|
| Cache | `~/Library/Caches/Xhare/` | `%LOCALAPPDATA%\Xhare\` |
| Logs | `~/Library/Application Support/com.felipe.xhare/logs/` | `%APPDATA%\com.felipe.xhare\logs\` |
| Settings | `~/Library/Application Support/com.felipe.xhare/settings.json` | `%APPDATA%\com.felipe.xhare\settings.json` |
| Tray | Menu bar (top) | System tray (bottom right) |
| Abrir path | `open` | `explorer` / `start` |
| Reveal in folder | `open -R` | `explorer /select,` |
| Clipboard files (read) | `osascript` + `NSPasteboard` via AppleScriptObjC | `Get-Clipboard -Format FileDropList` (PowerShell) |
| Clipboard files (write) | `NSPasteboard.writeObjects:[NSURL]` | `System.Windows.Forms.Clipboard.SetFileDropList` |
| Notificação | macOS Notification Center | Windows Toast |
| Separador de path | `/` | use `path::join` no Rust, nunca hardcode |

No Rust: use `dirs` crate pra caminhos de sistema. No frontend: Tauri abstrai
tudo — nunca acesse paths diretamente no TypeScript.

---

## Stack

- **Shell:** Tauri 2 (Rust + WebView). Plugins: `dialog`, `opener`, `notification`.
- **Frontend:** React 19 + TypeScript + Tailwind CSS v4.
- **State:** Zustand. Nada de React Query (removido — não havia uso).
- **Forms:** react-hook-form + `zod/mini` (não a `zod` cheia).
- **UI:** Radix UI primitives + Lucide icons + Sonner (toasts).
- **Persistência local:** arquivos JSON em config dir (settings) e logs em
  arquivos diários. Sem SQLite — overkill pra escopo atual.
- **Plataformas:** macOS + Windows.

---

## Estrutura de pastas

```
app/
├── src/
│   ├── components/        ← primitivos: Button, Dialog, Toast, Tooltip, AlertDialog, …
│   ├── features/
│   │   ├── devices/       ← DeviceList, DeviceItem, useDevices, NewDeviceDialog
│   │   ├── file-feed/     ← FileFeed, FileRow, BulkActionBar, DragOverlay, useTransferSubscription
│   │   ├── logs/          ← LogViewer
│   │   └── settings/      ← SettingsForm, settingsSchema
│   ├── hooks/             ← useClipboardPaste, useDragDrop, useNativeDragDrop,
│   │                        useCopySelectedShortcut, useSelectAllShortcut,
│   │                        useUnreadBadge, useWindowDrag, useWindowControls,
│   │                        usePlatform, useLocalIp
│   ├── services/          ← wrappers de Tauri commands (files, transfer, devices,
│   │                        network, settings, logs, pickFolder)
│   ├── stores/            ← Zustand (filesStore, devicesStore, settingsStore,
│   │                        connectionStore)
│   ├── types/             ← Device, SharedFile, Settings
│   ├── utils/             ← cn, formatSize, fileType, timeAgo, uniqueName
│   ├── test/              ← setup.ts (mocks de Tauri), fixtures, renderWithTooltip
│   └── App.tsx
├── src-tauri/
│   └── src/
│       ├── lib.rs         ← entrypoint, invoke_handler, window event handling
│       ├── main.rs        ← thin wrapper
│       ├── discovery.rs   ← mDNS + ARP + heartbeat reconciliation
│       ├── transfer.rs    ← TCP protocol, folder zip, clipboard ops, cache cleanup
│       ├── lan_scan.rs    ← cross-platform `arp -a` parser
│       ├── settings.rs    ← JSON settings (atomic writes)
│       ├── tray.rs        ← native tray icon + unread badge
│       └── logger.rs      ← file + terminal logger with daily rotation
└── scripts/
    └── release.mjs        ← `pnpm release:patch|minor|major`
```

---

## Status

Tudo abaixo está **implementado e funcionando** (V0.1.0 — primeira release):

- **Discovery:** mDNS (`_xhare._tcp.local.`) via `mdns-sd` + ARP fallback +
  TCP heartbeat. Host claim usa `xhare-<hostname>.local.` pra evitar conflito
  com o LocalHostName do macOS (que bumpa pra `-1`, `-2`, … quando colide).
  IP picker prefere o /24 da própria máquina (Windows multi-NIC).
- **Transferência:** TCP chunks de 256KB + CRC32 + JSON header. Frontend gera
  o UUID **antes** do invoke pra evitar race com eventos. Folder → auto-zip
  com progresso real (pré-scan + emit por bytes lidos).
- **UI completa:** drag-drop, paste (clipboard files via Rust + inline blobs),
  multi-select com bottom action bar, Cmd/Ctrl+A toggle, Cmd/Ctrl+C copia
  arquivo real pro clipboard, browser-style name dedupe (`notes (1).txt`),
  thumbnails reservados pra futuro.
- **Tray + notifications:** menu bar (macOS) / system tray (Windows). Fechar a
  janela esconde + flipa pra `ActivationPolicy::Accessory` no macOS (some do
  dock). Notificação OS suprimida quando janela focada. Batch debounce 1.5s.
- **Logs:** file logger com rotação diária, viewer in-app, limpeza automática
  >2 dias.

**Roadmap futuro** (não-prioridade):
- Thumbnails de imagem/vídeo no feed
- Pause / resume / cancel mid-transfer
- Hotkey global Cmd/Ctrl+Shift+X (pulado a pedido do usuário)
- Drop no ícone do tray (hard cross-platform — pulado)
- Code signing + notarização

---

## Decisões de UX

- **Broadcast automático** — arquivo enviado vai pra todos os peers online.
- **Fire and forget** — quem está offline não recebe; lista mostra com bolinha
  cinza.
- **Cache, não disco** — arquivo recebido fica em cache até o usuário clicar
  "Salvar". Cache é wipe no exit do app.
- **Não lido** — fundo levemente destacado + borda esquerda azul 2px.
- **Hover actions** — botões de ação aparecem alinhados à direita no hover da
  linha; em modo de seleção (>=1 checkbox marcado), action bar flutuante
  aparece no rodapé com Salvar/Apagar/Limpar.
- **Notificação suprimida quando focado** — se janela está visível+focada,
  Rust skipa o OS notification. Em-app toast também só aparece se desfocado.
- **Batch de 1.5s** — receber 10 arquivos seguidos não gera 10 notifs; agrupa
  em "Felipe enviou 10 arquivos".

---

## Comandos

```bash
# Dev
pnpm tauri dev          # app completo com hot reload
pnpm dev                # só Vite (sem Tauri)
pnpm build              # build de produção (frontend)
pnpm tauri build        # gera .dmg / .msi locais

# Verificação
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint .
pnpm lint:fix           # eslint . --fix
pnpm test               # vitest run
pnpm test:watch         # vitest em watch

# Release (script automatizado)
pnpm release:patch      # 0.1.0 → 0.1.1
pnpm release:minor      # 0.1.5 → 0.2.0
pnpm release:major      # 0.4.2 → 1.0.0
```

---

## Release process

`pnpm release:<kind>` em `scripts/release.mjs`:

1. Valida ambiente — recusa se não está em `main`, working tree suja, ou local
   desincado com `origin/main`.
2. Bumpa versão em `package.json`, `tauri.conf.json`, `Cargo.toml`, refresca
   `Cargo.lock`.
3. Commit `release: vX.Y.Z` + tag anotada + push.
4. Tag push dispara `.github/workflows/release.yml` que builda `.dmg`
   universal (macOS) + `.msi` (Windows) em paralelo e publica GitHub Release.

CI separado em `.github/workflows/ci.yml` roda em todo push/PR pra `main`:
typecheck + lint + tests no frontend, `cargo check` + `cargo clippy -D
warnings` no Rust.

---

## Tipos globais importantes

```typescript
// src/types/Device.ts
type Device = {
  id: string                    // self:<fullname> | mdns:<fullname> | lan:<ip> | manual:<ip>
  name: string
  address: string
  status: 'ONLINE' | 'OFFLINE'
  isSelf: boolean
}

// src/types/SharedFile.ts
type FileStatus = 'zipping' | 'sending' | 'receiving' | 'sent' | 'received' | 'error'
type FileKind = 'file' | 'folder' | 'image' | 'video'

type SharedFile = {
  id: string
  name: string                  // display name (pode ter "(1)" pra dedupe)
  size: number                  // bytes
  kind: FileKind
  extension?: string
  thumbnailUrl?: string
  from: string                  // device name ou 'você'
  fromAddress?: string          // IP capturado no receive (fallback de match no FromCell)
  sentAt: Date
  status: FileStatus
  progress?: number             // 0-100 durante zipping/sending/receiving
  speedBps?: number             // só durante transfer
  isRead: boolean
  isPinned: boolean
  cachedPath?: string           // cache OS, set on received
  savedPath?: string            // após "Salvar"
  sourcePath?: string           // source do envio (usado pra resend)
}
```

---

## Gotchas conhecidos

- **mDNS hostname bumping** — registre como `xhare-<host>.local.`, nunca `<host>.local.`. macOS Bonjour fica numa briga eterna.
- **Race UUID frontend↔Rust** — gere o id no JS antes do invoke; senão eventos
  podem chegar antes do `addFile` e ficam órfãos (linha trava em 0%).
- **WebKit drag** — `getCurrentWindow().startDragging()` precisa ser chamada
  **sincronamente** do mousedown handler; nada de `await` antes (microtask
  break mata o gesto). Static import only.
- **Tauri v2 tray** — não expõe drop target. Drop no ícone do tray não é
  viável sem código nativo pesado (objc2 + win32 hacks).
- **Notificação OS em dev** — vem com nome/ícone do Terminal (macOS) ou
  PowerShell (Windows) porque o processo herda do parent. Em build instalado
  (.dmg/.msi) vem como "Xhare" corretamente.
- **Tailwind v4 sintaxe** — `p-0!` (sufixo) e não `!p-0` (prefixo).
- **Tailwind v4 + .gitignore** — content auto-detection respeita .gitignore;
  se houver entrada conflitando com pasta real (ex: `logs/`), classes podem
  sumir. Solução: `@source "./**/*.{ts,tsx,html}"` no CSS.
