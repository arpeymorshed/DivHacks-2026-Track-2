"use client";
import { useState, useEffect, useCallback } from "react";
import { Shield, ShieldX, RotateCcw, ExternalLink, Zap, RefreshCw, Clock, Home, UserPlus, CheckCircle2 } from "lucide-react";

const LA = "rLndQ7v...4kDf";
const initT = () => ({
  abhi:   { id:"abhi",name:"Abhimanyu Dudeja",ini:"A",unit:"4B",sh:0.5,rT:2900,rS:1450,ut:38,cap:1600,wa:"rAbhi8x...KqvP",bal:1520,ap:true,st:"paid",dl:0,lf:0,ag:"agent-abhi-4b" },
  kashish: { id:"kashish",name:"Kashish",ini:"K",unit:"4B",sh:0.5,rT:2900,rS:1450,ut:38,cap:1600,wa:"rKash3m...NpxR",bal:980,ap:true,st:"late",dl:8,lf:15,ag:"agent-kashish-4b" },
  musammat:  { id:"musammat",name:"Musammat",ini:"M",unit:"2A",sh:1.0,rT:1450,rS:1450,ut:52,cap:1600,wa:"rMusa7v...WxsT",bal:1550,ap:true,st:"due",dl:0,lf:0,ag:"agent-musammat-2a" },
});
const UNITS=[{id:"4B",rent:2900,ts:["abhi","kashish"]},{id:"2A",rent:1450,ts:["musammat"]}];

const ATK=[
  {id:"scam",t:"Scam bank-account change",d:"Message claims landlord changed accounts, reroutes rent.",bk:"Guardian",ly:"g",v:`Destination rScam...9xyz doesn't match verified address (${LA}).`,x:"Guardian pins the landlord's on-chain credential. Mismatch = refused."},
  {id:"inflate",t:"Inflated utility bill",d:"ConEd share misread as $380 instead of $38.",bk:"Guardian",ly:"g",v:"Monthly total $1,830 exceeds tenant cap of $1,600.",x:"Guardian tallies all charges before co-signing."},
  {id:"double",t:"Double rent charge",d:"Landlord agent requests September rent again.",bk:"Guardian",ly:"g",v:"September 2026 already paid. Duplicate refused.",x:"Guardian tracks paid periods. Same month = refused."},
  {id:"fee",t:"Illegal $200 late fee",d:"Fee exceeds NY cap, or charged during grace period.",bk:"Guardian",ly:"g",v:"$200 exceeds min($50, 5% × $1,450). Grace period violated.",x:"NY RPL §238-a. Guardian enforces the cap and grace window."},
  {id:"key",t:"Stolen agent key",d:"Attacker signs with only the agent's key.",bk:"XRPL ledger",ly:"l",v:"1 signature, quorum requires 2. Rejected on-chain.",x:"Master key disabled. 2 of 3 needed. The ledger enforces this."},
];

const AUD=[
  {id:"a1",t:"Sep 1",w:"Abhimanyu",wh:"Rent",a:1450,s:"ok",r:"Passed",tx:"E4F8A2...9C1D"},
  {id:"a2",t:"Sep 1",w:"Abhimanyu",wh:"ConEd",a:38,s:"ok",r:"Passed",tx:"B7D3F1...4E2A"},
  {id:"a3",t:"Sep 1",w:"Musammat",wh:"Rent",a:1450,s:"ok",r:"Passed",tx:"C2A9E5...7F3B"},
  {id:"a4",t:"Sep 1",w:"Kashish",wh:"Rent",a:1450,s:"fail",r:"Insufficient balance",tx:null},
  {id:"a5",t:"Sep 3",w:"Abhimanyu",wh:"Scam",a:1450,s:"block",r:"Unrecognized address",tx:null},
];

const f$=n=>n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});

function useNf(){
  const[ts,sTs]=useState([]);
  const push=useCallback((m,c="#0d6e6e")=>{const id=""+Date.now();sTs(t=>[...t,{id,m,c}]);setTimeout(()=>sTs(t=>t.filter(x=>x.id!==id)),3200)},[]);
  return{ts,push};
}

function St({s}){const m={paid:{c:"#1a7f4b",l:"Paid"},due:{c:"#2563eb",l:"Due"},late:{c:"#b8860b",l:"Late"},blocked:{c:"#c0392b",l:"Blocked"},failed:{c:"#c0392b",l:"Failed"},ok:{c:"#1a7f4b",l:"Paid"},block:{c:"#c0392b",l:"Blocked"},fail:{c:"#c0392b",l:"Failed"},processing:{c:"#0d6e6e",l:"Processing..."}};const v=m[s]||m.due;return <span style={{fontSize:12,fontWeight:600,color:v.c}}>{v.l}</span>}

function Toasts({ts}){return <div style={{position:"fixed",top:16,right:16,zIndex:999,display:"flex",flexDirection:"column",gap:6}}>{ts.map(t=><div key={t.id} style={{background:"#fff",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",borderLeft:`3px solid ${t.c}`,fontSize:13,fontWeight:500,maxWidth:300}}>{t.m}</div>)}</div>}

function useSt(c,ms=70){const[v,s]=useState([]);useEffect(()=>{s([]);for(let i=0;i<c;i++)setTimeout(()=>s(p=>[...p,i]),(i+1)*ms)},[c]);return v}

export default function DemoPage(){
  const[tab,sTab]=useState("building");
  const[dd,sDD]=useState(9);
  const[tenants,sT]=useState(initT);
  const[proc,sP]=useState(null);
  const[spSt,sSS]=useState([]);
  const[res,sR]=useState({});
  const[run,sRn]=useState(null);
  const nf=useNf();
  const vis=useSt(ATK.length,70);

  function runRD(){
    sDD(1);const o=["abhi","musammat","kashish"];let d=0;
    o.forEach(id=>{
      d+=600;setTimeout(()=>{sP(id);nf.push("Processing "+tenants[id].name+"...")},d);
      d+=1e3;setTimeout(()=>{
        const t=tenants[id];const tot=t.rS+t.ut+t.lf;
        if(t.bal>=tot){sT(p=>({...p,[id]:{...p[id],st:"paid",bal:p[id].bal-tot}}));nf.push(t.name.split(" ")[0]+": paid","#1a7f4b")}
        else{sT(p=>({...p,[id]:{...p[id],st:"failed"}}));nf.push(t.name.split(" ")[0]+": failed","#c0392b")}
        sP(null)
      },d)
    })
  }

  function spawn(){sSS([]);["Wallet created","Trust line set","Signer list (2-of-3)","Master key disabled","Credential issued","Live"].forEach((s,i)=>setTimeout(()=>sSS(p=>[...p,s]),i*550+200))}

  function fire(a){if(run)return;sRn(a.id);sR(r=>({...r,[a.id]:undefined}));setTimeout(()=>{sR(r=>({...r,[a.id]:true}));sRn(null);nf.push("Blocked: "+a.t,a.ly==="l"?"#0d6e6e":"#c0392b")},1200)}

  return (
    <div style={{minHeight:"100vh",background:"#111116",fontFamily:"'DM Sans',system-ui,sans-serif",color:"#fff"}}>
      <Toasts ts={nf.ts}/>

      {/* top bar */}
      <div style={{padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #222"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:28,height:28,borderRadius:7,background:"#0d6e6e",display:"flex",alignItems:"center",justifyContent:"center"}}><Shield size={14} color="#fff"/></div>
          <span style={{fontSize:18,fontWeight:700}}>aartee.</span>
          <span style={{fontSize:13,color:"#666",marginLeft:8}}>Demo · Landlord + Guardian</span>
        </div>
        <button onClick={()=>{sDD(9);sT(initT());sR({});sRn(null);sSS([])}} style={{padding:"6px 14px",borderRadius:7,border:"1px solid #333",background:"transparent",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",color:"#888",display:"flex",alignItems:"center",gap:4}}><RotateCcw size={12}/>Reset all</button>
      </div>

      {/* tabs */}
      <div style={{display:"flex",gap:2,padding:"16px 24px 0"}}>
        {[{id:"building",l:"Building Console"},{id:"guardian",l:"Guardian Demo"}].map(tb=>(
          <button key={tb.id} onClick={()=>sTab(tb.id)} style={{
            padding:"10px 20px",borderRadius:8,border:tab===tb.id?"1px solid #444":"1px solid transparent",
            background:tab===tb.id?"#1e1e24":"transparent",color:tab===tb.id?"#fff":"#888",
            fontSize:14,fontWeight:tab===tb.id?600:400,cursor:"pointer",fontFamily:"inherit",
          }}>{tb.l}</button>
        ))}
      </div>

      <div style={{padding:"20px 24px"}}>

        {/* ═══ BUILDING CONSOLE ═══ */}
        {tab==="building"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:12}}>
              <div>
                <h1 style={{fontSize:24,fontWeight:700}}>123 W 112th St</h1>
                <p style={{fontSize:13,color:"#888",marginTop:2}}>Landlord: Arpey · 2 units · 3 tenants</p>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{padding:"5px 10px",borderRadius:6,border:"1px solid #444",fontSize:12,fontWeight:600,color:"#aaa"}}>Sep {dd}</span>
                <button onClick={()=>sDD(d=>Math.min(d+1,30))} style={{padding:"5px 10px",borderRadius:6,border:"1px solid #444",background:"transparent",fontSize:12,cursor:"pointer",fontFamily:"inherit",color:"#aaa"}}>+1 day</button>
                <button onClick={runRD} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#0d6e6e",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><span style={{display:"flex",alignItems:"center",gap:4}}><Zap size={12}/>Rent day</span></button>
                <button onClick={()=>{sDD(9);sT(initT())}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #444",background:"transparent",cursor:"pointer"}}><RotateCcw size={12} color="#888"/></button>
              </div>
            </div>

            {/* spawn */}
            <div style={{padding:"12px 16px",border:"1px solid #333",borderRadius:8,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><p style={{fontSize:14,fontWeight:600}}>Add a tenant</p><p style={{fontSize:12,color:"#888"}}>Spawn wallet + keys on-chain</p></div>
              <button onClick={spawn} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #444",background:"transparent",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",color:"#aaa"}}>Spawn</button>
            </div>
            {spSt.length>0&&<div style={{padding:"10px 16px",border:"1px solid #333",borderRadius:8,marginBottom:16}}>
              {spSt.map((s,i)=><p key={i} style={{fontSize:13,padding:"4px 0",color:s==="Live"?"#1a7f4b":"#ccc",fontWeight:s==="Live"?700:400,display:"flex",alignItems:"center",gap:6}}>
                {s==="Live"?<CheckCircle2 size={14} color="#1a7f4b"/>:<RefreshCw size={12} color="#0d6e6e" style={{animation:i===spSt.length-1&&s!=="Live"?"spin 1s linear infinite":"none"}}/>}
                {s==="Live"?"Agent live":""+s}
              </p>)}
            </div>}

            {/* units */}
            {UNITS.map(u=>{
              const allP=u.ts.every(id=>tenants[id].st==="paid");const anyL=u.ts.some(id=>tenants[id].st==="late");
              return <div key={u.id} style={{border:"1px solid #333",borderRadius:8,overflow:"hidden",marginBottom:12}}>
                <div style={{padding:"10px 16px",background:"#1e1e24",borderBottom:"1px solid #333",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:700,fontSize:14}}><Home size={14} style={{display:"inline",marginRight:6,verticalAlign:"-2px"}} color="#888"/>Unit {u.id}<span style={{fontWeight:400,color:"#777",marginLeft:6}}>${u.rent.toLocaleString()}/mo</span></span>
                  <St s={allP?"paid":anyL?"late":"due"}/>
                </div>
                {u.ts.map(tid=>{
                  const tn=tenants[tid];const tot=tn.rS+tn.ut+tn.lf;const isP=proc===tid;
                  return <div key={tid} style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #2a2a30",background:isP?"rgba(13,110,110,0.1)":"transparent",transition:"background 0.3s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:30,height:30,borderRadius:8,background:"#2a2a30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#aaa"}}>{tn.ini}</div>
                      <div><p style={{fontSize:14,fontWeight:600}}>{tn.name}</p><p style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"#666"}}>{tn.ag}</p></div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:16,fontSize:13}}>
                      <span style={{fontWeight:600}}>${f$(tot)}</span>
                      <span style={{color:tn.bal>=tot?"#1a7f4b":"#c0392b",fontWeight:500}}>${f$(tn.bal)}</span>
                      <St s={isP?"processing":tn.st}/>
                    </div>
                  </div>
                })}
              </div>
            })}

            {/* audit */}
            <p style={{fontWeight:700,fontSize:14,marginTop:20,marginBottom:10}}>Audit log</p>
            <div style={{border:"1px solid #333",borderRadius:8,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{borderBottom:"1px solid #333"}}>{["Time","Tenant","Type","Amount","Status","Rule","Tx"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:600,color:"#666",fontSize:11}}>{h}</th>)}</tr></thead>
                <tbody>{AUD.map(r=><tr key={r.id} style={{borderBottom:"1px solid #2a2a30"}}>
                  <td style={{padding:"10px 12px",color:"#777"}}>{r.t}</td>
                  <td style={{padding:"10px 12px",fontWeight:500}}>{r.w}</td>
                  <td style={{padding:"10px 12px",color:"#888"}}>{r.wh}</td>
                  <td style={{padding:"10px 12px",fontWeight:500}}>${f$(r.a)}</td>
                  <td style={{padding:"10px 12px"}}><St s={r.s}/></td>
                  <td style={{padding:"10px 12px",color:"#888"}}>{r.r}</td>
                  <td style={{padding:"10px 12px"}}>{r.tx?<span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#0d6e6e"}}>{r.tx}</span>:<span style={{color:"#555"}}>—</span>}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ GUARDIAN DEMO ═══ */}
        {tab==="guardian"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h1 style={{fontSize:24,fontWeight:700}}>What could go wrong?</h1>
                <p style={{fontSize:14,color:"#888",marginTop:4}}>Five threats, each stopped by a different layer.</p>
              </div>
              <button onClick={()=>{sR({});sRn(null)}} style={{padding:"6px 14px",borderRadius:7,border:"1px solid #444",background:"transparent",fontSize:12,cursor:"pointer",fontFamily:"inherit",color:"#888",display:"flex",alignItems:"center",gap:4}}><RotateCcw size={12}/>Reset</button>
            </div>
            <div style={{display:"flex",gap:14,fontSize:12,color:"#666",marginBottom:20}}>
              <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:3,borderRadius:2,background:"#c0392b"}}/>Guardian</span>
              <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:3,borderRadius:2,background:"#0d6e6e"}}/>XRPL ledger</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {ATK.map((a,i)=>{
                const show=vis.includes(i);const isR=run===a.id;const bl=res[a.id];const ac=a.ly==="l"?"#0d6e6e":"#c0392b";
                return <div key={a.id} style={{background:"#1e1e24",borderRadius:8,overflow:"hidden",opacity:show?1:0,transform:show?"none":"translateY(10px)",transition:"all 0.3s ease",borderLeft:bl?`3px solid ${ac}`:"3px solid #333",padding:"16px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                    <div><p style={{fontSize:15,fontWeight:600,marginBottom:4}}>{a.t}</p><p style={{fontSize:13,color:"#888",lineHeight:1.4}}>{a.d}</p></div>
                    <button onClick={()=>fire(a)} disabled={isR} style={{padding:"7px 14px",borderRadius:6,border:bl?"1px solid #444":"none",background:bl?"transparent":"#c0392b",color:bl?"#999":"#fff",fontSize:12,fontWeight:600,cursor:isR?"wait":"pointer",fontFamily:"inherit",flexShrink:0}}>
                      {isR?<span style={{display:"flex",alignItems:"center",gap:4}}><RefreshCw size={12} style={{animation:"spin 1s linear infinite"}}/>Testing</span>:bl?"Again":"Run"}
                    </button>
                  </div>
                  {bl&&<div style={{marginTop:12,padding:"12px 14px",borderRadius:6,background:a.ly==="l"?"rgba(13,110,110,0.12)":"rgba(192,57,43,0.1)"}}>
                    <p style={{fontSize:13,fontWeight:700,color:ac,marginBottom:4}}>Blocked by {a.bk}</p>
                    <p style={{fontSize:13,fontWeight:500,color:"#ddd",marginBottom:4}}>{a.v}</p>
                    <p style={{fontSize:12,color:"#888"}}>{a.x}</p>
                  </div>}
                </div>
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
