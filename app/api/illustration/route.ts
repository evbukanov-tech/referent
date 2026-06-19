import { buildArticleText } from "@/lib/articleText";
import { apiError } from "@/lib/errors";
import { generateImage } from "@/lib/huggingface";
import { chatCompletion } from "@/lib/openrouter";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { title?: string | null; content?: string | null };

  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_REQUEST", 400);
  }

  const articleText = buildArticleText(body.title, body.content);

  if (!articleText) {
    return apiError("NO_ARTICLE_TEXT", 400);
  }

  try {
    const prompt = await chatCompletion([
      {
        role: "system",
        content:
          "Ты арт-директор. Прочитай статью и составь промпт на английском языке для генерации иллюстрации, которая визуально передаёт главную тему статьи. Промпт должен быть конкретным: опиши сцену, стиль (editorial illustration, digital art), настроение и ключевые визуальные элементы. Верни только текст промпта, без пояснений и кавычек.",
      },
      {
        role: "user",
        content: articleText,
      },
    ]);

    const image = await generateImage(prompt);

    return NextResponse.json({ image, prompt });
  } catch {
    return apiError("AI_ILLUSTRATION_FAILED", 502);
  }
}
