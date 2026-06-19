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
    const summary = await chatCompletion([
      {
        role: "system",
        content:
          "Ты редактор. Прочитай англоязычную статью и напиши краткое описание на русском языке: 2–4 предложения, только суть, без воды и комментариев.",
      },
      {
        role: "user",
        content: articleText,
      },
    ]);

    return NextResponse.json({ summary });
  } catch {
    return apiError("AI_SUMMARY_FAILED", 502);
  }
}
