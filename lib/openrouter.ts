const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek/deepseek-chat-v3-0324";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

function getApiKey(): string {
  const raw = process.env.OPENROUTER_API_KEY?.trim();

  if (!raw) {
    throw new Error("OPENROUTER_API_KEY не задан в .env.local");
  }

  return raw.replace(/^\[|\]$/g, "");
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Referent",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
    }),
    signal: AbortSignal.timeout(120000),
  });

  let data: OpenRouterResponse;

  try {
    data = (await response.json()) as OpenRouterResponse;
  } catch {
    throw new Error("Некорректный ответ от OpenRouter");
  }

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenRouter вернул ошибку: HTTP ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter не вернул текст ответа");
  }

  return content;
}
