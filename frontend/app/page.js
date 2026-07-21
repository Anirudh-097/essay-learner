"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HomePage() {
  const [topic, setTopic] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const loadTopic = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch(`${API_URL}/topic/today`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`The backend returned ${response.status}.`);
      }
      setTopic(await response.json());
      setStatus("ready");
    } catch (requestError) {
      setStatus("error");
      setError(
        `${requestError.message} Make sure the FastAPI server is running at ${API_URL}.`,
      );
    }
  }, []);

  useEffect(() => {
    loadTopic();
  }, [loadTopic]);

  return (
    <main className="min-h-screen overflow-hidden bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-7 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between border-b border-ink/10 pb-6">
          <a className="font-display text-xl font-semibold tracking-tight" href="/">
            essay<span className="text-coral">.</span>learner
          </a>
          <span className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
            GRE AWA
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-coral">
              Today&apos;s practice
            </p>
            <h1 className="max-w-xl font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
              One clear idea at a time.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-8 text-ink/65">
              Build a stronger argument through small, deliberate writing sessions.
              Start with today&apos;s issue and make it your own.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-coral/10 blur-2xl" />
            <article className="rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(23,32,51,0.10)] sm:p-12">
              <div className="mb-12 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">
                <span>Issue topic</span>
                {topic && <span>#{String(topic.id).padStart(3, "0")}</span>}
              </div>

              {status === "loading" && (
                <div className="space-y-4" aria-label="Loading topic">
                  <div className="h-5 w-5/6 animate-pulse rounded bg-ink/10" />
                  <div className="h-5 w-full animate-pulse rounded bg-ink/10" />
                  <div className="h-5 w-2/3 animate-pulse rounded bg-ink/10" />
                </div>
              )}

              {status === "error" && (
                <div role="alert">
                  <p className="text-lg leading-8 text-ink/70">{error}</p>
                  <button className="mt-8 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral" onClick={loadTopic}>
                    Try again
                  </button>
                </div>
              )}

              {status === "ready" && topic && (
                <>
                  <blockquote className="font-display text-2xl leading-[1.5] sm:text-3xl">
                    {topic.topic}
                  </blockquote>
                  <div className="mt-12 flex items-center justify-between border-t border-ink/10 pt-6">
                    <span className="text-sm text-ink/50">Take your time. Make a claim.</span>
                    <span className="text-2xl text-coral" aria-hidden="true">↗</span>
                  </div>
                </>
              )}
            </article>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-ink/10 pt-5 text-xs text-ink/45">
          <span>Practice with intention.</span>
          <span>01 / topic</span>
        </footer>
      </div>
    </main>
  );
}
