# Council AI

<div align="center">

[![Live demo — hosted app](https://img.shields.io/badge/LIVE_DEMO-council--ai.onrender.com-7c3aed?style=for-the-badge)](https://council-ai.onrender.com/)

### Talk to a council of AI advisors at once

Group‑chat UI · multi‑provider LLMs · **OpenAI Agents** path + native Gemini & Claude

<p align="center">
  <a href="https://council-ai.onrender.com/" title="Open the live app on Render">
    <img
      src="docs/images/council-ai-live.png"
      alt="Council AI — live council chat UI on Render"
      width="900"
    />
  </a>
</p>

<p align="center">
  <sub>
    Screenshot is static ·
    <a href="https://thattutorbot.github.io/council_ai/">GitHub Pages</a> embeds the app · on Render,
    <code>?embed=1</code> skips the capsule for iframe-style views (<a href="#github-pages-embedded-demo">details</a>)
  </sub>
</p>

</div>

---

## At a glance

Council AI is a **multi‑advisor chat**: you send one message; several personas (see `src/types.ts`) can reply in turn, coordinated by a router model. **LLM credentials stay on the server** for local runs; values you enter in the **hosted** app’s setup UI apply **only to that browser session** — they are **not** written into `.env.local` or committed to this repo.

**Documentation index:** [docs/README.md](docs/README.md)

---

## How to get started

Pick **one** path.

### A · Try it in the browser

Open **[council-ai.onrender.com](https://council-ai.onrender.com/)** — home is the **Council capsule**; expand to chat or setup. For iframe-style previews use **`?embed=1`** (expanded UI).

If the deployment shows a **setup** step, treat keys you paste there as **session‑scoped** in the browser — they do not create or change a developer’s `.env.local`.

### B · Run on your machine

1. **Node.js 22+** (`package.json` `engines`).
2. Install and env template:

   ```bash
   npm install
   cp .env.example .env.local
   ```

3. Edit **`.env.local`** — set **`LLM_VENDOR_ADVISOR`** / **`LLM_VENDOR_DECIDE`** (or **`LLM_VENDOR`**) and the API keys for whichever vendors you use. See **[docs/native-providers.md](docs/native-providers.md)** (and **[docs/litellm-setup.md](docs/litellm-setup.md)** if you use LiteLLM for the OpenAI path).

   When the **server** already has the keys it needs (including **`GEMINI_API_KEY`** when Gemini is selected, etc.), onboarding can **skip the setup UI** and go straight to **Meet the Council**.

4. Start development:

   ```bash
   npm run dev
   ```

   - **Web UI:** http://localhost:3000  
   - **API:** http://localhost:3001 (or `PORT` from env)

`npm run dev` runs the API and Vite together; Vite proxies `/api` to the backend.

---

## Features

- **Multi-advisor council** — Toggle which advisors are in the room; advisors are defined in `src/types.ts` (e.g. Zhuge Liang, Cao Cao, Marcus Aurelius) with instructions and avatars.
- **Coordinator** — After your message, the backend decides which advisor(s) should reply (with a fallback if the model returns nothing valid).
- **Bilingual messages** — Each advisor reply includes primary text plus a short translation, matching persona language settings.
- **Client-side chat UX** — Scrollable thread, mentions, optional HoneyHive session ids for observability.
- **Multi-provider** — Set **`LLM_VENDOR_ADVISOR`** / **`LLM_VENDOR_DECIDE`** (or **`LLM_VENDOR`**) to `openai`, `gemini`, or `anthropic`; use each vendor’s API key. See **[docs/native-providers.md](docs/native-providers.md)**.
- **Optional LiteLLM** — When the **openai** path is used, **`LITELLM_BASE_URL`** can route to a [LiteLLM](https://github.com/BerriAI/litellm) proxy. See **[docs/litellm-setup.md](docs/litellm-setup.md)**.

---

## Architecture

**Stack:** React 19, Vite 6, Tailwind, Motion (`components/`) · Express + TypeScript (`server/index.ts`) · `@openai/agents` + Zod, or native **`@google/genai`** / **`@anthropic-ai/sdk`** · optional LiteLLM via `LITELLM_BASE_URL`.

Local dev: the Vite dev server proxies `/api` to Express. Production serves the built SPA and the same API.

```mermaid
flowchart LR
  B["Browser · Vite :3000"] -->|"/api"| E["Express :3001"]
  E --> L["OpenAI · Gemini · Anthropic\nor LiteLLM → upstream"]
```

---

## Prerequisites

- **Node.js 22+** (`package.json` `engines`; required by `@openai/agents`)
- API keys for whichever vendors you select — see **[docs/native-providers.md](docs/native-providers.md)**

---

## Environment variables

See **`.env.example`** and **[docs/README.md](docs/README.md)**.

### Native vendors

| Variable | Purpose |
|----------|---------|
| `LLM_VENDOR_ADVISOR` | `openai` \| `gemini` \| `anthropic` — advisor replies (default `openai`). |
| `LLM_VENDOR_DECIDE` | Same — coordinator (default `openai`). |
| `LLM_VENDOR` | Sets **both** if the per-route vars are unset. |
| `OPENAI_API_KEY` | When **openai** is used (direct OpenAI or LiteLLM token if `LITELLM_BASE_URL` is set). |
| `GEMINI_API_KEY` | When **gemini** is used. |
| `ANTHROPIC_API_KEY` | When **anthropic** is used. |
| `OPENAI_MODEL_*`, `GEMINI_MODEL_*`, `ANTHROPIC_MODEL_*` | Model IDs per route — see `.env.example`. |

### LiteLLM (optional; **openai** vendor only)

| Variable | Purpose |
|----------|---------|
| `LITELLM_API_KEY` | Proxy bearer token (preferred with LiteLLM). |
| `LITELLM_BASE_URL` | e.g. `http://127.0.0.1:4000/v1` |
| `LITELLM_USE_RESPONSES` | See **docs/litellm-setup.md** |
| `PORT` | API port (default `3001`). |
| `HONEYHIVE_*` | Optional LLM tracing. |

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | API + web with hot reload |
| `npm run dev:api` | API only (`tsx watch server/index.ts`) |
| `npm run dev:web` | Vite only (port 3000) |
| `npm run build` | Production build (`dist/`) |
| `npm run start` | API only (`tsx server/index.ts`) |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run preview` | Preview Vite production build |

---

## HTTP API

All routes use JSON. Rate limiting applies under `/api`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Liveness; **`llm`**: `{ advisor, decide }` vendors; **`llmProxy`**: set when LiteLLM URL configured |
| `POST` | `/api/chat/respond` | `advisorId`, `history`, optional `sessionId` → `{ message, sessionId? }` |
| `POST` | `/api/chat/decide` | `history`, `activeAdvisorIds`, optional `sessionId` → `{ ids }` |

Errors: **`400`** with `{ "error": "..." }`.

---

## Security and privacy

- **API keys stay on the server** — `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, LiteLLM tokens, etc. are read only in Node; never expose them to the browser.
- Use **HTTPS** and sensible **CORS** in production.
- Do not commit **`.env.local`**.

---

## Repository layout

```
council_ai/
├── src/                   # React app, types, chat service
├── server/
│   ├── index.ts           # Express, vendor dispatch, HoneyHive
│   ├── llm/               # configureOpenAIProvider, vendors, models, Gemini/Anthropic natives
│   └── agents/            # OpenAI Agents + zod schemas
├── public/                  # Static assets (optional; advisor portraits use Wikimedia URLs in code)
├── docs/
│   ├── index.html         # GitHub Pages: full-page iframe → Render (enable Pages from /docs)
│   ├── .nojekyll          # Disable Jekyll so `index.html` is served as-is
│   ├── README.md          # Doc index
│   ├── images/
│   │   └── council-ai-live.png  # README hero image
│   ├── native-providers.md
│   └── litellm-setup.md
├── .env.example
└── .trellis/              # Trellis task/spec tooling (contributors)
```

---

## Contributing

Issues and pull requests are welcome. Run **`npm run lint`** before submitting. If you change API shapes, update **`src/services/chatService.ts`** and this README / **`docs/`** as needed.

---

## GitHub Pages embedded demo

The static page **`docs/index.html`** embeds the app at **`https://council-ai.onrender.com/?embed=1`** inside a framed viewport (expanded UI for iframes). API stays on Render.

**Enable it:** Repository **Settings → Pages → Build and deployment → Branch** → choose **`main`** (or your default branch) and folder **`/docs`**, then save. After the first deploy, the site is typically:

**https://thattutorbot.github.io/council_ai/**

If your GitHub username or repository name differs, update that URL everywhere it appears in this README and the optional **Source** link in **`docs/index.html`**.

---

## License

[MIT](LICENSE). You may replace the copyright line in `LICENSE` with your legal name or organization if you prefer.
