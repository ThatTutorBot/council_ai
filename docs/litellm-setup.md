# LiteLLM setup for Council AI

Use this guide when **`LLM_VENDOR_ADVISOR`** and/or **`LLM_VENDOR_DECIDE`** includes **`openai`** and you want HTTP traffic to go through **[LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/quick_start)** instead of directly to `api.openai.com`.

> **Not using the OpenAI vendor path?** If both routes are **`gemini`** or **`anthropic`** only, you do **not** need LiteLLM — see **[native-providers.md](./native-providers.md)**.

Council AI’s OpenAI stack speaks **OpenAI-compatible HTTP** (`@openai/agents-openai`). LiteLLM sits in front of Gemini, OpenAI, Anthropic, etc., so you can route many upstream APIs through **one** proxy while still using **`OPENAI_MODEL_*`** env vars (often mapped to LiteLLM model aliases).

---

## What you configure where

| Place | Responsibility |
|--------|------------------|
| **LiteLLM** | Holds **real** provider keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, …), routing rules, budgets. |
| **Council AI `.env.local`** | **`LLM_VENDOR_*`** includes **`openai`** → set **`LITELLM_BASE_URL`** → your proxy; **`LITELLM_API_KEY`** (preferred) or **`OPENAI_API_KEY`** → token the **proxy** validates (master key or [virtual key](https://docs.litellm.ai/docs/proxy/virtual_keys)); **`OPENAI_MODEL_*`** → model id the proxy understands. |

Keys never go to the browser — only the Node server reads `.env.local`.

---

## 1. Install and run the proxy

Official quickstart: [LiteLLM Proxy – Quick start](https://docs.litellm.ai/docs/proxy/quick_start).

Typical local run (after `pip install 'litellm[proxy]'`):

```bash
export GEMINI_API_KEY="your-google-ai-studio-key"
export OPENAI_API_KEY="your-openai-key"   # if you use OpenAI models too

litellm --config /path/to/litellm_config.yaml
```

Default proxy URL is often **`http://0.0.0.0:4000`**. The OpenAI client expects a base path that includes **`/v1`** (see below).

---

## 2. Example `litellm_config.yaml` (multiple models)

Define **friendly names** you reuse in Council AI as **`OPENAI_MODEL_FAST`** / **`OPENAI_MODEL_DECIDE`**.

```yaml
model_list:
  - model_name: council-fast
    litellm_params:
      model: gemini/gemini-2.0-flash
      api_key: os.environ/GEMINI_API_KEY

  - model_name: council-decide
    litellm_params:
      model: gemini/gemini-2.0-flash
      api_key: os.environ/GEMINI_API_KEY

  - model_name: council-openai
    litellm_params:
      model: gpt-4o-mini
      api_key: os.environ/OPENAI_API_KEY
```

You can point **both** `council-fast` and `council-decide` at the same or different `model_name` rows.

**Alternatively**, pass LiteLLM’s full model strings in Council AI if your proxy accepts them — see [LiteLLM model routing](https://docs.litellm.ai/docs/proxy/model_management).

---

## 3. Council AI `.env.local`

You must keep **`LLM_VENDOR_ADVISOR`** / **`LLM_VENDOR_DECIDE`** (or **`LLM_VENDOR`**) as **`openai`** for this path.

```bash
LLM_VENDOR="openai"

# Proxy — must match where LiteLLM listens; OpenAI SDK usually wants .../v1
LITELLM_BASE_URL="http://127.0.0.1:4000/v1"

# Key sent *to the proxy* (LiteLLM master or virtual key — not necessarily your raw Gemini key here)
LITELLM_API_KEY="your-litellm-master-or-virtual-key"
# Alternatively: OPENAI_API_KEY="same-value"

OPENAI_MODEL_FAST="council-fast"
OPENAI_MODEL_DECIDE="council-decide"
```

Restart **`npm run dev`** after edits.

Check **`GET http://localhost:3001/healthz`** — **`llmProxy`** appears when the server sees your proxy URL.

---

## 4. Responses API vs Chat Completions

This repo defaults to **Chat Completions** when a proxy URL is set (`useResponses: false` in code). If your LiteLLM deployment exposes the OpenAI **Responses** API and the Agents SDK needs it, try:

```bash
LITELLM_USE_RESPONSES="true"
```

If calls fail with transport or 404 errors, leave `LITELLM_USE_RESPONSES` unset or `false` and ensure LiteLLM supports the path the SDK uses.

---

## 5. Troubleshooting

| Symptom | Things to check |
|--------|-------------------|
| `401` / auth errors | **`LITELLM_API_KEY`** / **`OPENAI_API_KEY`** in `.env.local` matches what LiteLLM expects; virtual keys and env vars on the proxy process. |
| Unknown model | **`OPENAI_MODEL_*`** matches `model_name` in YAML or a valid LiteLLM route. |
| Connection refused | LiteLLM is running; **`LITELLM_BASE_URL`** host/port and **`/v1`** match [your proxy URL](https://docs.litellm.ai/docs/proxy/quick_start). |
| Structured output errors | Try another model on the proxy; some routes handle JSON / tool shapes differently. |

---

## References

- [LiteLLM Proxy docs](https://docs.litellm.ai/docs/proxy/quick_start)
- [Virtual keys](https://docs.litellm.ai/docs/proxy/virtual_keys)
- Repo: `server/llm/configureOpenAIProvider.ts`, `.env.example`
- Native multi-provider (no proxy): [native-providers.md](./native-providers.md)
- Internal spec: `.trellis/spec/backend/llm-configuration.md`
