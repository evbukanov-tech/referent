export type ErrorCode =
  | "INVALID_REQUEST"
  | "URL_REQUIRED"
  | "INVALID_URL"
  | "ARTICLE_FETCH_FAILED"
  | "NOT_HTML"
  | "ARTICLE_PARSE_FAILED"
  | "NO_ARTICLE_TEXT"
  | "AI_SERVICE_UNAVAILABLE"
  | "AI_TRANSLATION_FAILED"
  | "AI_SUMMARY_FAILED"
  | "AI_THESES_FAILED"
  | "AI_TELEGRAM_FAILED"
  | "AI_ILLUSTRATION_FAILED"
  | "NETWORK_ERROR";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_REQUEST: "Некорректный запрос. Обновите страницу и попробуйте снова.",
  URL_REQUIRED: "Введите URL англоязычной статьи.",
  INVALID_URL: "Введите корректный URL (например, https://example.com/article).",
  ARTICLE_FETCH_FAILED: "Не удалось загрузить статью по этой ссылке.",
  NOT_HTML: "По этой ссылке нет текстовой статьи для анализа.",
  ARTICLE_PARSE_FAILED: "Не удалось извлечь текст статьи. Попробуйте другую ссылку.",
  NO_ARTICLE_TEXT: "В статье недостаточно текста для обработки.",
  AI_SERVICE_UNAVAILABLE: "Сервис AI временно недоступен. Попробуйте позже.",
  AI_TRANSLATION_FAILED: "Не удалось перевести статью. Попробуйте позже.",
  AI_SUMMARY_FAILED: "Не удалось сгенерировать описание. Попробуйте позже.",
  AI_THESES_FAILED: "Не удалось сгенерировать тезисы. Попробуйте позже.",
  AI_TELEGRAM_FAILED: "Не удалось сгенерировать пост. Попробуйте позже.",
  AI_ILLUSTRATION_FAILED: "Не удалось сгенерировать иллюстрацию. Попробуйте позже.",
  NETWORK_ERROR: "Не удалось выполнить запрос. Проверьте соединение и попробуйте снова.",
};

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
  };
};

export function apiError(code: ErrorCode, status: number): Response {
  return Response.json({ error: { code } } satisfies ApiErrorBody, { status });
}

export function isErrorCode(value: string): value is ErrorCode {
  return value in ERROR_MESSAGES;
}

export function getErrorMessage(code: ErrorCode | string | null | undefined): string {
  if (code && isErrorCode(code)) {
    return ERROR_MESSAGES[code];
  }

  return ERROR_MESSAGES.NETWORK_ERROR;
}

export function parseApiErrorCode(data: unknown): ErrorCode | null {
  if (!data || typeof data !== "object" || !("error" in data)) {
    return null;
  }

  const error = (data as ApiErrorBody).error;

  if (error && typeof error.code === "string" && isErrorCode(error.code)) {
    return error.code;
  }

  return null;
}
