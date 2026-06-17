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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка генерации тезисов";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
