"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import { load, save } from "@/lib/storage";
import actions from "@/data/actions.json";
import reasons from "@/data/reasons.json";
import interventions from "@/data/interventions.json";
import type { Step, ReasonQuality } from "@/lib/types";

type Mode = "equation" | "expression" | "arithmetic";
type ReasonOption = { id: string; quality: ReasonQuality; misconception?: string };
type Intervention = {
  skill: string;
  mode: Mode;
  tasks: { id: string; expression: string; answer: string }[];
  reasonOptions?: ReasonOption[];
};

const FALLBACK = "EQU-MOVE-FLIP";
const EQUATION_ACTIONS = new Set(["SUB_BOTH", "ADD_BOTH", "DIV_BOTH", "MUL_BOTH"]);

export default function Practice() {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [target, setTarget] = useState<string>(FALLBACK);
  const [taskIndex, setTaskIndex] = useState(0);
  const [expression, setExpression] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [ready, setReady] = useState(false);

  // Hint agent — generative layer, second agent (see app/api/hint). Keyed
  // by step index so each step gets at most one hint request/response.
  const [hints, setHints] = useState<Record<number, string>>({});
  const [hintLoading, setHintLoading] = useState<Record<number, boolean>>({});

  // Arithmetic-mode local state
  const [answerInput, setAnswerInput] = useState("");
  const [answerChecked, setAnswerChecked] = useState<boolean | null>(null);

  const startedAt = useRef(Date.now());
  const bank = interventions as unknown as Record<string, Intervention>;

  useEffect(() => {
    const stored = load<string>("targetMisconception");
    const id = stored && bank[stored] ? stored : FALLBACK;
    const first = bank[id].tasks[0];
    setTarget(id);
    setExpression(first.expression);
    setSteps([
      {
        index: 1,
        expression: first.expression,
        actionId: null,
        actionValue: null,
        reasonId: null,
        reasonQuality: null,
        verified: true,
      },
    ]);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mode: Mode = bank[target]?.mode ?? "equation";
  const taskCount = ready ? Math.min(bank[target].tasks.length, 3) : 0;

  const isExpressionExpand = mode === "expression" && expression.includes("(");
  const availableActions = useMemo(() => {
    if (mode === "equation") return actions.filter((a) => EQUATION_ACTIONS.has(a.id) || a.id === "COLLECT" || a.id === "EXPAND");
    if (mode === "expression") {
      return actions.filter((a) => (isExpressionExpand ? a.id === "EXPAND" : a.id === "COLLECT"));
    }
    return [];
  }, [mode, isExpressionExpand]);

  const action = useMemo(() => actions.find((a) => a.id === actionId) ?? null, [actionId]);
  const reasonOptions = useMemo(() => (action ? action.reasons : []), [action]);

  const canVerify =
    actionId !== null &&
    reasonId !== null &&
    (!action?.needsValue || value.trim() !== "") &&
    !busy;

  async function verifyAlgebra() {
    if (!action || !reasonId) return;
    setBusy(true);
    setNote("");

    let res: { ok: boolean; valid?: boolean; expression?: string; solved?: boolean };
    try {
      const r = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expression,
          op: action.op,
          value: action.needsValue ? Number(value) : null,
        }),
      });
      res = await r.json();
    } catch {
      res = { ok: false };
    }

    setBusy(false);

    if (!res.ok || !res.valid || !res.expression) {
      setNote(t("practice.investigate"));
      return;
    }

    const meta = reasons.find((r) => r.id === reasonId);
    const step: Step = {
      index: steps.length + 1,
      expression: res.expression,
      actionId: action.id,
      actionValue: action.needsValue ? Number(value) : null,
      reasonId,
      reasonQuality: (meta?.quality ?? "unknown") as ReasonQuality,
      verified: true,
    };

    const updated = [...steps, step];
    setSteps(updated);
    setExpression(res.expression);
    setActionId(null);
    setValue("");
    setReasonId(null);

    if (res.solved) finishTask(updated);
  }

  async function checkArithmetic() {
    if (!answerInput.trim()) return;
    setBusy(true);
    setNote("");

    let res: { ok: boolean; correct?: boolean; expected?: string };
    try {
      const r = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression, userAnswer: answerInput }),
      });
      res = await r.json();
    } catch {
      res = { ok: false };
    }
    setBusy(false);

    if (!res.ok) {
      setNote(t("practice.investigate"));
      return;
    }
    setAnswerChecked(!!res.correct);
    if (!res.correct) setNote(t("arithmetic.incorrect"));
  }

  function submitArithmeticStep() {
    if (!reasonId || answerChecked !== true) return;
    const opts = bank[target].reasonOptions ?? [];
    const meta = opts.find((r) => r.id === reasonId);
    const step: Step = {
      index: steps.length,
      expression: `${expression} = ${answerInput.trim()}`,
      actionId: "ANSWER",
      actionValue: null,
      reasonId,
      reasonQuality: (meta?.quality ?? "unknown") as ReasonQuality,
      verified: true,
    };
    const updated = [...steps.slice(0, steps.length - 1), step];
    setAnswerInput("");
    setAnswerChecked(null);
    setReasonId(null);
    finishTask(updated);
  }

  function finishTask(final: Step[]) {
    const tasks = bank[target].tasks;
    const nextIndex = taskIndex + 1;
    const count = Math.min(tasks.length, 3);

    if (nextIndex >= count) {
      save("session", {
        misconceptionId: target,
        skill: bank[target].skill,
        steps: final,
        durationMs: Date.now() - startedAt.current,
      });
      router.push("/retest");
      return;
    }

    const next = tasks[nextIndex];
    setTaskIndex(nextIndex);
    setExpression(next.expression);
    setSteps([
      {
        index: 1,
        expression: next.expression,
        actionId: null,
        actionValue: null,
        reasonId: null,
        reasonQuality: null,
        verified: true,
      },
    ]);
  }

  async function requestHint(step: Step) {
    if (hints[step.index] !== undefined || hintLoading[step.index]) return;
    setHintLoading((h) => ({ ...h, [step.index]: true }));

    const actionLabel =
      step.actionId === "ANSWER"
        ? t("arithmetic.answer")
        : step.actionId
          ? t(`actions.${step.actionId}`)
          : "";
    const reasonNamespace = mode === "arithmetic" ? "arithmeticReasons" : "reasons";
    const reasonText = step.reasonId ? t(`${reasonNamespace}.${step.reasonId}`) : "";

    let text = "";
    try {
      const r = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          skillLabel: t(`skills.${bank[target].skill}`),
          reasonQuality: step.reasonQuality ?? "unknown",
          actionLabel,
          reasonText,
        }),
      });
      const data = await r.json();
      text = data.ok ? data.text : "";
    } catch {
      text = "";
    }

    setHintLoading((h) => ({ ...h, [step.index]: false }));
    setHints((h) => ({ ...h, [step.index]: text }));
  }

  if (!ready || steps.length === 0) return null;

  return (
    <>
      <TopBar section={t("practice.title", { current: taskIndex + 1, total: taskCount })} />

      <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.2fr_1fr]">
        {/* LEFT — built steps */}
        <section className="border-r border-line bg-panel p-8">
          <Eyebrow>{t("practice.problem")}</Eyebrow>
          <p className="mt-3 font-mono text-2xl">{steps[0].expression}</p>

          <div className="mt-8 space-y-2.5">
            {steps.map((s) => (
              <div
                key={s.index}
                className="flex items-start gap-4 rounded-md border border-line bg-white px-4 py-3"
              >
                <span className="font-mono text-xs text-muted">{s.index}</span>
                <div className="flex-1">
                  <p className="font-mono text-[15px]">{s.expression}</p>
                  <p className="mt-1 text-xs text-muted">
                    {s.actionId === "ANSWER"
                      ? t("arithmetic.answer")
                      : s.actionId
                        ? t(`actions.${s.actionId}`)
                        : t("practice.initialState")}
                  </p>

                  {(s.reasonQuality === "procedural" || s.reasonQuality === "misconception") && (
                    <div className="mt-2">
                      {hints[s.index] === undefined ? (
                        <button
                          onClick={() => requestHint(s)}
                          disabled={hintLoading[s.index]}
                          className="text-xs font-medium text-action underline decoration-dotted underline-offset-2 disabled:opacity-50"
                        >
                          {hintLoading[s.index] ? t("practice.hintLoading") : t("practice.getHint")}
                        </button>
                      ) : hints[s.index] ? (
                        <p className="text-xs italic text-muted">
                          <span className="font-semibold not-italic">{t("practice.hintLabel")}:</span>{" "}
                          {hints[s.index]}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                <span className="text-ok">&#10003;</span>
              </div>
            ))}

            {mode !== "arithmetic" && (
              <div className="rounded-md border border-dashed border-line px-4 py-3">
                <span className="font-mono text-sm text-slate-300">
                  {t("practice.nextStep")}
                </span>
              </div>
            )}
          </div>

          {note && <p className="mt-5 text-sm text-warn">{note}</p>}
        </section>

        {/* RIGHT — action + reason, or arithmetic answer + reason */}
        <section className="p-8">
          <Eyebrow>{t("practice.step", { n: steps.length })}</Eyebrow>

          {mode !== "arithmetic" ? (
            <>
              <h3 className="mt-6 text-sm font-semibold">{t("practice.action")}</h3>
              <div className="mt-3 space-y-2">
                {availableActions.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActionId(a.id);
                        setReasonId(null);
                      }}
                      className={`flex flex-1 items-center gap-3 rounded-md border px-4 py-2.5 text-left text-sm transition-colors ${
                        actionId === a.id ? "border-action" : "border-line hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                          actionId === a.id ? "border-[4px] border-action" : "border-slate-300"
                        }`}
                      />
                      {t(`actions.${a.id}`)}
                    </button>
                    {actionId === a.id && a.needsValue && (
                      <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        inputMode="numeric"
                        className="w-16 rounded-md border border-line px-2 py-2 text-center font-mono text-sm outline-none focus:border-action"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="my-7 h-px bg-line" />

              <h3 className="text-sm font-semibold">{t("practice.reason")}</h3>
              {action ? (
                <>
                  <p className="mt-2 text-sm text-muted">
                    {t("practice.reasonPrompt", {
                      action: t(`actions.${action.id}`).toLowerCase(),
                    })}
                  </p>
                  <div className="mt-4 space-y-3">
                    {reasonOptions.map((rid, i) => (
                      <button
                        key={rid}
                        onClick={() => setReasonId(rid)}
                        className="flex w-full items-start gap-3 text-left text-sm"
                      >
                        <span
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border ${
                            reasonId === rid ? "border-[4px] border-action" : "border-slate-300"
                          }`}
                        />
                        <span>
                          {String.fromCharCode(65 + i)}. {t(`reasons.${rid}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs italic text-muted">{t("practice.firstChoice")}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-300">&mdash;</p>
              )}

              <div className="mt-8 flex justify-end">
                <Button onClick={verifyAlgebra} disabled={!canVerify}>
                  {busy ? "…" : t("practice.verify")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="mt-6 text-sm font-semibold">{t("arithmetic.answer")}</h3>
              <p className="mt-2 text-sm text-muted">{t("arithmetic.answerPrompt")}</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={answerInput}
                  onChange={(e) => {
                    setAnswerInput(e.target.value);
                    setAnswerChecked(null);
                  }}
                  placeholder={t("arithmetic.answerPlaceholder")}
                  className="w-40 rounded-md border border-line px-3 py-2 font-mono text-sm outline-none focus:border-action"
                />
                <Button
                  variant="ghost"
                  onClick={checkArithmetic}
                  disabled={busy || !answerInput.trim()}
                >
                  {busy ? "…" : t("arithmetic.check")}
                </Button>
              </div>
              {answerChecked === true && (
                <p className="mt-2 text-sm text-ok">{t("arithmetic.correct")}</p>
              )}

              <div className="my-7 h-px bg-line" />

              <h3 className="text-sm font-semibold">{t("arithmetic.reasonHeading")}</h3>
              <div className="mt-4 space-y-3">
                {(bank[target].reasonOptions ?? []).map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setReasonId(r.id)}
                    className="flex w-full items-start gap-3 text-left text-sm"
                    disabled={answerChecked !== true}
                  >
                    <span
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border ${
                        reasonId === r.id ? "border-[4px] border-action" : "border-slate-300"
                      } ${answerChecked !== true ? "opacity-40" : ""}`}
                    />
                    <span className={answerChecked !== true ? "opacity-40" : ""}>
                      {String.fromCharCode(65 + i)}. {t(`arithmeticReasons.${r.id}`)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs italic text-muted">{t("practice.firstChoice")}</p>

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={submitArithmeticStep}
                  disabled={answerChecked !== true || !reasonId}
                >
                  {t("practice.verify")}
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
