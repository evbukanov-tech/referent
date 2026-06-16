import { parseArticleHtml } from "@/lib/parseArticle";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { url?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const url = body.url?.trim();

  if (!url) {
    return NextResponse.json({ error: "URL не указан" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Некорректный URL" }, { status: 400 });
  }

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ReferentBot/1.0; +https://github.com/referent)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json(
      { error: "Не удалось загрузить страницу. Проверьте URL и доступность сайта." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `Сайт вернул ошибку: HTTP ${response.status}` },
      { status: 502 },
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    return NextResponse.json(
      { error: "По URL не HTML-страница" },
      { status: 422 },
    );
  }

  const html = await response.text();
  const article = parseArticleHtml(html);

  if (!article.title && !article.content) {
    return NextResponse.json(
      { error: "Не удалось извлечь заголовок и контент статьи" },
      { status: 422 },
    );
  }

  return NextResponse.json(article);
}
