# Native multi-provider setup (OpenAI, Gemini, Claude)

Council AI can call **OpenAI** (via the Agents SDK), **Google Gemini**, and **Anthropic Claude** with **separate API keys** — no LiteLLM required. You bill and monitor usage on **each provider’s own console**.

---

## Routing

| Env | Meaning |
|-----|---------|
| `LLM_VENDOR_ADVISOR` | `openai` \| `gemini` \| `anthropic` — who generates advisor replies |
| `LLM_VENDOR_DECIDE` | Same — who runs the “who speaks next” coordinator |
| `LLM_VENDOR` | Sets **both** advisor and decide when the two above are unset (defaults to **`openai`** if everything is empty) |

Resolution logic lives in **`server/llm/vendors.ts`**.

### Examples

| Goal | Sample `.env.local` |
|------|---------------------|
| All OpenAI (default) | Leave unset or `LLM_VENDOR=openai`, `OPENAI_API_KEY=sk-...` |
| All Gemini | `LLM_VENDOR=gemini`, `GEMINI_API_KEY=...`, `GEMINI_MODEL_*` |
| All Claude | `LLM_VENDOR=anthropic`, `ANTHROPIC_API_KEY=...`, `ANTHROPIC_MODEL_*` |
| Mixed | `LLM_VENDOR_ADVISOR=gemini`, `LLM_VENDOR_DECIDE=openai`, plus **`GEMINI_API_KEY`** and **`OPENAI_API_KEY`** |

---

## API keys (only set what you use)

| Vendor | Env var | Where to get / track usage |
|--------|---------|------------------------------|
| OpenAI | `OPENAI_API_KEY` | [OpenAI API keys](https://platform.openai.com/api-keys), [usage](https://platform.openai.com/usage) |
| Gemini | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) / Cloud — per Google’s product |
| Anthropic | `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) |

Startup fails fast with a clear error if a vendor is selected but its key is missing (**`server/llm/validateLlmEnv.ts`**).

---

## Model IDs

Set independently per route:

| Role | OpenAI | Gemini | Anthropic |
|------|--------|--------|-----------|
| Advisor | `OPENAI_MODEL_FAST` | `GEMINI_MODEL_FAST` | `ANTHROPIC_MODEL_FAST` |
| Decide | `OPENAI_MODEL_DECIDE` | `GEMINI_MODEL_DECIDE` | `ANTHROPIC_MODEL_DECIDE` |

Defaults are defined in **`server/llm/models.ts`** (e.g. `gpt-4.1-mini`, `gemini-2.0-flash`, `claude-3-5-sonnet-20241022`). For **Claude Opus**, set e.g. `ANTHROPIC_MODEL_FAST=claude-3-opus-20240229` — confirm current IDs in **[Anthropic models](https://docs.anthropic.com/claude/docs/models-overview)**.

---

## LiteLLM vs native

- **Native** (this doc): Council AI calls Gemini with **`@google/genai`** and Claude with **`@anthropic-ai/sdk`** when you set **`LLM_VENDOR_*`** to **`gemini`** / **`anthropic`**.
- **LiteLLM** ([litellm-setup.md](./litellm-setup.md)): optional **only for the `openai` vendor path** — points the OpenAI-compatible client at your proxy. You still need **`OPENAI_API_KEY`** / **`LITELLM_API_KEY`** when `LLM_VENDOR_*` includes **`openai`**.

---

## Health check

`GET /healthz` returns JSON including:

- **`llm.advisor`** / **`llm.decide`** — resolved vendors (`openai` \| `gemini` \| `anthropic`)
- **`llmProxy`** — present when **`LITELLM_BASE_URL`** is set (OpenAI stack → LiteLLM)

---

## Code map

| Vendor | Packages | Server files |
|--------|----------|----------------|
| OpenAI | `@openai/agents`, `@openai/agents-openai` | `server/agents/*`, `run()` in `server/index.ts`, `server/llm/configureOpenAIProvider.ts` |
| Gemini | `@google/genai` | `server/llm/geminiNative.ts` |
| Anthropic | `@anthropic-ai/sdk` | `server/llm/anthropicNative.ts` |

Shared types: **`server/llm/contracts.ts`** (`TrackModelCall`).

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| `Missing LLM API key…` | **`OPENAI_API_KEY`** / **`LITELLM_*`** when advisor or decide uses **openai**. |
| `GEMINI_API_KEY is required…` | Vendor includes **gemini** but key unset. |
| `ANTHROPIC_API_KEY is required…` | Vendor includes **anthropic** but key unset. |
| JSON parse errors (Anthropic) | Model ignored JSON-only instructions — try a stronger model or shorter prompts. |
| Wrong model | **`GEMINI_MODEL_*`**, **`ANTHROPIC_MODEL_*`**, **`OPENAI_MODEL_*`** match strings your provider accepts. |
