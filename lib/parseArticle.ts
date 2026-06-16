import * as cheerio from "cheerio";

export type ParsedArticle = {
  date: string | null;
  title: string | null;
  content: string | null;
};

const CONTENT_SELECTORS = [
  "article",
  "[role='main']",
  "main",
  ".post-content",
  ".article-content",
  ".entry-content",
  ".post-body",
  ".content",
  ".post",
  "#content",
  "#main-content",
];

const DATE_SELECTORS = [
  "time[datetime]",
  "meta[property='article:published_time']",
  "meta[name='article:published_time']",
  "meta[property='og:published_time']",
  "meta[name='pubdate']",
  "meta[name='date']",
  "meta[itemprop='datePublished']",
  ".published",
  ".post-date",
  ".entry-date",
  ".article-date",
  "[class*='publish']",
  "[class*='date']",
];

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle($: cheerio.CheerioAPI): string | null {
  const candidates = [
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("h1").first().text(),
    $("title").text(),
  ];

  for (const candidate of candidates) {
    const value = normalizeText(candidate ?? "");
    if (value) return value;
  }

  return null;
}

function extractDate($: cheerio.CheerioAPI): string | null {
  for (const selector of DATE_SELECTORS) {
    const el = $(selector).first();
    if (!el.length) continue;

    const value =
      el.attr("datetime") ??
      el.attr("content") ??
      el.attr("value") ??
      el.text();

    const normalized = normalizeText(value ?? "");
    if (normalized) return normalized;
  }

  return null;
}

function extractContent($: cheerio.CheerioAPI): string | null {
  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector).first();
    if (!el.length) continue;

    el.find("script, style, nav, footer, aside, .comments, .comment, .sidebar, .advertisement, .ad").remove();

    const text = normalizeText(
      el
        .find("p, li, h2, h3, h4, blockquote")
        .map((_, node) => $(node).text())
        .get()
        .join("\n\n"),
    );

    if (text.length >= 100) return text;

    const fallback = normalizeText(el.text());
    if (fallback.length >= 100) return fallback;
  }

  const bodyText = normalizeText(
    $("body")
      .find("p")
      .map((_, node) => $(node).text())
      .get()
      .join("\n\n"),
  );

  return bodyText.length >= 100 ? bodyText : null;
}

export function parseArticleHtml(html: string): ParsedArticle {
  const $ = cheerio.load(html);

  return {
    date: extractDate($),
    title: extractTitle($),
    content: extractContent($),
  };
}
