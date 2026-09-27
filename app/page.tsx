"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown, CheckCircle2, RotateCcw, Send, RefreshCw, Bell, X, MessageCircle, ChevronRight,
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
function useSt(c: number, ms = 70) {
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
    setTimeout(() => sTs((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const mr = useCallback(() => sH((x) => x.map((n) => ({ ...n, r: true }))), []);
  return { ts, h, push, ur: h.filter((n) => !n.r).length, mr };
}

const statusTone: Record<string, string> = {
  paid: "text-ok", due: "text-info", late: "text-warn", blocked: "text-danger", failed: "text-danger",
  ok: "text-ok", block: "text-danger", fail: "text-danger", processing: "text-accent", note: "text-ink-faint",
  warn: "text-warn", alert: "text-warn",
};
const statusLabel: Record<string, string> = {
  paid: "Paid", due: "Due", late: "Late", blocked: "Blocked", failed: "Failed",
  ok: "Paid", block: "Blocked", fail: "Failed", processing: "Processing…",
};
function St({ s }: { s: string }) {
  return <span className={`text-xs font-semibold ${statusTone[s] || "text-info"}`}>{statusLabel[s] || "Due"}</span>;
}
function AN({ value, p = "$" }: { value: number; p?: string }) {
  const [d, sd] = useState(value);
  const r = useRef(0);
  useEffect(() => {
    const fr = d, dur = 600, t0 = performance.now();
    function tick(n: number) {
      const pr = Math.min((n - t0) / dur, 1);
      sd(fr + (value - fr) * (1 - Math.pow(1 - pr, 3)));
      if (pr < 1) r.current = requestAnimationFrame(tick);
    }
    r.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r.current);
  }, [value]);
  return <span>{p}{f$(d)}</span>;
}

const toastBorder: Record<string, string> = {
  ok: "border-ok", danger: "border-danger", warn: "border-warn", accent: "border-accent",
};
function Toasts({ ts }: { ts: any[] }) {
  return (
    <div className="fixed left-4 right-4 top-12 z-[9999] flex flex-col gap-1.5 md:left-auto md:right-4 md:w-80">
      {ts.map((t) => (
        <div key={t.id} className={`animate-toast-in rounded-xl border-l-[3px] bg-surface px-4 py-3 text-sm font-medium text-ink shadow-pop ${toastBorder[t.c] || "border-accent"}`}>
          {t.m}
        </div>
      ))}
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
    if (open && d) setTimeout(() => { sM([{ id: "g", r: "a", t: d.hi }]); setTimeout(() => sS(d.sg), 400); }, 250);
  }, [open, tid]);
  useEffect(() => { br.current?.scrollIntoView({ behavior: "smooth" }); }, [ms, typ]);
  useEffect(() => { if (open) setTimeout(() => ir.current?.focus(), 300); }, [open]);
  function send(t: string) {
    sM((m) => [...m, { id: Date.now(), r: "u", t }]); sS([]); sI(""); sT(true);
    const a = d.an[t as keyof typeof d.an] || "Let me check on that.";
    setTimeout(() => { sT(false); sM((m) => [...m, { id: Date.now() + 1, r: "a", t: a }]); setTimeout(() => sS(d.sg.filter((s) => s !== t)), 400); }, 900 + Math.random() * 600);
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-bg">
      <div className="flex items-center justify-between border-b border-line bg-surface px-5 pb-4 pt-14">
        <div>
          <p className="text-[17px] font-bold text-ink">Polo</p>
          <p className="text-[13px] text-ink-faint">RentRelay agent · Unit {tn.unit}</p>
        </div>
        <button onClick={close} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink"><X size={16} /></button>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
        {ms.map((m) => (
          <div key={m.id} className={`flex animate-msg-pop ${m.r === "u" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap px-4 py-3 text-[15px] leading-relaxed shadow-sm ${m.r === "u" ? "rounded-[20px] rounded-br-sm bg-accent text-white shadow-bubble" : "rounded-[20px] rounded-bl-sm bg-line-soft text-ink"}`}>
              {m.t}
            </div>
          </div>
        ))}
        {typ && (
          <div className="flex">
            <div className="flex gap-1.5 rounded-[18px] rounded-bl-sm bg-line-soft px-[18px] py-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={br} />
      </div>
      {sg.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pb-2.5">
          {sg.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-accent">{s}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2 border-t border-line-soft bg-surface px-4 pb-9 pt-3">
        <input ref={ir} value={inp} onChange={(e) => sI(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && inp.trim()) send(inp.trim()); }} placeholder="Ask anything..." className="flex-1 rounded-3xl border border-line bg-line-soft px-4 py-3 text-base outline-none focus:border-accent" />
        <button onClick={() => { if (inp.trim()) send(inp.trim()); }} className="rounded-3xl bg-accent px-3.5 py-3 text-white"><Send size={18} /></button>
      </div>
    </div>
  );
}

function GroupChat() {
  const [msgs, sMsgs] = useState(GRP);
  const [inp, sInp] = useState("");
  const [typ, sTyp] = useState(false);
  const vis = useSt(msgs.length, 100);
  const br = useRef<HTMLDivElement>(null);
  const ir = useRef<HTMLInputElement>(null);
  useEffect(() => { br.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typ]);
  const nameC: Record<string, string> = { "ag-m": "text-accent", "ag-j": "text-info", abhi: "text-ink", kashish: "text-ink", "?": "text-danger" };
  const grpAnswers: Record<string, string> = {
    "what do i owe": "Rent $1,450 + ConEd $38 = $1,488. Your wallet covers it.",
    "how much left": "Groceries budget: $76 remaining this week.",
    "did rent go through": "Yes — paid Oct 1. Tx: E4F8A2...9C1D.",
    "is everyone paid": "Abhimanyu: paid. Kashish: overdue (8 days, $15 fee). Musammat: paid.",
    "when is rent due": "Oct 1. Autopay handles it if your wallet is funded.",
  };
  function send(text: string) {
    sMsgs((m) => [...m, { id: Date.now(), f: "abhi", n: "Abhimanyu", m: text, t: "now", tp: "u" }]);
    sInp(""); sTyp(true);
    const key = Object.keys(grpAnswers).find((k) => text.toLowerCase().includes(k));
    const reply = key ? grpAnswers[key] : "Let me check on that and get back to you.";
    setTimeout(() => { sTyp(false); sMsgs((m) => [...m, { id: Date.now() + 1, f: "ag-m", n: "Polo", m: reply, t: "now", tp: "ag" }]); }, 900 + Math.random() * 600);
  }
  return (
    <div>
      <div className="px-0 pb-2.5 pt-3.5 text-center">
        <p className="text-sm font-medium text-ink-muted">Unit 4B · Abhimanyu, Kashish & agents</p>
      </div>
      <div className="px-4 pb-20">
        <div className="flex flex-col gap-1">
          {msgs.map((m, i) => {
            const show = vis.includes(i);
            const isU = m.tp === "u";
            const prev = i > 0 ? msgs[i - 1] : null;
            const showDate = !prev || m.t.split(",")[0] !== prev.t.split(",")[0];
            const sameSender = prev && prev.f === m.f && !showDate;
            const bubble =
              m.tp === "ok" ? "bg-ok-soft border-2 border-ok text-ink" :
              m.tp === "block" || m.tp === "scam" ? "bg-danger-soft border-2 border-danger text-danger" :
              m.tp === "warn" ? "bg-warn-soft border-2 border-warn text-ink" :
              isU ? "bg-accent text-white shadow-bubble border-0" : "bg-line-soft text-ink border-0";
            return (
              <div key={m.id}>
                {showDate && m.t !== "now" && <p className="px-0 pb-1.5 pt-3.5 text-center text-xs font-medium text-ink-faint">{m.t.split(",")[0]}</p>}
                <div className={`flex transition-all duration-300 ${isU ? "justify-end" : "justify-start"} ${show ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"} ${sameSender ? "mt-0.5" : "mt-2"}`}>
                  <div className="max-w-[82%]">
                    {!isU && !sameSender && <p className={`mb-0.5 ml-0.5 text-xs font-semibold ${nameC[m.f] || "text-ink-muted"}`}>{m.n}</p>}
                    <div className={`whitespace-pre-wrap rounded-[20px] px-4 py-3 text-[15px] leading-relaxed ${isU ? "rounded-br-sm" : "rounded-bl-sm"} ${bubble}`}>{m.m}</div>
                    {m.t !== "now" && (showDate || i === msgs.length - 1 || msgs[i + 1]?.f !== m.f) && (
                      <p className={`mt-0.5 text-[11px] text-ink-faint ${isU ? "text-right" : "text-left ml-0.5"}`}>{m.t.split(", ")[1]}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {typ && (
            <div className="mt-2 flex">
              <div className="flex gap-1.5 rounded-2xl rounded-bl-sm bg-line-soft px-[18px] py-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={br} />
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-[90] flex gap-2 border-t border-line-soft bg-surface px-4 pb-8 pt-2.5">
        <input ref={ir} value={inp} onChange={(e) => sInp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && inp.trim()) send(inp.trim()); }} placeholder="Message Unit 4B..." className="flex-1 rounded-3xl border border-line bg-line-soft px-4 py-3 text-base outline-none focus:border-accent" />
        <button onClick={() => { if (inp.trim()) send(inp.trim()); }} className="rounded-3xl bg-accent px-3.5 py-3 text-white"><Send size={18} /></button>
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 p-5">
      <div className="w-full max-w-[340px] rounded-2xl bg-surface p-6 shadow-pop">
        <p className="mb-1 text-lg font-bold text-ink">Top up wallet</p>
        <p className="mb-5 text-sm text-ink-muted">Simulated RLUSD transfer.</p>
        <div className="mb-4 flex gap-2">
          {ps.map((v) => (
            <button key={v} onClick={() => sA("" + v)} className={`flex-1 rounded-[10px] px-2 py-2.5 text-sm font-semibold ${a === "" + v ? "border-2 border-accent bg-accent-soft text-accent" : "border border-line bg-surface text-ink"}`}>
              ${v}
            </button>
          ))}
        </div>
        <input value={a} onChange={(e) => sA(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Amount" className="mb-5 w-full rounded-[10px] border border-line px-3 py-3 text-center text-base font-semibold outline-none focus:border-accent" />
        <div className="flex gap-2">
          <button onClick={close} className="flex-1 rounded-[10px] border border-line bg-surface py-3 text-[15px] font-semibold text-ink">Cancel</button>
          <button onClick={() => { if (parseFloat(a) > 0) { go(parseFloat(a)); close(); sA(""); } }} className="flex-1 rounded-[10px] bg-accent py-3 text-[15px] font-semibold text-white">Top up</button>
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
  const vis = useSt(ATK.length, 70);

  function runRD() {
    sDD(1);
    const o = ["abhi", "musammat", "kashish"];
    let d = 0;
    o.forEach((id) => {
      d += 600;
      setTimeout(() => { sP(id); nf("Processing " + tenants[id].name + "..."); }, d);
      d += 1e3;
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
    ["Wallet created", "Trust line set", "Signer list (2-of-3)", "Master key disabled", "Credential issued", "Live"].forEach((s, i) => setTimeout(() => sSS((p) => [...p, s]), i * 550 + 200));
  }
  function fire(a: typeof ATK[0]) {
    if (run) return;
    sRn(a.id); sR((r) => ({ ...r, [a.id]: undefined }));
    setTimeout(() => { sR((r) => ({ ...r, [a.id]: true })); sRn(null); nf("Blocked: " + a.t, a.ly === "l" ? "accent" : "danger"); }, 1200);
  }

  return (
    <div className="px-5 pb-24 pt-[70px]">
      <div className="mb-5 flex gap-1.5">
        {[{ id: "building", l: "Building" }, { id: "guardian", l: "Guardian Demo" }].map((tb) => (
          <button key={tb.id} onClick={() => sLT(tb.id)} className={`flex-1 rounded-lg py-2.5 text-sm ${lTab === tb.id ? "border-2 border-accent bg-accent-soft font-bold text-accent" : "border border-line bg-surface font-normal text-ink-faint"}`}>
            {tb.l}
          </button>
        ))}
      </div>

      {lTab === "building" && (
        <div>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-2.5">
            <div>
              <h2 className="text-[22px] font-bold text-ink">123 W 112th St</h2>
              <p className="mt-0.5 text-[13px] text-ink-muted">2 units · 3 tenants</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted">Sep {dd}</span>
              <button onClick={() => sDD((d: number) => Math.min(d + 1, 30))} className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs text-ink-muted">+1 day</button>
              <button onClick={runRD} className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white">Rent day</button>
              <button onClick={() => { sDD(9); sT(initT()); }} className="rounded-md border border-line bg-surface px-2 py-1"><RotateCcw size={12} className="text-ink-muted" /></button>
            </div>
          </div>

          <div className="mb-3.5 flex items-center justify-between rounded-lg border border-line px-3.5 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Add a tenant</p>
              <p className="text-xs text-ink-muted">Spawn wallet + keys on-chain</p>
            </div>
            <button onClick={spawn} className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted">Spawn</button>
          </div>
          {spSt.length > 0 && (
            <div className="mb-3.5 rounded-lg border border-line-soft bg-surface px-3.5 py-2.5">
              {spSt.map((s, i) => (
                <p key={i} className={`flex items-center gap-1.5 py-1 text-[13px] ${s === "Live" ? "font-bold text-ok" : "font-normal text-ink"}`}>
                  {s === "Live" ? <CheckCircle2 size={14} className="text-ok" /> : <RefreshCw size={12} className={`text-accent ${i === spSt.length - 1 && s !== "Live" ? "animate-spin" : ""}`} />}
                  {s === "Live" ? "Agent live" : s}
                </p>
              ))}
            </div>
          )}

          {UNITS.map((u) => {
            const allP = u.ts.every((id) => tenants[id].st === "paid");
            const anyL = u.ts.some((id) => tenants[id].st === "late");
            return (
              <div key={u.id} className="mb-2.5 overflow-hidden rounded-lg border border-line">
                <div className="flex items-center justify-between border-b border-line-soft bg-surface px-3.5 py-2.5">
                  <span className="text-sm font-bold text-ink">Unit {u.id}<span className="ml-1.5 font-normal text-ink-faint">${u.rent.toLocaleString()}/mo</span></span>
                  <St s={allP ? "paid" : anyL ? "late" : "due"} />
                </div>
                {u.ts.map((tid) => {
                  const tn = tenants[tid];
                  const tot = tn.rS + tn.ut + tn.lf;
                  const isP = proc === tid;
                  return (
                    <div key={tid} className={`flex items-center justify-between border-b border-line-soft px-3.5 py-2.5 transition-colors ${isP ? "bg-accent-soft" : "bg-transparent"}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-line-soft text-xs font-bold text-ink">{tn.ini}</div>
                        <div>
                          <p className="text-[13px] font-semibold text-ink">{tn.name}</p>
                          <p className="mono">{tn.ag}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3.5 text-[13px]">
                        <span className="font-semibold text-ink">${f$(tot)}</span>
                        <span className={`font-medium ${tn.bal >= tot ? "text-ok" : "text-danger"}`}>${f$(tn.bal)}</span>
                        <St s={isP ? "processing" : tn.st} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <p className="mb-2 mt-4 text-sm font-bold text-ink">Audit log</p>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-line">
                  {["Time", "Who", "Type", "Amt", "Status", "Rule"].map((h) => (
                    <th key={h} className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-faint">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AUD.map((r) => (
                  <tr key={r.id} className="border-b border-line-soft">
                    <td className="px-2.5 py-2 text-ink-faint">{r.t}</td>
                    <td className="px-2.5 py-2 font-medium text-ink">{r.w}</td>
                    <td className="px-2.5 py-2 text-ink-muted">{r.wh}</td>
                    <td className="px-2.5 py-2 font-medium text-ink">${f$(r.a)}</td>
                    <td className="px-2.5 py-2"><St s={r.s} /></td>
                    <td className="px-2.5 py-2 text-ink-muted">{r.r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lTab === "guardian" && (
        <div>
          <h2 className="mb-1 text-[22px] font-bold text-ink">What could go wrong?</h2>
          <p className="mb-1.5 text-sm text-ink-muted">Five threats, each blocked.</p>
          <div className="mb-4 flex gap-3 text-xs text-ink-faint">
            <span>Guardian = co-signer</span>
            <span>Ledger = on-chain</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {ATK.map((a, i) => {
              const show = vis.includes(i);
              const isR = run === a.id;
              const bl = res[a.id];
              const edge = a.ly === "l" ? "border-l-accent" : "border-l-danger";
              const tone = a.ly === "l" ? "text-accent bg-accent-soft" : "text-danger bg-danger-soft";
              return (
                <div key={a.id} className={`overflow-hidden rounded-lg border border-line border-l-[3px] px-4 py-3.5 transition-all duration-300 ${bl ? edge : "border-l-line"} ${show ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0"}`}>
                  <div className="flex items-start justify-between gap-2.5">
                    <div>
                      <p className="mb-1 text-[15px] font-semibold text-ink">{a.t}</p>
                      <p className="text-[13px] leading-snug text-ink-muted">{a.d}</p>
                    </div>
                    <button onClick={() => fire(a)} disabled={!!isR} className={`shrink-0 rounded-md px-3.5 py-1.5 text-xs font-semibold ${bl ? "border border-line bg-surface text-ink-muted" : "bg-danger text-white"} ${isR ? "cursor-wait" : ""}`}>
                      {isR ? <span className="flex items-center gap-1"><RefreshCw size={12} className="animate-spin" />Testing</span> : bl ? "Again" : "Run"}
                    </button>
                  </div>
                  {bl && (
                    <div className={`mt-2.5 rounded-md px-3 py-2.5 ${tone.split(" ")[1]}`}>
                      <p className={`mb-1 text-[13px] font-bold ${tone.split(" ")[0]}`}>Blocked by {a.bk}</p>
                      <p className="mb-1 text-[13px] font-medium text-ink">{a.v}</p>
                      <p className="text-xs text-ink-muted">{a.x}</p>
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
  const vis = useSt(acts.length, 70);
  function topUp(id: string, a: number) {
    sT((p) => ({ ...p, [id]: { ...p[id as keyof typeof p], bal: p[id as keyof typeof p].bal + a } }));
    nf.push("Topped up +$" + f$(a), "ok");
  }

  const roles = [
    ...Object.values(tenants).map((tn) => ({ id: tn.id, name: tn.name, ini: tn.ini, sub: "Unit " + tn.unit, type: "tenant" as const })),
    { id: "landlord", name: "Arpey", ini: "AR", sub: "Landlord", type: "landlord" as const },
  ];
  const activeRole = roles.find((r) => r.id === role) || roles[0];
  const dotColor: Record<string, string> = { ok: "bg-ok", danger: "bg-danger", warn: "bg-warn", accent: "bg-accent" };

  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <Toasts ts={nf.ts} />

      <div className="fixed -top-24 left-0 right-0 z-[101] h-56 bg-surface" />
      <header className="fixed left-0 right-0 top-0 z-[102] border-b border-line bg-surface pt-1.5">
        <div className="flex h-[50px] items-center justify-between px-5">
          <span className="text-xl font-bold tracking-tight text-ink">RentRelay</span>
          <div className="flex items-center gap-2">
            <button onClick={() => sDark(!dark)} className="px-1 text-lg" aria-label="Toggle theme">{dark ? "☀️" : "🌙"}</button>
            <button onClick={() => sNfO(!nfO)} className="relative p-1">
              <Bell size={22} className={nfO ? "text-accent" : "text-ink-muted"} />
              {nf.ur > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">{nf.ur}</span>}
            </button>
            <button onClick={() => sPk(!pk)} className={`flex items-center gap-1.5 rounded-[10px] border border-line px-3 py-1.5 text-sm font-medium ${isLandlord ? "bg-accent-soft" : "bg-surface"}`}>
              <div className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg text-xs font-bold ${isLandlord ? "bg-accent text-[10px] text-white" : "bg-accent-soft text-accent"}`}>{activeRole.ini}</div>
              {activeRole.name.split(" ")[0]}
              <ChevronDown size={14} className="text-ink-faint" />
            </button>
          </div>
        </div>
        {!isLandlord && (
          <div className="flex border-t border-line-soft">
            {[{ id: "dash", l: "Dashboard" }, { id: "group", l: "Unit " + t.unit + " chat" }].map((tb) => (
              <button key={tb.id} onClick={() => { sTab(tb.id); window.scrollTo(0, 0); }} className={`flex-1 border-b-[2.5px] py-3 text-sm ${tab === tb.id ? "border-ink font-bold text-ink" : "border-transparent font-normal text-ink-faint"}`}>
                {tb.l}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className={isLandlord ? "h-16" : "h-[105px]"} />

      {pk && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => sPk(false)} />
          <div className="fixed right-4 top-[110px] z-[160] min-w-[210px] rounded-xl border border-line bg-surface p-1 shadow-pop">
            <p className="px-3.5 pb-1 pt-2 text-[11px] font-semibold text-ink-faint">Tenants</p>
            {roles.filter((r) => r.type === "tenant").map((r) => (
              <button key={r.id} onClick={() => { sRole(r.id); sPk(false); sTab("dash"); window.scrollTo(0, 0); }} className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-[15px] ${role === r.id ? "bg-line-soft" : "bg-transparent"}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${role === r.id ? "bg-accent text-white" : "bg-line-soft text-ink-faint"}`}>{r.ini}</div>
                  <span className={role === r.id ? "font-semibold" : "font-normal"}>{r.name}</span>
                </div>
                <span className="text-[13px] text-ink-faint">{r.sub}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-line-soft" />
            <p className="px-3.5 py-1 text-[11px] font-semibold text-ink-faint">Landlord</p>
            <button onClick={() => { sRole("landlord"); sPk(false); window.scrollTo(0, 0); }} className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-[15px] ${role === "landlord" ? "bg-line-soft" : "bg-transparent"}`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${role === "landlord" ? "bg-accent text-white" : "bg-line-soft text-ink-faint"}`}>AR</div>
                <span className={role === "landlord" ? "font-semibold" : "font-normal"}>Arpey</span>
              </div>
              <span className="text-[13px] text-ink-faint">Landlord</span>
            </button>
          </div>
        </>
      )}

      {nfO && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => sNfO(false)} />
          <div className="fixed left-4 right-4 top-[110px] z-[160] overflow-hidden rounded-[14px] border border-line bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line-soft px-[18px] py-3.5">
              <span className="text-[15px] font-bold">Notifications</span>
              <button onClick={nf.mr} className="text-[13px] font-semibold text-accent">Mark read</button>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {nf.h.map((n) => (
                <div key={n.id} onClick={() => { sNfSel(n); sNfO(false); }} className={`cursor-pointer border-b border-line-soft px-[18px] py-3.5 ${n.r ? "bg-transparent" : "bg-accent-soft"}`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor[n.c] || "bg-accent"}`} />
                    <div className="flex-1">
                      <p className={`text-sm ${n.r ? "font-normal" : "font-semibold"}`}>{n.m}</p>
                      <span className="text-xs text-ink-faint">{n.t}</span>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-accent">View</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {nfSel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/15 p-5" onClick={() => sNfSel(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[340px] overflow-hidden rounded-[14px] bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line-soft px-[18px] py-3.5">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${dotColor[nfSel.c] || "bg-accent"}`} />
                <span className="text-sm font-bold">{nfSel.tag}</span>
              </div>
              <button onClick={() => sNfSel(null)}><X size={16} /></button>
            </div>
            <div className="px-[18px] py-4">
              <p className="mb-1 text-base font-semibold">{nfSel.m}</p>
              <p className="mb-3 text-[13px] text-ink-faint">{nfSel.t}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{nfSel.detail}</p>
            </div>
          </div>
        </div>
      )}

      {isLandlord && <LandlordView tenants={tenants} sT={sT} nf={nf.push} dd={dd} sDD={sDD} />}

      {!isLandlord && tab === "dash" && (
        <div className="px-5 pt-5">
          <p className="text-[15px] text-ink-muted">Unit {t.unit} · {t.sh * 100}% share</p>
          <h1 className="mb-5 mt-1 text-[28px] font-bold tracking-tight text-ink">{t.name.split(" ")[0]}&apos;s rent</h1>

          {t.str > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-[10px] bg-warn-soft px-4 py-3">
              <span className="text-[15px] font-semibold text-amber-800 dark:text-warn">{t.str} months on time</span>
              <span className="text-[13px] text-amber-700 dark:text-warn/80">Rental reference</span>
            </div>
          )}

          <div className="mb-5">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="mb-1 text-[13px] text-ink-faint">{t.st === "paid" ? "September — settled" : t.st === "late" ? `${t.dl} days overdue` : "Due Oct 1"}</p>
                <p className={`text-4xl font-bold tracking-tight ${t.st === "paid" ? "text-ok" : t.st === "late" ? "text-warn" : "text-ink"}`}><AN value={tot} /></p>
              </div>
              <St s={t.st} />
            </div>
            <div className="mt-3.5 flex flex-col gap-2.5 text-[15px] text-ink-muted">
              <div className="flex justify-between"><span>Rent ({t.sh * 100}%)</span><span className="font-medium text-ink">${f$(t.rS)}</span></div>
              <div className="flex justify-between"><span>ConEd</span><span className="font-medium text-ink">${f$(t.ut)}</span></div>
              {t.lf > 0 && <div className="flex justify-between text-warn"><span>Late fee</span><span className="font-medium">${f$(t.lf)}</span></div>}
            </div>
            <div className="my-3.5 h-px bg-line-soft" />
            <div className="flex justify-between text-sm text-ink-muted">
              <span>ConEd building: $128</span>
              <span className="font-medium text-accent">Read by Gemini</span>
            </div>
          </div>

          <div className="mb-[18px] rounded-xl border border-line p-[18px]">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-[13px] text-ink-faint">Rent wallet</p>
                <p className="text-[26px] font-bold tracking-tight text-ink"><AN value={t.bal} /><span className="ml-1 text-sm font-normal text-ink-faint">RLUSD</span></p>
                <p className="mono mt-1">{t.wa}</p>
              </div>
              <div className="text-right">
                {short && <p className="mb-1.5 text-sm font-semibold text-danger">Short ${f$(tot - t.bal)}</p>}
                <button onClick={() => sTU(true)} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-sm font-semibold text-white">Top up</button>
              </div>
            </div>
            <div className="mt-3.5 h-1.5 overflow-hidden rounded-sm bg-line-soft">
              <div className={`h-full rounded-sm transition-all duration-500 ${short ? "bg-danger" : "bg-ok"}`} style={{ width: `${Math.min((t.bal / tot) * 100, 100)}%` }} />
            </div>
          </div>

          <div className="mb-5 text-[15px]">
            <p className="mb-3 font-bold text-ink">Rules</p>
            <div className="flex flex-col gap-2.5 text-ink-muted">
              {[["Cap", "$" + t.cap.toLocaleString()], ["Autopay", t.ap ? "On" : "Off"], ["Keys", "2 of 3"], ["Landlord", LA]].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span>{l}</span>
                  <span className={`font-medium ${l === "Autopay" && t.ap ? "text-ok" : l === "Landlord" ? "font-mono text-xs text-ink-faint" : "text-ink"}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between rounded-[10px] border border-line px-4 py-3.5">
            <div>
              <p className="text-[15px] font-semibold text-ink">1 threat blocked</p>
              <p className="text-[13px] text-ink-muted">Scam payment, Sep 3</p>
            </div>
            <ChevronRight size={18} className="text-ink-faint" />
          </div>

          <p className="mb-3 text-[15px] font-bold text-ink">Activity</p>
          {acts.map((a, i) => {
            const show = vis.includes(i);
            const c = a.tp === "ok" ? "bg-ok" : a.tp === "block" ? "bg-danger" : a.tp === "warn" || a.tp === "alert" ? "bg-warn" : "bg-ink-faint";
            return (
              <div key={a.id} className={`flex gap-3 border-b border-line-soft py-3 transition-all duration-300 last:border-0 ${show ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"}`}>
                <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${c}`} />
                <div className="flex-1">
                  <p className="text-[15px] text-ink">{a.m}</p>
                  <div className="mt-1 flex gap-2">
                    <span className="text-[13px] text-ink-faint">{a.t}</span>
                    {"tx" in a && typeof a.tx === "string" && <span className="mono text-accent">{a.tx}</span>}
                  </div>
                </div>
                <St s={a.tp} />
              </div>
            );
          })}
        </div>
      )}

      {!isLandlord && tab === "group" && <GroupChat />}

      <div className="h-24" />

      {!isLandlord && tab === "dash" && (
        <div className="flex justify-end px-5 pb-8">
          <button onClick={() => sC1(true)} className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-accent shadow-fab">
            <MessageCircle size={24} className="text-white" />
          </button>
        </div>
      )}

      {!isLandlord && <Chat1 tid={tid} open={c1} close={() => sC1(false)} />}
      {!isLandlord && <TopUp tn={t} open={tu} close={() => sTU(false)} go={(a) => topUp(tid, a)} />}
    </div>
  );
}
