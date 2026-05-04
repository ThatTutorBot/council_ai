# Council AI

<div align="center">

[![Live demo — hosted app](https://img.shields.io/badge/LIVE_DEMO-council--ai.onrender.com-7c3aed?style=for-the-badge)](https://council-ai.onrender.com/)

### Talk to a council of AI advisors at once

Group‑chat UI · coordinator picks who speaks · bilingual flair · **OpenAI Agents SDK** + Express API

</div>

---

## At a glance

Council AI is a **multi‑advisor chat**: you message once; several fixed personas (see `src/types.ts`) can reply in turn, orchestrated by a coordinator model. Keys stay on the **server** for local dev; the hosted build is the fastest way to try the experience without cloning.

---

## How to get started

Pick **one** path—both lead to the same app behavior once it is running.

### A · Try it in the browser (fastest)

Open **[council-ai.onrender.com](https://council-ai.onrender.com/)**.

If the deployment shows a **settings / setup** step where you paste a provider key or options, treat that as **temporary for your session** in the browser. Those values are **not** written into `.env.local` on your machine and **not** stored in this repository—they exist only to let that visit talk to the LLM.

### B · Run on your machine

1. **Node.js 22+** (see `package.json` `engines`).
2. Install and copy env template:

   ```bash
   npm install
   cp .env.example .env.local
   ```

3. Edit **`.env.local`** (gitignored):
   - **`OPENAI_API_KEY`** — required for the API to call your LLM endpoint (see **Environment variables** below).
   - Optional: **`LLM_VENDOR_ADVISOR`** and **`GEMINI_API_KEY`** — when your build’s onboarding flow respects server‑side config, setting these can **skip the setup UI** and go straight to **Meet the Council** instead of stepping through provider setup.

4. Start dev:

   ```bash
   npm run dev
   ```

   - **Web UI:** http://localhost:3000  
   - **API:** http://localhost:3001 (or `PORT` from env)

`npm run dev` runs the API and Vite together; `/api` is proxied from the dev server so the browser stays same‑origin.

---

## Features

- **Multi‑advisor council** — Toggle who is in the room; personas + avatars live in `src/types.ts`.
- **Coordinator** — After your message, the backend chooses which advisor(s) reply (with fallbacks if the model returns nothing usable).
- **Bilingual replies** — Primary text plus a short translation line where configured.
- **Chat UX** — Thread, mentions, optional HoneyHive session ids.
- **LiteLLM‑ready** — Point **`LITELLM_BASE_URL`** / **`OPENAI_BASE_URL`** at any OpenAI‑compatible proxy and use model strings the proxy understands.

---

## Architecture

| Layer | Stack |
|--------|--------|
| Frontend | **React 19**, **Vite 6**, **Tailwind CSS**, **Motion**, `components/` |
| Backend | **Express**, **TypeScript**, **`@openai/agents`**, **`zod`** |
| LLM | OpenAI API by default, or a compatible base URL via env |

```
Browser (Vite dev, :3000)  →  /api  →  Express (:3001)  →  OpenAI‑compatible endpoint
```

---

## Environment variables

See **`.env.example`** for the full list.

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for normal local/server runs. Read only on the server, never sent to the browser bundle. |
| `PORT` | API port (default `3001`). |
| `OPENAI_MODEL_FAST` | Advisor replies model (default `gpt-4.1-mini` if unset in code). |
| `OPENAI_MODEL_DECIDE` | Coordinator model. |
| `LITELLM_BASE_URL` | Optional OpenAI‑compatible root (often ends with `/v1`). |
| `OPENAI_BASE_URL` | Optional alias for the same `baseURL`. |
| `LITELLM_USE_RESPONSES` | `true` only if your proxy supports OpenAI **Responses** API. |
| `HONEYHIVE_*` | Optional tracing. |
| `LLM_VENDOR_ADVISOR` | Optional. With onboarding that reads server env, helps **skip setup** and land on **Meet the Council**. |
| `GEMINI_API_KEY` | Optional. Same idea when using Gemini through your stack or proxy. |

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | API + web with hot reload |
| `npm run dev:api` | API only (`tsx watch server/index.ts`) |
| `npm run dev:web` | Vite only (port 3000) |
| `npm run build` | Production build (`dist/`) |
| `npm run start` | API only — serve `dist/` separately in production |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run preview` | Preview Vite production build |

---

## HTTP API

All routes accept JSON. Rate limiting applies under `/api`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Liveness; includes `llmProxy` when a proxy base URL is configured |
| `POST` | `/api/chat/respond` | Body: `advisorId`, `history`, optional `sessionId` → `{ message, sessionId? }` |
| `POST` | `/api/chat/decide` | Body: `history`, `activeAdvisorIds`, optional `sessionId` → `{ ids: string[] }` |

Errors: **`400`** with `{ "error": "..." }` for typical failures.

---

## LiteLLM (multi‑provider routing)

1. Run a [LiteLLM proxy](https://docs.litellm.ai/docs/proxy/quick_start) (or another OpenAI‑compatible gateway).
2. Set **`LITELLM_BASE_URL`** to your proxy’s OpenAI‑compatible root (often ends with `/v1`).
3. Set **`OPENAI_API_KEY`** to whatever that proxy expects (virtual key, master key, etc.).
4. Set **`OPENAI_MODEL_FAST`** / **`OPENAI_MODEL_DECIDE`** to models your proxy understands (e.g. `gemini/gemini-2.0-flash`, `openai/gpt-4o-mini`).

More detail: **`.trellis/spec/backend/llm-configuration.md`**.

---

## Security and privacy

- **Server holds LLM credentials** — `OPENAI_API_KEY` and proxy settings are read in Node, not exposed to the client bundle.
- Use **HTTPS** and tighten **`CORS`** / deployment URLs in production.
- Do not commit **`.env.local`**.

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
│   └── .nojekyll        # Reserved if you publish static docs on GitHub Pages
├── public/avatars/
├── .env.example
└── .trellis/            # Trellis task/spec tooling (optional for contributors)
```

---

## Contributing

Issues and pull requests are welcome. Run **`npm run lint`** before submitting. If you change API shapes, update the client (`src/services/chatService.ts`) and this README.

---

## License

[MIT](LICENSE). You may replace the copyright line in `LICENSE` with your legal name or organization if you prefer.
