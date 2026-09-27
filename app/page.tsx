"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Shield, ShieldX, ChevronDown, CheckCircle2, XCircle, RotateCcw, ExternalLink, Plus, AlertTriangle, Clock, Send, Zap, RefreshCw, Bell, X, Users, Home, MessageCircle, ChevronRight, Lock, ArrowUpRight, UserPlus, Receipt } from "lucide-react";

const LA = "rLndQ7v...4kDf";
const initT = () => ({
  abhi:   { id:"abhi",name:"Abhimanyu Dudeja",ini:"A",unit:"4B",sh:0.5,rT:2900,rS:1450,ut:38,cap:1600,wa:"rAbhi8x...KqvP",bal:1520,ap:true,st:"paid",dl:0,lf:0,ag:"agent-abhi-4b",str:11 },
  kashish: { id:"kashish",name:"Kashish",ini:"K",unit:"4B",sh:0.5,rT:2900,rS:1450,ut:38,cap:1600,wa:"rKash3m...NpxR",bal:980,ap:true,st:"late",dl:8,lf:15,ag:"agent-kashish-4b",str:0 },
  musammat:  { id:"musammat",name:"Musammat",ini:"M",unit:"2A",sh:1.0,rT:1450,rS:1450,ut:52,cap:1600,wa:"rMusa7v...WxsT",bal:1550,ap:true,st:"due",dl:0,lf:0,ag:"agent-musammat-2a",str:7 },
});
const UNITS=[{id:"4B",rent:2900,ts:["abhi","kashish"]},{id:"2A",rent:1450,ts:["musammat"]}];
const AUD=[
  {id:"a1",t:"Sep 1",w:"Abhimanyu",wh:"Rent",a:1450,s:"ok",r:"Passed",tx:"E4F8A2...9C1D"},
  {id:"a2",t:"Sep 1",w:"Abhimanyu",wh:"ConEd",a:38,s:"ok",r:"Passed",tx:"B7D3F1...4E2A"},
  {id:"a3",t:"Sep 1",w:"Musammat",wh:"Rent",a:1450,s:"ok",r:"Passed",tx:"C2A9E5...7F3B"},
  {id:"a4",t:"Sep 1",w:"Kashish",wh:"Rent",a:1450,s:"fail",r:"Insufficient balance",tx:null},
  {id:"a5",t:"Sep 3",w:"Abhimanyu",wh:"Scam",a:1450,s:"block",r:"Unrecognized address",tx:null},
];
const ATK=[
  {id:"scam",t:"Scam bank-account change",d:"Message reroutes rent to a new address.",bk:"Guardian",ly:"g",v:`Destination rScam...9xyz doesn't match verified address (${LA}).`,x:"Guardian pins the landlord's on-chain credential."},
  {id:"inflate",t:"Inflated utility bill",d:"ConEd share misread as $380 instead of $38.",bk:"Guardian",ly:"g",v:"Monthly total $1,830 exceeds tenant cap of $1,600.",x:"Guardian tallies all charges before co-signing."},
  {id:"double",t:"Double rent charge",d:"Landlord agent requests September rent again.",bk:"Guardian",ly:"g",v:"September 2026 already paid. Duplicate refused.",x:"Guardian tracks paid periods."},
  {id:"fee",t:"Illegal $200 late fee",d:"Fee exceeds NY cap, or charged in grace period.",bk:"Guardian",ly:"g",v:"$200 exceeds min($50, 5% x $1,450). Grace violated.",x:"NY RPL 238-a. Guardian enforces both."},
  {id:"key",t:"Stolen agent key",d:"Attacker signs with only the agent's key.",bk:"XRPL ledger",ly:"l",v:"1 signature, quorum requires 2. Rejected on-chain.",x:"Master key disabled. 2 of 3 needed. Ledger enforces."},
];

const ACT={
  abhi:[{id:1,tp:"ok",m:"Rent $1,450.00 paid",t:"Sep 1",tx:"E4F8A2...9C1D"},{id:2,tp:"ok",m:"ConEd $38.00 paid",t:"Sep 1",tx:"B7D3F1...4E2A"},{id:3,tp:"note",m:"September settled",t:"Sep 1"},{id:4,tp:"block",m:"Scam blocked — unrecognized payee address",t:"Sep 3"}],
  kashish:[{id:1,tp:"warn",m:"Wallet short $508 for Sep 1 rent",t:"Aug 29"},{id:2,tp:"warn",m:"Rent day — still short",t:"Sep 1"},{id:3,tp:"warn",m:"Grace period: 4 days left",t:"Sep 3"},{id:4,tp:"alert",m:"Late fee: $5/day, now $15",t:"Sep 9"}],
  musammat:[{id:1,tp:"note",m:"Oct 1 dues covered by wallet",t:"Sep 28"},{id:2,tp:"note",m:"Autopay scheduled",t:"Sep 30"}],
};

const CHAT1={
  abhi:{hi:"September's settled — rent and ConEd paid. Nothing due.",sg:["What did I pay?","Why is ConEd $38?","Is Kashish's rent paid?"],an:{"What did I pay?":"Rent $1,450 (50% of 4B) plus ConEd $38. Total $1,488, both on Sep 1, verified on-chain.","Why is ConEd $38?":"Building bill was $128. 4B pays $76 by square footage, split 50/50 with Kashish. Your share: $38.","Is Kashish's rent paid?":"Not yet. He's 8 days late with a $15 fee accruing. His agent is on it. Doesn't affect you."}},
  kashish:{hi:"September rent is 8 days overdue. Late fee: $15. What do you need?",sg:["Why the late fee?","Can I pay on the 5th?","Total owed?"],an:{"Why the late fee?":"Due Sep 1, grace ended Sep 5. Fee is $5/day after that, capped at $50. You're 3 days past grace = $15.","Can I pay on the 5th?":"I can request an extension. If approved, the fee pauses until Oct 5. Want me to send it?","Total owed?":"Rent $1,450 + ConEd $38 + fee $15 = $1,503. Wallet has $980. Top up $523 and I'll pay immediately."}},
  musammat:{hi:"October rent covered. Autopay on. Nothing to do.",sg:["ConEd share?","Payment streak?","When is rent day?"],an:{"ConEd share?":"Building bill $128. Unit 2A = 41% = $52. You're the sole tenant.","Payment streak?":"7 months on time. Visible to your landlord as a reference.","When is rent day?":"Oct 1. Autopay is on, wallet covers it. I'll handle it."}},
};

const GRP=[
  {id:1,f:"ag-m",n:"Polo",m:"Rent reminder — Abhimanyu, $1,450 + ConEd $38 due Oct 1. Wallet covers it.",t:"Sep 28, 10:00 AM",tp:"ag"},
  {id:2,f:"ag-j",n:"Polo-K",m:"Rent reminder — Kashish, $1,450 + ConEd $38 due Oct 1. Wallet short $508.",t:"Sep 28, 10:00 AM",tp:"ag"},
  {id:3,f:"kashish",n:"Kashish",m:"why is ConEd $38?",t:"Sep 28, 10:12 AM",tp:"u"},
  {id:4,f:"ag-j",n:"Polo-K",m:"Building bill $128. Unit 4B pays $76 (59% sq ft), split 50/50 = $38 each.",t:"Sep 28, 10:12 AM",tp:"ag"},
  {id:5,f:"abhi",n:"Abhimanyu",m:"mine's covered right?",t:"Sep 28, 11:30 AM",tp:"u"},
  {id:6,f:"ag-m",n:"Polo",m:"Yes — $1,520 in wallet, $1,488 needed. Autopay handles it Oct 1.",t:"Sep 28, 11:30 AM",tp:"ag"},
  {id:7,f:"ag-m",n:"Polo",m:"Paid Abhimanyu's rent $1,450 → landlord\ntx: E4F8A2...9C1D",t:"Oct 1, 9:00 AM",tp:"ok"},
  {id:8,f:"ag-m",n:"Polo",m:"Paid ConEd $38 → landlord\ntx: B7D3F1...4E2A",t:"Oct 1, 9:01 AM",tp:"ok"},
  {id:9,f:"abhi",n:"Abhimanyu",m:"nice",t:"Oct 1, 9:05 AM",tp:"u"},
  {id:10,f:"ag-j",n:"Polo-K",m:"Rent due today. Wallet $508 short — top up to pay.",t:"Oct 1, 9:00 AM",tp:"warn"},
  {id:11,f:"?",n:"Unknown number",m:"URGENT: This is your landlord. We changed our bank account. Send rent to rScam...9xyz immediately.",t:"Oct 2, 3:22 PM",tp:"scam"},
  {id:12,f:"ag-m",n:"Polo",m:"Blocked — that address isn't the verified landlord. Scam. Real address: "+LA,t:"Oct 2, 3:22 PM",tp:"block"},
  {id:13,f:"ag-j",n:"Polo-K",m:"Confirmed scam. Not from the landlord's verified agent. Ignored.",t:"Oct 2, 3:22 PM",tp:"block"},
  {id:14,f:"ag-j",n:"Polo-K",m:"Grace period ends tomorrow. Late fee starts Oct 6 at $5/day.",t:"Oct 5, 9:00 AM",tp:"warn"},
  {id:15,f:"ag-j",n:"Polo-K",m:"Late fee active: $5/day. Current total: $15 (3 days). Cap: $50.",t:"Oct 9, 9:00 AM",tp:"warn"},
  {id:16,f:"kashish",n:"Kashish",m:"how much total?",t:"Oct 9, 10:15 AM",tp:"u"},
  {id:17,f:"ag-j",n:"Polo-K",m:"Rent $1,450 + ConEd $38 + fee $15 = $1,503.\nWallet $980. Top up $523.",t:"Oct 9, 10:15 AM",tp:"ag"},
];

/* ═══ HELPERS ═══ */
const f$=n=>n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
function useSt(c,ms=70){const[v,s]=useState([]);useEffect(()=>{s([]);for(let i=0;i<c;i++)setTimeout(()=>s(p=>[...p,i]),(i+1)*ms)},[c]);return v}
function useNf(){
  const[ts,sTs]=useState([]);
  const[h,sH]=useState([
    {id:"n0",m:"Abhimanyu's rent paid",t:"Sep 1",r:true,c:"var(--ok)",detail:"Rent $1,450 and ConEd $38 paid. Verified on-chain.",tag:"Payment"},
    {id:"n1",m:"Scam payment blocked",t:"Sep 3",r:false,c:"var(--no)",detail:"Unknown address rScam...9xyz rejected by Guardian.",tag:"Blocked"},
    {id:"n2",m:"Kashish overdue — day 8",t:"Sep 9",r:false,c:"var(--am)",detail:"Wallet short. Late fee $15 accruing. Cap: $50.",tag:"Overdue"},
  ]);
  const push=useCallback((m,c="var(--ac)")=>{const id=""+Date.now();const n={id,m,t:"now",r:false,c,detail:m,tag:"Update"};sTs(t=>[...t,n]);sH(x=>[n,...x]);setTimeout(()=>sTs(t=>t.filter(x=>x.id!==id)),3200)},[]);
  const mr=useCallback(()=>sH(x=>x.map(n=>({...n,r:true}))),[]);
  return{ts,h,push,ur:h.filter(n=>!n.r).length,mr}
}

function St({s}){const m={paid:{c:"var(--ok)",l:"Paid"},due:{c:"var(--bl)",l:"Due"},late:{c:"var(--am)",l:"Late"},blocked:{c:"var(--no)",l:"Blocked"},failed:{c:"var(--no)",l:"Failed"},ok:{c:"var(--ok)",l:"Paid"},block:{c:"var(--no)",l:"Blocked"},fail:{c:"var(--no)",l:"Failed"}};const v=m[s]||m.due;return <span style={{fontSize:12,fontWeight:600,color:v.c}}>{v.l}</span>}
function AN({value,p="$"}){const[d,sd]=useState(value);const r=useRef<number>(0);useEffect(()=>{const fr=d,dur=600,t0=performance.now();function tick(n){const pr=Math.min((n-t0)/dur,1);sd(fr+(value-fr)*(1-Math.pow(1-pr,3)));if(pr<1)r.current=requestAnimationFrame(tick)}r.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(r.current)},[value]);return <span>{p}{f$(d)}</span>}

/* ═══ TOASTS ═══ */
function Toasts({ts}){return <div style={{position:"fixed",top:50,left:16,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:6}}>{ts.map(t=><div key={t.id} style={{background:"var(--sf)",borderRadius:12,padding:"12px 16px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",borderLeft:`3px solid ${t.c}`,fontSize:14,fontWeight:500}}>{t.m}</div>)}</div>}

/* ═══ 1-ON-1 CHAT ═══ */
function Chat1({tid,open,close}){
  const d=CHAT1[tid];const tn=initT()[tid];
  const[ms,sM]=useState([]);const[inp,sI]=useState("");const[typ,sT]=useState(false);const[sg,sS]=useState([]);
  const br=useRef<HTMLDivElement>(null);const ir=useRef<HTMLInputElement>(null);
  useEffect(()=>{sM([]);sS([]);sT(false);if(open&&d){setTimeout(()=>{sM([{id:"g",r:"a",t:d.hi}]);setTimeout(()=>sS(d.sg),400)},250)}},[open,tid]);
  useEffect(()=>{br.current?.scrollIntoView({behavior:"smooth"})},[ms,typ]);
  useEffect(()=>{if(open)setTimeout(()=>ir.current?.focus(),300)},[open]);
  function send(t){sM(m=>[...m,{id:Date.now(),r:"u",t}]);sS([]);sI("");sT(true);const a=d.an[t]||"Let me check on that.";setTimeout(()=>{sT(false);sM(m=>[...m,{id:Date.now()+1,r:"a",t:a}]);setTimeout(()=>sS(d.sg.filter(s=>s!==t)),400)},900+Math.random()*600)}
  if(!open)return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",background:"var(--bg)"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--sf)",paddingTop:56}}>
        <div><p style={{fontWeight:700,fontSize:17}}>Polo</p><p style={{fontSize:13,color:"var(--txL)"}}>RentRelay agent · Unit {tn.unit}</p></div>
        <button onClick={close} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--bd)",background:"var(--sf)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={16}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:8}}>
        {ms.map(m=><div key={m.id} style={{display:"flex",justifyContent:m.r==="u"?"flex-end":"flex-start",animation:"msgPop 0.2s ease"}}>
          <div style={{maxWidth:"80%",padding:"12px 16px",borderRadius:20,...(m.r==="u"?{background:"var(--ac)",color:"#fff",borderBottomRightRadius:4,boxShadow:"0 2px 8px rgba(13,110,110,0.2)"}:{background:"var(--bdL)",borderBottomLeftRadius:4,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}),fontSize:15,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.t}</div>
        </div>)}
        {typ&&<div style={{display:"flex"}}><div style={{background:"var(--bdL)",borderRadius:18,borderBottomLeftRadius:4,padding:"12px 18px",display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"var(--txL)",animation:`pulse 1.2s ${i*0.15}s ease-in-out infinite`}}/>)}</div></div>}
        <div ref={br}/>
      </div>
      {sg.length>0&&<div style={{padding:"0 20px 10px",display:"flex",gap:6,flexWrap:"wrap"}}>{sg.map(s=><button key={s} onClick={()=>send(s)} style={{padding:"8px 14px",borderRadius:20,border:"1px solid var(--bd)",background:"var(--sf)",fontSize:14,cursor:"pointer",color:"var(--ac)",fontFamily:"inherit",fontWeight:500}}>{s}</button>)}</div>}
      <div style={{padding:"12px 16px",paddingBottom:36,borderTop:"1px solid var(--bdL)",display:"flex",gap:8,background:"var(--sf)"}}>
        <input ref={ir} value={inp} onChange={e=>sI(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&inp.trim())send(inp.trim())}} placeholder="Ask anything..." style={{flex:1,padding:"12px 16px",borderRadius:24,border:"1px solid var(--bd)",fontSize:16,fontFamily:"inherit",outline:"none",background:"var(--bdL)"}} onFocus={e=>e.target.style.borderColor="var(--ac)"} onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
        <button onClick={()=>{if(inp.trim())send(inp.trim())}} style={{padding:"12px 14px",borderRadius:24,border:"none",background:"var(--ac)",color:"#fff",cursor:"pointer"}}><Send size={18}/></button>
      </div>
    </div>
  );
}

/* ═══ GROUP CHAT ═══ */
function GroupChat(){
  const[msgs,sMsgs]=useState(GRP);
  const[inp,sInp]=useState("");
  const[typ,sTyp]=useState(false);
  const vis=useSt(msgs.length,100);const br=useRef<HTMLDivElement>(null);const ir=useRef<HTMLInputElement>(null);
  useEffect(()=>{br.current?.scrollIntoView({behavior:"smooth"})},[msgs,typ]);
  const nameC={"ag-m":"var(--ac)","ag-j":"var(--bl)","abhi":"var(--tx)","kashish":"var(--tx)","?":"var(--no)"};

  const grpAnswers={"what do i owe":"Rent $1,450 + ConEd $38 = $1,488. Your wallet covers it.","how much left":"Groceries budget: $76 remaining this week.","did rent go through":"Yes — paid Oct 1. Tx: E4F8A2...9C1D.","is everyone paid":"Abhimanyu: paid. Kashish: overdue (8 days, $15 fee). Musammat: paid.","when is rent due":"Oct 1. Autopay handles it if your wallet is funded."};

  function send(text){
    const userMsg={id:Date.now(),f:"abhi",n:"Abhimanyu",m:text,t:"now",tp:"u"};
    sMsgs(m=>[...m,userMsg]);sInp("");sTyp(true);
    const key=Object.keys(grpAnswers).find(k=>text.toLowerCase().includes(k));
    const reply=key?grpAnswers[key]:"Let me check on that and get back to you.";
    setTimeout(()=>{sTyp(false);sMsgs(m=>[...m,{id:Date.now()+1,f:"ag-m",n:"Polo",m:reply,t:"now",tp:"ag"}])},900+Math.random()*600);
  }

  return <div>
    <div style={{textAlign:"center",padding:"14px 0 10px"}}><p style={{fontSize:14,color:"var(--txM)",fontWeight:500}}>Unit 4B · Abhimanyu, Kashish & agents</p></div>
    <div style={{padding:"0 16px",paddingBottom:80}}>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {msgs.map((m,i)=>{
          const show=vis.includes(i);const isU=m.tp==="u";const prev=i>0?msgs[i-1]:null;
          const showDate=!prev||m.t.split(",")[0]!==prev.t.split(",")[0];
          const sameSender=prev&&prev.f===m.f&&!showDate;
          const bg=m.tp==="ok"?"var(--okL)":m.tp==="block"?"var(--noL)":m.tp==="warn"?"var(--amL)":m.tp==="scam"?"var(--noL)":isU?"var(--ac)":"var(--bdL)";
          const tc=isU?"#fff":m.tp==="scam"?"var(--no)":"var(--tx)";
          const bdr=m.tp==="ok"?"2px solid var(--ok)":m.tp==="block"?"2px solid var(--no)":m.tp==="warn"?"2px solid var(--am)":m.tp==="scam"?"2px solid var(--no)":"none";
          return <div key={m.id}>
            {showDate&&m.t!=="now"&&<p style={{textAlign:"center",fontSize:12,color:"var(--txL)",fontWeight:500,padding:"14px 0 6px"}}>{m.t.split(",")[0]}</p>}
            <div style={{display:"flex",justifyContent:isU?"flex-end":"flex-start",opacity:show?1:0,transform:show?"none":"translateY(6px)",transition:"all 0.3s ease",marginTop:sameSender?2:8}}>
              <div style={{maxWidth:"82%"}}>
                {!isU&&!sameSender&&<p style={{fontSize:12,fontWeight:600,color:nameC[m.f]||"var(--txM)",marginBottom:2,marginLeft:2}}>{m.n}</p>}
                <div style={{padding:"12px 16px",borderRadius:20,...(isU?{borderBottomRightRadius:4,boxShadow:"0 2px 8px rgba(13,110,110,0.15)"}:{borderBottomLeftRadius:4,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}),background:bg,color:tc,border:bdr,fontSize:15,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.m}</div>
                {m.t!=="now"&&(showDate||i===msgs.length-1||msgs[i+1]?.f!==m.f)&&<p style={{fontSize:11,color:"var(--txL)",marginTop:2,marginLeft:2,textAlign:isU?"right":"left"}}>{m.t.split(", ")[1]}</p>}
              </div>
            </div>
          </div>
        })}
        {typ&&<div style={{display:"flex",marginTop:8}}><div style={{background:"var(--bdL)",borderRadius:16,borderBottomLeftRadius:4,padding:"12px 18px",display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"var(--txL)",animation:`pulse 1.2s ${i*0.15}s ease-in-out infinite`}}/>)}</div></div>}
        <div ref={br}/>
      </div>
    </div>
    {/* input pinned to bottom */}
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:90,padding:"10px 16px",paddingBottom:34,borderTop:"1px solid var(--bdL)",background:"var(--sf)",display:"flex",gap:8}}>
      <input ref={ir} value={inp} onChange={e=>sInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&inp.trim())send(inp.trim())}} placeholder="Message Unit 4B..." style={{flex:1,padding:"12px 16px",borderRadius:24,border:"1px solid var(--bd)",fontSize:16,fontFamily:"inherit",outline:"none",background:"var(--bdL)"}} onFocus={e=>e.target.style.borderColor="var(--ac)"} onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
      <button onClick={()=>{if(inp.trim())send(inp.trim())}} style={{padding:"12px 14px",borderRadius:24,border:"none",background:"var(--ac)",color:"#fff",cursor:"pointer"}}><Send size={18}/></button>
    </div>
  </div>
}

/* ═══ TOP-UP ═══ */
function TopUp({tn,open,close,go}){const[a,sA]=useState("");if(!open)return null;const tot=tn.rS+tn.ut+tn.lf;const sf=Math.max(0,tot-tn.bal);const ps=[100,250,500];if(sf>0&&!ps.includes(Math.ceil(sf)))ps.push(Math.ceil(sf));
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.2)",padding:20}}>
      <div style={{width:"100%",maxWidth:340,background:"var(--sf)",borderRadius:16,padding:24,boxShadow:"0 8px 30px rgba(0,0,0,0.12)"}}>
        <p style={{fontWeight:700,fontSize:18,marginBottom:4}}>Top up wallet</p><p style={{fontSize:14,color:"var(--txM)",marginBottom:20}}>Simulated RLUSD transfer.</p>
        <div style={{display:"flex",gap:8,marginBottom:16}}>{ps.map(v=><button key={v} onClick={()=>sA(""+v)} style={{flex:1,padding:"10px",borderRadius:10,border:a===""+v?"2px solid var(--ac)":"1px solid var(--bd)",background:a===""+v?"var(--acL)":"var(--sf)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>${v}</button>)}</div>
        <input value={a} onChange={e=>sA(e.target.value.replace(/[^0-9.]/g,""))} placeholder="Amount" style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid var(--bd)",fontSize:16,fontFamily:"inherit",fontWeight:600,outline:"none",textAlign:"center",marginBottom:20}}/>
        <div style={{display:"flex",gap:8}}><button onClick={close} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid var(--bd)",background:"var(--sf)",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button><button onClick={()=>{if(parseFloat(a)>0){go(parseFloat(a));close();sA("")}}} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--ac)",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Top up</button></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   FULL-SCREEN TENANT APP (for iPhone)
   ═══════════════════════════════════════ */
/* ═══ LANDLORD VIEW ═══ */
function LandlordView({tenants,sT,nf,dd,sDD}){
  const[proc,sP]=useState(null);const[spSt,sSS]=useState([]);const[lTab,sLT]=useState("building");
  const[res,sR]=useState({});const[run,sRn]=useState(null);const vis=useSt(ATK.length,70);

  function runRD(){sDD(1);const o=["abhi","musammat","kashish"];let d=0;o.forEach(id=>{d+=600;setTimeout(()=>{sP(id);nf("Processing "+tenants[id].name+"...")},d);d+=1e3;setTimeout(()=>{const t=tenants[id];const tot=t.rS+t.ut+t.lf;if(t.bal>=tot){sT(p=>({...p,[id]:{...p[id],st:"paid",bal:p[id].bal-tot}}));nf(t.name.split(" ")[0]+": paid","var(--ok)")}else{sT(p=>({...p,[id]:{...p[id],st:"failed"}}));nf(t.name.split(" ")[0]+": failed","var(--no)")}sP(null)},d)})}
  function spawn(){sSS([]);["Wallet created","Trust line set","Signer list (2-of-3)","Master key disabled","Credential issued","Live"].forEach((s,i)=>setTimeout(()=>sSS(p=>[...p,s]),i*550+200))}
  function fire(a){if(run)return;sRn(a.id);sR(r=>({...r,[a.id]:undefined}));setTimeout(()=>{sR(r=>({...r,[a.id]:true}));sRn(null);nf("Blocked: "+a.t,a.ly==="l"?"var(--ac)":"var(--no)")},1200)}

  return <div style={{padding:"20px 20px 100px",paddingTop:70}}>
    {/* landlord tabs */}
    <div style={{display:"flex",gap:6,marginBottom:20}}>
      {[{id:"building",l:"Building"},{id:"guardian",l:"Guardian Demo"}].map(tb=><button key={tb.id} onClick={()=>sLT(tb.id)} style={{flex:1,padding:"10px 0",borderRadius:8,border:lTab===tb.id?"2px solid var(--ac)":"1px solid var(--bd)",background:lTab===tb.id?"var(--acL)":"var(--sf)",fontSize:14,fontWeight:lTab===tb.id?700:400,color:lTab===tb.id?"var(--ac)":"var(--txL)",cursor:"pointer",fontFamily:"inherit"}}>{tb.l}</button>)}
    </div>

    {lTab==="building"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><h2 style={{fontSize:22,fontWeight:700}}>123 W 112th St</h2><p style={{fontSize:13,color:"var(--txM)",marginTop:2}}>2 units · 3 tenants</p></div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{padding:"5px 10px",borderRadius:6,border:"1px solid var(--bd)",fontSize:12,fontWeight:600,color:"var(--txM)"}}>Sep {dd}</span>
          <button onClick={()=>sDD(d=>Math.min(d+1,30))} style={{padding:"5px 10px",borderRadius:6,border:"1px solid var(--bd)",background:"var(--sf)",fontSize:12,cursor:"pointer",fontFamily:"inherit",color:"var(--txM)"}}>+1 day</button>
          <button onClick={runRD} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"var(--ac)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Rent day</button>
          <button onClick={()=>{sDD(9);sT(initT())}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid var(--bd)",background:"var(--sf)",cursor:"pointer"}}><RotateCcw size={12} color="var(--txM)"/></button>
        </div>
      </div>

      {/* spawn */}
      <div style={{padding:"12px 14px",border:"1px solid var(--bd)",borderRadius:8,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><p style={{fontSize:14,fontWeight:600}}>Add a tenant</p><p style={{fontSize:12,color:"var(--txM)"}}>Spawn wallet + keys on-chain</p></div><button onClick={spawn} style={{padding:"6px 12px",borderRadius:6,border:"1px solid var(--bd)",background:"var(--sf)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",color:"var(--txM)"}}>Spawn</button></div>
      {spSt.length>0&&<div style={{padding:"10px 14px",border:"1px solid var(--bdL)",borderRadius:8,marginBottom:14,background:"var(--sf)"}}>{spSt.map((s,i)=><p key={i} style={{fontSize:13,padding:"4px 0",color:s==="Live"?"var(--ok)":"var(--tx)",fontWeight:s==="Live"?700:400,display:"flex",alignItems:"center",gap:6}}>{s==="Live"?<CheckCircle2 size={14} color="var(--ok)"/>:<RefreshCw size={12} color="var(--ac)" style={{animation:i===spSt.length-1&&s!=="Live"?"spin 1s linear infinite":"none"}}/>}{s==="Live"?"Agent live":s}</p>)}</div>}

      {/* units */}
      {UNITS.map(u=>{const allP=u.ts.every(id=>tenants[id].st==="paid");const anyL=u.ts.some(id=>tenants[id].st==="late");
        return <div key={u.id} style={{border:"1px solid var(--bd)",borderRadius:8,overflow:"hidden",marginBottom:10}}>
          <div style={{padding:"10px 14px",background:"var(--sf)",borderBottom:"1px solid var(--bdL)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:700,fontSize:14}}>Unit {u.id}<span style={{fontWeight:400,color:"var(--txL)",marginLeft:6}}>${u.rent.toLocaleString()}/mo</span></span><St s={allP?"paid":anyL?"late":"due"}/></div>
          {u.ts.map(tid=>{const tn=tenants[tid];const tot=tn.rS+tn.ut+tn.lf;const isP=proc===tid;
            return <div key={tid} style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--bdL)",background:isP?"var(--acL)":"transparent",transition:"background 0.3s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:28,height:28,borderRadius:8,background:"var(--bdL)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{tn.ini}</div><div><p style={{fontSize:13,fontWeight:600}}>{tn.name}</p><p className="mono">{tn.ag}</p></div></div>
              <div style={{display:"flex",alignItems:"center",gap:14,fontSize:13}}>
                <span style={{fontWeight:600}}>${f$(tot)}</span>
                <span style={{color:tn.bal>=tot?"var(--ok)":"var(--no)",fontWeight:500}}>${f$(tn.bal)}</span>
                <St s={isP?"processing":tn.st}/>
              </div>
            </div>})}
        </div>})}

      {/* audit */}
      <p style={{fontWeight:700,fontSize:14,marginTop:16,marginBottom:8}}>Audit log</p>
      <div style={{border:"1px solid var(--bd)",borderRadius:8,overflow:"hidden",overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{borderBottom:"1px solid var(--bd)"}}>{["Time","Who","Type","Amt","Status","Rule"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:600,color:"var(--txL)",fontSize:11}}>{h}</th>)}</tr></thead>
        <tbody>{AUD.map(r=><tr key={r.id} style={{borderBottom:"1px solid var(--bdL)"}}>
          <td style={{padding:"8px 10px",color:"var(--txL)"}}>{r.t}</td>
          <td style={{padding:"8px 10px",fontWeight:500}}>{r.w}</td>
          <td style={{padding:"8px 10px",color:"var(--txM)"}}>{r.wh}</td>
          <td style={{padding:"8px 10px",fontWeight:500}}>${f$(r.a)}</td>
          <td style={{padding:"8px 10px"}}><St s={r.s}/></td>
          <td style={{padding:"8px 10px",color:"var(--txM)"}}>{r.r}</td>
        </tr>)}</tbody>
      </table></div>
    </div>}

    {lTab==="guardian"&&<div>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:4}}>What could go wrong?</h2>
      <p style={{fontSize:14,color:"var(--txM)",marginBottom:6}}>Five threats, each blocked.</p>
      <div style={{display:"flex",gap:12,fontSize:12,color:"var(--txL)",marginBottom:16}}><span>Guardian = co-signer</span><span>Ledger = on-chain</span></div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {ATK.map((a,i)=>{const show=vis.includes(i);const isR=run===a.id;const bl=res[a.id];const ac=a.ly==="l"?"var(--ac)":"var(--no)";
          return <div key={a.id} style={{border:"1px solid var(--bd)",borderRadius:8,overflow:"hidden",opacity:show?1:0,transform:show?"none":"translateY(10px)",transition:"all 0.3s ease",borderLeft:bl?`3px solid ${ac}`:"3px solid var(--bd)",padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
              <div><p style={{fontSize:15,fontWeight:600,marginBottom:3}}>{a.t}</p><p style={{fontSize:13,color:"var(--txM)",lineHeight:1.4}}>{a.d}</p></div>
              <button onClick={()=>fire(a)} disabled={isR} style={{padding:"7px 14px",borderRadius:6,border:bl?"1px solid var(--bd)":"none",background:bl?"var(--sf)":"var(--no)",color:bl?"var(--txM)":"#fff",fontSize:12,fontWeight:600,cursor:isR?"wait":"pointer",fontFamily:"inherit",flexShrink:0}}>
                {isR?<span style={{display:"flex",alignItems:"center",gap:4}}><RefreshCw size={12} style={{animation:"spin 1s linear infinite"}}/>Testing</span>:bl?"Again":"Run"}
              </button>
            </div>
            {bl&&<div style={{marginTop:10,padding:"10px 12px",borderRadius:6,background:a.ly==="l"?"var(--acL)":"var(--noL)"}}>
              <p style={{fontSize:13,fontWeight:700,color:ac,marginBottom:3}}>Blocked by {a.bk}</p>
              <p style={{fontSize:13,fontWeight:500,marginBottom:3}}>{a.v}</p>
              <p style={{fontSize:12,color:"var(--txM)"}}>{a.x}</p>
            </div>}
          </div>})}
      </div>
    </div>}
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
}

export default function App(){
  const[role,sRole]=useState("abhi");const[pk,sPk]=useState(false);
  const[tenants,sT]=useState(initT);const[nfO,sNfO]=useState(false);
  const[tab,sTab]=useState("dash");const[tu,sTU]=useState(false);const[c1,sC1]=useState(false);
  const[nfSel,sNfSel]=useState(null);const[dd,sDD]=useState(9);
  const[dark,sDark]=useState(false);
  const nf=useNf();

  useEffect(()=>{document.documentElement.setAttribute("data-theme",dark?"dark":"light")},[dark]);
  const isLandlord=role==="landlord";
  const tid=isLandlord?"abhi":role;
  const t=tenants[tid];const acts=ACT[tid]||[];
  const tot=t.rS+t.ut+t.lf;const short=t.bal<tot;
  const vis=useSt(acts.length,70);
  function topUp(id,a){sT(p=>({...p,[id]:{...p[id],bal:p[id].bal+a}}));nf.push("Topped up +$"+f$(a),"var(--ok)")}

  const roles=[
    ...Object.values(tenants).map(tn=>({id:tn.id,name:tn.name,ini:tn.ini,sub:"Unit "+tn.unit,type:"tenant"})),
    {id:"landlord",name:"Arpey",ini:"AR",sub:"Landlord",type:"landlord"},
  ];
  const activeRole=roles.find(r=>r.id===role)||roles[0];

  return (
    <div style={{background:"var(--bg)",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <Toasts ts={nf.ts}/>

      {/* status bar cover */}
      <div style={{position:"fixed",top:-100,left:0,right:0,height:220,zIndex:101,background:"var(--sf)"}}/>
      {/* ═══ NAV ═══ */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:102,background:"var(--sf)",borderBottom:"1px solid var(--bd)",paddingTop:6}}>
        <div style={{padding:"0 20px",display:"flex",justifyContent:"space-between",alignItems:"center",height:50}}>
          <span style={{fontSize:20,fontWeight:700,letterSpacing:-0.5}}>RentRelay</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* theme toggle */}
            <button onClick={()=>sDark(!dark)} style={{background:"none",border:"none",cursor:"pointer",padding:4,fontSize:18}}>
              {dark?"☀️":"🌙"}
            </button>
            <button onClick={()=>sNfO(!nfO)} style={{position:"relative",background:"none",border:"none",cursor:"pointer",padding:4}}>
              <Bell size={22} color={nfO?"var(--ac)":"var(--txM)"}/>
              {nf.ur>0&&<span style={{position:"absolute",top:-2,right:-2,width:18,height:18,borderRadius:"50%",background:"var(--no)",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{nf.ur}</span>}
            </button>
            <button onClick={()=>sPk(!pk)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,border:"1px solid var(--bd)",background:isLandlord?"var(--acL)":"var(--sf)",fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
              <div style={{width:26,height:26,borderRadius:8,background:isLandlord?"var(--ac)":"var(--acL)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isLandlord?10:12,fontWeight:700,color:isLandlord?"#fff":"var(--ac)"}}>{activeRole.ini}</div>
              {activeRole.name.split(" ")[0]}
              <ChevronDown size={14} color="var(--txL)"/>
            </button>
          </div>
        </div>
        {/* tabs — different for landlord vs tenant */}
        {!isLandlord&&<div style={{display:"flex",borderTop:"1px solid var(--bdL)"}}>
          {[{id:"dash",l:"Dashboard"},{id:"group",l:"Unit "+t.unit+" chat"}].map(tb=><button key={tb.id} onClick={()=>{sTab(tb.id);window.scrollTo(0,0)}} style={{flex:1,padding:"12px 0",border:"none",background:"none",fontFamily:"inherit",fontSize:14,fontWeight:tab===tb.id?700:400,color:tab===tb.id?"var(--tx)":"var(--txL)",cursor:"pointer",borderBottom:tab===tb.id?"2.5px solid var(--tx)":"2.5px solid transparent"}}>{tb.l}</button>)}
        </div>}
      </div>
      <div style={{height:isLandlord?65:105}}/>

      {/* role picker dropdown */}
      {pk&&(
        <>
          <div style={{position:"fixed",inset:0,zIndex:150}} onClick={()=>sPk(false)}/>
          <div style={{position:"fixed",top:110,right:16,zIndex:160,background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:12,padding:4,minWidth:210,boxShadow:"0 8px 30px rgba(0,0,0,0.12)"}}>
            <p style={{fontSize:11,fontWeight:600,color:"var(--txL)",padding:"8px 14px 4px"}}>Tenants</p>
            {roles.filter(r=>r.type==="tenant").map(r=>(
              <button key={r.id} onClick={()=>{sRole(r.id);sPk(false);sTab("dash");window.scrollTo(0,0)}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"11px 14px",borderRadius:8,border:"none",background:role===r.id?"var(--bdL)":"transparent",cursor:"pointer",fontSize:15,fontFamily:"inherit"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:28,height:28,borderRadius:8,background:role===r.id?"var(--ac)":"var(--bdL)",color:role===r.id?"#fff":"var(--txL)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{r.ini}</div>
                  <span style={{fontWeight:role===r.id?600:400}}>{r.name}</span>
                </div>
                <span style={{fontSize:13,color:"var(--txL)"}}>{r.sub}</span>
              </button>
            ))}
            <div style={{height:1,background:"var(--bdL)",margin:"4px 0"}}/>
            <p style={{fontSize:11,fontWeight:600,color:"var(--txL)",padding:"4px 14px 4px"}}>Landlord</p>
            <button onClick={()=>{sRole("landlord");sPk(false);window.scrollTo(0,0)}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"11px 14px",borderRadius:8,border:"none",background:role==="landlord"?"var(--bdL)":"transparent",cursor:"pointer",fontSize:15,fontFamily:"inherit"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:28,height:28,borderRadius:8,background:role==="landlord"?"var(--ac)":"var(--bdL)",color:role==="landlord"?"#fff":"var(--txL)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>AR</div>
                <span style={{fontWeight:role==="landlord"?600:400}}>Arpey</span>
              </div>
              <span style={{fontSize:13,color:"var(--txL)"}}>Landlord</span>
            </button>
          </div>
        </>
      )}

      {/* notifications panel */}
      {nfO&&(
        <>
          <div style={{position:"fixed",inset:0,zIndex:150}} onClick={()=>sNfO(false)}/>
          <div style={{position:"fixed",top:110,left:16,right:16,zIndex:160,background:"var(--sf)",borderRadius:14,boxShadow:"0 8px 30px rgba(0,0,0,0.12)",border:"1px solid var(--bd)",overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid var(--bdL)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:700,fontSize:15}}>Notifications</span><button onClick={nf.mr} style={{fontSize:13,border:"none",background:"none",color:"var(--ac)",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Mark read</button></div>
            <div style={{maxHeight:300,overflowY:"auto"}}>
              {nf.h.map(n=>(
                <div key={n.id} onClick={()=>{sNfSel(n);sNfO(false)}} style={{padding:"14px 18px",borderBottom:"1px solid var(--bdL)",background:n.r?"transparent":"var(--acL)",cursor:"pointer"}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div style={{width:8,height:8,borderRadius:"50%",background:n.c,marginTop:5,flexShrink:0}}/><div style={{flex:1}}><p style={{fontSize:14,fontWeight:n.r?400:600}}>{n.m}</p><span style={{fontSize:12,color:"var(--txL)"}}>{n.t}</span></div><span style={{fontSize:12,color:"var(--ac)",fontWeight:500,flexShrink:0}}>View</span></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* notification detail */}
      {nfSel&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.15)",padding:20}} onClick={()=>sNfSel(null)}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:340,background:"var(--sf)",borderRadius:14,boxShadow:"0 12px 40px rgba(0,0,0,0.15)",overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid var(--bdL)",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:nfSel.c}}/><span style={{fontSize:14,fontWeight:700}}>{nfSel.tag}</span></div><button onClick={()=>sNfSel(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={16}/></button></div>
            <div style={{padding:"16px 18px"}}><p style={{fontSize:16,fontWeight:600,marginBottom:4}}>{nfSel.m}</p><p style={{fontSize:13,color:"var(--txL)",marginBottom:12}}>{nfSel.t}</p><p style={{fontSize:14,color:"var(--txM)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{nfSel.detail}</p></div>
          </div>
        </div>
      )}

      {/* ═══ LANDLORD VIEW ═══ */}
      {isLandlord&&<LandlordView tenants={tenants} sT={sT} nf={nf.push} dd={dd} sDD={sDD}/>}

      {/* ═══ DASHBOARD ═══ */}
      {!isLandlord&&tab==="dash"&&(
        <div style={{padding:"20px 20px 0"}}>
          <p style={{fontSize:15,color:"var(--txM)"}}>Unit {t.unit} · {t.sh*100}% share</p>
          <h1 style={{fontSize:28,fontWeight:700,letterSpacing:-0.5,marginTop:4,marginBottom:20}}>{t.name.split(" ")[0]}&apos;s rent</h1>

          {t.str>0&&<div style={{padding:"12px 16px",marginBottom:16,background:"var(--amL)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:600,color:"#92400E"}}>{t.str} months on time</span><span style={{fontSize:13,color:"#B45309"}}>Rental reference</span></div>}

          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <div><p style={{fontSize:13,color:"var(--txL)",marginBottom:4}}>{t.st==="paid"?"September — settled":t.st==="late"?`${t.dl} days overdue`:"Due Oct 1"}</p><p style={{fontSize:40,fontWeight:700,letterSpacing:-1.5,color:t.st==="paid"?"var(--ok)":t.st==="late"?"var(--am)":"var(--tx)"}}><AN value={tot}/></p></div>
              <St s={t.st}/>
            </div>
            <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:10,fontSize:15,color:"var(--txM)"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Rent ({t.sh*100}%)</span><span style={{color:"var(--tx)",fontWeight:500}}>${f$(t.rS)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>ConEd</span><span style={{color:"var(--tx)",fontWeight:500}}>${f$(t.ut)}</span></div>
              {t.lf>0&&<div style={{display:"flex",justifyContent:"space-between",color:"var(--am)"}}><span>Late fee</span><span style={{fontWeight:500}}>${f$(t.lf)}</span></div>}
            </div>
            <div style={{height:1,background:"var(--bdL)",margin:"14px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:14,color:"var(--txM)"}}><span>ConEd building: $128</span><span style={{color:"var(--ac)",fontWeight:500}}>Read by Gemini</span></div>
          </div>

          {/* wallet */}
          <div style={{padding:"18px",border:"1px solid var(--bd)",borderRadius:12,marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><p style={{fontSize:13,color:"var(--txL)",marginBottom:4}}>Rent wallet</p><p style={{fontSize:26,fontWeight:700,letterSpacing:-0.5}}><AN value={t.bal}/><span style={{fontSize:14,fontWeight:400,color:"var(--txL)",marginLeft:4}}>RLUSD</span></p><p className="mono" style={{marginTop:4}}>{t.wa}</p></div>
              <div style={{textAlign:"right"}}>{short&&<p style={{fontSize:14,fontWeight:600,color:"var(--no)",marginBottom:6}}>Short ${f$(tot-t.bal)}</p>}<button onClick={()=>sTU(true)} style={{padding:"10px 18px",borderRadius:10,border:"none",background:"var(--ac)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Top up</button></div>
            </div>
            <div style={{marginTop:14,height:5,background:"var(--bdL)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:short?"var(--no)":"var(--ok)",width:`${Math.min((t.bal/tot)*100,100)}%`,transition:"width 0.6s ease"}}/></div>
          </div>

          {/* rules */}
          <div style={{marginBottom:20,fontSize:15}}>
            <p style={{fontWeight:700,marginBottom:12}}>Rules</p>
            <div style={{display:"flex",flexDirection:"column",gap:10,color:"var(--txM)"}}>
              {[["Cap","$"+t.cap.toLocaleString()],["Autopay",t.ap?"On":"Off"],["Keys","2 of 3"],["Landlord",LA]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between"}}><span>{l}</span><span style={{fontWeight:500,color:l==="Autopay"&&t.ap?"var(--ok)":l==="Landlord"?"var(--txL)":"var(--tx)",...(l==="Landlord"?{fontFamily:"'DM Mono',monospace",fontSize:12}:{})}}>{v}</span></div>)}
            </div>
          </div>

          {/* threat */}
          <div style={{padding:"14px 16px",marginBottom:24,border:"1px solid var(--bd)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><p style={{fontSize:15,fontWeight:600}}>1 threat blocked</p><p style={{fontSize:13,color:"var(--txM)"}}>Scam payment, Sep 3</p></div><ChevronRight size={18} color="var(--txL)"/></div>

          {/* activity */}
          <p style={{fontWeight:700,marginBottom:12,fontSize:15}}>Activity</p>
          {acts.map((a,i)=>{const show=vis.includes(i);const c=a.tp==="ok"?"var(--ok)":a.tp==="block"?"var(--no)":a.tp==="warn"||a.tp==="alert"?"var(--am)":"var(--txL)";
            return <div key={a.id} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<acts.length-1?"1px solid var(--bdL)":"none",opacity:show?1:0,transform:show?"none":"translateY(6px)",transition:"all 0.3s ease"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:c,marginTop:7,flexShrink:0}}/>
              <div style={{flex:1}}><p style={{fontSize:15}}>{a.m}</p><div style={{display:"flex",gap:8,marginTop:4}}><span style={{fontSize:13,color:"var(--txL)"}}>{a.t}</span>{a.tx&&<span className="mono" style={{color:"var(--ac)"}}>{a.tx}</span>}</div></div>
              <St s={a.tp}/>
            </div>})}
        </div>
      )}

      {/* ═══ GROUP CHAT ═══ */}
      {!isLandlord&&tab==="group"&&<GroupChat/>}

      <div style={{height:100}}/>{/* bottom spacer */}

      {/* ═══ CHAT FAB (tenant dashboard only) ═══ */}
      {!isLandlord&&tab==="dash"&&<div style={{display:"flex",justifyContent:"flex-end",padding:"0 20px 30px"}}><button onClick={()=>sC1(true)} style={{width:54,height:54,borderRadius:16,border:"none",background:"var(--ac)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(13,110,110,0.3)"}}><MessageCircle size={24} color="#fff"/></button></div>}

      {!isLandlord&&<Chat1 tid={tid} open={c1} close={()=>sC1(false)}/>}
      {!isLandlord&&<TopUp tn={t} open={tu} close={()=>sTU(false)} go={a=>topUp(tid,a)}/>}
    </div>
  );
}
