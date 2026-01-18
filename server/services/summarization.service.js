const OpenAI = require("openai");
const chunkText = require("../utils/chuckText");
const logger = require("../utils/logger");
const config = require("../config/env");

const client = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

async function summarizeChunk(chunk) {
  try {
    const completion = await client.chat.completions.create({
      model: config.OPENAI_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are an expert summarizer.

Summarize the following transcript chunk into concise bullet points.
Focus on:
- Key ideas
- Actionable insights
- Clear wording

Transcript:
${chunk}`,
        },
      ],
    });

    return completion.choices[0].message.content;
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
