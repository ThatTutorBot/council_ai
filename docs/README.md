# Council AI — documentation index

| Doc | When to read |
|-----|----------------|
| **[native-providers.md](./native-providers.md)** | Routing **OpenAI**, **Gemini**, and **Anthropic** with separate keys (`LLM_VENDOR_*`) — no LiteLLM required. |
| **[litellm-setup.md](./litellm-setup.md)** | Optional **[LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/quick_start)** in front of the **OpenAI-compatible** stack only (`LLM_VENDOR_*` includes `openai`). |

Also see **`.env.example`** at the repo root and **`README.md`** for setup and architecture.

Internal contributor specs: [**`.trellis/spec/backend/llm-configuration.md`**](../.trellis/spec/backend/llm-configuration.md).
