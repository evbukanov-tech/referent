import { chatCompletion } from "@/lib/openrouter";
import { NextResponse } from "next/server";

const MAX_CONTENT_LENGTH = 12000;

export async function POST(request: Request) {
  let body: { title?: string | null; content?: string | null };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const content = body.content?.trim() ?? "";

  if (!title && !content) {
    return NextResponse.json({ error: "Нет текста статьи для перевода" }, { status: 400 });
  }

  const articleText = [
    title ? `Title: ${title}` : "",
    content ? `Content:\n${content.slice(0, MAX_CONTENT_LENGTH)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

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
