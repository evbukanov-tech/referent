import { buildArticleText } from "@/lib/articleText";
import { chatCompletion } from "@/lib/openrouter";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { title?: string | null; content?: string | null };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const articleText = buildArticleText(body.title, body.content);

  if (!articleText) {
    return NextResponse.json({ error: "Нет текста статьи для анализа" }, { status: 400 });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка генерации описания";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
