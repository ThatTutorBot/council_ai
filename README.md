<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/20403d80-be70-4e71-a20a-05851f555957

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend Security Notes

- Gemini requests are handled in `server/index.ts` so the API key is not shipped to browser clients.
- API routes are exposed under `/api/chat/*` and include basic rate limiting.
- A health endpoint is available at `/healthz`.
- Optional HoneyHive observability is enabled when `HONEYHIVE_API_KEY` is set.
