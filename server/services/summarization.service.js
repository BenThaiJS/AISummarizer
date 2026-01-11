const fetch = require("node-fetch");
const chunkText = require("../utils/chuckText");
const logger = require("../utils/logger");

const OLLAMA_URL = "http://localhost:11434/api/generate";

async function summarizeChunk(chunk) {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:270m",
        prompt: `
You are an expert summarizer.

Summarize the following transcript chunk into concise bullet points.
Focus on:
- Key ideas
- Actionable insights
- Clear wording

Transcript:
${chunk}
`,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`ollama error: ${res.status} ${text}`);
      logger.error("summarize:api_error", { err: err.message });
      throw err;
    }

    const data = await res.json();
    return data.response;
  } catch (e) {
    logger.error("summarize:chunk_error", { err: e.message });
    throw e;
  }
}

exports.summarize = async (text, onProgress) => {
  const chunks = chunkText(text);
  const summaries = [];

  for (let i = 0; i < chunks.length; i++) {
    const s = await summarizeChunk(chunks[i]);
    summaries.push(s);
    try {
      onProgress && onProgress(((i + 1) / chunks.length) * 100);
    } catch (e) {
      logger.warn("summarize:onProgress_failed", { err: e.message });
    }
  }

  return summaries.join("\n\n");
};
