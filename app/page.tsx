"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown, CheckCircle2, RotateCcw, Send, RefreshCw, Bell, X, MessageCircle,
  Moon, Sun,
} from "lucide-react";

const LA = "rLndQ7v...4kDf";
const initT = () => ({
  abhi: { id: "abhi", name: "Abhimanyu Dudeja", ini: "A", unit: "4B", sh: 0.5, rT: 2900, rS: 1450, ut: 38, cap: 1600, wa: "rAbhi8x...KqvP", bal: 1520, ap: true, st: "paid", dl: 0, lf: 0, ag: "agent-abhi-4b", str: 11 },
  kashish: { id: "kashish", name: "Kashish", ini: "K", unit: "4B", sh: 0.5, rT: 2900, rS: 1450, ut: 38, cap: 1600, wa: "rKash3m...NpxR", bal: 980, ap: true, st: "late", dl: 8, lf: 15, ag: "agent-kashish-4b", str: 0 },
  musammat: { id: "musammat", name: "Musammat", ini: "M", unit: "2A", sh: 1.0, rT: 1450, rS: 1450, ut: 52, cap: 1600, wa: "rMusa7v...WxsT", bal: 1550, ap: true, st: "due", dl: 0, lf: 0, ag: "agent-musammat-2a", str: 7 },
});
const UNITS = [{ id: "4B", rent: 2900, ts: ["abhi", "kashish"] }, { id: "2A", rent: 1450, ts: ["musammat"] }];
const AUD = [
  { id: "a1", t: "Sep 1", w: "Abhimanyu", wh: "Rent", a: 1450, s: "ok", r: "Passed", tx: "E4F8A2...9C1D" },
  { id: "a2", t: "Sep 1", w: "Abhimanyu", wh: "ConEd", a: 38, s: "ok", r: "Passed", tx: "B7D3F1...4E2A" },
  { id: "a3", t: "Sep 1", w: "Musammat", wh: "Rent", a: 1450, s: "ok", r: "Passed", tx: "C2A9E5...7F3B" },
  { id: "a4", t: "Sep 1", w: "Kashish", wh: "Rent", a: 1450, s: "fail", r: "Insufficient balance", tx: null },
  { id: "a5", t: "Sep 3", w: "Abhimanyu", wh: "Scam", a: 1450, s: "block", r: "Unrecognized address", tx: null },
];
const ATK = [
  { id: "scam", t: "Scam bank-account change", d: "Message reroutes rent to a new address.", bk: "Guardian", ly: "g", v: `Destination rScam...9xyz doesn't match verified address (${LA}).`, x: "Guardian pins the landlord's on-chain credential." },
  { id: "inflate", t: "Inflated utility bill", d: "ConEd share misread as $380 instead of $38.", bk: "Guardian", ly: "g", v: "Monthly total $1,830 exceeds tenant cap of $1,600.", x: "Guardian tallies all charges before co-signing." },
  { id: "double", t: "Double rent charge", d: "Landlord agent requests September rent again.", bk: "Guardian", ly: "g", v: "September 2026 already paid. Duplicate refused.", x: "Guardian tracks paid periods." },
  { id: "fee", t: "Illegal $200 late fee", d: "Fee exceeds NY cap, or charged in grace period.", bk: "Guardian", ly: "g", v: "$200 exceeds min($50, 5% x $1,450). Grace violated.", x: "NY RPL 238-a. Guardian enforces both." },
  { id: "key", t: "Stolen agent key", d: "Attacker signs with only the agent's key.", bk: "XRPL ledger", ly: "l", v: "1 signature, quorum requires 2. Rejected on-chain.", x: "Master key disabled. 2 of 3 needed. Ledger enforces." },
];
const ACT = {
  abhi: [{ id: 1, tp: "ok", m: "Rent $1,450.00 paid", t: "Sep 1", tx: "E4F8A2...9C1D" }, { id: 2, tp: "ok", m: "ConEd $38.00 paid", t: "Sep 1", tx: "B7D3F1...4E2A" }, { id: 3, tp: "note", m: "September settled", t: "Sep 1" }, { id: 4, tp: "block", m: "Scam blocked — unrecognized payee address", t: "Sep 3" }],
  kashish: [{ id: 1, tp: "warn", m: "Wallet short $508 for Sep 1 rent", t: "Aug 29" }, { id: 2, tp: "warn", m: "Rent day — still short", t: "Sep 1" }, { id: 3, tp: "warn", m: "Grace period: 4 days left", t: "Sep 3" }, { id: 4, tp: "alert", m: "Late fee: $5/day, now $15", t: "Sep 9" }],
  musammat: [{ id: 1, tp: "note", m: "Oct 1 dues covered by wallet", t: "Sep 28" }, { id: 2, tp: "note", m: "Autopay scheduled", t: "Sep 30" }],
};
const CHAT1 = {
  abhi: { hi: "September's settled — rent and ConEd paid. Nothing due.", sg: ["What did I pay?", "Why is ConEd $38?", "Is Kashish's rent paid?"], an: { "What did I pay?": "Rent $1,450 (50% of 4B) plus ConEd $38. Total $1,488, both on Sep 1, verified on-chain.", "Why is ConEd $38?": "Building bill was $128. 4B pays $76 by square footage, split 50/50 with Kashish. Your share: $38.", "Is Kashish's rent paid?": "Not yet. He's 8 days late with a $15 fee accruing. His agent is on it. Doesn't affect you." } },
  kashish: { hi: "September rent is 8 days overdue. Late fee: $15. What do you need?", sg: ["Why the late fee?", "Can I pay on the 5th?", "Total owed?"], an: { "Why the late fee?": "Due Sep 1, grace ended Sep 5. Fee is $5/day after that, capped at $50. You're 3 days past grace = $15.", "Can I pay on the 5th?": "I can request an extension. If approved, the fee pauses until Oct 5. Want me to send it?", "Total owed?": "Rent $1,450 + ConEd $38 + fee $15 = $1,503. Wallet has $980. Top up $523 and I'll pay immediately." } },
  musammat: { hi: "October rent covered. Autopay on. Nothing to do.", sg: ["ConEd share?", "Payment streak?", "When is rent day?"], an: { "ConEd share?": "Building bill $128. Unit 2A = 41% = $52. You're the sole tenant.", "Payment streak?": "7 months on time. Visible to your landlord as a reference.", "When is rent day?": "Oct 1. Autopay is on, wallet covers it. I'll handle it." } },
};
const GRP = [
  { id: 1, f: "ag-m", n: "Polo", m: "Rent reminder — Abhimanyu, $1,450 + ConEd $38 due Oct 1. Wallet covers it.", t: "Sep 28, 10:00 AM", tp: "ag" },
  { id: 2, f: "ag-j", n: "Polo-K", m: "Rent reminder — Kashish, $1,450 + ConEd $38 due Oct 1. Wallet short $508.", t: "Sep 28, 10:00 AM", tp: "ag" },
  { id: 3, f: "kashish", n: "Kashish", m: "why is ConEd $38?", t: "Sep 28, 10:12 AM", tp: "u" },
  { id: 4, f: "ag-j", n: "Polo-K", m: "Building bill $128. Unit 4B pays $76 (59% sq ft), split 50/50 = $38 each.", t: "Sep 28, 10:12 AM", tp: "ag" },
  { id: 5, f: "abhi", n: "Abhimanyu", m: "mine's covered right?", t: "Sep 28, 11:30 AM", tp: "u" },
  { id: 6, f: "ag-m", n: "Polo", m: "Yes — $1,520 in wallet, $1,488 needed. Autopay handles it Oct 1.", t: "Sep 28, 11:30 AM", tp: "ag" },
  { id: 7, f: "ag-m", n: "Polo", m: "Paid Abhimanyu's rent $1,450 → landlord\ntx: E4F8A2...9C1D", t: "Oct 1, 9:00 AM", tp: "ok" },
  { id: 8, f: "ag-m", n: "Polo", m: "Paid ConEd $38 → landlord\ntx: B7D3F1...4E2A", t: "Oct 1, 9:01 AM", tp: "ok" },
  { id: 9, f: "abhi", n: "Abhimanyu", m: "nice", t: "Oct 1, 9:05 AM", tp: "u" },
  { id: 10, f: "ag-j", n: "Polo-K", m: "Rent due today. Wallet $508 short — top up to pay.", t: "Oct 1, 9:00 AM", tp: "warn" },
  { id: 11, f: "?", n: "Unknown number", m: "URGENT: This is your landlord. We changed our bank account. Send rent to rScam...9xyz immediately.", t: "Oct 2, 3:22 PM", tp: "scam" },
  { id: 12, f: "ag-m", n: "Polo", m: "Blocked — that address isn't the verified landlord. Scam. Real address: " + LA, t: "Oct 2, 3:22 PM", tp: "block" },
  { id: 13, f: "ag-j", n: "Polo-K", m: "Confirmed scam. Not from the landlord's verified agent. Ignored.", t: "Oct 2, 3:22 PM", tp: "block" },
  { id: 14, f: "ag-j", n: "Polo-K", m: "Grace period ends tomorrow. Late fee starts Oct 6 at $5/day.", t: "Oct 5, 9:00 AM", tp: "warn" },
  { id: 15, f: "ag-j", n: "Polo-K", m: "Late fee active: $5/day. Current total: $15 (3 days). Cap: $50.", t: "Oct 9, 9:00 AM", tp: "warn" },
  { id: 16, f: "kashish", n: "Kashish", m: "how much total?", t: "Oct 9, 10:15 AM", tp: "u" },
  { id: 17, f: "ag-j", n: "Polo-K", m: "Rent $1,450 + ConEd $38 + fee $15 = $1,503.\nWallet $980. Top up $523.", t: "Oct 9, 10:15 AM", tp: "ag" },
];

const f$ = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function useSt(c: number, ms = 55) {
  const [v, s] = useState<number[]>([]);
  useEffect(() => {
    s([]);
    for (let i = 0; i < c; i++) setTimeout(() => s((p) => [...p, i]), (i + 1) * ms);
  }, [c, ms]);
  return v;
}
function useNf() {
  const [ts, sTs] = useState<any[]>([]);
  const [h, sH] = useState([
    { id: "n0", m: "Abhimanyu's rent paid", t: "Sep 1", r: true, c: "ok", detail: "Rent $1,450 and ConEd $38 paid. Verified on-chain.", tag: "Payment" },
    { id: "n1", m: "Scam payment blocked", t: "Sep 3", r: false, c: "danger", detail: "Unknown address rScam...9xyz rejected by Guardian.", tag: "Blocked" },
    { id: "n2", m: "Kashish overdue — day 8", t: "Sep 9", r: false, c: "warn", detail: "Wallet short. Late fee $15 accruing. Cap: $50.", tag: "Overdue" },
  ]);
  const push = useCallback((m: string, c = "accent") => {
    const id = "" + Date.now();
    const n = { id, m, t: "now", r: false, c, detail: m, tag: "Update" };
    sTs((t) => [...t, n]);
    sH((x) => [n, ...x]);
    setTimeout(() => sTs((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);
  const mr = useCallback(() => sH((x) => x.map((n) => ({ ...n, r: true }))), []);
  return { ts, h, push, ur: h.filter((n) => !n.r).length, mr };
}

const tone: Record<string, string> = {
  paid: "text-ok", due: "text-info", late: "text-warn", blocked: "text-danger", failed: "text-danger",
  ok: "text-ok", block: "text-danger", fail: "text-danger", processing: "text-accent", note: "text-ink-faint",
  warn: "text-warn", alert: "text-warn",
};
const softBg: Record<string, string> = {
  paid: "bg-ok-soft text-ok", due: "bg-info-soft text-info", late: "bg-warn-soft text-warn",
  blocked: "bg-danger-soft text-danger", failed: "bg-danger-soft text-danger",
  ok: "bg-ok-soft text-ok", block: "bg-danger-soft text-danger", fail: "bg-danger-soft text-danger",
  processing: "bg-accent-soft text-accent",
};
const label: Record<string, string> = {
  paid: "Paid", due: "Due", late: "Late", blocked: "Blocked", failed: "Failed",
  ok: "Paid", block: "Blocked", fail: "Failed", processing: "Processing",
};
function St({ s }: { s: string }) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold tracking-wide ${softBg[s] || "bg-info-soft text-info"}`}>
      {label[s] || "Due"}
    </span>
  );
}
function AN({ value, p = "$" }: { value: number; p?: string }) {
  const [d, sd] = useState(value);
  const r = useRef(0);
  useEffect(() => {
    const fr = d, dur = 520, t0 = performance.now();
    function tick(n: number) {
      const pr = Math.min((n - t0) / dur, 1);
      sd(fr + (value - fr) * (1 - Math.pow(1 - pr, 3)));
      if (pr < 1) r.current = requestAnimationFrame(tick);
    }
    r.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r.current);
  }, [value]);
  return <span className="font-display tabular-nums">{p}{f$(d)}</span>;
}

function Toasts({ ts }: { ts: any[] }) {
  return (
    <div className="fixed inset-x-4 top-3 z-[9999] mx-auto flex max-w-sm flex-col gap-2 md:inset-x-auto md:right-4">
      {ts.map((t) => (
        <div key={t.id} className="animate-toast-in glass rounded-2xl px-4 py-3 text-sm font-medium text-ink shadow-lift">
          {t.m}
        </div>
      ))}
    </div>
  );
}

function SegTabs({ tabs, value, onChange }: { tabs: { id: string; l: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="relative flex gap-1 rounded-2xl bg-surface/70 p-1 ring-1 ring-line/70 backdrop-blur">
      {tabs.map((tb) => {
        const on = value === tb.id;
        return (
          <button
            key={tb.id}
            onClick={() => onChange(tb.id)}
            className={`relative z-10 flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200 ${on ? "text-ink" : "text-ink-faint hover:text-ink-muted"}`}
          >
            {on && <span className="absolute inset-0 -z-10 animate-tab-slide rounded-xl bg-bg shadow-soft ring-1 ring-line/80" />}
            {tb.l}
          </button>
        );
      })}
    </div>
  );
}

function Chat1({ tid, open, close }: { tid: string; open: boolean; close: () => void }) {
  const d = CHAT1[tid as keyof typeof CHAT1];
  const tn = initT()[tid as keyof ReturnType<typeof initT>];
  const [ms, sM] = useState<any[]>([]);
  const [inp, sI] = useState("");
  const [typ, sT] = useState(false);
  const [sg, sS] = useState<string[]>([]);
  const br = useRef<HTMLDivElement>(null);
  const ir = useRef<HTMLInputElement>(null);
  useEffect(() => {
    sM([]); sS([]); sT(false);
    if (open && d) setTimeout(() => { sM([{ id: "g", r: "a", t: d.hi }]); setTimeout(() => sS(d.sg), 320); }, 180);
  }, [open, tid]);
  useEffect(() => { br.current?.scrollIntoView({ behavior: "smooth" }); }, [ms, typ]);
  useEffect(() => { if (open) setTimeout(() => ir.current?.focus(), 220); }, [open]);
  function send(t: string) {
    sM((m) => [...m, { id: Date.now(), r: "u", t }]); sS([]); sI(""); sT(true);
    const a = d.an[t as keyof typeof d.an] || "Let me check on that.";
    setTimeout(() => { sT(false); sM((m) => [...m, { id: Date.now() + 1, r: "a", t: a }]); setTimeout(() => sS(d.sg.filter((s) => s !== t)), 280); }, 700 + Math.random() * 400);
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-bg/95 backdrop-blur-md animate-fade-up">
      <div className="flex items-center justify-between px-5 pb-3 pt-12">
        <div>
          <p className="font-display text-lg font-bold tracking-tight">Polo</p>
          <p className="text-xs text-ink-faint">Agent · Unit {tn.unit}</p>
        </div>
        <button onClick={close} className="press rounded-xl p-2 text-ink-muted hover:bg-surface"><X size={18} /></button>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-4">
        {ms.map((m) => (
          <div key={m.id} className={`flex animate-msg-pop ${m.r === "u" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap px-4 py-3 text-[15px] leading-relaxed ${m.r === "u" ? "rounded-2xl rounded-br-md bg-ink text-bg" : "rounded-2xl rounded-bl-md glass text-ink"}`}>
              {m.t}
            </div>
          </div>
        ))}
        {typ && (
          <div className="flex">
            <div className="flex gap-1.5 rounded-2xl rounded-bl-md glass px-4 py-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={br} />
      </div>
      {sg.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {sg.map((s) => (
            <button key={s} onClick={() => send(s)} className="press rounded-xl bg-surface px-3.5 py-2 text-sm text-ink ring-1 ring-line hover:ring-accent/40 hover:bg-accent-soft/50">{s}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2 px-4 pb-8 pt-2">
        <input ref={ir} value={inp} onChange={(e) => sI(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && inp.trim()) send(inp.trim()); }} placeholder="Ask anything" className="flex-1 rounded-2xl bg-surface px-4 py-3 text-base ring-1 ring-line focus:ring-accent/40" />
        <button onClick={() => { if (inp.trim()) send(inp.trim()); }} className="press rounded-2xl bg-ink px-4 text-bg"><Send size={18} /></button>
      </div>
    </div>
  );
}

function GroupChat() {
  const [msgs, sMsgs] = useState(GRP);
  const [inp, sInp] = useState("");
  const [typ, sTyp] = useState(false);
  const vis = useSt(msgs.length, 70);
  const br = useRef<HTMLDivElement>(null);
  useEffect(() => { br.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typ]);
  const nameC: Record<string, string> = { "ag-m": "text-accent", "ag-j": "text-info", abhi: "text-ink", kashish: "text-ink", "?": "text-danger" };
  const answers: Record<string, string> = {
    "what do i owe": "Rent $1,450 + ConEd $38 = $1,488. Your wallet covers it.",
    "how much left": "Groceries budget: $76 remaining this week.",
    "did rent go through": "Yes — paid Oct 1. Tx: E4F8A2...9C1D.",
    "is everyone paid": "Abhimanyu: paid. Kashish: overdue (8 days, $15 fee). Musammat: paid.",
    "when is rent due": "Oct 1. Autopay handles it if your wallet is funded.",
  };
  function send(text: string) {
    sMsgs((m) => [...m, { id: Date.now(), f: "abhi", n: "Abhimanyu", m: text, t: "now", tp: "u" }]);
    sInp(""); sTyp(true);
    const key = Object.keys(answers).find((k) => text.toLowerCase().includes(k));
    const reply = key ? answers[key] : "Let me check on that and get back to you.";
    setTimeout(() => { sTyp(false); sMsgs((m) => [...m, { id: Date.now() + 1, f: "ag-m", n: "Polo", m: reply, t: "now", tp: "ag" }]); }, 700 + Math.random() * 400);
  }
  return (
    <div className="animate-fade-up">
      <p className="px-5 pb-3 pt-3 text-center text-xs font-medium tracking-wide text-ink-faint">Unit 4B · live</p>
      <div className="space-y-1 px-5 pb-24">
        {msgs.map((m, i) => {
          const show = vis.includes(i);
          const isU = m.tp === "u";
          const prev = i > 0 ? msgs[i - 1] : null;
          const showDate = !prev || m.t.split(",")[0] !== prev.t.split(",")[0];
          const same = prev && prev.f === m.f && !showDate;
          const bubble =
            m.tp === "ok" ? "bg-ok-soft text-ink" :
            m.tp === "block" || m.tp === "scam" ? "bg-danger-soft text-danger" :
            m.tp === "warn" ? "bg-warn-soft text-ink" :
            isU ? "bg-ink text-bg" : "glass text-ink";
          return (
            <div key={m.id}>
              {showDate && m.t !== "now" && <p className="py-3 text-center text-[11px] font-medium tracking-wider text-ink-faint">{m.t.split(",")[0]}</p>}
              <div className={`flex transition duration-300 ease-snappy ${isU ? "justify-end" : "justify-start"} ${show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${same ? "mt-1" : "mt-2.5"}`}>
                <div className="max-w-[80%]">
                  {!isU && !same && <p className={`mb-1 ml-1 text-[11px] font-semibold ${nameC[m.f] || "text-ink-muted"}`}>{m.n}</p>}
                  <div className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${isU ? "rounded-br-md" : "rounded-bl-md"} ${bubble}`}>{m.m}</div>
                </div>
              </div>
            </div>
          );
        })}
        {typ && (
          <div className="mt-2 flex">
            <div className="flex gap-1.5 rounded-2xl rounded-bl-md glass px-4 py-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={br} />
      </div>
      <div className="fixed bottom-0 left-0 right-0 flex gap-2 bg-bg/80 px-4 pb-8 pt-3 backdrop-blur-xl">
        <input value={inp} onChange={(e) => sInp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && inp.trim()) send(inp.trim()); }} placeholder="Message" className="flex-1 rounded-2xl bg-surface px-4 py-3 text-base ring-1 ring-line focus:ring-accent/40" />
        <button onClick={() => { if (inp.trim()) send(inp.trim()); }} className="press rounded-2xl bg-ink px-4 text-bg"><Send size={18} /></button>
      </div>
    </div>
  );
}

function TopUp({ tn, open, close, go }: { tn: any; open: boolean; close: () => void; go: (a: number) => void }) {
  const [a, sA] = useState("");
  if (!open) return null;
  const tot = tn.rS + tn.ut + tn.lf;
  const sf = Math.max(0, tot - tn.bal);
  const ps = [100, 250, 500];
  if (sf > 0 && !ps.includes(Math.ceil(sf))) ps.push(Math.ceil(sf));
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/25 p-4 backdrop-blur-sm sm:items-center" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="sheet w-full max-w-sm p-6">
        <p className="font-display text-xl font-bold tracking-tight">Top up</p>
        <p className="mt-1 text-sm text-ink-muted">Simulated RLUSD transfer</p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ps.map((v) => (
            <button key={v} onClick={() => sA("" + v)} className={`press rounded-xl py-2.5 text-sm font-semibold ${a === "" + v ? "bg-ink text-bg" : "bg-bg text-ink ring-1 ring-line hover:ring-accent/40"}`}>${v}</button>
          ))}
        </div>
        <input value={a} onChange={(e) => sA(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Custom amount" className="mt-3 w-full rounded-xl bg-bg px-4 py-3 text-center text-base font-semibold ring-1 ring-line focus:ring-accent/40" />
        <div className="mt-5 flex gap-2">
          <button onClick={close} className="press flex-1 rounded-xl py-3 text-sm font-medium text-ink-muted hover:bg-bg">Cancel</button>
          <button onClick={() => { if (parseFloat(a) > 0) { go(parseFloat(a)); close(); sA(""); } }} className="press flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:brightness-110">Confirm</button>
        </div>
      </div>
    </div>
  );
}

function LandlordView({ tenants, sT, nf, dd, sDD }: any) {
  const [proc, sP] = useState<string | null>(null);
  const [spSt, sSS] = useState<string[]>([]);
  const [lTab, sLT] = useState("building");
  const [res, sR] = useState<Record<string, boolean | undefined>>({});
  const [run, sRn] = useState<string | null>(null);
  const vis = useSt(ATK.length, 50);

  function runRD() {
    sDD(1);
    const o = ["abhi", "musammat", "kashish"];
    let d = 0;
    o.forEach((id) => {
      d += 500;
      setTimeout(() => { sP(id); nf("Processing " + tenants[id].name + "..."); }, d);
      d += 900;
      setTimeout(() => {
        const t = tenants[id];
        const tot = t.rS + t.ut + t.lf;
        if (t.bal >= tot) { sT((p: any) => ({ ...p, [id]: { ...p[id], st: "paid", bal: p[id].bal - tot } })); nf(t.name.split(" ")[0] + ": paid", "ok"); }
        else { sT((p: any) => ({ ...p, [id]: { ...p[id], st: "failed" } })); nf(t.name.split(" ")[0] + ": failed", "danger"); }
        sP(null);
      }, d);
    });
  }
  function spawn() {
    sSS([]);
    ["Wallet created", "Trust line set", "Signer list (2-of-3)", "Master key disabled", "Credential issued", "Live"].forEach((s, i) => setTimeout(() => sSS((p) => [...p, s]), i * 480 + 150));
  }
  function fire(a: typeof ATK[0]) {
    if (run) return;
    sRn(a.id); sR((r) => ({ ...r, [a.id]: undefined }));
    setTimeout(() => { sR((r) => ({ ...r, [a.id]: true })); sRn(null); nf("Blocked: " + a.t, a.ly === "l" ? "accent" : "danger"); }, 1000);
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-6">
      <div className="mb-8">
        <SegTabs
          tabs={[{ id: "building", l: "Building" }, { id: "guardian", l: "Guardian" }]}
          value={lTab}
          onChange={sLT}
        />
      </div>

      {lTab === "building" && (
        <div key="building" className="stagger space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-faint">Property</p>
              <h2 className="mt-1 font-display text-hero text-ink">123 W 112th St</h2>
              <p className="mt-1 text-sm text-ink-muted">2 units · 3 tenants</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink-muted">Sep {dd}</span>
              <button onClick={() => sDD((d: number) => Math.min(d + 1, 30))} className="press rounded-xl px-3 py-1.5 text-xs font-medium text-ink-muted ring-1 ring-line hover:bg-surface">+1 day</button>
              <button onClick={runRD} className="press rounded-xl bg-ink px-3.5 py-1.5 text-xs font-semibold text-bg">Rent day</button>
              <button onClick={() => { sDD(9); sT(initT()); }} className="press rounded-xl p-1.5 text-ink-faint hover:bg-surface"><RotateCcw size={14} /></button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl glass px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold">Add tenant</p>
              <p className="text-xs text-ink-faint">Spawn wallet on-chain</p>
            </div>
            <button onClick={spawn} className="press rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-white">Spawn</button>
          </div>
          {spSt.length > 0 && (
            <div className="space-y-2 rounded-2xl glass p-4">
              {spSt.map((s, i) => (
                <p key={i} className={`flex items-center gap-2 text-sm transition-all duration-300 ${s === "Live" ? "font-semibold text-ok" : "text-ink-muted"}`}>
                  {s === "Live" ? <CheckCircle2 size={14} /> : <RefreshCw size={12} className={i === spSt.length - 1 && s !== "Live" ? "animate-spin" : ""} />}
                  {s === "Live" ? "Agent live" : s}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-5">
            {UNITS.map((u) => {
              const allP = u.ts.every((id) => tenants[id].st === "paid");
              const anyL = u.ts.some((id) => tenants[id].st === "late");
              return (
                <section key={u.id}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Unit {u.id} <span className="font-normal text-ink-faint">${u.rent.toLocaleString()}/mo</span></h3>
                    <St s={allP ? "paid" : anyL ? "late" : "due"} />
                  </div>
                  <div className="divide-y divide-line/70 overflow-hidden rounded-2xl glass">
                    {u.ts.map((tid) => {
                      const tn = tenants[tid];
                      const tot = tn.rS + tn.ut + tn.lf;
                      const isP = proc === tid;
                      return (
                        <div key={tid} className={`flex items-center justify-between px-4 py-3.5 transition-colors duration-300 ${isP ? "bg-accent-soft/70" : ""}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg text-xs font-bold ring-1 ring-line">{tn.ini}</div>
                            <div>
                              <p className="text-sm font-semibold">{tn.name}</p>
                              <p className="mono">{tn.ag}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="tabular-nums font-medium">${f$(tot)}</span>
                            <span className={`tabular-nums font-semibold ${tn.bal >= tot ? "text-ok" : "text-danger"}`}>${f$(tn.bal)}</span>
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
            <h3 className="mb-3 text-sm font-semibold">Audit</h3>
            <div className="overflow-x-auto rounded-2xl glass">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                    {["Time", "Who", "Type", "Amt", "Status"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {AUD.map((r) => (
                    <tr key={r.id} className="border-b border-line-soft last:border-0 transition-colors hover:bg-bg/50">
                      <td className="px-4 py-3 text-ink-faint">{r.t}</td>
                      <td className="px-4 py-3 font-medium">{r.w}</td>
                      <td className="px-4 py-3 text-ink-muted">{r.wh}</td>
                      <td className="px-4 py-3 tabular-nums font-medium">${f$(r.a)}</td>
                      <td className="px-4 py-3"><St s={r.s} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {lTab === "guardian" && (
        <div key="guardian" className="animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-faint">Threats</p>
          <h2 className="mt-1 font-display text-hero">What could go wrong?</h2>
          <p className="mt-2 text-sm text-ink-muted">Five attacks. Tap Run to watch each get blocked.</p>
          <div className="mt-8 space-y-3">
            {ATK.map((a, i) => {
              const show = vis.includes(i);
              const isR = run === a.id;
              const bl = res[a.id];
              return (
                <div key={a.id} className={`rounded-2xl glass p-5 transition-all duration-300 ease-snappy hover:shadow-lift ${show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"} ${bl ? "ring-accent/30" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold tracking-tight">{a.t}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{a.d}</p>
                    </div>
                    <button onClick={() => fire(a)} disabled={!!isR} className={`press shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold ${bl ? "text-ink-muted ring-1 ring-line" : "bg-ink text-bg"}`}>
                      {isR ? <span className="flex items-center gap-1"><RefreshCw size={12} className="animate-spin" />Test</span> : bl ? "Again" : "Run"}
                    </button>
                  </div>
                  {bl && (
                    <div className="mt-4 animate-fade-up border-t border-line pt-4">
                      <p className={`text-xs font-semibold uppercase tracking-wider ${a.ly === "l" ? "text-accent" : "text-danger"}`}>Blocked by {a.bk}</p>
                      <p className="mt-1.5 text-sm font-semibold">{a.v}</p>
                      <p className="mt-1 text-sm text-ink-muted">{a.x}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [role, sRole] = useState("abhi");
  const [pk, sPk] = useState(false);
  const [tenants, sT] = useState(initT);
  const [nfO, sNfO] = useState(false);
  const [tab, sTab] = useState("dash");
  const [tu, sTU] = useState(false);
  const [c1, sC1] = useState(false);
  const [nfSel, sNfSel] = useState<any>(null);
  const [dd, sDD] = useState(9);
  const [dark, sDark] = useState(false);
  const nf = useNf();

  useEffect(() => { document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);
  const isLandlord = role === "landlord";
  const tid = isLandlord ? "abhi" : role;
  const t = tenants[tid as keyof typeof tenants];
  const acts = ACT[tid as keyof typeof ACT] || [];
  const tot = t.rS + t.ut + t.lf;
  const short = t.bal < tot;
  const vis = useSt(acts.length, 50);
  function topUp(id: string, a: number) {
    sT((p) => ({ ...p, [id]: { ...p[id as keyof typeof p], bal: p[id as keyof typeof p].bal + a } }));
    nf.push("Topped up +$" + f$(a), "ok");
  }

  const roles = [
    ...Object.values(tenants).map((tn) => ({ id: tn.id, name: tn.name, ini: tn.ini, sub: "Unit " + tn.unit, type: "tenant" as const })),
    { id: "landlord", name: "Arpey", ini: "AR", sub: "Landlord", type: "landlord" as const },
  ];
  const activeRole = roles.find((r) => r.id === role) || roles[0];
  const dot: Record<string, string> = { ok: "bg-ok", danger: "bg-danger", warn: "bg-warn", accent: "bg-accent" };

  return (
    <div className="min-h-screen text-ink">
      <Toasts ts={nf.ts} />

      <header className="sticky top-0 z-40 border-b border-line/50 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <span className="font-display text-[17px] font-bold tracking-tight">RentRelay</span>
          <div className="flex items-center gap-1">
            <button onClick={() => sDark(!dark)} className="press rounded-xl p-2 text-ink-muted hover:bg-surface" aria-label="Theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => sNfO(!nfO)} className="press relative rounded-xl p-2 text-ink-muted hover:bg-surface">
              <Bell size={18} />
              {nf.ur > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-soft-pulse rounded-full bg-danger" />}
            </button>
            <button onClick={() => sPk(!pk)} className="press ml-1 flex items-center gap-2 rounded-2xl bg-surface py-1 pl-1 pr-2.5 ring-1 ring-line hover:ring-accent/30">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-ink text-[10px] font-bold text-bg">{activeRole.ini}</span>
              <span className="text-sm font-semibold">{activeRole.name.split(" ")[0]}</span>
              <ChevronDown size={14} className={`text-ink-faint transition-transform duration-200 ${pk ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {!isLandlord && (
          <div className="mx-auto max-w-2xl px-5 pb-3">
            <SegTabs
              tabs={[{ id: "dash", l: "Home" }, { id: "group", l: `Unit ${t.unit}` }]}
              value={tab}
              onChange={(id) => { sTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            />
          </div>
        )}
      </header>

      {pk && (
        <>
          <div className="fixed inset-0 z-50 bg-ink/10 backdrop-blur-[2px]" onClick={() => sPk(false)} />
          <div className="sheet fixed right-4 top-[3.75rem] z-[60] w-60 overflow-hidden p-1.5">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Switch</p>
            {roles.filter((r) => r.type === "tenant").map((r) => (
              <button key={r.id} onClick={() => { sRole(r.id); sPk(false); sTab("dash"); }} className={`press flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${role === r.id ? "bg-accent-soft" : "hover:bg-bg"}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-bold ${role === r.id ? "bg-ink text-bg" : "bg-bg text-ink-muted ring-1 ring-line"}`}>{r.ini}</span>
                <span className="flex-1 font-semibold">{r.name.split(" ")[0]}</span>
                <span className="text-xs text-ink-faint">{r.sub}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-line" />
            <button onClick={() => { sRole("landlord"); sPk(false); }} className={`press flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${role === "landlord" ? "bg-accent-soft" : "hover:bg-bg"}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-bold ${role === "landlord" ? "bg-ink text-bg" : "bg-bg text-ink-muted ring-1 ring-line"}`}>AR</span>
              <span className="flex-1 font-semibold">Arpey</span>
              <span className="text-xs text-ink-faint">Landlord</span>
            </button>
          </div>
        </>
      )}

      {nfO && (
        <>
          <div className="fixed inset-0 z-50 bg-ink/10 backdrop-blur-[2px]" onClick={() => sNfO(false)} />
          <div className="sheet fixed inset-x-4 top-[3.75rem] z-[60] mx-auto max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-bold">Notifications</span>
              <button onClick={nf.mr} className="text-xs font-semibold text-accent">Mark read</button>
            </div>
            <div className="max-h-72 divide-y divide-line overflow-y-auto">
              {nf.h.map((n) => (
                <button key={n.id} onClick={() => { sNfSel(n); sNfO(false); }} className={`press flex w-full gap-3 px-4 py-3.5 text-left transition-colors ${n.r ? "hover:bg-bg/60" : "bg-accent-soft/50"}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[n.c] || "bg-accent"}`} />
                  <span className="flex-1">
                    <span className={`block text-sm ${n.r ? "font-normal" : "font-semibold"}`}>{n.m}</span>
                    <span className="text-xs text-ink-faint">{n.t}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {nfSel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/25 p-5 backdrop-blur-sm" onClick={() => sNfSel(null)}>
          <div onClick={(e) => e.stopPropagation()} className="sheet w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{nfSel.tag}</span>
              <button onClick={() => sNfSel(null)} className="press text-ink-faint"><X size={16} /></button>
            </div>
            <p className="mt-3 font-display text-xl font-bold tracking-tight">{nfSel.m}</p>
            <p className="mt-1 text-xs text-ink-faint">{nfSel.t}</p>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">{nfSel.detail}</p>
          </div>
        </div>
      )}

      {isLandlord && <LandlordView tenants={tenants} sT={sT} nf={nf.push} dd={dd} sDD={sDD} />}

      {!isLandlord && tab === "dash" && (
        <main key={tid} className="mx-auto max-w-2xl stagger px-5 pb-28 pt-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-faint">Unit {t.unit} · {t.sh * 100}% share</p>
            <h1 className="mt-2 font-display text-display text-ink">{t.name.split(" ")[0]}</h1>
            {t.str > 0 && (
              <p className="mt-3 text-sm text-ink-muted"><span className="font-semibold text-ink">{t.str} months</span> on time</p>
            )}
          </div>

          <section className="mt-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-ink-muted">
                  {t.st === "paid" ? "September settled" : t.st === "late" ? `${t.dl} days overdue` : "Due Oct 1"}
                </p>
                <p className={`mt-1 text-display ${t.st === "paid" ? "text-ok" : t.st === "late" ? "text-warn" : "text-ink"}`}>
                  <AN value={tot} />
                </p>
              </div>
              <St s={t.st} />
            </div>
            <dl className="mt-6 space-y-3 border-t border-line/80 pt-5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">Rent</dt><dd className="tabular-nums font-semibold">${f$(t.rS)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">ConEd</dt><dd className="tabular-nums font-semibold">${f$(t.ut)}</dd></div>
              {t.lf > 0 && <div className="flex justify-between text-warn"><dt>Late fee</dt><dd className="tabular-nums font-semibold">${f$(t.lf)}</dd></div>}
            </dl>
            <p className="mt-4 text-xs text-ink-faint">Building ConEd $128 · split by Gemini</p>
          </section>

          <section className="mt-8 rounded-[1.75rem] glass p-5 transition-shadow duration-300 hover:shadow-lift">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">Wallet</p>
                <p className="mt-2 text-3xl font-display font-bold tracking-tight"><AN value={t.bal} /></p>
                <p className="mono mt-2">{t.wa}</p>
              </div>
              <div className="text-right">
                {short && <p className="mb-2 text-xs font-semibold text-danger">Short ${f$(tot - t.bal)}</p>}
                <button onClick={() => sTU(true)} className="press rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Top up</button>
              </div>
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-bg">
              <div className={`h-full rounded-full transition-all duration-700 ease-snappy ${short ? "bg-danger" : "bg-ok"}`} style={{ width: `${Math.min((t.bal / tot) * 100, 100)}%` }} />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-bold">Rules</h2>
            <dl className="mt-4 space-y-0 text-sm">
              {[["Cap", "$" + t.cap.toLocaleString()], ["Autopay", t.ap ? "On" : "Off"], ["Keys", "2 of 3"], ["Landlord", LA]].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b border-line/60 py-3.5 last:border-0">
                  <dt className="text-ink-muted">{l}</dt>
                  <dd className={`font-semibold ${l === "Autopay" && t.ap ? "text-ok" : l === "Landlord" ? "mono font-normal" : ""}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-8 rounded-2xl bg-ok-soft/60 px-4 py-4 ring-1 ring-ok/15">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-ok">Protected</h2>
              <span className="text-xs font-medium text-ok/80">1 blocked</span>
            </div>
            <p className="mt-1.5 text-sm text-ink-muted">Scam payment refused · Sep 3</p>
          </section>

          <section className="mt-10">
            <h2 className="mb-2 text-sm font-bold">Activity</h2>
            <div>
              {acts.map((a, i) => {
                const show = vis.includes(i);
                const c = a.tp === "ok" ? "bg-ok" : a.tp === "block" ? "bg-danger" : a.tp === "warn" || a.tp === "alert" ? "bg-warn" : "bg-ink-faint";
                return (
                  <div key={a.id} className={`flex gap-3 border-b border-line/60 py-4 transition-all duration-300 ease-snappy last:border-0 ${show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${c}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.m}</p>
                      <div className="mt-1 flex gap-2 text-xs text-ink-faint">
                        <span>{a.t}</span>
                        {"tx" in a && typeof a.tx === "string" && <span className="mono text-accent">{a.tx}</span>}
                      </div>
                    </div>
                    <St s={a.tp} />
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {!isLandlord && tab === "group" && <GroupChat />}

      {!isLandlord && tab === "dash" && (
        <button onClick={() => sC1(true)} className="press fixed bottom-6 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-bg shadow-float hover:shadow-lift" aria-label="Chat">
          <MessageCircle size={22} />
        </button>
      )}

      {!isLandlord && <Chat1 tid={tid} open={c1} close={() => sC1(false)} />}
      {!isLandlord && <TopUp tn={t} open={tu} close={() => sTU(false)} go={(a) => topUp(tid, a)} />}
    </div>
  );
}
