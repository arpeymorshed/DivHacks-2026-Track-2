"use client";
import AarteeLogo from "../AarteeLogo";
// Landlord console (/demo): everything here is live. State comes from GET /api/state; every button calls
// the real route (rent day through the Guardian on XRPL Testnet, attacks, spawn, clock, reset).
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Moon, RefreshCw, RotateCcw, Sun } from "lucide-react";
import { api, ATTACK_CARDS, errorText, ruleLabel, shortAddr, usd, type AttackResponse, type SpawnStep, type Tone } from "@/app/lib/api";
import { useDemoState } from "@/app/lib/useDemoState";
import type { ActivityEntry, DueStage, TenantState } from "@/types/rent";

// Static explanations for each attack card (the live result supplies the actual reason).
const ATTACK_TEXT: Record<string, { d: string; x: string }> = {
  "scam-address": { d: "A text claims the landlord changed bank accounts and asks the agent to pay there.", x: "The Guardian only co-signs payments to the landlord's verified on-ledger address." },
  "illegal-late-fee": { d: "The landlord's agent adds a $200 late fee.", x: "NY RPL §238-a: at most min($50, 5% of rent), never during the 5-day grace period." },
  "stolen-key": { d: "An attacker steals the agent's key and signs alone.", x: "Rent wallets need 2 of 3 signatures and the master key is disabled: the ledger itself refuses." },
  "inflated-coned": { d: "The ConEd share is misread as $500.", x: "The Guardian caps utilities per tenant before co-signing." },
  "double-charge": { d: "Rent is requested a second time this month.", x: "The Guardian checks the ledger: one rent payment per month." },
};

const toneText: Record<Tone, string> = { ok: "text-ok", warn: "text-warn", bad: "text-danger" };
const stageTone: Record<DueStage | "none", string> = { paid: "text-ok", due: "text-info", grace: "text-info", late: "text-warn", upcoming: "text-ink-faint", none: "text-ink-faint" };
const stageLabel: Record<DueStage | "none", string> = { paid: "Paid", due: "Due", grace: "Grace period", late: "Late", upcoming: "Upcoming", none: "No rent due" };
const activityTone: Record<ActivityEntry["status"], string> = { paid: "text-ok", done: "text-ok", refused: "text-warn", blocked: "text-danger", failed: "text-danger" };

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

type Toast = { id: number; m: string; tone: Tone };
function useToasts() {
  const [ts, setTs] = useState<Toast[]>([]);
  const push = useCallback((m: string, tone: Tone = "ok") => {
    const id = Date.now() + Math.random();
    setTs((t) => [...t, { id, m, tone }]);
    setTimeout(() => setTs((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return { ts, push };
}
function Toasts({ ts }: { ts: Toast[] }) {
  // Bottom of the screen so toasts never cover the header's Reset button.
  return (
    <div className="fixed inset-x-4 bottom-4 z-[9999] mx-auto flex max-w-sm flex-col gap-2 md:inset-x-auto md:right-4">
      {ts.map((t) => (
        <div key={t.id} className={`animate-rise rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm shadow-panel ${toneText[t.tone]}`}>{t.m}</div>
      ))}
    </div>
  );
}
function TxLink({ url, label }: { url?: string; label?: string }) {
  if (!url) return <span className="text-ink-faint">—</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mono inline-flex items-center gap-1 text-accent hover:underline">
      {label ?? "View"}<ExternalLink size={10} />
    </a>
  );
}

export default function DemoPage() {
  const { state, error, refresh } = useDemoState();
  const nf = useToasts();
  const [tab, setTab] = useState("building");
  const [busy, setBusy] = useState<string | null>(null); // which action is running (one at a time)
  const [spawnName, setSpawnName] = useState("");
  const [spawnSteps, setSpawnSteps] = useState<SpawnStep[]>([]);
  const [spawnDone, setSpawnDone] = useState<string | null>(null);
  const [attacks, setAttacks] = useState<Record<string, AttackResponse | { error: string }>>({});
  const [dark, setDark] = useState(true);

  // /demo follows its own toggle (default dark for the stage), instead of forcing dark.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  async function act(name: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(name);
    try {
      await fn();
    } catch (e) {
      nf.push(errorText(e), "bad");
    } finally {
      setBusy(null);
      void refresh();
    }
  }

  const rentDay = () =>
    act("rent-day", async () => {
      nf.push("Rent day: every tenant agent pays on its own…", "ok");
      const r = await api.rentDay();
      for (const res of r.results) {
        const name = state?.tenants.find((t) => t.id === res.tenantId)?.name ?? res.tenantId;
        const { label, tone } = res.payment?.success ? { label: `paid ${usd(res.intent.amountUsd)}`, tone: "ok" as Tone } : ruleLabel(res.guardianDecision.rule, "rent");
        nf.push(`${name}: ${label}`, tone);
      }
    });
  const advance = () => act("clock", async () => { await api.advanceDays(1); });
  const jumpToRentDay = () => act("clock", async () => { if (state) await api.jumpToRentDay(state.clock); });
  const reset = () =>
    act("reset", async () => {
      const r = await api.reset();
      setAttacks({});
      setSpawnSteps([]);
      setSpawnDone(null);
      nf.push(`Demo reset: run ${r.state.run}, back to ${fmtDay(r.state.today)}`, "ok");
    });
  const spawn = () =>
    act("spawn", async () => {
      const name = spawnName.trim();
      if (!name) throw new Error("Type the new tenant's name first");
      setSpawnSteps([]);
      setSpawnDone(null);
      const t = await api.spawn(name, (s) => setSpawnSteps((p) => [...p, s]));
      setSpawnDone(t.name);
      setSpawnName("");
      nf.push(`${t.name}'s agent is live`, "ok");
    });
  const fire = (name: string) =>
    act(`attack:${name}`, async () => {
      setAttacks((a) => { const next = { ...a }; delete next[name]; return next; });
      try {
        const r = await api.attack(name);
        setAttacks((a) => ({ ...a, [name]: r }));
        const { label, tone } = r.blocked ? { label: `Blocked by ${r.blockedBy === "ledger" ? "the XRP Ledger" : "the Guardian"}`, tone: "ok" as Tone } : ruleLabel(r.rule, "attack");
        nf.push(`${r.title}: ${label}`, tone);
      } catch (e) {
        setAttacks((a) => ({ ...a, [name]: { error: errorText(e) } }));
        throw e;
      }
    });

  const tenantsIn = (unitId: string) => (state?.tenants ?? []).filter((t) => t.unitId === unitId);
  const nameOf = (id?: string) => state?.tenants.find((t) => t.id === id)?.name ?? id ?? "Building";

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Toasts ts={nf.ts} />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[14px] font-medium tracking-tight"><AarteeLogo size={20} /></span>
            <span className="text-[12px] text-ink-faint">Landlord console</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setDark((d) => !d)} aria-label="Toggle theme" className="rounded-md p-1.5 text-ink-muted hover:bg-surface">
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button onClick={reset} disabled={!!busy} className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[12px] text-ink-muted hover:bg-surface disabled:opacity-50">
              {busy === "reset" ? <RefreshCw size={11} className="animate-spin" /> : <RotateCcw size={11} />}Reset demo
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-3xl gap-4 px-4">
          {[{ id: "building", l: "Building" }, { id: "guardian", l: "Guardian" }].map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`-mb-px border-b pb-2.5 text-[13px] ${tab === tb.id ? "border-ink font-medium text-ink" : "border-transparent text-ink-faint hover:text-ink-muted"}`}>
              {tb.l}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        {error && <p className="mb-4 rounded-md border border-line bg-surface px-3.5 py-2.5 text-[13px] text-danger">Can't reach the app: {error}</p>}
        {state?.warnings.map((w) => <p key={w} className="mb-4 rounded-md border border-line bg-surface px-3.5 py-2.5 text-[13px] text-warn">{w}</p>)}
        {!state && !error && <p className="text-[13px] text-ink-faint">Loading the building from the ledger…</p>}

        {state && tab === "building" && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-hero text-ink">123 W 112th St</h1>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Landlord: {state.building.landlordName} · <TxLink url={state.building.landlordExplorerUrl} label={shortAddr(state.building.landlordWallet)} /> · {state.building.units.length} units · {state.tenants.length} tenants
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] text-ink-muted">{fmtDay(state.clock.today)} · run {state.clock.run}</span>
                <button onClick={advance} disabled={!!busy} className="rounded-md border border-line px-2 py-1 text-[12px] text-ink-muted hover:bg-surface disabled:opacity-50">+1 day</button>
                <button onClick={jumpToRentDay} disabled={!!busy} className="rounded-md border border-line px-2 py-1 text-[12px] text-ink-muted hover:bg-surface disabled:opacity-50">Jump to rent day</button>
                <button onClick={rentDay} disabled={!!busy} className="flex items-center gap-1 rounded-md bg-ink px-2.5 py-1 text-[12px] font-medium text-bg hover:opacity-90 disabled:opacity-60">
                  {busy === "rent-day" && <RefreshCw size={11} className="animate-spin" />}Rent day
                </button>
              </div>
            </div>
            {state.paymentsMode === "mock" && <p className="text-[12px] text-warn">Payments are in mock mode: the XRPL env isn't configured on this deploy.</p>}

            <div className="rounded-md border border-line bg-surface px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[13px] font-medium">Add a tenant</p>
                  <p className="text-[12px] text-ink-faint">The main agent spawns their rent wallet on-chain (~30s)</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input value={spawnName} onChange={(e) => setSpawnName(e.target.value)} placeholder="Name" maxLength={30}
                    className="w-28 rounded-md border border-line bg-bg px-2 py-1 text-[16px] text-ink md:text-[13px]" />
                  <button onClick={spawn} disabled={!!busy} className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[12px] font-medium text-ink-muted hover:bg-bg disabled:opacity-50">
                    {busy === "spawn" && <RefreshCw size={11} className="animate-spin" />}Spawn
                  </button>
                </div>
              </div>
              {(spawnSteps.length > 0 || spawnDone) && (
                <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {spawnSteps.map((s, i) => (
                    <p key={i} className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
                      <CheckCircle2 size={12} className="text-ok" />{s.label}
                      {s.explorer && <TxLink url={s.explorer} />}
                      <span className="text-[11px] text-ink-faint">{(s.elapsedMs / 1000).toFixed(1)}s</span>
                    </p>
                  ))}
                  {busy === "spawn" && <p className="flex items-center gap-2 text-[13px] text-ink-faint"><RefreshCw size={11} className="animate-spin" />Waiting for the ledger…</p>}
                  {spawnDone && <p className="flex items-center gap-2 text-[13px] font-medium text-ok"><CheckCircle2 size={13} />{spawnDone}&apos;s agent is live</p>}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {state.building.units.map((u) => {
                const ts = tenantsIn(u.id);
                const unitRent = ts.reduce((s, t) => s + (t.due?.rentUsd ?? 0), 0);
                const stages = ts.map((t) => t.due?.stage ?? "none");
                const unitStage: DueStage | "none" = stages.every((s) => s === "paid") ? "paid" : stages.includes("late") ? "late" : stages[0] ?? "none";
                return (
                  <section key={u.id}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="text-[13px] font-medium">Unit {u.name} <span className="font-normal text-ink-faint">{usd(unitRent)}/mo</span></h3>
                      <span className={`text-[12px] font-medium ${stageTone[unitStage]}`}>{stageLabel[unitStage]}</span>
                    </div>
                    <div className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                      {ts.map((t) => <TenantRow key={t.id} t={t} processing={busy === "rent-day"} />)}
                    </div>
                  </section>
                );
              })}
            </div>

            <section>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-[13px] font-medium">Audit log</h3>
                <span className="text-[12px] text-ink-faint">Bank float {usd(state.bankBalanceUsd)}</span>
              </div>
              <div className="overflow-x-auto rounded-md border border-line bg-surface">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-[11px] text-ink-faint">
                      {["Time", "Who", "What", "Amt", "Status", "Why", "Ledger"].map((h) => <th key={h} className="px-3.5 py-2.5 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {state.activity.length === 0 && (
                      <tr><td colSpan={7} className="px-3.5 py-3 text-ink-faint">Nothing yet. Press Rent day.</td></tr>
                    )}
                    {state.activity.map((e) => (
                      <tr key={e.id} className="border-b border-line-soft last:border-0">
                        <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-faint">{fmtTime(e.time)}</td>
                        <td className="px-3.5 py-2.5">{nameOf(e.tenantId)}</td>
                        <td className="px-3.5 py-2.5 text-ink-muted">{e.title}</td>
                        <td className="px-3.5 py-2.5 tabular-nums">{e.amountUsd !== undefined ? usd(e.amountUsd) : "—"}</td>
                        <td className={`px-3.5 py-2.5 text-[12px] font-medium capitalize ${activityTone[e.status]}`}>{e.status}</td>
                        <td className="px-3.5 py-2.5 text-ink-muted">
                          {e.rule ? ruleLabel(e.rule, e.kind === "attack" ? "attack" : "rent").label : e.reason ?? ""}
                        </td>
                        <td className="px-3.5 py-2.5"><TxLink url={e.explorerUrl} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {state && tab === "guardian" && (
          <div className="animate-fade-in">
            <div>
              <h1 className="text-hero">What could go wrong?</h1>
              <p className="mt-1 text-[13px] text-ink-muted">Real attacks against Abhimanyu&apos;s rent wallet. Nothing is ever paid.</p>
            </div>
            <div className="mt-6 space-y-2">
              {ATTACK_CARDS.map((c) => {
                const r = attacks[c.name];
                const running = busy === `attack:${c.name}`;
                const text = ATTACK_TEXT[c.name];
                return (
                  <div key={c.name} className="rounded-md border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-medium">{c.title}{c.live && <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">LIVE DEMO</span>}</p>
                        <p className="mt-1 text-[13px] leading-snug text-ink-muted">{text.d}</p>
                      </div>
                      <button onClick={() => fire(c.name)} disabled={!!busy}
                        className={`shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium disabled:opacity-60 ${r ? "border border-line text-ink-muted" : "bg-ink text-bg hover:opacity-90"}`}>
                        {running ? <span className="flex items-center gap-1"><RefreshCw size={11} className="animate-spin" />Testing</span> : r ? "Again" : "Run"}
                      </button>
                    </div>
                    {r && <AttackResult r={r} explain={text.x} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TenantRow({ t, processing }: { t: TenantState; processing: boolean }) {
  const stage: DueStage | "none" = t.due?.stage ?? "none";
  const total = t.due?.totalUsd ?? 0;
  const short = t.balanceUsd !== null && t.due !== null && stage !== "paid" && t.balanceUsd < total;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 ${processing && stage !== "paid" ? "bg-accent-soft/50" : ""}`}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-bg text-[11px] font-medium text-ink-muted">{t.name[0]}</div>
        <div>
          <p className="text-[13px] font-medium">{t.name}</p>
          <p className="mono"><TxLink url={t.walletExplorerUrl} label={shortAddr(t.walletAddress)} /> · {t.agent.id}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[13px]">
        <span className="tabular-nums text-ink-muted" title={t.due ? `${usd(t.due.rentUsd)} rent + ${usd(t.due.utilitiesUsd)} ConEd${t.due.lateFeeUsd ? ` + ${usd(t.due.lateFeeUsd)} late fee` : ""}` : ""}>
          {usd(total)}{t.due?.lateFeeUsd ? <span className="text-warn"> (+{usd(t.due.lateFeeUsd)} fee)</span> : null}
        </span>
        <span className={`tabular-nums ${short ? "text-danger" : "text-ok"}`}>{usd(t.balanceUsd)}</span>
        {t.due?.payment ? (
          <TxLink url={t.due.payment.explorerUrl || undefined} label="Paid ✓" />
        ) : (
          <span className={`text-[12px] font-medium ${processing ? "text-accent" : stageTone[stage]}`}>{processing ? "Processing" : stageLabel[stage]}</span>
        )}
      </div>
    </div>
  );
}

function AttackResult({ r, explain }: { r: AttackResponse | { error: string }; explain: string }) {
  if ("error" in r) return <p className="mt-3 border-t border-line pt-3 text-[13px] text-warn">{r.error}</p>;
  const { label, tone } = r.blocked
    ? { label: `Blocked by ${r.blockedBy === "ledger" ? "the XRP Ledger" : "the Guardian"}${r.ledgerCode ? ` (${r.ledgerCode})` : ""}`, tone: "bad" as Tone }
    : ruleLabel(r.rule, "attack");
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className={`text-[12px] font-medium ${r.blocked && r.blockedBy === "ledger" ? "text-accent" : toneText[tone]}`}>{label}</p>
      <p className="mt-1 text-[13px]">{r.reason}</p>
      {r.blocked && <p className="mt-0.5 text-[13px] text-ink-muted">{explain}</p>}
    </div>
  );
}
