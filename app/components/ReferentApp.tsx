"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  type ErrorCode,
  getErrorMessage,
  parseApiErrorCode,
} from "@/lib/errors";

type ParsedArticle = {
  date: string | null;
  title: string | null;
  content: string | null;
};

type Action = "summary" | "theses" | "telegram" | "translate";

type LoadingPhase = "parsing" | "generating";

type HistoryItem = {
  id: string;
  url: string;
  action: Action;
  result: string;
  createdAt: string;
};

const HISTORY_STORAGE_KEY = "referent:last-requests";
const HISTORY_LIMIT = 20;

const AI_ACTIONS: Record<
  Action,
  { endpoint: string; resultKey: string; fallbackError: ErrorCode }
> = {
  translate: {
    endpoint: "/api/translate",
    resultKey: "translation",
    fallbackError: "AI_TRANSLATION_FAILED",
  },
  summary: {
    endpoint: "/api/summary",
    resultKey: "summary",
    fallbackError: "AI_SUMMARY_FAILED",
  },
  theses: {
    endpoint: "/api/theses",
    resultKey: "theses",
    fallbackError: "AI_THESES_FAILED",
  },
  telegram: {
    endpoint: "/api/telegram",
    resultKey: "post",
    fallbackError: "AI_TELEGRAM_FAILED",
  },
};

const ACTIONS: { id: Action; label: string; description: string }[] = [
  {
    id: "translate",
    label: "Перевод",
    description: "Полный перевод статьи на русский язык",
  },
  {
    id: "summary",
    label: "О чем статья?",
    description: "Краткое описание содержания статьи",
  },
  {
    id: "theses",
    label: "Тезисы",
    description: "Основные тезисы и ключевые мысли",
  },
  {
    id: "telegram",
    label: "Пост для Telegram",
    description: "Готовый пост для публикации в Telegram",
  },
];

const ACTION_LABELS: Record<Action, string> = ACTIONS.reduce(
  (acc, action) => ({ ...acc, [action.id]: action.label }),
  {} as Record<Action, string>,
);

const LOADING_MESSAGES: Record<Action, Record<LoadingPhase, string>> = {
  translate: {
    parsing: "Загружаю статью…",
    generating: "Перевожу статью…",
  },
  summary: {
    parsing: "Загружаю статью…",
    generating: "Генерирую описание…",
  },
  theses: {
    parsing: "Загружаю статью…",
    generating: "Генерирую тезисы…",
  },
  telegram: {
    parsing: "Загружаю статью…",
    generating: "Генерирую пост…",
  },
};

const ERROR_TITLES: Partial<Record<ErrorCode, string>> = {
  URL_REQUIRED: "Укажите ссылку",
  INVALID_URL: "Некорректный URL",
  ARTICLE_FETCH_FAILED: "Статья недоступна",
  NOT_HTML: "Неподходящий формат",
  ARTICLE_PARSE_FAILED: "Не удалось прочитать статью",
  NO_ARTICLE_TEXT: "Мало текста",
  AI_SERVICE_UNAVAILABLE: "AI недоступен",
  AI_TRANSLATION_FAILED: "Ошибка перевода",
  AI_SUMMARY_FAILED: "Ошибка описания",
  AI_THESES_FAILED: "Ошибка тезисов",
  AI_TELEGRAM_FAILED: "Ошибка поста",
  NETWORK_ERROR: "Проблема с соединением",
  INVALID_REQUEST: "Ошибка запроса",
};

function getErrorTitle(code: ErrorCode): string {
  return ERROR_TITLES[code] ?? "Что-то пошло не так";
}

function isAction(value: unknown): value is Action {
  return typeof value === "string" && value in AI_ACTIONS;
}

function parseHistory(raw: string | null): HistoryItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is HistoryItem => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Partial<HistoryItem>;

        return (
          typeof candidate.id === "string" &&
          typeof candidate.url === "string" &&
          isAction(candidate.action) &&
          typeof candidate.result === "string" &&
          typeof candidate.createdAt === "string"
        );
      })
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function persistHistory(items: HistoryItem[]) {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage may be unavailable in private/restricted mode
  }
}

export default function ReferentApp() {
  const resultSectionRef = useRef<HTMLElement>(null);
  const [url, setUrl] = useState("");
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("parsing");
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (result && !isLoading) {
      resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result, isLoading]);

  useEffect(() => {
    const saved = parseHistory(window.localStorage.getItem(HISTORY_STORAGE_KEY));
    setHistory(saved);
  }, []);

  function handleClear() {
    if (isLoading) return;

    setUrl("");
    setActiveAction(null);
    setResult("");
    setErrorCode(null);
    setLoadingPhase("parsing");
    setCopied(false);
  }

  async function handleCopy() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may be unavailable
    }
  }

  function handleUseHistory(item: HistoryItem) {
    if (isLoading) return;

    setUrl(item.url);
    setActiveAction(item.action);
    setResult(item.result);
    setErrorCode(null);
    setLoadingPhase("parsing");
    setCopied(false);
  }

  function handleClearHistory() {
    if (isLoading) return;

    setHistory([]);

    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // localStorage may be unavailable in private/restricted mode
    }
  }

  async function handleAction(action: Action) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setErrorCode("URL_REQUIRED");
      setResult("");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setErrorCode("INVALID_URL");
      setResult("");
      return;
    }

    setErrorCode(null);
    setActiveAction(action);
    setIsLoading(true);
    setLoadingPhase("parsing");
    setResult("");

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = (await response.json()) as ParsedArticle | unknown;

      if (!response.ok) {
        setErrorCode(parseApiErrorCode(data) ?? "ARTICLE_FETCH_FAILED");
        setResult("");
        return;
      }

      const article = data as ParsedArticle;
      const aiAction = AI_ACTIONS[action];

      setLoadingPhase("generating");

      const aiResponse = await fetch(aiAction.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          ...(action === "telegram" ? { url: trimmedUrl } : {}),
        }),
      });

      const aiData = (await aiResponse.json()) as Record<string, string | undefined> | unknown;

      if (!aiResponse.ok) {
        setErrorCode(parseApiErrorCode(aiData) ?? aiAction.fallbackError);
        setResult("");
        return;
      }

      const generatedResult = (aiData as Record<string, string | undefined>)[aiAction.resultKey] ?? "";
      setResult(generatedResult);

      if (generatedResult) {
        setHistory((prevHistory) => {
          const nextHistory: HistoryItem[] = [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              url: trimmedUrl,
              action,
              result: generatedResult,
              createdAt: new Date().toISOString(),
            },
            ...prevHistory.filter(
              (entry) =>
                !(
                  entry.url === trimmedUrl &&
                  entry.action === action &&
                  entry.result === generatedResult
                ),
            ),
          ].slice(0, HISTORY_LIMIT);

          persistHistory(nextHistory);
          return nextHistory;
        });
      }
    } catch {
      setErrorCode("NETWORK_ERROR");
      setResult("");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-6 sm:mb-10">
          <p className="text-sm font-medium uppercase tracking-wider text-sky-600">
            Referent
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            Анализ англоязычных статей
          </h1>
          <p className="mt-3 max-w-2xl break-words text-slate-600">
            Вставьте ссылку на статью и выберите, что нужно сгенерировать с
            помощью AI.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <label htmlFor="article-url" className="block text-sm font-medium text-slate-700">
            URL англоязычной статьи
          </label>
          <input
            id="article-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 sm:text-sm"
          />
          <p className="mt-1.5 text-xs text-slate-500">Укажите ссылку на англоязычную статью</p>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {ACTIONS.map((action) => {
              const isActive = activeAction === action.id && isLoading;

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleAction(action.id)}
                  disabled={isLoading}
                  title={action.description}
                  className={[
                    "inline-flex w-full items-center justify-center rounded-xl px-3 py-3 text-sm font-medium transition",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    isActive
                      ? "bg-sky-700 text-white"
                      : "bg-sky-600 text-white hover:bg-sky-700",
                  ].join(" ")}
                >
                  {isActive ? "Генерация..." : action.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Очистить
            </button>
          </div>
        </section>

        {history.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Последние запросы</h2>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={isLoading}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Очистить историю
              </button>
            </div>

            <div className="space-y-3">
              {history.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                      {ACTION_LABELS[item.action]}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString("ru-RU")}
                    </span>
                  </div>

                  <p className="mt-2 break-all text-xs text-slate-600">{item.url}</p>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-700">
                    {item.result}
                  </p>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => handleUseHistory(item)}
                      disabled={isLoading}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Открыть результат
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {errorCode && (
          <Alert variant="destructive" className="mt-6 break-words">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{getErrorTitle(errorCode)}</AlertTitle>
            <AlertDescription className="break-words">
              {getErrorMessage(errorCode)}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && activeAction && (
          <div
            className="mt-6 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800"
            role="status"
            aria-live="polite"
          >
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-300 border-t-sky-600" />
            <span className="min-w-0 break-words">
              {LOADING_MESSAGES[activeAction][loadingPhase]}
            </span>
          </div>
        )}

        <section
          ref={resultSectionRef}
          className="mt-6 flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm scroll-mt-6 sm:p-6"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="shrink-0 text-lg font-semibold text-slate-900">Результат</h2>
            <div className="flex flex-wrap items-center gap-2">
              {activeAction && !isLoading && (
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                  {ACTIONS.find((a) => a.id === activeAction)?.label}
                </span>
              )}
              {result && !isLoading && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {copied ? "Скопировано" : "Копировать"}
                </button>
              )}
            </div>
          </div>

          <div className="min-h-48 flex-1 overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 sm:min-h-64">
            {isLoading ? (
              <div className="flex h-full min-h-56 items-center justify-center text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
              </div>
            ) : result ? (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800">
                {result}
              </pre>
            ) : (
              <div className="flex h-full min-h-56 items-center justify-center text-center text-sm text-slate-500">
                Результат появится здесь после выбора действия
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
