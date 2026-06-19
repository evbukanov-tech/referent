import { buildArticleText } from "@/lib/articleText";
import { apiError } from "@/lib/errors";
import { chatCompletion } from "@/lib/openrouter";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { title?: string | null; content?: string | null; url?: string | null };

  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_REQUEST", 400);
  }

  const articleText = buildArticleText(body.title, body.content);

  if (!articleText) {
    return apiError("NO_ARTICLE_TEXT", 400);
  }

  const sourceUrl = body.url?.trim() ?? "";

  try {
    const postBody = await chatCompletion([
      {
        role: "system",
        content:
          "Ты SMM-редактор. Прочитай англоязычную статью и напиши пост для Telegram. Весь текст поста — заголовок, изложение, выводы — должен быть строго на русском языке. Не используй английские слова и фразы, кроме имён собственных и названий продуктов. Формат: цепляющий заголовок, краткое изложение, 1–2 ключевых вывода, уместные эмодзи. До 1400 символов. Без хештегов и ссылок. Только готовый текст поста.",
      },
      {
        role: "user",
        content: `Напиши пост для Telegram на русском языке по этой статье:\n\n${articleText}`,
      },
    ]);

    const post = sourceUrl ? `${postBody}\n\nИсточник: ${sourceUrl}` : postBody;

    return NextResponse.json({ post });
  } catch {
    return apiError("AI_TELEGRAM_FAILED", 502);
  }
}
