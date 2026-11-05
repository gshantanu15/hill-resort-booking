import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
console.log(
  JSON.stringify({
    model: "anthropic/claude-haiku-5.5",
    inferenceEnabled: process.env.AI_INFERENCE_ENABLED === "true",
    keyConfigured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    mode: "configuration-only; no provider requests",
  }),
);
console.log(
  "Use ai:trial for explicit budgeted synthetic evaluation; ai:control for runtime status/stop.",
);
