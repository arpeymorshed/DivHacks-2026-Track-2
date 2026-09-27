"use client";
import AarteeLogo from "./AarteeLogo";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown, CheckCircle2, RotateCcw, Send, RefreshCw, Bell, X, MessageCircle,
  Moon, Sun, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { api, errorText, shortAddr, usd } from "@/app/lib/api";
import { useDemoState } from "@/app/lib/useDemoState";
import type { ActivityEntry, TenantState } from "@/types/rent";

// The group chat below is a scripted story (there's no group-chat backend); everything else on this page is live.
const LA = "rLD4K9g…VxZS"; // the real landlord address, shown in the scripted story
const CHAT_SUGGESTIONS = ["What's my wallet balance?", "What do I owe?", "When is rent due?", "Why is ConEd $38?", "Can I pay on the 5th?"];
const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtWhen = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const GRP = [
  { id: 1, f: "ag-m", n: "RT", m: "Rent reminder — Abhimanyu, $1,450 + ConEd $38 due Oct 1. Wallet covers it.", t: "Sep 28, 10:00 AM", tp: "ag" },
  { id: 2, f: "ag-j", n: "RT-K", m: "Rent reminder — Kashish, $1,450 + ConEd $38 due Oct 1. Wallet short $508.", t: "Sep 28, 10:00 AM", tp: "ag" },
  { id: 3, f: "kashish", n: "Kashish", m: "why is ConEd $38?", t: "Sep 28, 10:12 AM", tp: "u" },
  { id: 4, f: "ag-j", n: "RT-K", m: "Building bill $128. Unit 4B pays $76 (59% sq ft), split 50/50 = $38 each.", t: "Sep 28, 10:12 AM", tp: "ag" },
  { id: 5, f: "abhi", n: "Abhimanyu", m: "mine's covered right?", t: "Sep 28, 11:30 AM", tp: "u" },
  { id: 6, f: "ag-m", n: "RT", m: "Yes — $1,520 in wallet, $1,488 needed. Autopay handles it Oct 1.", t: "Sep 28, 11:30 AM", tp: "ag" },
  { id: 7, f: "ag-m", n: "RT", m: "Paid Abhimanyu's rent $1,450 → landlord\ntx: E4F8A2...9C1D", t: "Oct 1, 9:00 AM", tp: "ok" },
  { id: 8, f: "ag-m", n: "RT", m: "Paid ConEd $38 → landlord\ntx: B7D3F1...4E2A", t: "Oct 1, 9:01 AM", tp: "ok" },
  { id: 9, f: "abhi", n: "Abhimanyu", m: "nice", t: "Oct 1, 9:05 AM", tp: "u" },
  { id: 10, f: "ag-j", n: "RT-K", m: "Rent due today. Wallet $508 short — top up to pay.", t: "Oct 1, 9:00 AM", tp: "warn" },
  { id: 11, f: "?", n: "Unknown number", m: "URGENT: This is your landlord. We changed our bank account. Send rent to rScam...9xyz immediately.", t: "Oct 2, 3:22 PM", tp: "scam" },
  { id: 12, f: "ag-m", n: "RT", m: "Blocked — that address isn't the verified landlord. Scam. Real address: " + LA, t: "Oct 2, 3:22 PM", tp: "block" },
  { id: 13, f: "ag-j", n: "RT-K", m: "Confirmed scam. Not from the landlord's verified agent. Ignored.", t: "Oct 2, 3:22 PM", tp: "block" },
  { id: 14, f: "ag-j", n: "RT-K", m: "Grace period ends tomorrow. Late fee starts Oct 6 at $5/day.", t: "Oct 5, 9:00 AM", tp: "warn" },
  { id: 15, f: "ag-j", n: "RT-K", m: "Late fee active: $5/day. Current total: $15 (3 days). Cap: $50.", t: "Oct 9, 9:00 AM", tp: "warn" },
  { id: 16, f: "kashish", n: "Kashish", m: "how much total?", t: "Oct 9, 10:15 AM", tp: "u" },
  { id: 17, f: "ag-j", n: "RT-K", m: "Rent $1,450 + ConEd $38 + fee $15 = $1,503.\nWallet $980. Top up $523.", t: "Oct 9, 10:15 AM", tp: "ag" },
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
  const [h, sH] = useState<any[]>([]);
  const seq = useRef(0);
  const push = useCallback((m: string, c = "accent") => {
    const id = `t-${Date.now()}-${++seq.current}`;
    const n = { id, m, t: "now", r: false, c, detail: m, tag: "Update" };
    sTs((t) => [...t, n]);
    sH((x) => [n, ...x]);
    setTimeout(() => sTs((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  const mr = useCallback(() => sH((x) => x.map((n) => ({ ...n, r: true }))), []);
  return { ts, h, push, ur: h.filter((n) => !n.r).length, mr };
}

const tone: Record<string, string> = {
  paid: "text-ok", due: "text-info", grace: "text-info", upcoming: "text-ink-faint", late: "text-warn", blocked: "text-danger", failed: "text-danger",
  ok: "text-ok", block: "text-danger", fail: "text-danger", processing: "text-accent", note: "text-ink-faint",
  warn: "text-warn", alert: "text-warn",
};
const label: Record<string, string> = {
  paid: "Paid", due: "Due", grace: "Grace period", upcoming: "Upcoming", late: "Late", blocked: "Blocked", failed: "Failed",
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
  const prev = useRef(value);
  useEffect(() => {
    const fr = d;
    const dropping = value < prev.current;
    prev.current = value;
    const dur = dropping ? 780 : 420;
    const t0 = performance.now();
    function tick(n: number) {
      const pr = Math.min((n - t0) / dur, 1);
      const eased = dropping ? 1 - Math.pow(1 - pr, 2.4) : 1 - Math.pow(1 - pr, 3);
      sd(fr + (value - fr) * eased);
      if (pr < 1) r.current = requestAnimationFrame(tick);
    }
    r.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r.current);
  }, [value]);
  return <span className="tabular-nums">{p}{f$(d)}</span>;
}

function BalDelta({ amount }: { amount: number | null }) {
  if (amount == null || amount === 0) return null;
  const up = amount > 0;
  return (
    <span className={`inline-flex animate-delta-pop items-center rounded-md px-1.5 py-0.5 text-[12px] font-medium tabular-nums ${
      up ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
    }`}>
      {up ? "+" : "−"}${f$(Math.abs(amount))}
    </span>
  );
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

function Chat1({ tid, unit, hi, open, close, cap }: { tid: string; unit: string; hi: string; open: boolean; close: () => void; cap?: number }) {
  const [ms, sM] = useState<{ id: string; r: "u" | "a" | "err"; t: string }[]>([]);
  const [inp, sI] = useState("");
  const [typ, sT] = useState(false);
  const [sg, sS] = useState<string[]>([]);
  const br = useRef<HTMLDivElement>(null);
  const ir = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    busy.current = false;
    sM([]); sS([]); sI(""); sT(false);
    if (!open) return;
    let t2 = 0;
    const t1 = window.setTimeout(() => {
      sM([{ id: "g", r: "a", t: hi }]);
      t2 = window.setTimeout(() => sS(CHAT_SUGGESTIONS), 220);
    }, 80);
    return () => {
      window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
    };
  }, [open, tid, hi]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!typ && ms.length === 0) return;
    br.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ms.length, typ]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => ir.current?.focus(), 180);
    return () => window.clearTimeout(t);
  }, [open, tid]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy.current || typ) return;
    busy.current = true;
    const uid = `u-${++seq.current}`;
    const aid = `a-${seq.current}`;
    sM((m) => [...m, { id: uid, r: "u", t: text }]);
    sS([]); sI(""); sT(true);
    let a: string;
    let kind: "a" | "err" = "a";
    try {
      a = (await api.chat(tid, text)).reply;
    } catch (e) {
      a = `I couldn't reach the server: ${errorText(e)}`;
      kind = "err";
    }
    sT(false);
    sM((m) => [...m, { id: aid, r: kind, t: a }]);
    busy.current = false;
    window.setTimeout(() => sS(CHAT_SUGGESTIONS.filter((x) => x !== text)), 200);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-bg" role="dialog" aria-label="RT chat">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-[15px] font-medium">RT</p>
          <p className="text-xs text-ink-faint">Agent · Unit {unit}{cap ? ` · Cap $${f$(cap)}` : ""}</p>
        </div>
        <button type="button" onClick={close} className="rounded-md p-1.5 text-ink-muted hover:bg-line-soft" aria-label="Close chat"><X size={16} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-end gap-2.5">
          {ms.map((m) => (
            <div key={m.id} className={`flex ${m.r === "u" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] whitespace-pre-wrap rounded-md px-3 py-2 text-[14px] leading-relaxed ${
                m.r === "u" ? "bg-ink text-bg"
                  : m.r === "err" ? "border border-danger/30 bg-danger-soft text-danger"
                  : "border border-line bg-surface text-ink"
              }`}>{m.t}</div>
            </div>
          ))}
          {typ && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-md border border-line bg-surface px-3 py-2.5">
                {[0, 1, 2].map((i) => <div key={i} className="h-1 w-1 animate-pulse-dot rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={br} className="h-px w-full shrink-0" />
        </div>
      </div>
      {sg.length > 0 && (
        <div className="shrink-0 border-t border-line bg-bg px-4 py-2.5">
          <p className="mb-1.5 text-[11px] font-medium text-ink-faint">Suggestions</p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sg.map((s) => (
              <button key={s} type="button" disabled={typ} onClick={() => send(s)} className="shrink-0 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink-muted hover:border-ink/20 hover:text-ink disabled:opacity-50">{s}</button>
            ))}
          </div>
        </div>
      )}
      <div className="flex shrink-0 gap-2 border-t border-line px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <input
          ref={ir}
          value={inp}
          disabled={typ}
          onChange={(e) => sI(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && inp.trim()) { e.preventDefault(); void send(inp); } }}
          placeholder="Ask about balance, dues, or top up"
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-[16px] sm:text-[14px] focus:border-ink/30 disabled:opacity-60"
        />
        <button type="button" disabled={typ || !inp.trim()} onClick={() => void send(inp)} className="rounded-md bg-ink px-3 text-bg hover:opacity-90 disabled:opacity-40"><Send size={16} /></button>
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
    setTimeout(() => { sTyp(false); sMsgs((m) => [...m, { id: Date.now() + 1, f: "ag-m", n: "RT", m: reply, t: "now", tp: "ag" }]); }, 650 + Math.random() * 350);
  }
  return (
    <div>
      <p className="border-b border-line px-4 py-2 text-center text-xs text-ink-faint">Unit 4B</p>
      <div className="space-y-0.5 px-4 pb-32 pt-3">
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
      <div className="fixed bottom-0 left-0 right-0 border-t border-line bg-bg">
        <div className="flex gap-1.5 overflow-x-auto border-b border-line px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["What's my wallet balance?", "What do I owe?", "Is everyone paid?", "When is rent due?"].map((s) => (
            <button key={s} type="button" disabled={typ} onClick={() => send(s)} className="shrink-0 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12.5px] font-medium text-ink hover:border-ink/25 disabled:opacity-50">{s}</button>
          ))}
        </div>
        <div className="flex gap-2 px-3 py-3 pb-7">
          <input value={inp} onChange={(e) => sInp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && inp.trim()) send(inp.trim()); }} placeholder="Message unit chat" className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-[16px] sm:text-[14px] focus:border-ink/30" />
          <button type="button" onClick={() => { if (inp.trim()) send(inp.trim()); }} className="rounded-md bg-ink px-3 text-bg hover:opacity-90"><Send size={16} /></button>
        </div>
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
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/20 p-4 sm:items-center" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm animate-rise rounded-lg border border-line bg-surface p-5 shadow-panel">
        <p className="text-[15px] font-medium">Top up</p>
        <p className="mt-0.5 text-[13px] text-ink-muted">Simulated RLUSD transfer</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ps.map((v) => (
            <button key={v} onClick={() => sA("" + v)} className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${a === "" + v ? "bg-ink text-bg" : "border border-line text-ink hover:bg-bg"}`}>${v}</button>
          ))}
        </div>
        <input value={a} onChange={(e) => sA(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Custom amount" className="mt-3 w-full rounded-md border border-line bg-bg px-3 py-2 text-center text-[16px] sm:text-[14px] focus:border-ink/30" />
        <div className="mt-4 flex gap-2">
          <button onClick={close} className="flex-1 rounded-md px-3 py-2 text-[13px] text-ink-muted hover:bg-bg">Cancel</button>
          <button onClick={() => { if (parseFloat(a) > 0) { go(parseFloat(a)); close(); sA(""); } }} className="flex-1 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white hover:opacity-90">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { state, error, refresh } = useDemoState();
  const [role, sRole] = useState("abhimanyu");
  const [pk, sPk] = useState(false);
  const [nfO, sNfO] = useState(false);
  const [tab, sTab] = useState("dash");
  const [tu, sTU] = useState(false);
  const [c1, sC1] = useState(false);
  const [nfSel, sNfSel] = useState<any>(null);
  const [dark, sDark] = useState(false);
  const [topping, sTopping] = useState(false);
  const nf = useNf();

  useEffect(() => { document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => {
    if (!state?.tenants?.length) return;
    if (role !== "landlord" && !state.tenants.some((x) => x.id === role)) {
      sRole(state.tenants[0].id);
    }
  }, [state, role]);
  const isLandlord = role === "landlord";
  const tenantsS: TenantState[] = state?.tenants ?? [];
  const unitName = (unitId: string) => state?.building.units.find((u) => u.id === unitId)?.name ?? "";
  const cur = tenantsS.find((x) => x.id === role) ?? tenantsS[0];
  const tid = cur?.id ?? "abhimanyu";
  // View model for the (unchanged) layout, built from GET /api/state.
  const t = {
    id: tid, name: cur?.name ?? "", ini: (cur?.name ?? "?")[0], unit: cur ? unitName(cur.unitId) : "",
    sh: cur?.share ?? 0, rS: cur?.due?.rentUsd ?? 0, ut: cur?.due?.utilitiesUsd ?? 0, lf: cur?.due?.lateFeeUsd ?? 0,
    cap: cur?.capUsd ?? 0, wa: cur?.walletAddress ?? "", walletUrl: cur?.walletExplorerUrl ?? "", bal: cur?.balanceUsd ?? 0,
    st: cur?.due?.stage ?? "due", dl: cur?.due?.daysLate ?? 0, payment: cur?.due?.payment ?? null,
  };
  const mine: ActivityEntry[] = (state?.activity ?? []).filter((e) => e.tenantId === tid);
  const acts = mine.map((e) => ({
    id: e.id,
    tp: e.status === "paid" || e.status === "done" ? "ok" : e.status === "blocked" ? "block" : "warn",
    m: e.status === "blocked" ? `${e.title}: blocked` : e.status === "refused" && e.rule === "once-per-month" ? `${e.title}: already paid` : e.status === "refused" ? `${e.title}: ${e.reason ?? "not paid"}` : e.title,
    t: fmtWhen(e.time), tx: e.explorerUrl,
  }));
  const blocked = mine.filter((e) => e.kind === "attack" && e.status === "blocked");
  const tot = t.payment ? t.payment.amountUsd : t.rS + t.ut + t.lf;
  const short = cur?.balanceUsd !== null && t.st !== "paid" && t.bal < tot;
  const vis = useSt(acts.length, 35);
  const month = state ? new Date(`${state.clock.month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" }) : "";
  const hi = !state ? "" : t.payment ? `${month} is paid: ${usd(t.payment.amountUsd)} on the ledger. Nothing due.`
    : t.st === "late" ? `${month} rent is ${t.dl} days late. Total ${usd(tot)} including a ${usd(t.lf)} late fee.`
    : `${month} rent: ${usd(tot)} (${usd(t.rS)} rent + ${usd(t.ut)} ConEd). ${short ? `Your wallet is short ${usd(tot - t.bal)}.` : "Your wallet covers it."}`;

  async function topUp(id: string, a: number) {
    if (topping) return;
    sTopping(true);
    try {
      const r = await api.topUp(id, a);
      nf.push(`Topped up ${usd(r.usd)} · wallet now ${usd(r.walletBalanceUsd)}`, "ok");
    } catch (e) {
      nf.push(errorText(e), "danger");
    } finally {
      sTopping(false);
      void refresh();
    }
  }

  const roles = [
    ...tenantsS.map((tn) => ({ id: tn.id, name: tn.name, ini: tn.name[0], sub: "Unit " + unitName(tn.unitId), type: "tenant" as const })),
    { id: "landlord", name: state?.building.landlordName ?? "Arpey", ini: "AR", sub: "Landlord", type: "landlord" as const },
  ];
  const activeRole = roles.find((r) => r.id === role) || roles[0] || { id: "loading", name: "Loading", ini: "·", sub: "", type: "tenant" as const };
  const dot: Record<string, string> = { ok: "bg-ok", danger: "bg-danger", warn: "bg-warn", accent: "bg-accent" };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Toasts ts={nf.ts} />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
          <span className="text-[14px] font-medium tracking-tight"><AarteeLogo size={20} /></span>
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
        {state && !isLandlord && (
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

      {!state && (
        <main className="mx-auto max-w-2xl px-4 pt-10 text-[13px] text-ink-muted">
          {error ? (
            <p className="text-danger">Can&apos;t reach the app: {error}. Seed Mongo / set env, or open <Link className="underline" href="/demo">/demo</Link>.</p>
          ) : (
            <p>Loading your rent wallet from the ledger…</p>
          )}
        </main>
      )}

      {state && isLandlord && (
        <main className="mx-auto max-w-2xl animate-fade-in px-4 pb-24 pt-7">
          <p className="text-[12px] text-ink-faint">Landlord</p>
          <h1 className="mt-1 text-display text-ink">{state.building.landlordName}</h1>
          <p className="mt-3 text-[13px] text-ink-muted">Run rent day, spawn tenant agents and try the attacks in the landlord console.</p>
          <Link href="/demo" className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-2 text-[13px] font-medium text-bg hover:opacity-90">
            Open the landlord console <ExternalLink size={13} />
          </Link>
        </main>
      )}

      {state && !isLandlord && tab === "dash" && (
        <main key={tid} className="mx-auto max-w-2xl animate-fade-in px-4 pb-32 pt-7">
          {state.warnings?.length > 0 && (
            <p className="mb-4 rounded-md border border-line bg-surface px-3.5 py-2.5 text-[12px] text-warn">{state.warnings[0]}</p>
          )}
          <p className="text-[12px] text-ink-faint">Unit {t.unit} · {t.sh * 100}% share</p>
          <h1 className="mt-1 text-display text-ink">Welcome, {t.name.split(" ")[0]}!</h1>

          <section className="mt-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-ink-muted">
                  {t.st === "paid" ? `${month} paid` : t.st === "late" ? `${t.dl} days overdue` : `Due ${fmtDay(state.clock.month + "-01")}`}
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
            {t.payment?.explorerUrl ? (
              <a href={t.payment.explorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12px] text-accent hover:underline">Paid on the XRP Ledger <ExternalLink size={11} /></a>
            ) : (
              <p className="mt-3 text-[12px] text-ink-faint">ConEd is your share of the building bill</p>
            )}
          </section>

          <section className="mt-7 rounded-md border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] text-ink-faint">Wallet</p>
                <p className="mt-1 text-[22px] font-medium tracking-tight"><AN value={t.bal} /></p>
                <a href={t.walletUrl} target="_blank" rel="noreferrer" className="mono mt-1.5 inline-flex items-center gap-1 text-accent hover:underline">{shortAddr(t.wa)} <ExternalLink size={10} /></a>
              </div>
              <button type="button" onClick={() => sTU(true)} disabled={topping} className="rounded-md bg-accent disabled:opacity-60 px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90">Top up</button>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-sm bg-bg">
              <div className={`h-full rounded-sm transition-all duration-700 ${short ? "bg-danger" : "bg-ok"}`} style={{ width: `${Math.min((tot > 0 ? t.bal / tot : 1) * 100, 100)}%` }} />
            </div>
            {short ? (
              <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                <div>
                  <p className="text-[12px] text-ink-faint">Shortfall</p>
                  <p className="mt-0.5 text-[18px] font-medium tabular-nums text-danger">−${f$(tot - t.bal)}</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">Need ${f$(tot - t.bal)} more to cover this month.</p>
                </div>
                <button type="button" onClick={() => sTU(true)} className="shrink-0 rounded-md border border-danger/30 bg-danger-soft px-2.5 py-1.5 text-[12px] font-medium text-danger hover:opacity-90">
                  Cover −${f$(tot - t.bal)}
                </button>
              </div>
            ) : tot > 0 ? (
              <p className="mt-3 text-[12px] text-ok">Covered — wallet can pay ${f$(tot)} due.</p>
            ) : null}
          </section>

          <section className="mt-8">
            <h2 className="text-[13px] font-medium">Rules</h2>
            <dl className="mt-3 space-y-0 pr-12 text-[13px] sm:pr-0">
              {[["Cap", "$" + t.cap.toLocaleString()], ["Autopay", "On"], ["Keys", "2 of 3"], ["Landlord", shortAddr(state.building.landlordWallet)]].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b border-line-soft py-2.5 last:border-0">
                  <dt className="text-ink-muted">{l}</dt>
                  <dd className={`${l === "Autopay" ? "text-ok" : l === "Landlord" ? "mono" : ""}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-7">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-medium">Protected</h2>
              <span className="text-[12px] text-ink-faint">{blocked.length} blocked</span>
            </div>
            <p className="mt-1 text-[13px] text-ink-muted">{blocked[0] ? `${blocked[0].title} · refused ${fmtWhen(blocked[0].time)}` : "No attacks on your wallet yet. The Guardian and the ledger are watching."}</p>
          </section>

          <section className="mt-8">
            <h2 className="mb-1 text-[13px] font-medium">Activity</h2>
            <div>
              {acts.length === 0 && <p className="py-3 text-[13px] text-ink-faint">No activity yet this run.</p>}
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
                        {a.tx && <a href={a.tx} target="_blank" rel="noreferrer" className="mono inline-flex items-center gap-0.5 text-accent hover:underline">ledger<ExternalLink size={9} /></a>}
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

      {state && !isLandlord && tab === "group" && <GroupChat />}

      {state && !isLandlord && tab === "dash" && !c1 && (
        <button type="button" onClick={() => sC1(true)} className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-md bg-ink px-3.5 py-2.5 text-bg shadow-panel hover:opacity-90" aria-label="Ask RT">
          <MessageCircle size={18} />
          <span className="text-[13px] font-medium">Ask RT</span>
        </button>
      )}

      {state && !isLandlord && <Chat1 tid={tid} unit={t.unit} hi={hi} open={c1} close={() => sC1(false)} cap={t.cap} />}
      {state && !isLandlord && <TopUp tn={t} open={tu} close={() => sTU(false)} go={(a) => topUp(tid, a)} />}
    </div>
  );
}
