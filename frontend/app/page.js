"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
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

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
      <form className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(23,32,51,0.10)] sm:p-12" onSubmit={submit}>
        <p className="font-display text-xl font-semibold tracking-tight">essay<span className="text-coral">.</span>learner</p>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.24em] text-coral">Private practice</p>
        <h1 className="mt-4 font-display text-4xl leading-tight">Welcome back.</h1>
        <p className="mt-4 text-sm leading-6 text-ink/60">Sign in to continue your writing practice.</p>
        {error && <div className="mt-6"><ErrorMessage message={error} /></div>}
        <label className="mt-8 block text-sm font-semibold" htmlFor="username">Username</label>
        <input className="mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 outline-none focus:border-coral" id="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        <label className="mt-5 block text-sm font-semibold" htmlFor="password">Password</label>
        <input className="mt-2 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 outline-none focus:border-coral" id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        <button className="mt-7 w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral disabled:cursor-wait disabled:opacity-60" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [topic, setTopic] = useState(null);
  const [practice, setPractice] = useState(null);
  const [essay, setEssay] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [progress, setProgress] = useState(null);
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
      setProgress(await request("/progress"));
      setLoading("");
    } catch (requestError) {
      setLoading("");
      setError(`${requestError.message} Make sure the FastAPI server is running at ${API_URL}.`);
    }
  }, [loadPractice]);

  useEffect(() => {
    request("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (user) loadPage();
  }, [user, loadPage]);

  if (!authChecked) {
    return <main className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink/50">Checking your session…</main>;
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  async function logout() {
    await request("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }

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

  const chartAttempts = progress?.attempts || [];
  const chartWidth = 640;
  const chartHeight = 180;
  const chartPoints = chartAttempts.map((attempt, index) => {
    const x = chartAttempts.length === 1 ? chartWidth / 2 : (index / (chartAttempts.length - 1)) * chartWidth;
    const y = chartHeight - ((attempt.score - 1) / 5) * chartHeight;
    return `${x},${y}`;
  }).join(" ");
  const metricLabels = {
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    structure: "Structure",
    argument_quality: "Argument quality",
  };

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
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-ink/60">GRE AWA</span>
            <button className="text-xs font-semibold text-ink/50 transition hover:text-coral" onClick={logout} type="button">Log out</button>
          </div>
        </header>

        <section className="py-16">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-coral">Today&apos;s practice</p>
          <h1 className="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">One clear idea at a time.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-ink/65">
            Read a model essay, then make an argument of your own. Small, deliberate sessions build stronger writing.
          </p>
        </section>

        {error && <div className="mb-8"><ErrorMessage message={error} /></div>}

        <section className="flex flex-col gap-8">
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

                    {evaluation.better_vocabulary && evaluation.better_vocabulary.length > 0 && (
                      <>
                        <p className="mt-8 font-semibold">Vocabulary improvements</p>
                        <div className="mt-3 space-y-3">
                          {evaluation.better_vocabulary.map((item, index) => {
                            // Extract synonyms safely to handle both old and new backend/LLM formats
                            let synList = [];
                            if (Array.isArray(item.synonyms)) {
                              synList = item.synonyms;
                            } else if (typeof item.synonyms === "string") {
                              synList = [item.synonyms];
                            } else if (Array.isArray(item.alternative)) {
                              synList = item.alternative;
                            } else if (typeof item.alternative === "string") {
                              synList = [item.alternative];
                            } else if (item.alternative) {
                              synList = [String(item.alternative)];
                            }

                            return (
                              <div key={index} className="rounded-2xl border border-ink/5 bg-white/50 p-5">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink/30">Word</span>
                                  <span className="font-display text-lg font-medium text-coral">{item.word}</span>
                                </div>
                                {synList.length > 0 && (
                                  <div className="mt-2 flex items-start gap-3">
                                    <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/30">Synonyms</span>
                                    <div className="flex flex-wrap gap-2">
                                      {synList.map((syn) => (
                                        <span key={syn} className="rounded-lg bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink/70">
                                          {syn}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {item.context && (
                                  <p className="mt-3 text-xs leading-relaxed text-ink/50 italic">{item.context}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                )}
              </>
            )}
          </article>

          <section className="rounded-[2rem] bg-ink p-8 text-white shadow-[0_24px_80px_rgba(23,32,51,0.14)] sm:p-10">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Progress</p>
                <h2 className="mt-4 font-display text-3xl leading-tight">Your writing, over time.</h2>
              </div>
              <p className="text-sm text-white/55">{progress?.total_attempts || 0} evaluated {progress?.total_attempts === 1 ? "attempt" : "attempts"}</p>
            </div>
            {progress && progress.attempts.length > 0 ? (
              <>
                <div className="mt-8 overflow-hidden rounded-2xl bg-white/5 p-4">
                  <svg className="h-48 w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Overall score trend">
                    <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="rgba(255,255,255,.12)" />
                    <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="rgba(255,255,255,.12)" />
                    <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="rgba(255,255,255,.12)" />
                    <polyline points={chartPoints} fill="none" stroke="#dc6b4c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    {progress.attempts.map((attempt, index) => {
                      const [x, y] = chartPoints.split(" ")[index].split(",");
                      return <circle key={attempt.id} cx={x} cy={y} r="5" fill="#f7f4ee" stroke="#dc6b4c" strokeWidth="3" vectorEffect="non-scaling-stroke" />;
                    })}
                  </svg>
                  <div className="flex justify-between text-xs text-white/40"><span>Score 1</span><span>Overall score trend</span><span>Score 6</span></div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(metricLabels).map(([key, label]) => {
                    const metric = progress.metrics[key];
                    return (
                      <div key={key} className="rounded-2xl bg-white/10 p-4">
                        <p className="text-xs text-white/55">{label}</p>
                        <p className="mt-2 font-display text-3xl text-coral">{metric.average.toFixed(1)}<span className="text-sm text-white/45"> / 6</span></p>
                        <p className="mt-1 text-xs text-white/40">Latest: {metric.latest ?? "—"}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="mt-8 rounded-2xl bg-white/5 p-6 text-sm leading-6 text-white/60">Complete your first paragraph evaluation to start tracking your progress.</p>
            )}
          </section>
        </section>

        <footer className="mt-16 flex items-center justify-between border-t border-ink/10 pt-5 text-xs text-ink/45">
          <span>Practice with intention.</span>
          <span>01 / daily topic</span>
        </footer>
      </div>
    </main>
  );
}
