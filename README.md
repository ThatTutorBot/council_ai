# Council AI

A **group-chat style web app** where you talk with several **AI advisors** at once—each with a fixed persona, bilingual replies (Chinese / English depending on the character), and a coordinator model that picks who speaks next. The UI is inspired by mobile messaging; the backend uses the **OpenAI Agents SDK** (TypeScript) behind a small Express API.

---

## Features

- **Multi-advisor council** — Toggle which advisors are in the room; advisors are defined in `src/types.ts` (e.g. Zhuge Liang, Cao Cao, Marcus Aurelius) with instructions and avatars.
- **Coordinator** — After your message, the backend decides which advisor(s) should reply (with a fallback if the model returns nothing valid).
- **Bilingual messages** — Each advisor reply includes primary text plus a short translation, matching persona language settings.
- **Client-side chat UX** — Scrollable thread, mentions, optional HoneyHive session ids for observability.
- **LiteLLM-ready** — Use [LiteLLM](https://github.com/BerriAI/litellm) (or any OpenAI-compatible proxy) so you can route to many providers via model strings, without adding per-vendor SDKs in Node.
- **Welcome flow** — Each **full page load** starts the onboarding experience for direct visits. **`?demo=1`** or **`?embed=1`** skips it for embedded previews (e.g. GitHub Pages iframe).

---

## Architecture

| Layer | Stack |
|--------|--------|
| Frontend | **React 19**, **Vite 6**, **Tailwind CSS**, **Motion**, UI primitives under `components/` |
| Backend | **Express**, **TypeScript**, **`@openai/agents`** (`Agent` per advisor + coordinator), **`zod`** for structured outputs |
| LLM transport | Default **OpenAI API**, or **`LITELLM_BASE_URL` / `OPENAI_BASE_URL`** for a compatible proxy |

```
Browser (Vite dev server, port 3000)
    → proxies /api → Express (port 3001)
          → OpenAI-compatible endpoint (OpenAI or LiteLLM)
```

---

## Prerequisites

- **Node.js 22+** (`@openai/agents` and `package.json` `engines`)
- An **OpenAI API key**, or a **LiteLLM proxy** (or similar) with a key your proxy expects

---

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local — set OPENAI_API_KEY (and optional LITELLM_BASE_URL / models)
npm run dev
```

- **Web UI:** http://localhost:3000  
- **API:** http://localhost:3001 (or `PORT` from env)

`npm run dev` runs the API and the Vite dev server together (`concurrently`). The Vite config proxies `/api` to the backend so the browser can call `/api/chat/*` on the same origin.

---

## Environment variables

See **`.env.example`** for the full list. Common entries:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required. Sent only from the server to your LLM endpoint. |
| `PORT` | API port (default `3001`). |
| `OPENAI_MODEL_FAST` | Model for advisor replies (default `gpt-4.1-mini` in code if unset). |
| `OPENAI_MODEL_DECIDE` | Model for the coordinator (defaults follow fast / `OPENAI_DEFAULT_MODEL`). |
| `LITELLM_BASE_URL` | Optional. OpenAI-compatible base URL (e.g. `http://127.0.0.1:4000/v1`). |
| `OPENAI_BASE_URL` | Optional alias for the same `baseURL`. |
| `LITELLM_USE_RESPONSES` | Set `true` only if your proxy supports OpenAI **Responses** API; otherwise the app uses Chat Completions against the proxy. |
| `HONEYHIVE_*` | Optional LLM tracing via HoneyHive. |

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | API + web with hot reload |
| `npm run dev:api` | API only (`tsx watch server/index.ts`) |
| `npm run dev:web` | Vite only (port 3000) |
| `npm run build` | Production build of the frontend (`dist/`) |
| `npm run start` | Run API only (`tsx server/index.ts`) — serve `dist/` separately or use a process manager |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run preview` | Preview Vite production build |

---

## HTTP API

All routes accept JSON. Rate limiting applies under `/api`.

| Method | Path | Description |
|--------|------|--------------|
| `GET` | `/healthz` | Liveness; includes `llmProxy` when a proxy base URL is configured |
| `POST` | `/api/chat/respond` | Body: `advisorId`, `history`, optional `sessionId` → `{ message, sessionId? }` |
| `POST` | `/api/chat/decide` | Body: `history`, `activeAdvisorIds`, optional `sessionId` → `{ ids: string[] }` |

Errors: **`400`** with `{ "error": "..." }` for typical failures.

---

## LiteLLM (multi-provider routing)

1. Run a [LiteLLM proxy](https://docs.litellm.ai/docs/proxy/quick_start) (or another OpenAI-compatible gateway).
2. Set **`LITELLM_BASE_URL`** to your proxy’s OpenAI-compatible root (often ends with `/v1`).
3. Set **`OPENAI_API_KEY`** to whatever that proxy expects (virtual key, master key, etc.).
4. Set **`OPENAI_MODEL_FAST`** / **`OPENAI_MODEL_DECIDE`** to models your proxy understands (e.g. `gemini/gemini-2.0-flash`, `openai/gpt-4o-mini`).

More detail is in **`.trellis/spec/backend/llm-configuration.md`** if you use this repo’s Trellis docs.

---

## Security and privacy

- **API keys never go to the browser** — only the Node server reads `OPENAI_API_KEY` and proxy settings.
- Use **HTTPS** and lock down **`CORS`** / deployment URLs in production.
- Do not commit **`.env.local`** (keep it gitignored).

---

## GitHub Pages embed (`docs/index.html`)

If you publish **`/docs`** with GitHub Pages, **`docs/index.html`** wraps the live Render app in an iframe.

**Not interactive on the repo “landing” itself:** the default GitHub **repository page** only shows markdown + static images — it cannot run embedded apps like gallery sites ([Godly](https://godly.website/)). Use your **`*.github.io`** Pages URL from repository **Settings → Pages** for the full in-page demo.

**If the embed feels “stuck”:**

1. **Click inside** the dark chat area first — many browsers require a tap on a cross-origin iframe before typing or scrolling fully works.
2. **Cold start:** Render may spin up slowly; wait a few seconds or open **Open full tab** on the embed page.
3. **API errors:** Ensure the Render deployment has a valid **`OPENAI_API_KEY`** (and models); otherwise sends fail even though the UI loads.

---

## Repository layout

```
council_ai/
├── src/                 # React app, types, chat service
├── server/
│   ├── index.ts         # Express routes
│   ├── llm/             # OpenAI provider / LiteLLM base URL wiring
│   └── agents/          # Advisor + coordinator agents, zod schemas
├── docs/
│   ├── index.html       # Optional GitHub Pages shell (iframe → Render + ?demo=1)
│   └── .nojekyll        # Serve static HTML without Jekyll
├── public/avatars/      # Advisor images
├── .env.example
└── .trellis/            # Optional Trellis task/spec tooling for contributors
```

---

## Contributing

Issues and pull requests are welcome. Run **`npm run lint`** before submitting. If you change API shapes, update the client (`src/services/chatService.ts`) and this README.

---

## License

[MIT](LICENSE). You may replace the copyright line in `LICENSE` with your legal name or organization if you prefer.
