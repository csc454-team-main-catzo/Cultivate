```
npm install
npm run dev
```

```
open http://localhost:3000
```

**Glean Agent** — `POST /api/glean/agent` runs the Glean chat agent (LLM + listing search). Optional `OPENAI_API_KEY` in `.env` for LLM-powered farmer drafts and intro text. Chat UX follows the [21st.dev Chat App template](https://21st.dev/agents/docs/templates/chat-app) pattern (streaming intro + structured payloads).
