"use client";

import { useState } from "react";

type ParsedArticle = {
  date: string | null;
  title: string | null;
  content: string | null;
};

type Action = "summary" | "theses" | "telegram" | "translate";

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

const LOADING_MESSAGES: Record<Action, string> = {
  translate: "Перевод статьи...",
  summary: "Загрузка и парсинг статьи...",
  theses: "Загрузка и парсинг статьи...",
  telegram: "Загрузка и парсинг статьи...",
};

export default function ReferentApp() {
  const [url, setUrl] = useState("");
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAction(action: Action) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Введите URL англоязычной статьи");
      setResult("");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Введите корректный URL (например, https://example.com/article)");
      setResult("");
      return;
    }

    setError("");
    setActiveAction(action);
    setIsLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = (await response.json()) as ParsedArticle | { error?: string };

      if (!response.ok) {
        setError("error" in data && data.error ? data.error : "Ошибка парсинга статьи");
        setResult("");
        return;
      }

      const article = data as ParsedArticle;

      if (action === "translate") {
        const translateResponse = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: article.title,
            content: article.content,
          }),
        });

        const translateData = (await translateResponse.json()) as
          | { translation?: string }
          | { error?: string };

        if (!translateResponse.ok) {
          setError(
            "error" in translateData && translateData.error
              ? translateData.error
              : "Ошибка перевода статьи",
          );
          setResult("");
          return;
        }

        setResult("translation" in translateData ? (translateData.translation ?? "") : "");
        return;
      }

      setResult(JSON.stringify(article, null, 2));
    } catch {
      setError("Не удалось выполнить запрос. Проверьте соединение и попробуйте снова.");
      setResult("");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-sm font-medium uppercase tracking-wider text-sky-600">
            Referent
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Анализ англоязычных статей
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Вставьте ссылку на статью и выберите, что нужно сгенерировать с
            помощью AI.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label htmlFor="article-url" className="block text-sm font-medium text-slate-700">
            URL англоязычной статьи
          </label>
          <input
            id="article-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
                    "inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition",
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
        </section>

        <section className="mt-6 flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
            {activeAction && !isLoading && (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                {ACTIONS.find((a) => a.id === activeAction)?.label}
              </span>
            )}
          </div>

          <div className="min-h-64 flex-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
            {isLoading ? (
              <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 text-slate-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
                <p className="text-sm">
                  {activeAction ? LOADING_MESSAGES[activeAction] : "Загрузка..."}
                </p>
              </div>
            ) : result ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-800">
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
