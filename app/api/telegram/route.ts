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
    const post = await chatCompletion([
      {
        role: "system",
        content:
          "Ты SMM-редактор. Прочитай англоязычную статью и напиши пост для Telegram на русском языке: цепляющий заголовок, краткое изложение, 1–2 ключевых вывода, уместные эмодзи. До 1500 символов. Без хештегов и ссылок. Только готовый текст поста.",
      },
      {
        role: "user",
        content: articleText,
      },
    ]);

    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка генерации поста";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
