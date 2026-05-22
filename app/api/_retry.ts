import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ランタイムで初期化（ビルド時にAPIキーが不要）
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const retryable = e?.status === 429 || (e?.status >= 500 && e?.status < 600);
      if (!retryable || attempt === maxAttempts - 1) throw e;
      await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
    }
  }
  throw lastError;
}

/** シングルターン（system + user 1件）でClaude→GPT-4oフォールバック */
export async function createMessageWithFallback(params: {
  system: string;
  userContent: string;
  maxTokens?: number;
}): Promise<string> {
  const { system, userContent, maxTokens = 1024 } = params;

  try {
    const message = await withRetry(() =>
      getAnthropic().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userContent }],
      })
    );
    const content = message.content[0];
    if (content.type === "text") return content.text;
    throw new Error("Unexpected content type");
  } catch (e) {
    console.warn("[Fallback] Claude failed, switching to GPT-4o:", (e as Error)?.message);
  }

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

/** マルチターン会話でClaude→GPT-4oフォールバック */
export async function createChatWithFallback(params: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}): Promise<string> {
  const { system, messages, maxTokens = 1024 } = params;

  try {
    const message = await withRetry(() =>
      getAnthropic().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system,
        messages,
      })
    );
    const content = message.content[0];
    if (content.type === "text") return content.text;
    throw new Error("Unexpected content type");
  } catch (e) {
    console.warn("[Fallback] Claude failed, switching to GPT-4o:", (e as Error)?.message);
  }

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}
