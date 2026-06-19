import { parseArticleHtml } from "@/lib/parseArticle";
import { apiError } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { url?: string };

  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_REQUEST", 400);
  }

  const url = body.url?.trim();

  if (!url) {
    return apiError("URL_REQUIRED", 400);
  }

  try {
    new URL(url);
  } catch {
    return apiError("INVALID_URL", 400);
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
    return apiError("ARTICLE_FETCH_FAILED", 502);
  }

  if (!response.ok) {
    return apiError("ARTICLE_FETCH_FAILED", 502);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    return apiError("NOT_HTML", 422);
  }

  const html = await response.text();
  const article = parseArticleHtml(html);

  if (!article.title && !article.content) {
    return apiError("ARTICLE_PARSE_FAILED", 422);
  }

  return NextResponse.json(article);
}
