# Council AI — documentation index

| Doc | When to read |
|-----|----------------|
| **[native-providers.md](./native-providers.md)** | Routing **OpenAI**, **Gemini**, and **Anthropic** with separate keys (`LLM_VENDOR_*`) — no LiteLLM required. |
| **[litellm-setup.md](./litellm-setup.md)** | Optional **[LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/quick_start)** in front of the **OpenAI-compatible** stack only (`LLM_VENDOR_*` includes `openai`). |

Also see **`.env.example`** at the repo root and **`README.md`** for setup and architecture.

## Client data

Named council **groups** (titles, membership, transcripts) and the HoneyHive **`sessionId`** per group are stored in **`localStorage`** under the key `council-ai-chat-groups-v1`. Data stays **on this browser** only—clearing site storage resets chats.

Advisor **portraits** use **Wikimedia Commons** **330px thumbnails** (URLs in `src/types.ts`), consistent with Wikipedia infobox images. If `upload.wikimedia.org` is unreachable, avatars may not render until the network allows it.

Internal contributor specs: [**`.trellis/spec/backend/llm-configuration.md`**](../.trellis/spec/backend/llm-configuration.md).
