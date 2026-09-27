"use client";
import { useState, useEffect, useCallback } from "react";
import { Shield, RotateCcw, Zap, RefreshCw, Home, CheckCircle2 } from "lucide-react";

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
    setTimeout(() => sTs((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return { ts, push };
}
const statusTone: Record<string, string> = {
  paid: "text-ok", due: "text-info", late: "text-warn", blocked: "text-danger", failed: "text-danger",
  ok: "text-ok", block: "text-danger", fail: "text-danger", processing: "text-accent",
};
const statusLabel: Record<string, string> = {
  paid: "Paid", due: "Due", late: "Late", blocked: "Blocked", failed: "Failed",
  ok: "Paid", block: "Blocked", fail: "Failed", processing: "Processing…",
};
function St({ s }: { s: string }) {
  return <span className={`text-xs font-semibold ${statusTone[s] || "text-info"}`}>{statusLabel[s] || "Due"}</span>;
}
function Toasts({ ts }: { ts: { id: string; m: string; c: string }[] }) {
  const border: Record<string, string> = { ok: "border-ok", danger: "border-danger", warn: "border-warn", accent: "border-accent" };
  return (
    <div className="fixed right-4 top-4 z-[999] flex flex-col gap-1.5">
      {ts.map((t) => (
        <div key={t.id} className={`max-w-[300px] animate-toast-in rounded-lg border-l-[3px] bg-surface px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-pop ${border[t.c] || "border-accent"}`}>
          {t.m}
        </div>
      ))}
    </div>
  );
}
function useSt(c: number, ms = 70) {
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
  const vis = useSt(ATK.length, 70);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    return () => { document.documentElement.setAttribute("data-theme", "light"); };
  }, []);

  function runRD() {
    sDD(1);
    const o = ["abhi", "musammat", "kashish"];
    let d = 0;
    o.forEach((id) => {
      d += 600;
      setTimeout(() => { sP(id); nf.push("Processing " + tenants[id].name + "..."); }, d);
      d += 1e3;
      setTimeout(() => {
        const t = tenants[id];
        const tot = t.rS + t.ut + t.lf;
        if (t.bal >= tot) { sT((p) => ({ ...p, [id]: { ...p[id as keyof typeof p], st: "paid", bal: p[id as keyof typeof p].bal - tot } })); nf.push(t.name.split(" ")[0] + ": paid", "ok"); }
        else { sT((p) => ({ ...p, [id]: { ...p[id as keyof typeof p], st: "failed" } })); nf.push(t.name.split(" ")[0] + ": failed", "danger"); }
        sP(null);
      }, d);
    });
  }
  function spawn() {
    sSS([]);
    ["Wallet created", "Trust line set", "Signer list (2-of-3)", "Master key disabled", "Credential issued", "Live"].forEach((s, i) => setTimeout(() => sSS((p) => [...p, s]), i * 550 + 200));
  }
  function fire(a: typeof ATK[0]) {
    if (run) return;
    sRn(a.id); sR((r) => ({ ...r, [a.id]: undefined }));
    setTimeout(() => { sR((r) => ({ ...r, [a.id]: true })); sRn(null); nf.push("Blocked: " + a.t, a.ly === "l" ? "accent" : "danger"); }, 1200);
  }

  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <Toasts ts={nf.ts} />

      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
            <Shield size={14} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">RentRelay</span>
          <span className="ml-2 text-[13px] text-ink-faint">Demo · Landlord + Guardian</span>
        </div>
        <button
          onClick={() => { sDD(9); sT(initT()); sR({}); sRn(null); sSS([]); }}
          className="flex items-center gap-1 rounded-md border border-line px-3.5 py-1.5 text-xs font-medium text-ink-faint"
        >
          <RotateCcw size={12} />Reset all
        </button>
      </header>

      <div className="flex gap-0.5 px-6 pt-4">
        {[{ id: "building", l: "Building Console" }, { id: "guardian", l: "Guardian Demo" }].map((tb) => (
          <button
            key={tb.id}
            onClick={() => sTab(tb.id)}
            className={`rounded-lg px-5 py-2.5 text-sm ${tab === tb.id ? "border border-line bg-surface font-semibold text-ink" : "border border-transparent font-normal text-ink-faint"}`}
          >
            {tb.l}
          </button>
        ))}
      </div>

      <div className="px-6 py-5">
        {tab === "building" && (
          <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">123 W 112th St</h1>
                <p className="mt-0.5 text-[13px] text-ink-faint">Landlord: Arpey · 2 units · 3 tenants</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted">Sep {dd}</span>
                <button onClick={() => sDD((d) => Math.min(d + 1, 30))} className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-muted">+1 day</button>
                <button onClick={runRD} className="flex items-center gap-1 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white"><Zap size={12} />Rent day</button>
                <button onClick={() => { sDD(9); sT(initT()); }} className="rounded-md border border-line px-2 py-1"><RotateCcw size={12} className="text-ink-faint" /></button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-lg border border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Add a tenant</p>
                <p className="text-xs text-ink-faint">Spawn wallet + keys on-chain</p>
              </div>
              <button onClick={spawn} className="rounded-md border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-muted">Spawn</button>
            </div>
            {spSt.length > 0 && (
              <div className="mb-4 rounded-lg border border-line px-4 py-2.5">
                {spSt.map((s, i) => (
                  <p key={i} className={`flex items-center gap-1.5 py-1 text-[13px] ${s === "Live" ? "font-bold text-ok" : "text-ink-muted"}`}>
                    {s === "Live" ? <CheckCircle2 size={14} className="text-ok" /> : <RefreshCw size={12} className={`text-accent ${i === spSt.length - 1 && s !== "Live" ? "animate-spin" : ""}`} />}
                    {s === "Live" ? "Agent live" : s}
                  </p>
                ))}
              </div>
            )}

            {UNITS.map((u) => {
              const allP = u.ts.every((id) => tenants[id as keyof typeof tenants].st === "paid");
              const anyL = u.ts.some((id) => tenants[id as keyof typeof tenants].st === "late");
              return (
                <div key={u.id} className="mb-3 overflow-hidden rounded-lg border border-line">
                  <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
                    <span className="flex items-center text-sm font-bold">
                      <Home size={14} className="mr-1.5 inline text-ink-faint" />
                      Unit {u.id}
                      <span className="ml-1.5 font-normal text-ink-faint">${u.rent.toLocaleString()}/mo</span>
                    </span>
                    <St s={allP ? "paid" : anyL ? "late" : "due"} />
                  </div>
                  {u.ts.map((tid) => {
                    const tn = tenants[tid as keyof typeof tenants];
                    const tot = tn.rS + tn.ut + tn.lf;
                    const isP = proc === tid;
                    return (
                      <div key={tid} className={`flex items-center justify-between border-b border-line-soft px-4 py-3 transition-colors ${isP ? "bg-accent-soft" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-line-soft text-xs font-bold text-ink-muted">{tn.ini}</div>
                          <div>
                            <p className="text-sm font-semibold">{tn.name}</p>
                            <p className="font-mono text-[11px] text-ink-faint">{tn.ag}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-[13px]">
                          <span className="font-semibold">${f$(tot)}</span>
                          <span className={`font-medium ${tn.bal >= tot ? "text-ok" : "text-danger"}`}>${f$(tn.bal)}</span>
                          <St s={isP ? "processing" : tn.st} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <p className="mb-2.5 mt-5 text-sm font-bold">Audit log</p>
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line">
                    {["Time", "Tenant", "Type", "Amount", "Status", "Rule", "Tx"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-ink-faint">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AUD.map((r) => (
                    <tr key={r.id} className="border-b border-line-soft">
                      <td className="px-3 py-2.5 text-ink-faint">{r.t}</td>
                      <td className="px-3 py-2.5 font-medium">{r.w}</td>
                      <td className="px-3 py-2.5 text-ink-muted">{r.wh}</td>
                      <td className="px-3 py-2.5 font-medium">${f$(r.a)}</td>
                      <td className="px-3 py-2.5"><St s={r.s} /></td>
                      <td className="px-3 py-2.5 text-ink-muted">{r.r}</td>
                      <td className="px-3 py-2.5">{r.tx ? <span className="font-mono text-[11px] text-accent">{r.tx}</span> : <span className="text-ink-faint">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "guardian" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">What could go wrong?</h1>
                <p className="mt-1 text-sm text-ink-faint">Five threats, each stopped by a different layer.</p>
              </div>
              <button onClick={() => { sR({}); sRn(null); }} className="flex items-center gap-1 rounded-md border border-line px-3.5 py-1.5 text-xs text-ink-faint">
                <RotateCcw size={12} />Reset
              </button>
            </div>
            <div className="mb-5 flex gap-3.5 text-xs text-ink-faint">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-2.5 rounded-sm bg-danger" />Guardian</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-2.5 rounded-sm bg-accent" />XRPL ledger</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {ATK.map((a, i) => {
                const show = vis.includes(i);
                const isR = run === a.id;
                const bl = res[a.id];
                const edge = a.ly === "l" ? "border-l-accent" : "border-l-danger";
                const soft = a.ly === "l" ? "bg-accent-soft" : "bg-danger-soft";
                const tone = a.ly === "l" ? "text-accent" : "text-danger";
                return (
                  <div key={a.id} className={`rounded-lg border-l-[3px] bg-surface px-[18px] py-4 transition-all duration-300 ${bl ? edge : "border-l-line"} ${show ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="mb-1 text-[15px] font-semibold">{a.t}</p>
                        <p className="text-[13px] leading-snug text-ink-faint">{a.d}</p>
                      </div>
                      <button onClick={() => fire(a)} disabled={!!isR} className={`shrink-0 rounded-md px-3.5 py-1.5 text-xs font-semibold ${bl ? "border border-line text-ink-faint" : "bg-danger text-white"} ${isR ? "cursor-wait" : ""}`}>
                        {isR ? <span className="flex items-center gap-1"><RefreshCw size={12} className="animate-spin" />Testing</span> : bl ? "Again" : "Run"}
                      </button>
                    </div>
                    {bl && (
                      <div className={`mt-3 rounded-md px-3.5 py-3 ${soft}`}>
                        <p className={`mb-1 text-[13px] font-bold ${tone}`}>Blocked by {a.bk}</p>
                        <p className="mb-1 text-[13px] font-medium text-ink">{a.v}</p>
                        <p className="text-xs text-ink-faint">{a.x}</p>
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
