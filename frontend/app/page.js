"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `The backend returned ${response.status}.`);
  return body;
}

function ErrorMessage({ message }) {
  return <p className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800">{message}</p>;
}

export default function HomePage() {
  const [topic, setTopic] = useState(null);
  const [practice, setPractice] = useState(null);
  const [essay, setEssay] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState("topic");
  const [error, setError] = useState("");

  const loadPractice = useCallback(async (topicId) => {
    const prompt = await request(`/practice/prompt?exclude_topic_id=${topicId}`);
    setPractice(prompt);
  }, []);

  const loadPage = useCallback(async () => {
    setLoading("topic");
    setError("");
    try {
      const today = await request("/topic/today");
      setTopic(today);
      await loadPractice(today.id);
      setLoading("");
    } catch (requestError) {
      setLoading("");
      setError(`${requestError.message} Make sure the FastAPI server is running at ${API_URL}.`);
    }
  }, [loadPractice]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function generateEssay() {
    setLoading("essay");
    setError("");
    try {
      const result = await request("/essay/generate", {
        method: "POST",
        body: JSON.stringify({ topic_id: topic.id }),
      });
      setEssay(result.essay);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading("");
    }
  }

  async function evaluateParagraph(event) {
    event.preventDefault();
    setLoading("evaluation");
    setError("");
    try {
      const result = await request("/evaluate", {
        method: "POST",
        body: JSON.stringify({
          topic_id: practice.topic.id,
          paragraph_type: practice.paragraph_type,
          paragraph,
        }),
      });
      setEvaluation(result.evaluation);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-6xl px-6 py-7 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between border-b border-ink/10 pb-6">
          <a className="font-display text-xl font-semibold tracking-tight" href="/">
            essay<span className="text-coral">.</span>learner
          </a>
          <span className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
            GRE AWA
          </span>
        </header>

        <section className="py-16">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-coral">Today&apos;s practice</p>
          <h1 className="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">One clear idea at a time.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-ink/65">
            Read a model essay, then make an argument of your own. Small, deliberate sessions build stronger writing.
          </p>
        </section>

        {error && <div className="mb-8"><ErrorMessage message={error} /></div>}

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(23,32,51,0.10)] sm:p-12">
            <div className="mb-10 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">
              <span>Issue topic</span>
              {topic && <span>#{String(topic.id).padStart(3, "0")}</span>}
            </div>
            {loading === "topic" ? (
              <div className="space-y-4" aria-label="Loading topic">
                <div className="h-5 w-5/6 animate-pulse rounded bg-ink/10" />
                <div className="h-5 w-full animate-pulse rounded bg-ink/10" />
                <div className="h-5 w-2/3 animate-pulse rounded bg-ink/10" />
              </div>
            ) : topic ? (
              <blockquote className="font-display text-2xl leading-[1.5] sm:text-3xl">{topic.topic}</blockquote>
            ) : null}
            {topic && (
              <button className="mt-10 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral disabled:cursor-wait disabled:opacity-60" disabled={loading === "essay"} onClick={generateEssay}>
                {loading === "essay" ? "Writing essay…" : essay ? "Regenerate model essay" : "Generate complete essay"}
              </button>
            )}
            {essay && (
              <div className="mt-10 border-t border-ink/10 pt-8">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-coral">Model essay</p>
                <div className="whitespace-pre-wrap text-base leading-8 text-ink/80">{essay}</div>
              </div>
            )}
          </article>

          <article className="rounded-[2rem] border border-ink/10 bg-[#eee9df] p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Your turn</p>
            <h2 className="mt-4 font-display text-3xl leading-tight">Write one paragraph on another issue.</h2>
            {practice && (
              <>
                <div className="mt-8 rounded-2xl bg-white/70 p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">{practice.paragraph_type}</p>
                  <p className="font-display text-xl leading-8">{practice.topic.topic}</p>
                </div>
                <form className="mt-6" onSubmit={evaluateParagraph}>
                  <label className="sr-only" htmlFor="paragraph">Your paragraph</label>
                  <textarea
                    className="min-h-56 w-full resize-y rounded-2xl border-0 bg-white p-5 text-base leading-7 text-ink outline-none ring-coral/30 placeholder:text-ink/35 focus:ring-2"
                    id="paragraph"
                    placeholder={`Write your ${practice.paragraph_type.toLowerCase()} here…`}
                    value={paragraph}
                    onChange={(event) => setParagraph(event.target.value)}
                    required
                  />
                  <button className="mt-4 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50" disabled={loading === "evaluation" || !paragraph.trim()} type="submit">
                    {loading === "evaluation" ? "Evaluating…" : "Get feedback"}
                  </button>
                </form>
                {evaluation && (
                  <div className="mt-8 border-t border-ink/15 pt-7">
                    <div className="flex items-end justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Coach feedback</p>
                      <p className="font-display text-4xl text-coral">{evaluation.score}<span className="text-lg text-ink/40"> / 6</span></p>
                    </div>
                    <p className="mt-6 font-semibold">What&apos;s working</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink/70">{evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
                    <p className="mt-5 font-semibold">Next to improve</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink/70">{evaluation.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
                    <p className="mt-5 font-semibold">Suggested rewrite</p>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{evaluation.suggested_rewrite}</p>
                  </div>
                )}
              </>
            )}
          </article>
        </section>

        <footer className="mt-16 flex items-center justify-between border-t border-ink/10 pt-5 text-xs text-ink/45">
          <span>Practice with intention.</span>
          <span>01 / daily topic</span>
        </footer>
      </div>
    </main>
  );
}
