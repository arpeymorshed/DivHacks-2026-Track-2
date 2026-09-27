"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown, CheckCircle2, RotateCcw, Send, RefreshCw, Bell, X, MessageCircle,
  Moon, Sun,
} from "lucide-react";
import { buildPoloReply, type TenantChatState } from "@/lib/poloChat";

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
function useSt(c: number, ms = 40) {
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
    setTimeout(() => sTs((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  const mr = useCallback(() => sH((x) => x.map((n) => ({ ...n, r: true }))), []);
  return { ts, h, push, ur: h.filter((n) => !n.r).length, mr };
}

const tone: Record<string, string> = {
  paid: "text-ok", due: "text-info", late: "text-warn", blocked: "text-danger", failed: "text-danger",
  ok: "text-ok", block: "text-danger", fail: "text-danger", processing: "text-accent", note: "text-ink-faint",
  warn: "text-warn", alert: "text-warn",
};
const label: Record<string, string> = {
  paid: "Paid", due: "Due", late: "Late", blocked: "Blocked", failed: "Failed",
  ok: "Paid", block: "Blocked", fail: "Failed", processing: "Processing",
  note: "", warn: "", alert: "",
};
function St({ s }: { s: string }) {
  if (!(s in label) || label[s] === "") return null;
  return <span className={`text-[12px] font-medium ${tone[s] || "text-info"}`}>{label[s]}</span>;
}
function AN({ value, p = "$" }: { value: number; p?: string }) {
  const [d, sd] = useState(value);
  const r = useRef(0);
  useEffect(() => {
    const fr = d, dur = 400, t0 = performance.now();
    function tick(n: number) {
      const pr = Math.min((n - t0) / dur, 1);
      sd(fr + (value - fr) * (1 - Math.pow(1 - pr, 3)));
      if (pr < 1) r.current = requestAnimationFrame(tick);
    }
    r.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r.current);
  }, [value]);
  return <span className="tabular-nums">{p}{f$(d)}</span>;
}

function Toasts({ ts }: { ts: any[] }) {
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

type TopUpResult =
  | { ok: true; bal: number; added: number }
  | { ok: false; error: string; room: number };

function Chat1({
  tid, tn, open, close, onTopUp,
}: {
  tid: string;
  tn: ReturnType<typeof initT>[keyof ReturnType<typeof initT>];
  open: boolean;
  close: () => void;
  onTopUp: (amount: number) => TopUpResult;
}) {
  const d = CHAT1[tid as keyof typeof CHAT1];
  const [ms, sM] = useState<{ id: number | string; r: "u" | "a" | "err"; t: string }[]>([]);
  const [inp, sI] = useState("");
  const [typ, sT] = useState(false);
  const br = useRef<HTMLDivElement>(null);
  const ir = useRef<HTMLInputElement>(null);

  const totDue = tn.rS + tn.ut + tn.lf;
  const shortAmt = Math.max(0, Math.round((totDue - tn.bal) * 100) / 100);
  const room = Math.max(0, Math.round((tn.cap - tn.bal) * 100) / 100);

  const widgets = (() => {
    const items: { tag: string; label: string; prompt: string }[] = [
      { tag: "Wallet", label: "Wallet balance", prompt: "What's my wallet balance?" },
      { tag: "Balance", label: "What do I owe?", prompt: "What do I owe?" },
      { tag: "Schedule", label: "When is rent due?", prompt: "When is rent due?" },
      { tag: "Limits", label: "What's my cap?", prompt: "What's my cap?" },
    ];
    if (shortAmt > 0 && shortAmt <= room) {
      items.unshift({ tag: "Top up", label: `Add $${f$(shortAmt)} to cover`, prompt: `Top up $${f$(shortAmt)}` });
    }
    for (const amt of [100, 250, 500]) {
      if (amt <= room) items.push({ tag: "Top up", label: `Top up $${amt}`, prompt: `Top up $${amt}` });
    }
    if (room > 0 && room < 100) {
      items.push({ tag: "Top up", label: `Top up $${f$(room)} (max)`, prompt: `Top up $${f$(room)}` });
    }
    for (const s of d.sg) {
      if (!items.some((i) => i.prompt === s)) items.push({ tag: "Ask", label: s, prompt: s });
    }
    return items.slice(0, 8);
  })();

  useEffect(() => {
    sM([]); sT(false);
    if (open && d) setTimeout(() => { sM([{ id: "g", r: "a", t: d.hi }]); }, 120);
  }, [open, tid]);
  useEffect(() => { br.current?.scrollIntoView({ behavior: "smooth" }); }, [ms, typ]);
  useEffect(() => { if (open) setTimeout(() => ir.current?.focus(), 180); }, [open]);

  function toState(): TenantChatState {
    return {
      name: tn.name, unit: tn.unit, bal: tn.bal, cap: tn.cap,
      rS: tn.rS, ut: tn.ut, lf: tn.lf, st: tn.st, dl: tn.dl,
    };
  }

  function send(t: string) {
    sM((m) => [...m, { id: Date.now(), r: "u", t }]); sI(""); sT(true);
    const a = buildPoloReply(t, toState(), onTopUp, d.an as Record<string, string>);
    setTimeout(() => {
      sT(false);
      sM((m) => [...m, { id: Date.now() + 1, r: a.r, t: a.t }]);
    }, 550 + Math.random() * 300);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-bg animate-fade-in">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 pt-11">
        <div>
          <p className="text-[15px] font-medium">Polo</p>
          <p className="text-xs text-ink-faint">Agent · Unit {tn.unit} · Cap ${f$(tn.cap)}</p>
        </div>
        <button onClick={close} className="rounded-md p-1.5 text-ink-muted hover:bg-line-soft"><X size={16} /></button>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4">
        {ms.map((m) => (
          <div key={m.id} className={`flex animate-rise ${m.r === "u" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] whitespace-pre-wrap rounded-md px-3 py-2 text-[14px] leading-relaxed ${
              m.r === "u" ? "bg-ink text-bg"
                : m.r === "err" ? "border border-danger/30 bg-danger-soft text-danger"
                : "border border-line bg-surface text-ink"
            }`}>
              {m.t}
            </div>
          </div>
        ))}
        {typ && (
          <div className="flex">
            <div className="flex gap-1 rounded-md border border-line bg-surface px-3 py-2.5">
              {[0, 1, 2].map((i) => <div key={i} className="h-1 w-1 animate-pulse-dot rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={br} />
      </div>

      <div className="border-t border-line bg-bg px-4 py-2.5">
        <p className="mb-1.5 text-[11px] font-medium text-ink-faint">Suggestions</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {widgets.map((w) => (
            <button
              key={w.tag + w.prompt}
              onClick={() => send(w.prompt)}
              className="shrink-0 rounded-md border border-line bg-surface px-2.5 py-1.5 text-left hover:border-ink/25 hover:bg-bg"
            >
              <span className="block text-[10px] uppercase tracking-wide text-ink-faint">{w.tag}</span>
              <span className="text-[12.5px] font-medium text-ink">{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-t border-line px-3 py-3 pb-7">
        <input
          ref={ir}
          value={inp}
          onChange={(e) => sI(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && inp.trim()) send(inp.trim()); }}
          placeholder={"Try \u201cWhat\u2019s my wallet balance?\u201d or \u201cTop up $100\u201d"}
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-[14px] focus:border-ink/30"
        />
        <button onClick={() => { if (inp.trim()) send(inp.trim()); }} className="rounded-md bg-ink px-3 text-bg hover:opacity-90"><Send size={16} /></button>
      </div>
    </div>
  );
}

function GroupChat() {
  const [msgs, sMsgs] = useState(GRP);
  const [inp, sInp] = useState("");
  const [typ, sTyp] = useState(false);
  const vis = useSt(msgs.length, 45);
  const br = useRef<HTMLDivElement>(null);
  useEffect(() => { br.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typ]);
  const nameC: Record<string, string> = { "ag-m": "text-accent", "ag-j": "text-info", abhi: "text-ink", kashish: "text-ink", "?": "text-danger" };
  const answers: Record<string, string> = {
    "what do i owe": "Rent $1,450 + ConEd $38 = $1,488. Your wallet covers it.",
    "total": "Rent $1,450 + ConEd $38 = $1,488. Your wallet covers it.",
    "how much left": "Groceries budget: $76 remaining this week.",
    "did rent go through": "Yes — paid Oct 1. Tx: E4F8A2...9C1D.",
    "is everyone paid": "Abhimanyu: paid. Kashish: overdue (8 days, $15 fee). Musammat: paid.",
    "when is rent due": "Next payment of $1,488 is due Oct 1 ($1,450 rent + $38 ConEd). Your wallet covers it.",
  };
  function send(text: string) {
    sMsgs((m) => [...m, { id: Date.now(), f: "abhi", n: "Abhimanyu", m: text, t: "now", tp: "u" }]);
    sInp(""); sTyp(true);
    const q = text.toLowerCase().replace(/[?.!,]/g, " ").replace(/\s+/g, " ").trim();
    const key = Object.keys(answers).sort((a, b) => b.length - a.length).find((k) => q.includes(k));
    const abhiState: TenantChatState = {
      name: "Abhimanyu Dudeja", unit: "4B", bal: 1520, cap: 1600,
      rS: 1450, ut: 38, lf: 0, st: "paid", dl: 0,
    };
    let reply: string;
    if (key && !q.includes("wallet") && key !== "total" && !q.includes("balance")) {
      reply = answers[key];
    } else {
      const a = buildPoloReply(text, abhiState, () => ({ ok: false as const, error: "Top-ups happen in your personal Polo chat.", room: 80 }), answers);
      reply = a.t;
    }
    setTimeout(() => { sTyp(false); sMsgs((m) => [...m, { id: Date.now() + 1, f: "ag-m", n: "Polo", m: reply, t: "now", tp: "ag" }]); }, 650 + Math.random() * 350);
  }
  return (
    <div>
      <p className="border-b border-line px-4 py-2 text-center text-xs text-ink-faint">Unit 4B</p>
      <div className="space-y-0.5 px-4 pb-24 pt-3">
        {msgs.map((m, i) => {
          const show = vis.includes(i);
          const isU = m.tp === "u";
          const prev = i > 0 ? msgs[i - 1] : null;
          const showDate = !prev || m.t.split(",")[0] !== prev.t.split(",")[0];
          const same = prev && prev.f === m.f && !showDate;
          const bubble =
            m.tp === "ok" ? "border border-ok/25 bg-ok-soft text-ink" :
            m.tp === "block" || m.tp === "scam" ? "border border-danger/25 bg-danger-soft text-danger" :
            m.tp === "warn" ? "border border-warn/25 bg-warn-soft text-ink" :
            isU ? "bg-ink text-bg" : "border border-line bg-surface text-ink";
          return (
            <div key={m.id}>
              {showDate && m.t !== "now" && <p className="py-2.5 text-center text-[11px] text-ink-faint">{m.t.split(",")[0]}</p>}
              <div className={`flex transition-opacity duration-200 ${isU ? "justify-end" : "justify-start"} ${show ? "opacity-100" : "opacity-0"} ${same ? "mt-0.5" : "mt-2"}`}>
                <div className="max-w-[82%]">
                  {!isU && !same && <p className={`mb-0.5 ml-0.5 text-[11px] font-medium ${nameC[m.f] || "text-ink-muted"}`}>{m.n}</p>}
                  <div className={`whitespace-pre-wrap rounded-md px-3 py-2 text-[13.5px] leading-relaxed ${bubble}`}>{m.m}</div>
                </div>
              </div>
            </div>
          );
        })}
        {typ && (
          <div className="mt-2 flex">
            <div className="flex gap-1 rounded-md border border-line bg-surface px-3 py-2.5">
              {[0, 1, 2].map((i) => <div key={i} className="h-1 w-1 animate-pulse-dot rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={br} />
      </div>
      <div className="fixed bottom-0 left-0 right-0 flex gap-2 border-t border-line bg-bg px-3 py-3 pb-7">
        <input value={inp} onChange={(e) => sInp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && inp.trim()) send(inp.trim()); }} placeholder="Message" className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-[14px] focus:border-ink/30" />
        <button onClick={() => { if (inp.trim()) send(inp.trim()); }} className="rounded-md bg-ink px-3 text-bg hover:opacity-90"><Send size={16} /></button>
      </div>
    </div>
  );
}

function TopUp({ tn, open, close, go }: { tn: any; open: boolean; close: () => void; go: (a: number) => TopUpResult }) {
  const [a, sA] = useState("");
  const [err, sErr] = useState("");
  if (!open) return null;
  const tot = tn.rS + tn.ut + tn.lf;
  const sf = Math.max(0, tot - tn.bal);
  const room = Math.max(0, Math.round((tn.cap - tn.bal) * 100) / 100);
  const ps = [100, 250, 500].filter((v) => v <= room);
  if (sf > 0 && sf <= room && !ps.includes(Math.ceil(sf))) ps.push(Math.ceil(sf));
  if (room > 0 && room < 100 && !ps.includes(room)) ps.push(room);
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/20 p-4 sm:items-center" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm animate-rise rounded-lg border border-line bg-surface p-5 shadow-panel">
        <p className="text-[15px] font-medium">Top up</p>
        <p className="mt-0.5 text-[13px] text-ink-muted">Simulated RLUSD · cap ${f$(tn.cap)} · room ${f$(room)}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ps.map((v) => (
            <button key={v} onClick={() => { sA("" + v); sErr(""); }} className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${a === "" + v ? "bg-ink text-bg" : "border border-line text-ink hover:bg-bg"}`}>${v}</button>
          ))}
        </div>
        <input value={a} onChange={(e) => { sA(e.target.value.replace(/[^0-9.]/g, "")); sErr(""); }} placeholder="Custom amount" className="mt-3 w-full rounded-md border border-line bg-bg px-3 py-2 text-center text-[14px] focus:border-ink/30" />
        {err && <p className="mt-2 text-[12px] text-danger">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={close} className="flex-1 rounded-md px-3 py-2 text-[13px] text-ink-muted hover:bg-bg">Cancel</button>
          <button onClick={() => {
            const n = parseFloat(a);
            if (!(n > 0)) { sErr("Enter an amount greater than $0."); return; }
            const result = go(n);
            if (result.ok === false) { sErr(result.error); return; }
            close(); sA(""); sErr("");
          }} className="flex-1 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white hover:opacity-90">Confirm</button>
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
  const vis = useSt(ATK.length, 35);

  function runRD() {
    sDD(1);
    const o = ["abhi", "musammat", "kashish"];
    let d = 0;
    o.forEach((id) => {
      d += 450;
      setTimeout(() => { sP(id); nf("Processing " + tenants[id].name + "..."); }, d);
      d += 800;
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
    ["Wallet created", "Trust line set", "Signer list (2-of-3)", "Master key disabled", "Credential issued", "Live"].forEach((s, i) => setTimeout(() => sSS((p) => [...p, s]), i * 420 + 120));
  }
  function fire(a: typeof ATK[0]) {
    if (run) return;
    sRn(a.id); sR((r) => ({ ...r, [a.id]: undefined }));
    setTimeout(() => { sR((r) => ({ ...r, [a.id]: true })); sRn(null); nf("Blocked: " + a.t, a.ly === "l" ? "accent" : "danger"); }, 900);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-5">
      <div className="mb-6 flex gap-5 border-b border-line">
        {[{ id: "building", l: "Building" }, { id: "guardian", l: "Guardian" }].map((tb) => (
          <button key={tb.id} onClick={() => sLT(tb.id)} className={`-mb-px border-b pb-2.5 text-[13px] ${lTab === tb.id ? "border-ink font-medium text-ink" : "border-transparent text-ink-faint hover:text-ink-muted"}`}>
            {tb.l}
          </button>
        ))}
      </div>

      {lTab === "building" && (
        <div className="animate-fade-in space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-hero text-ink">123 W 112th St</h2>
              <p className="mt-1 text-[13px] text-ink-muted">2 units · 3 tenants</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] text-ink-muted">Sep {dd}</span>
              <button onClick={() => sDD((d: number) => Math.min(d + 1, 30))} className="rounded-md border border-line px-2 py-1 text-[12px] text-ink-muted hover:bg-surface">+1 day</button>
              <button onClick={runRD} className="rounded-md bg-ink px-2.5 py-1 text-[12px] font-medium text-bg hover:opacity-90">Rent day</button>
              <button onClick={() => { sDD(9); sT(initT()); }} className="rounded-md p-1 text-ink-faint hover:bg-surface"><RotateCcw size={13} /></button>
            </div>
          </div>

          <div className="flex items-center justify-between border border-line bg-surface px-3.5 py-3 rounded-md">
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
              const allP = u.ts.every((id) => tenants[id].st === "paid");
              const anyL = u.ts.some((id) => tenants[id].st === "late");
              return (
                <section key={u.id}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-[13px] font-medium">Unit {u.id} <span className="font-normal text-ink-faint">${u.rent.toLocaleString()}/mo</span></h3>
                    <St s={allP ? "paid" : anyL ? "late" : "due"} />
                  </div>
                  <div className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                    {u.ts.map((tid) => {
                      const tn = tenants[tid];
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
                    {["Time", "Who", "Type", "Amt", "Status"].map((h) => <th key={h} className="px-3.5 py-2.5 font-medium">{h}</th>)}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {lTab === "guardian" && (
        <div className="animate-fade-in">
          <h2 className="text-hero">What could go wrong?</h2>
          <p className="mt-1 text-[13px] text-ink-muted">Five attacks. Each one blocked.</p>
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
  const vis = useSt(acts.length, 35);
  function topUp(id: string, a: number): TopUpResult {
    const cur = tenants[id as keyof typeof tenants];
    const room = Math.max(0, Math.round((cur.cap - cur.bal) * 100) / 100);
    if (!(a > 0)) {
      return { ok: false, error: "Enter an amount greater than $0 and try again.", room };
    }
    if (cur.bal + a > cur.cap + 0.001) {
      return {
        ok: false,
        error: `That would put your wallet over the $${f$(cur.cap)} cap (balance $${f$(cur.bal)}). You can add up to $${f$(room)}. Please retry with a smaller amount.`,
        room,
      };
    }
    const next = Math.round((cur.bal + a) * 100) / 100;
    sT((p) => ({ ...p, [id]: { ...p[id as keyof typeof p], bal: next } }));
    nf.push("Topped up +$" + f$(a), "ok");
    return { ok: true, bal: next, added: a };
  }

  const roles = [
    ...Object.values(tenants).map((tn) => ({ id: tn.id, name: tn.name, ini: tn.ini, sub: "Unit " + tn.unit, type: "tenant" as const })),
    { id: "landlord", name: "Arpey", ini: "AR", sub: "Landlord", type: "landlord" as const },
  ];
  const activeRole = roles.find((r) => r.id === role) || roles[0];
  const dot: Record<string, string> = { ok: "bg-ok", danger: "bg-danger", warn: "bg-warn", accent: "bg-accent" };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Toasts ts={nf.ts} />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
          <span className="text-[14px] font-medium tracking-tight">RentRelay</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => sDark(!dark)} className="rounded-md p-1.5 text-ink-muted hover:bg-line-soft" aria-label="Theme">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => sNfO(!nfO)} className="relative rounded-md p-1.5 text-ink-muted hover:bg-line-soft">
              <Bell size={16} />
              {nf.ur > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" />}
            </button>
            <button onClick={() => sPk(!pk)} className="ml-1 flex items-center gap-1.5 rounded-md border border-line bg-surface py-0.5 pl-0.5 pr-2 hover:bg-bg">
              <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-ink text-[10px] font-medium text-bg">{activeRole.ini}</span>
              <span className="text-[13px]">{activeRole.name.split(" ")[0]}</span>
              <ChevronDown size={12} className="text-ink-faint" />
            </button>
          </div>
        </div>
        {!isLandlord && (
          <div className="mx-auto flex max-w-2xl gap-4 px-4">
            {[{ id: "dash", l: "Home" }, { id: "group", l: `Unit ${t.unit}` }].map((tb) => (
              <button key={tb.id} onClick={() => { sTab(tb.id); window.scrollTo(0, 0); }} className={`-mb-px border-b pb-2.5 text-[13px] ${tab === tb.id ? "border-ink font-medium" : "border-transparent text-ink-faint hover:text-ink-muted"}`}>
                {tb.l}
              </button>
            ))}
          </div>
        )}
      </header>

      {pk && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => sPk(false)} />
          <div className="fixed right-4 top-14 z-[60] w-52 overflow-hidden rounded-md border border-line bg-surface p-1 shadow-panel animate-rise">
            <p className="px-2.5 py-1.5 text-[11px] text-ink-faint">Tenants</p>
            {roles.filter((r) => r.type === "tenant").map((r) => (
              <button key={r.id} onClick={() => { sRole(r.id); sPk(false); sTab("dash"); }} className={`flex w-full items-center gap-2 rounded-[5px] px-2.5 py-2 text-left text-[13px] ${role === r.id ? "bg-bg" : "hover:bg-bg"}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-[5px] text-[10px] font-medium ${role === r.id ? "bg-ink text-bg" : "bg-bg text-ink-muted"}`}>{r.ini}</span>
                <span className="flex-1">{r.name.split(" ")[0]}</span>
                <span className="text-[11px] text-ink-faint">{r.sub}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-line" />
            <button onClick={() => { sRole("landlord"); sPk(false); }} className={`flex w-full items-center gap-2 rounded-[5px] px-2.5 py-2 text-left text-[13px] ${role === "landlord" ? "bg-bg" : "hover:bg-bg"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-[5px] text-[10px] font-medium ${role === "landlord" ? "bg-ink text-bg" : "bg-bg text-ink-muted"}`}>AR</span>
              <span className="flex-1">Arpey</span>
              <span className="text-[11px] text-ink-faint">Landlord</span>
            </button>
          </div>
        </>
      )}

      {nfO && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => sNfO(false)} />
          <div className="fixed inset-x-4 top-14 z-[60] mx-auto max-w-sm overflow-hidden rounded-md border border-line bg-surface shadow-panel animate-rise">
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <span className="text-[13px] font-medium">Notifications</span>
              <button onClick={nf.mr} className="text-[12px] text-accent hover:underline">Mark read</button>
            </div>
            <div className="max-h-72 divide-y divide-line overflow-y-auto">
              {nf.h.map((n) => (
                <button key={n.id} onClick={() => { sNfSel(n); sNfO(false); }} className={`flex w-full gap-2.5 px-3.5 py-3 text-left hover:bg-bg ${n.r ? "" : "bg-accent-soft/40"}`}>
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot[n.c] || "bg-accent"}`} />
                  <span className="flex-1">
                    <span className={`block text-[13px] ${n.r ? "" : "font-medium"}`}>{n.m}</span>
                    <span className="text-[11px] text-ink-faint">{n.t}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {nfSel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/20 p-4" onClick={() => sNfSel(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm animate-rise rounded-lg border border-line bg-surface p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-faint">{nfSel.tag}</span>
              <button onClick={() => sNfSel(null)} className="text-ink-faint hover:text-ink"><X size={14} /></button>
            </div>
            <p className="mt-2 text-[15px] font-medium">{nfSel.m}</p>
            <p className="mt-0.5 text-[12px] text-ink-faint">{nfSel.t}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{nfSel.detail}</p>
          </div>
        </div>
      )}

      {isLandlord && <LandlordView tenants={tenants} sT={sT} nf={nf.push} dd={dd} sDD={sDD} />}

      {!isLandlord && tab === "dash" && (
        <main key={tid} className="mx-auto max-w-2xl animate-fade-in px-4 pb-24 pt-7">
          <p className="text-[12px] text-ink-faint">Unit {t.unit} · {t.sh * 100}% share</p>
          <h1 className="mt-1 text-display text-ink">Welcome, {t.name.split(" ")[0]}!</h1>
          {t.str > 0 && (
            <p className="mt-2 text-[13px] text-ink-muted"><span className="text-ink">{t.str} months</span> on time</p>
          )}

          <section className="mt-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-ink-muted">
                  {t.st === "paid" ? "September settled" : t.st === "late" ? `${t.dl} days overdue` : "Due Oct 1"}
                </p>
                <p className={`mt-1 text-display ${t.st === "paid" ? "text-ok" : t.st === "late" ? "text-warn" : "text-ink"}`}>
                  <AN value={tot} />
                </p>
              </div>
              <St s={t.st} />
            </div>
            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between"><dt className="text-ink-muted">Rent</dt><dd className="tabular-nums">${f$(t.rS)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">ConEd</dt><dd className="tabular-nums">${f$(t.ut)}</dd></div>
              {t.lf > 0 && <div className="flex justify-between text-warn"><dt>Late fee</dt><dd className="tabular-nums">${f$(t.lf)}</dd></div>}
            </dl>
            <p className="mt-3 text-[12px] text-ink-faint">Building ConEd $128 · split by Gemini</p>
          </section>

          <section className="mt-7 rounded-md border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] text-ink-faint">Wallet</p>
                <p className="mt-1 text-[22px] font-medium tracking-tight"><AN value={t.bal} /></p>
                <p className="mono mt-1.5">{t.wa}</p>
              </div>
              <div className="text-right">
                {short && <p className="mb-1.5 text-[12px] text-danger">Short ${f$(tot - t.bal)}</p>}
                <button onClick={() => sTU(true)} className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90">Top up</button>
              </div>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-sm bg-bg">
              <div className={`h-full rounded-sm transition-all duration-500 ${short ? "bg-danger" : "bg-ok"}`} style={{ width: `${Math.min((t.bal / tot) * 100, 100)}%` }} />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-[13px] font-medium">Rules</h2>
            <dl className="mt-3 space-y-0 text-[13px]">
              {[["Cap", "$" + t.cap.toLocaleString()], ["Autopay", t.ap ? "On" : "Off"], ["Keys", "2 of 3"], ["Landlord", LA]].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b border-line-soft py-2.5 last:border-0">
                  <dt className="text-ink-muted">{l}</dt>
                  <dd className={`${l === "Autopay" && t.ap ? "text-ok" : l === "Landlord" ? "mono" : ""}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-7">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-medium">Protected</h2>
              <span className="text-[12px] text-ink-faint">1 blocked</span>
            </div>
            <p className="mt-1 text-[13px] text-ink-muted">Scam payment refused · Sep 3</p>
          </section>

          <section className="mt-8">
            <h2 className="mb-1 text-[13px] font-medium">Activity</h2>
            <div>
              {acts.map((a, i) => {
                const show = vis.includes(i);
                const c = a.tp === "ok" ? "bg-ok" : a.tp === "block" ? "bg-danger" : a.tp === "warn" || a.tp === "alert" ? "bg-warn" : "bg-ink-faint";
                return (
                  <div key={a.id} className={`flex gap-2.5 border-b border-line-soft py-3 transition-opacity duration-200 last:border-0 ${show ? "opacity-100" : "opacity-0"}`}>
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${c}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px]">{a.m}</p>
                      <div className="mt-0.5 flex gap-2 text-[11px] text-ink-faint">
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
        <button onClick={() => sC1(true)} className="fixed bottom-5 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-md bg-ink text-bg shadow-panel hover:opacity-90" aria-label="Chat">
          <MessageCircle size={18} />
        </button>
      )}

      {!isLandlord && <Chat1 tid={tid} tn={t} open={c1} close={() => sC1(false)} onTopUp={(a) => topUp(tid, a)} />}
      {!isLandlord && <TopUp tn={t} open={tu} close={() => sTU(false)} go={(a) => topUp(tid, a)} />}
    </div>
  );
}
