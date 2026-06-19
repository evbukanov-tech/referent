import { buildArticleText } from "@/lib/articleText";
import { apiError } from "@/lib/errors";
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
    const theses = await chatCompletion([
      {
        role: "system",
        content:
          "Ты редактор. Прочитай англоязычную статью и выпиши основные тезисы на русском языке: маркированный список из 5–10 пунктов, только ключевые мысли статьи, без комментариев.",
      },
      {
        role: "user",
        content: articleText,
      },
    ]);

    return NextResponse.json({ theses });
  } catch {
    return apiError("AI_THESES_FAILED", 502);
  }
}
