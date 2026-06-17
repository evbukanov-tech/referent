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
    return NextResponse.json({ error: "Нет текста статьи для перевода" }, { status: 400 });
  }

  try {
    const translation = await chatCompletion([
      {
        role: "system",
        content:
          "Ты профессиональный переводчик. Переведи англоязычную статью на русский язык. Сохрани структуру: сначала заголовок, затем основной текст. Перевод должен быть точным, естественным и читабельным. Не добавляй комментарии и пояснения — только перевод.",
      },
      {
        role: "user",
        content: articleText,
      },
    ]);

    return NextResponse.json({ translation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка перевода";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
