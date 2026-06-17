export const DEFAULT_MAX_CONTENT_LENGTH = 12000;

export function buildArticleText(
  title: string | null | undefined,
  content: string | null | undefined,
  maxLength = DEFAULT_MAX_CONTENT_LENGTH,
): string | null {
  const trimmedTitle = title?.trim() ?? "";
  const trimmedContent = content?.trim() ?? "";

  if (!trimmedTitle && !trimmedContent) {
    return null;
  }

  return [
    trimmedTitle ? `Title: ${trimmedTitle}` : "",
    trimmedContent ? `Content:\n${trimmedContent.slice(0, maxLength)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
