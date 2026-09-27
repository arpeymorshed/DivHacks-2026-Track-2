"use client";
import { useState, useEffect, useCallback } from "react";
import { RotateCcw, RefreshCw, CheckCircle2 } from "lucide-react";

const LA = "rLndQ7v...4kDf";
const initT = () => ({
  abhi: { id: "abhi", name: "Abhimanyu Dudeja", ini: "A", unit: "4B", sh: 0.5, rT: 2900, rS: 1450, ut: 38, cap: 1600, wa: "rAbhi8x...KqvP", bal: 1520, ap: true, st: "paid", dl: 0, lf: 0, ag: "agent-abhi-4b" },
  kashish: { id: "kashish", name: "Kashish", ini: "K", unit: "4B", sh: 0.5, rT: 2900, rS: 1450, ut: 38, cap: 1600, wa: "rKash3m...NpxR", bal: 980, ap: true, st: "late", dl: 8, lf: 15, ag: "agent-kashish-4b" },
  musammat: { id: "musammat", name: "Musammat", ini: "M", unit: "2A", sh: 1.0, rT: 1450, rS: 1450, ut: 52, cap: 1600, wa: "rMusa7v...WxsT", bal: 1550, ap: true, st: "due", dl: 0, lf: 0, ag: "agent-musammat-2a" },
});
const UNITS = [{ id: "4B", rent: 2900, ts: ["abhi", "kashish"] }, { id: "2A", rent: 1450, ts: ["musammat"] }];
const ATK = [
  { id: "scam", t: "Scam bank-account change", d: "Message claims landlord changed accounts, reroutes rent.", bk: "Guardian", ly: "g", v: `Destination rScam...9xyz doesn't match verified address (${LA}).`, x: "Guardian pins the landlord's on-chain credential. Mismatch = refused." },
  { id: "inflate", t: "Inflated utility bill", d: "ConEd share misread as $380 instead of $38.", bk: "Guardian", ly: "g", v: "Monthly total $1,830 exceeds tenant cap of $1,600.", x: "Guardian tallies all charges before co-signing." },
  { id: "double", t: "Double rent charge", d: "Landlord agent requests September rent again.", bk: "Guardian", ly: "g", v: "September 2026 already paid. Duplicate refused.", x: "Guardian tracks paid periods. Same month = refused." },
  { id: "fee", t: "Illegal $200 late fee", d: "Fee exceeds NY cap, or charged during grace period.", bk: "Guardian", ly: "g", v: "$200 exceeds min($50, 5% × $1,450). Grace period violated.", x: "NY RPL §238-a. Guardian enforces the cap and grace window." },
  { id: "key", t: "Stolen agent key", d: "Attacker signs with only the agent's key.", bk: "XRPL ledger", ly: "l", v: "1 signature, quorum requires 2. Rejected on-chain.", x: "Master key disabled. 2 of 3 needed. The ledger enforces this." },
];
const AUD = [
  { id: "a1", t: "Sep 1", w: "Abhimanyu", wh: "Rent", a: 1450, s: "ok", r: "Passed", tx: "E4F8A2...9C1D" },
  { id: "a2", t: "Sep 1", w: "Abhimanyu", wh: "ConEd", a: 38, s: "ok", r: "Passed", tx: "B7D3F1...4E2A" },
  { id: "a3", t: "Sep 1", w: "Musammat", wh: "Rent", a: 1450, s: "ok", r: "Passed", tx: "C2A9E5...7F3B" },
  { id: "a4", t: "Sep 1", w: "Kashish", wh: "Rent", a: 1450, s: "fail", r: "Insufficient balance", tx: null },
  { id: "a5", t: "Sep 3", w: "Abhimanyu", wh: "Scam", a: 1450, s: "block", r: "Unrecognized address", tx: null },
];

const f$ = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function useNf() {
  const [ts, sTs] = useState<{ id: string; m: string; c: string }[]>([]);
  const push = useCallback((m: string, c = "accent") => {
    const id = "" + Date.now();
    sTs((t) => [...t, { id, m, c }]);
    setTimeout(() => sTs((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return { ts, push };
}
const statusTone: Record<string, string> = {
  paid: "text-ok", due: "text-info", late: "text-warn", blocked: "text-danger", failed: "text-danger",
  ok: "text-ok", block: "text-danger", fail: "text-danger", processing: "text-accent",
};
const statusLabel: Record<string, string> = {
  paid: "Paid", due: "Due", late: "Late", blocked: "Blocked", failed: "Failed",
  ok: "Paid", block: "Blocked", fail: "Failed", processing: "Processing",
};
function St({ s }: { s: string }) {
  if (!(s in statusLabel)) return null;
  return <span className={`text-[12px] font-medium ${statusTone[s] || "text-info"}`}>{statusLabel[s]}</span>;
}
function Toasts({ ts }: { ts: { id: string; m: string; c: string }[] }) {
  return (
    <div className="fixed inset-x-4 top-3 z-[9999] mx-auto flex max-w-sm flex-col gap-2 md:inset-x-auto md:right-4">
      {ts.map((t) => (
        <div key={t.id} className="animate-rise rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-panel">
          {t.m}
        </div>
      ))}
    </div>
  );
}
function useSt(c: number, ms = 40) {
  const [v, s] = useState<number[]>([]);
  useEffect(() => {
    s([]);
    for (let i = 0; i < c; i++) setTimeout(() => s((p) => [...p, i]), (i + 1) * ms);
  }, [c, ms]);
  return v;
}

export default function DemoPage() {
  const [tab, sTab] = useState("building");
  const [dd, sDD] = useState(9);
  const [tenants, sT] = useState(initT);
  const [proc, sP] = useState<string | null>(null);
  const [spSt, sSS] = useState<string[]>([]);
  const [res, sR] = useState<Record<string, boolean | undefined>>({});
  const [run, sRn] = useState<string | null>(null);
  const nf = useNf();
  const vis = useSt(ATK.length, 40);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    return () => { document.documentElement.setAttribute("data-theme", "light"); };
  }, []);

  function runRD() {
    sDD(1);
    const o = ["abhi", "musammat", "kashish"];
    let d = 0;
    o.forEach((id) => {
      d += 500;
      setTimeout(() => { sP(id); nf.push("Processing " + tenants[id as keyof typeof tenants].name + "..."); }, d);
      d += 900;
      setTimeout(() => {
        const t = tenants[id as keyof typeof tenants];
        const tot = t.rS + t.ut + t.lf;
        if (t.bal >= tot) { sT((p) => ({ ...p, [id]: { ...p[id as keyof typeof p], st: "paid", bal: p[id as keyof typeof p].bal - tot } })); nf.push(t.name.split(" ")[0] + ": paid", "ok"); }
        else { sT((p) => ({ ...p, [id]: { ...p[id as keyof typeof p], st: "failed" } })); nf.push(t.name.split(" ")[0] + ": failed", "danger"); }
        sP(null);
      }, d);
    });
  }
  function spawn() {
    sSS([]);
    ["Wallet created", "Trust line set", "Signer list (2-of-3)", "Master key disabled", "Credential issued", "Live"].forEach((s, i) => setTimeout(() => sSS((p) => [...p, s]), i * 450 + 150));
  }
  function fire(a: typeof ATK[0]) {
    if (run) return;
    sRn(a.id); sR((r) => ({ ...r, [a.id]: undefined }));
    setTimeout(() => { sR((r) => ({ ...r, [a.id]: true })); sRn(null); nf.push("Blocked: " + a.t, a.ly === "l" ? "accent" : "danger"); }, 1000);
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Toasts ts={nf.ts} />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[14px] font-medium tracking-tight">aartee.</span>
            <span className="text-[12px] text-ink-faint">Demo</span>
          </div>
          <button
            onClick={() => { sDD(9); sT(initT()); sR({}); sRn(null); sSS([]); }}
            className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[12px] text-ink-muted hover:bg-surface"
          >
            <RotateCcw size={11} />Reset
          </button>
        </div>
        <div className="mx-auto flex max-w-3xl gap-4 px-4">
          {[{ id: "building", l: "Building" }, { id: "guardian", l: "Guardian" }].map((tb) => (
            <button
              key={tb.id}
              onClick={() => sTab(tb.id)}
              className={`-mb-px border-b pb-2.5 text-[13px] ${tab === tb.id ? "border-ink font-medium text-ink" : "border-transparent text-ink-faint hover:text-ink-muted"}`}
            >
              {tb.l}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        {tab === "building" && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-hero text-ink">123 W 112th St</h1>
                <p className="mt-1 text-[13px] text-ink-muted">Landlord: Arpey · 2 units · 3 tenants</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-ink-muted">Sep {dd}</span>
                <button onClick={() => sDD((d) => Math.min(d + 1, 30))} className="rounded-md border border-line px-2 py-1 text-[12px] text-ink-muted hover:bg-surface">+1 day</button>
                <button onClick={runRD} className="rounded-md bg-ink px-2.5 py-1 text-[12px] font-medium text-bg hover:opacity-90">Rent day</button>
                <button onClick={() => { sDD(9); sT(initT()); }} className="rounded-md p-1 text-ink-faint hover:bg-surface"><RotateCcw size={13} /></button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-line bg-surface px-3.5 py-3">
              <div>
                <p className="text-[13px] font-medium">Add tenant</p>
                <p className="text-[12px] text-ink-faint">Spawn wallet on-chain</p>
              </div>
              <button onClick={spawn} className="rounded-md border border-line px-2.5 py-1 text-[12px] font-medium text-ink-muted hover:bg-bg">Spawn</button>
            </div>
            {spSt.length > 0 && (
              <div className="space-y-1.5 rounded-md border border-line bg-surface px-3.5 py-3">
                {spSt.map((s, i) => (
                  <p key={i} className={`flex items-center gap-2 text-[13px] ${s === "Live" ? "font-medium text-ok" : "text-ink-muted"}`}>
                    {s === "Live" ? <CheckCircle2 size={13} /> : <RefreshCw size={11} className={i === spSt.length - 1 && s !== "Live" ? "animate-spin" : ""} />}
                    {s === "Live" ? "Agent live" : s}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {UNITS.map((u) => {
                const allP = u.ts.every((id) => tenants[id as keyof typeof tenants].st === "paid");
                const anyL = u.ts.some((id) => tenants[id as keyof typeof tenants].st === "late");
                return (
                  <section key={u.id}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="text-[13px] font-medium">Unit {u.id} <span className="font-normal text-ink-faint">${u.rent.toLocaleString()}/mo</span></h3>
                      <St s={allP ? "paid" : anyL ? "late" : "due"} />
                    </div>
                    <div className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                      {u.ts.map((tid) => {
                        const tn = tenants[tid as keyof typeof tenants];
                        const tot = tn.rS + tn.ut + tn.lf;
                        const isP = proc === tid;
                        return (
                          <div key={tid} className={`flex items-center justify-between px-3.5 py-3 ${isP ? "bg-accent-soft/50" : ""}`}>
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-bg text-[11px] font-medium text-ink-muted">{tn.ini}</div>
                              <div>
                                <p className="text-[13px] font-medium">{tn.name}</p>
                                <p className="mono">{tn.ag}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[13px]">
                              <span className="tabular-nums text-ink-muted">${f$(tot)}</span>
                              <span className={`tabular-nums ${tn.bal >= tot ? "text-ok" : "text-danger"}`}>${f$(tn.bal)}</span>
                              <St s={isP ? "processing" : tn.st} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            <section>
              <h3 className="mb-2 text-[13px] font-medium">Audit</h3>
              <div className="overflow-x-auto rounded-md border border-line bg-surface">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-[11px] text-ink-faint">
                      {["Time", "Who", "Type", "Amt", "Status", "Rule", "Tx"].map((h) => (
                        <th key={h} className="px-3.5 py-2.5 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AUD.map((r) => (
                      <tr key={r.id} className="border-b border-line-soft last:border-0">
                        <td className="px-3.5 py-2.5 text-ink-faint">{r.t}</td>
                        <td className="px-3.5 py-2.5">{r.w}</td>
                        <td className="px-3.5 py-2.5 text-ink-muted">{r.wh}</td>
                        <td className="px-3.5 py-2.5 tabular-nums">${f$(r.a)}</td>
                        <td className="px-3.5 py-2.5"><St s={r.s} /></td>
                        <td className="px-3.5 py-2.5 text-ink-muted">{r.r}</td>
                        <td className="px-3.5 py-2.5">{r.tx ? <span className="mono text-accent">{r.tx}</span> : <span className="text-ink-faint">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {tab === "guardian" && (
          <div className="animate-fade-in">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-hero">What could go wrong?</h1>
                <p className="mt-1 text-[13px] text-ink-muted">Five attacks. Each one blocked.</p>
              </div>
              <button onClick={() => { sR({}); sRn(null); }} className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[12px] text-ink-muted hover:bg-surface">
                <RotateCcw size={11} />Reset
              </button>
            </div>
            <div className="mt-6 space-y-2">
              {ATK.map((a, i) => {
                const show = vis.includes(i);
                const isR = run === a.id;
                const bl = res[a.id];
                return (
                  <div key={a.id} className={`rounded-md border border-line bg-surface p-4 transition-opacity duration-200 ${show ? "opacity-100" : "opacity-0"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-medium">{a.t}</p>
                        <p className="mt-1 text-[13px] leading-snug text-ink-muted">{a.d}</p>
                      </div>
                      <button onClick={() => fire(a)} disabled={!!isR} className={`shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium ${bl ? "border border-line text-ink-muted" : "bg-ink text-bg hover:opacity-90"}`}>
                        {isR ? <span className="flex items-center gap-1"><RefreshCw size={11} className="animate-spin" />Test</span> : bl ? "Again" : "Run"}
                      </button>
                    </div>
                    {bl && (
                      <div className="mt-3 border-t border-line pt-3">
                        <p className={`text-[12px] font-medium ${a.ly === "l" ? "text-accent" : "text-danger"}`}>Blocked by {a.bk}</p>
                        <p className="mt-1 text-[13px]">{a.v}</p>
                        <p className="mt-0.5 text-[13px] text-ink-muted">{a.x}</p>
                      </div>
                    )}
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
