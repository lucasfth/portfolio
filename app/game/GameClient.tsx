"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, RefreshCw, Trophy } from "lucide-react";
import type { DailyChallenge } from "@/lib/game/challenge";
import type { WorkerLinter } from "harper.js";
import { createChallenge } from "@/lib/game/challenge";
import type { GrammarIssue } from "@/lib/game/grammar";
import { hasObviousGibberish, summarizeHarperLints } from "@/lib/game/grammar";
import { countTokens, evaluateRules } from "@/lib/game/rules";

interface LeaderboardEntry {
  displayNickname: string;
  level: number;
  elapsedMs: number;
}

interface LeaderboardResponse {
  date?: string;
  scores?: LeaderboardEntry[];
  message?: string;
}

interface ScoreResponse {
  score?: {
    displayNickname: string;
    level: number;
    elapsedMs: number;
    rank: number | null;
  };
  error?: string;
  message?: string;
  failedRuleIds?: string[];
}

interface PlayResponse {
  token?: string;
  cleared?: number;
  error?: string;
  message?: string;
  failedRuleIds?: string[];
  retryAfterMs?: number;
}


function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  const hours = Math.floor(totalMinutes / 60);
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

export default function GameClient({
  initialChallenge,
  initialNow,
}: {
  initialChallenge: DailyChallenge;
  initialNow: string;
}) {
  const [challenge, setChallenge] = useState(initialChallenge);
  const [now, setNow] = useState(() => new Date(initialNow));
  const [sentence, setSentence] = useState("");
  const [cleared, setCleared] = useState(0);
  const [runToken, setRunToken] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [scoreReceipt, setScoreReceipt] = useState<ScoreResponse["score"] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[] | null>(null);
  const [grammarCheckedSentence, setGrammarCheckedSentence] = useState("");
  const [grammarChecking, setGrammarChecking] = useState(false);
  const [grammarError, setGrammarError] = useState("");
  const grammarLinterRef = useRef<Promise<WorkerLinter> | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = new Date();
      const nextChallenge = createChallenge(current);
      setNow(current);
      setChallenge((previous) =>
        previous.date === nextChallenge.date &&
        previous.timeBucket === nextChallenge.timeBucket
          ? previous
          : nextChallenge
      );
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError("");
    try {
      const response = await fetch(
        `/api/game/leaderboard?date=${encodeURIComponent(challenge.date)}`,
        { cache: "no-store" }
      );
      const result = (await response.json()) as LeaderboardResponse;
      if (!response.ok) {
        throw new Error(result.message || "The leaderboard could not be loaded.");
      }
      setLeaderboard(result.scores ?? []);
    } catch (error) {
      setLeaderboard([]);
      setLeaderboardError(
        error instanceof Error ? error.message : "The leaderboard could not be loaded."
      );
    } finally {
      setLeaderboardLoading(false);
    }
  }, [challenge.date]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  const currentLevel = Math.min(cleared + 1, 20);
  const completed = cleared === 20;
  const visibleRuleCount = completed ? 20 : currentLevel;
  const checks = useMemo(
    () => evaluateRules(sentence, { now }),
    [sentence, now]
  );
  const tokenCount = useMemo(() => countTokens(sentence), [sentence]);
  const containsObviousGibberish = hasObviousGibberish(sentence);
  const visibleChecks = checks.slice(0, visibleRuleCount);
  const allVisibleRulesPass =
    sentence.trim().length > 0 && visibleChecks.every(({ passed }) => passed);
  const elapsedMs = startedAt === null ? 0 : Math.max(0, now.getTime() - startedAt);
  const secondsIntoBucket = (now.getUTCMinutes() % 5) * 60 + now.getUTCSeconds();
  const secondsRemaining = 300 - secondsIntoBucket;
  const countdown = `${String(Math.floor(secondsRemaining / 60)).padStart(2, "0")}:${String(secondsRemaining % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (!completed || !allVisibleRulesPass || containsObviousGibberish) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setGrammarChecking(true);
      setGrammarError("");
      try {
        let linterPromise = grammarLinterRef.current;
        if (linterPromise === null) {
          linterPromise = (async () => {
            const [{ WorkerLinter, Dialect }, { binaryInlined }] = await Promise.all([
              import("harper.js"),
              import("harper.js/binaryInlined"),
            ]);
            const linter = new WorkerLinter({
              binary: binaryInlined,
              dialect: Dialect.American,
            });
            await linter.setup();
            return linter;
          })();
          grammarLinterRef.current = linterPromise;
        }
        const linter = await linterPromise;
        const issues = summarizeHarperLints(
          await linter.lint(sentence, { language: "plaintext" })
        );
        if (!cancelled) {
          setGrammarIssues(issues);
          setGrammarCheckedSentence(sentence);
        }
      } catch {
        if (!cancelled) setGrammarError("Automatic grammar checking is unavailable.");
      } finally {
        if (!cancelled) setGrammarChecking(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [allVisibleRulesPass, completed, containsObviousGibberish, sentence]);

  useEffect(
    () => () => {
      const linterPromise = grammarLinterRef.current;
      if (linterPromise !== null) {
        void linterPromise.then((linter) => linter.dispose()).catch(() => {});
      }
    },
    []
  );

  async function play(body: Record<string, unknown>): Promise<PlayResponse> {
    const response = await fetch("/api/game/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as PlayResponse;
    if (!response.ok) {
      if (result.failedRuleIds?.length) {
        throw new Error(`The server rejected rules ${result.failedRuleIds.join(", ")}. The clock may have moved.`);
      }
      if (result.error === "too_fast") throw new Error("Slow down. Wait a second between rules.");
      if (result.error === "invalid_run") {
        setRunToken(null);
        throw new Error("This run expired. Start a new run.");
      }
      throw new Error(result.message || "The rule could not be cleared.");
    }
    return result;
  }

  function handleSentenceChange(value: string) {
    if (startedAt === null && value.length > 0) {
      setStartedAt(Date.now());
      // The server clock times the run; this only starts it.
      void play({})
        .then((result) => setRunToken(result.token ?? null))
        .catch((error) => setSubmissionError(error instanceof Error ? error.message : "The run could not start."));
    }
    setSentence(value);
    setSubmissionError("");
    setGrammarIssues(null);
    setGrammarError("");
    setGrammarChecking(false);
  }
  async function handleClearRule() {
    if (!allVisibleRulesPass || containsObviousGibberish || completed || clearing || !runToken) return;
    setClearing(true);
    setSubmissionError("");
    try {
      const result = await play({ token: runToken, sentence });
      setRunToken(result.token ?? null);
      setCleared(result.cleared ?? cleared);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "The rule could not be cleared.");
    } finally {
      setClearing(false);
    }
  }

  async function handleSubmitScore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !completed ||
      !allVisibleRulesPass ||
      containsObviousGibberish ||
      runToken === null ||
      submitting
    ) return;

    setSubmitting(true);
    setSubmissionError("");
    try {
      const response = await fetch("/api/game/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: runToken, nickname, sentence }),
      });
      const result = (await response.json()) as ScoreResponse;
      if (!response.ok) {
        if (result.failedRuleIds?.length) {
          throw new Error(`The server rejected rules ${result.failedRuleIds.join(", ")}.`);
        }
        if (response.status === 402) {
          throw new Error("Your browser did not pass the bot check, so this entry counts as automated. Reload the page and try a new run, or turn off extensions that block scripts.");
        }
        if (result.error === "run_already_submitted") {
          throw new Error("This run is already on the board. Start a new run to try again.");
        }
        if (result.error === "invalid_nickname") {
          throw new Error("Use 1 to 24 characters, no links or reserved names.");
        }
        if (result.error === "gibberish_detected") {
          throw new Error("Remove repeated-letter gibberish before saving your score.");
        }
        throw new Error(result.message || "The score could not be saved.");
      }
      if (!result.score) throw new Error("The server did not return a saved score.");
      setScoreReceipt(result.score);
      await refreshLeaderboard();
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "The score could not be saved."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetRun() {
    setSentence("");
    setCleared(0);
    setRunToken(null);
    setStartedAt(null);
    setNickname("");
    setSubmissionError("");
    setScoreReceipt(null);
    setGrammarIssues(null);
    setGrammarCheckedSentence("");
    setGrammarChecking(false);
    setGrammarError("");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
      <header className="mb-10 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          A solo sentence game · no account required
        </p>
        <h1 className="mt-4 text-5xl leading-none sm:text-7xl">Damage Control</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Write one incident report. Each cleared rule reveals another, and every
          earlier rule stays live. The UTC clock changes the challenge every five
          minutes, and the anchor word changes every day.
        </p>
        <p className="mt-3 max-w-2xl text-xs leading-6 text-muted-foreground">
          Agents can play too. Read <a className="underline underline-offset-4" href="/game.md">the agent guide</a> for
          the JSON API. Leaderboard entries that fail the invisible bot check cost a small x402 payment; you can
          also <a className="underline underline-offset-4" href="/bitcoin">donate</a>.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section
          aria-labelledby="challenge-title"
          className="rounded-2xl border border-border bg-card p-5 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Today’s incident
              </p>
              <h2 id="challenge-title" className="mt-2 text-3xl sm:text-4xl">
                Contain the report
              </h2>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs sm:items-end">
              <span className="rounded-full border border-border px-3 py-1.5 text-foreground">
                {challenge.date} · {challenge.weekday}
              </span>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Clock3 aria-hidden="true" size={14} />
                {challenge.timeBucket} UTC · changes in {countdown}
              </span>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.15em]">
              <span className="text-muted-foreground">
                {completed ? "All rules cleared" : `Rule ${currentLevel} of 20`}
              </span>
              <span className="text-foreground">{cleared}/20 cleared</span>
            </div>
            <div
              aria-label={`${cleared} of 20 rules cleared`}
              aria-valuemax={20}
              aria-valuemin={0}
              aria-valuenow={cleared}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${(cleared / 20) * 100}%` }}
              />
            </div>
          </div>

          <label className="mt-8 block" htmlFor="incident-sentence">
            <span className="text-sm font-medium text-foreground">
              Your one-sentence incident report
            </span>
            <textarea
              id="incident-sentence"
              className="mt-3 min-h-32 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-border-strong focus:ring-2 focus:ring-ring/30"
              maxLength={500}
              onChange={(event) => handleSentenceChange(event.currentTarget.value)}
              placeholder="Begin with today's date. Keep the report calm, precise, and increasingly constrained."
              value={sentence}
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>One sentence. Punctuation counts where a rule says it does.</span>
            <span className="tabular-nums">
              {tokenCount}/23 tokens · {sentence.length}/500 characters
            </span>
          </div>

          {containsObviousGibberish && (
            <p className="mt-2 text-sm text-muted-foreground" role="alert">
              Remove words with three or more identical letters in a row before clearing this rule.
            </p>
          )}

          <ol className="mt-7 divide-y divide-border border-y border-border">
            {challenge.rules.slice(0, visibleRuleCount).map((rule, index) => {
              const hasText = sentence.trim().length > 0;
              const passed = hasText && checks[index]?.passed === true;
              return (
                <li
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)_5.5rem] items-start gap-3 py-3"
                  key={rule.id}
                >
                  <span className="pt-0.5 font-mono text-xs text-muted-foreground">
                    {rule.id}
                  </span>
                  <span className="text-sm leading-6 text-foreground">
                    {rule.description}
                  </span>
                  <span
                    aria-label={hasText ? (passed ? "Passed" : "Needs work") : "Waiting"}
                    className={`inline-flex items-center justify-end gap-1.5 pt-0.5 text-xs ${
                      passed
                        ? "text-foreground"
                        : hasText
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    {passed ? <Check aria-hidden="true" size={14} /> : "—"}
                    {passed ? "Passed" : hasText ? "Fix" : "Waiting"}
                  </span>
                </li>
              );
            })}
          </ol>

          {completed ? (
            <div className="mt-7 rounded-xl border border-border bg-background p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Trophy aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
                <div>
                  <h3 className="font-medium text-foreground">The report is contained.</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    All twenty rules are checked again before saving. If the clock
                    rolled over, repair the sentence and the cleared levels stay yours.
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  Automatic spelling and grammar suggestions run locally in your browser.
                  Your sentence is not sent to a grammar service; suggestions are advisory
                  and do not affect your score.
                </p>
                {grammarChecking && (
                  <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
                    Checking spelling and grammar…
                  </p>
                )}
                {grammarError && (
                  <p className="mt-3 text-sm text-muted-foreground" role="alert">
                    {grammarError}
                  </p>
                )}
                {grammarCheckedSentence === sentence && grammarIssues !== null && (
                  <div className="mt-4 text-sm" role="status">
                    {grammarIssues.length === 0 ? (
                      <p className="text-muted-foreground">
                        No suggestions found. Automatic checks can miss issues.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {grammarIssues.map((issue, index) => (
                          <li className="rounded-lg bg-muted/50 p-3" key={`${issue.offset}-${index}`}>
                            <p>
                              <span className="font-medium">{issue.text}</span>
                              {" · "}
                              {issue.message}
                            </p>
                            {issue.suggestions.length > 0 && (
                              <p className="mt-1 text-muted-foreground">
                                Suggestions: {issue.suggestions.join(", ")}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              {scoreReceipt && (
                <p className="mt-4 text-sm text-foreground" role="status">
                  Score saved: {scoreReceipt.level}/20 in {formatDuration(scoreReceipt.elapsedMs)}
                  {scoreReceipt.rank ? ` · rank #${scoreReceipt.rank}` : " · outside the top 50"}.
                </p>
              )}
              <form className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleSubmitScore}>
                <label className="block">
                  <span className="sr-only">Leaderboard nickname</span>
                  <input
                    autoComplete="nickname"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-border-strong focus:ring-2 focus:ring-ring/30"
                    maxLength={24}
                    onChange={(event) => setNickname(event.currentTarget.value)}
                    placeholder="Choose a nickname"
                    value={nickname}
                  />
                </label>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={
                    !allVisibleRulesPass ||
                    containsObviousGibberish ||
                    !nickname.trim() ||
                    submitting ||
                    runToken === null
                  }
                  type="submit"
                >
                  {submitting ? <RefreshCw aria-hidden="true" className="animate-spin" size={15} /> : null}
                  {submitting ? "Saving…" : "Save score"}
                </button>
              </form>
              {submissionError && (
                <p className="mt-3 text-sm text-muted-foreground" role="alert">
                  {submissionError}
                </p>
              )}
              <button
                className="mt-4 text-xs text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                onClick={resetRun}
                type="button"
              >
                Start a new run
              </button>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {startedAt === null
                  ? "The timer starts when you begin writing."
                  : `Run time ${formatDuration(elapsedMs)} · all visible rules must pass.`}
              </p>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!allVisibleRulesPass || containsObviousGibberish || clearing || !runToken}
                onClick={() => void handleClearRule()}
                type="button"
              >
                Clear rule {currentLevel}
              </button>
            </div>
          )}
          {!completed && submissionError && (
            <p className="mt-3 text-sm text-muted-foreground" role="alert">
              {submissionError}
            </p>
          )}
        </section>

        <aside
          aria-labelledby="leaderboard-title"
          className="rounded-2xl border border-border bg-card p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Daily standings
              </p>
              <h2 id="leaderboard-title" className="mt-2 text-3xl">
                Leaderboard
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {challenge.date} UTC · refreshes within 30 seconds
              </p>
            </div>
            <Trophy aria-hidden="true" className="mt-1 text-muted-foreground" size={18} />
          </div>

          {leaderboardLoading ? (
            <p className="mt-8 text-sm text-muted-foreground" aria-live="polite">
              Loading today’s scores…
            </p>
          ) : leaderboardError ? (
            <div className="mt-6 rounded-xl border border-border bg-background p-4">
              <p className="text-sm leading-6 text-muted-foreground" role="alert">
                {leaderboardError}
              </p>
              <button
                className="mt-3 text-xs text-foreground underline decoration-border underline-offset-4"
                onClick={() => void refreshLeaderboard()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">
              No scores recorded today. Make the first report.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[19rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="pb-3 pr-3 font-normal">#</th>
                    <th className="pb-3 pr-3 font-normal">Name</th>
                    <th className="pb-3 pr-3 text-right font-normal">Rules</th>
                    <th className="pb-3 text-right font-normal">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((score, index) => (
                    <tr className="border-b border-border/70 last:border-0" key={`${score.displayNickname}-${index}`}>
                      <td className="py-3 pr-3 text-muted-foreground">{index + 1}</td>
                      <td className="max-w-32 truncate py-3 pr-3 text-foreground">
                        {score.displayNickname}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">{score.level}/20</td>
                      <td className="py-3 text-right font-mono text-xs tabular-nums">
                        {formatDuration(score.elapsedMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            One best score per nickname each UTC day. Higher rule count ranks first;
            time breaks ties.
          </p>
        </aside>
      </div>
    </div>
  );
}
