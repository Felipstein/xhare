# Xhare — CLAUDE.md

App desktop de compartilhamento de arquivos em tempo real entre PCs na mesma rede local (LAN).
Código em `~/js/xhare/app/`.

---

## Como trabalhar neste projeto

### Modo de execução
Sempre trabalhe em **versões pequenas e validáveis**. Cada versão tem escopo fechado, testes passando e app rodando antes de avançar.

### Subagentes
Use subagentes em paralelo sempre que possível:
- **Frontend agent** — implementa componentes React/UI
- **Rust agent** — implementa lógica Tauri (discovery, transfer, cache, tray)
- **Test agent** — escreve testes automatizados pra cada módulo
- **Review agent** — revisa código gerado por outros agentes (qualidade, padrões, edge cases)
- **QA agent** — testa a UI, fluxos, estados de erro, edge cases visuais

### Regras de qualidade
- **Nunca declare uma versão pronta sem:** testes passando + TypeScript sem erros + app rodando
- **Zero `any` no TypeScript** — tipe tudo corretamente
- **Zero code smells** — sem duplicação, sem funções gigantes, sem lógica misturada com UI
- **Componente puro = sem efeito colateral** — hooks e stores ficam fora do JSX
- **Cada arquivo faz uma coisa só**
- Rode `pnpm build` e `pnpm typecheck` antes de marcar qualquer coisa como concluída

---

## Compatibilidade obrigatória

O app **deve rodar identicamente em macOS e Windows**. Nunca use APIs exclusivas de um SO sem o equivalente no outro.

| Concern | macOS | Windows |
|---|---|---|
| Cache | `~/Library/Caches/Xhare/` | `%APPDATA%\Xhare\cache\` |
| Tray | Menu bar (top) | System tray (bottom right) |
| Abrir arquivo | `open` | `explorer` / `start` |
| Separador de path | `/` | use `path::join` no Rust, nunca hardcode |
| Fonte | SF Pro (sistema) | Segoe UI (sistema) |
| Notificação | macOS Notification Center | Windows Toast |

No Rust: use `dirs` crate pra caminhos de sistema. No frontend: Tauri abstrai tudo — nunca acesse paths diretamente no TypeScript.

---

## Stack

- **Shell:** Tauri 2 (Rust + WebView)
- **Frontend:** React 19 + TypeScript + Tailwind CSS v4
- **Package manager:** pnpm
- **State:** Zustand (global) · Context API (local/subtree) · React Query (async/Tauri invokes)
- **UI primitivos:** Radix UI + Lucide React
- **DB local:** SQLite via `rusqlite` (metadata, peers, settings)
- **Plataformas MVP:** macOS + Windows

---

## Estrutura de pastas

```
app/
├── src/
│   ├── components/          ← primitivos de UI reutilizáveis (Button, Input, Dialog, etc.)
│   ├── features/
│   │   ├── devices/         ← DeviceList, useDevices, devicesStore
│   │   ├── file-feed/       ← FileFeed, FileRow, FileRowActions, DragOverlay, useFiles, filesStore
│   │   └── settings/        ← SettingsForm, settingsStore
│   ├── hooks/               ← hooks compartilhados (useHotkey, useDragDrop, useClipboard)
│   ├── services/            ← wrappers de Tauri commands (mock em V1, real em V2+)
│   ├── stores/              ← stores Zustand que cruzam features
│   ├── types/               ← tipos compartilhados
│   ├── mock/                ← dados mockados para V1
│   └── utils/               ← helpers (cn, format, etc.)
├── src-tauri/
│   └── src/
│       ├── main.rs
│       ├── discovery.rs     ← mDNS + IP manual
│       ├── transfer.rs      ← TCP chunks + progress + cancel
│       ├── cache.rs         ← cache em disco + TTL
│       ├── tray.rs          ← ícone, menu, drop target, badge
│       └── hotkeys.rs       ← atalhos globais
```

---

## Roadmap de versões

### V1 — UI completa com mocks ← ATUAL
**Objetivo:** app visualmente completo, todos os estados funcionando, sem Rust real.

Escopo:
- [ ] Feed de arquivos (`FileFeed` + `FileRow`) com mock de dados
- [ ] Estados: vazio, novo/não-lido, lido, enviando (progress), recebendo (progress), erro
- [ ] Hover actions por linha: Salvar · Abrir · Copiar · Mostrar · Descartar (recebido) / Reenviar · Cancelar (enviado)
- [ ] `DragOverlay` — overlay fullscreen ao arrastar arquivo pra janela
- [ ] `SettingsDialog` completo — pasta destino + TTL do cache
- [ ] `NewDeviceDialog` com validação de IP (regex)
- [ ] Sidebar com estados: conectando, sem wifi, sem dispositivos, lista de dispositivos
- [ ] Zustand stores: `filesStore`, `devicesStore`, `settingsStore`
- [ ] `services/` com mock que simula eventos Tauri (receber arquivo, progresso, etc.)
- [ ] Testes: cada componente, cada store, cada hook

**Done when:** `pnpm build` passa, zero erros TypeScript, todos os estados visíveis no app.

---

### V2 — Descoberta real (Rust + mDNS)
- mDNS via crate `mdns-sd`
- Tauri commands: `get_devices`, `add_device_by_ip`, `remove_device`
- Tauri events: `device-discovered`, `device-lost`, `device-status-changed`
- Substituir mock de devices por dados reais
- Testes de integração Rust

**Done when:** dois PCs na mesma rede se descobrem automaticamente.

---

### V3 — Transferência real (Rust TCP)
- Protocolo TCP com chunks de 256KB + checksum + resume
- Cache em `~/Library/Caches/Xhare/` (macOS) / `%APPDATA%\Xhare\cache\` (Windows)
- TTL: limpeza automática baseada em `settingsStore.ttl`
- Tauri events: `transfer-progress`, `transfer-complete`, `transfer-error`
- Drag-drop dispara envio real
- Paste de clipboard (imagem/arquivo)

**Done when:** arquivo vai de um PC pro outro com progress real.

---

### V4 — Tray + notificações + hotkeys
- Tray nativo (macOS menu bar / Windows system tray)
- Drop target no ícone do tray
- Badge quando há arquivos não lidos
- Notificação nativa ao receber arquivo
- Hotkey global `Cmd/Ctrl+Shift+X` pra abrir janela

---

## Design

Arquivo Figma: **"Design Xhare desktop app"** (acessível via Figma MCP `figma-desktop`).

Ao implementar UI:
1. Use a skill `figma:figma-implement-design` ANTES de codificar qualquer tela
2. Leia variáveis de design, estrutura do frame e tire screenshot via MCP
3. Implemente pixel-perfect, depois peça ao Review agent validar contra o Figma

---

## Decisões de UX

- **Broadcast automático** — arquivo enviado vai pra todos os peers online
- **Fire and forget** — quem estava offline não recebe; mostra `⏸ offline` na linha
- **Cache, não disco** — arquivo recebido fica em cache até o usuário escolher Salvar
- **Não lido** — linha com fundo levemente destacado + borda esquerda 2px azul
- **Lido** — linha escura, texto cinza
- **Hover actions** — ações aparecem alinhadas à direita no hover da linha

---

## Comandos

```bash
pnpm dev             # inicia app em modo dev
pnpm build           # build de produção
pnpm tauri dev       # alias pro dev com hot reload
pnpm typecheck       # type check sem build (tsc --noEmit)
pnpm test            # roda testes unitários (vitest)
pnpm test:watch      # vitest em modo watch
```

---

## Tipos globais importantes

```typescript
// src/types/Device.ts
type Device = {
  name: string
  address: string
  status: 'ONLINE' | 'OFFLINE'
}

// src/types/SharedFile.ts
type FileStatus = 'sending' | 'receiving' | 'sent' | 'received' | 'error'

type SharedFile = {
  id: string
  name: string
  size: number           // bytes
  type: 'file' | 'folder' | 'image' | 'video'
  extension?: string
  thumbnailUrl?: string  // só pra imagem/vídeo
  from: string           // device name ou 'você'
  sentAt: Date
  status: FileStatus
  progress?: number      // 0-100, só quando sending/receiving
  speedBps?: number      // bytes/s, só quando sending/receiving
  deliveredTo?: string[] // devices que confirmaram recebimento
  failedTo?: string[]    // devices offline no momento
  isRead: boolean
  isPinned: boolean
  cachedPath?: string    // caminho no cache local
}
```
