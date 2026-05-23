"use client";
// src/components/boss/cards.jsx — Composite Cards
// TrustScoreCard, TrustScoreSheet, TodayMoneyCard,
// OrderCard, StatusStepper, MeasGrid
import { useState, useMemo } from "react";
import { C, S, STATUSES, MEAS_FIELDS } from "./tokens";
import { fmt, fmtDate, getBalance, getTotalPaid, getPaymentState, allOrders, orderStatus, isOverdue, isDueToday, computeTrustScore } from "./helpers";
import { Sheet, SectionLabel } from "./ui";

export function TrustScoreCard({customers,onPress}){
  const ts=computeTrustScore(customers);const pct=ts.score;
  const ringColor=pct>=70?C.green:pct>=45?"#FF9F0A":C.muted;
  return(
    <div className="tap" onClick={onPress} style={{
      ...S.card,margin:"0 20px",display:"flex",alignItems:"center",gap:20,
      padding:"24px 20px",borderRadius:20,cursor:"pointer",
    }}>
      {/* Ring */}
      <div style={{position:"relative",flexShrink:0}}>
        <svg width={72} height={72} viewBox="0 0 72 72">
          <circle cx={36} cy={36} r={30} fill="none" stroke={C.border} strokeWidth={5}/>
          <circle cx={36} cy={36} r={30} fill="none" stroke={ringColor} strokeWidth={5} strokeLinecap="round"
            strokeDasharray={`${2*Math.PI*30}`}
            strokeDashoffset={`${2*Math.PI*30*(1-pct/100)}`}
            transform="rotate(-90 36 36)"
            style={{transition:"stroke-dashoffset 1s ease"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:20,fontWeight:800,lineHeight:1,color:C.text}}>{pct}</div>
          <div style={{fontSize:12,fontWeight:700,color:C.sub,letterSpacing:"0.5px"}}>SCORE</div>
        </div>
      </div>
      {/* Text */}
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:4}}>BOSS Trust Score</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div style={{fontSize:22,fontWeight:800,color:C.text,letterSpacing:"-0.5px"}}>{ts.level}</div>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div style={{fontSize:13,fontWeight:500,color:C.sub}}>Credit Readiness: <span style={{color:pct>=70?C.green:pct>=45?"#FF9F0A":C.red,fontWeight:700}}>{ts.readiness}</span></div>
      </div>
    </div>
  );
}
export function TrustScoreSheet({customers,open,onClose}){
  const ts=computeTrustScore(customers);
  const rows=[
    {label:"Order Completion",  value:ts.breakdown.completion+"%", note:"Jobs finished"},
    {label:"Repeat Customers",  value:ts.breakdown.repeatRate+"%",  note:"Came back again"},
    {label:"Payment Consistency",value:ts.breakdown.paymentRate+"%",note:"Fully paid deliveries"},
    {label:"Total Revenue",     value:fmt(ts.breakdown.revenue),    note:"Recorded earnings"},
    {label:"Overdue Orders",    value:ts.breakdown.overdue,         note:"Reduces your score"},
  ];
  return(
    <Sheet open={open} onClose={onClose} title="Your BOSS Score">
      <div style={{fontSize:14,color:C.sub,marginBottom:20,lineHeight:1.6}}>
        Your score is built from real business activity. The more consistent you are, the higher your score — and the closer you get to credit access.
      </div>
      {rows.map(r=>(
        <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"13px 0",borderBottom:`1px solid ${C.border}`}}>
          <div><div style={{fontWeight:600,fontSize:14,color:C.text}}>{r.label}</div><div style={{fontSize:12,color:C.sub,marginTop:2}}>{r.note}</div></div>
          <div style={{fontWeight:800,fontSize:16,color:C.text}}>{r.value}</div>
        </div>
      ))}
      <div style={{marginTop:20,padding:16,background:"rgba(0,102,204,0.06)",border:`1px solid rgba(0,102,204,0.15)`,borderRadius:14,fontSize:13,color:C.sub,lineHeight:1.6}}>
        💡 Complete more orders, collect payments promptly, and keep repeat customers to grow your score.
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────
// TODAY MONEY CARD
// ─────────────────────────────────────────
export function TodayMoneyCard({customers}){
  const orders=allOrders(customers);
  const dueToday=orders.filter(o=>isDueToday(o));
  const overdue =orders.filter(o=>isOverdue(o));
  const active  =orders.filter(o=>orderStatus(o)!=="Delivered");
  const unpaid  =active.reduce((s,o)=>s+getBalance(o),0);
  const todayIncome=dueToday.reduce((s,o)=>s+getBalance(o),0);
  return(
    <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:12}}>
      {/* Dark hero card - matches reference */}
      <div style={{
        backgroundColor:C.dark,color:"#fff",
        borderRadius:24,padding:"28px 24px",
        boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
        border:"none",
      }}>
        <div style={{fontSize:12,fontWeight:700,color:"#A1A1AA",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:12}}>Expected Today</div>
        <div style={{fontSize:42,fontWeight:800,letterSpacing:"-1.5px",color:"#fff",lineHeight:1}}>{fmt(todayIncome)}</div>
        <div style={{fontSize:14,fontWeight:500,color:"#A1A1AA",marginTop:10}}>from {dueToday.length} job{dueToday.length!==1?"s":""} due today</div>
      </div>
      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{...S.card,padding:20}}>
          <div style={{fontSize:12,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Overdue</div>
          <div style={{fontSize:28,fontWeight:800,color:overdue.length?C.red:"#D4D4D8",lineHeight:1}}>{overdue.length}</div>
          <div style={{fontSize:13,fontWeight:500,color:C.sub,marginTop:4}}>jobs</div>
        </div>
        <div style={{...S.card,padding:20}}>
          <div style={{fontSize:12,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Unpaid</div>
          <div style={{fontSize:22,fontWeight:800,color:unpaid?C.accent:"#D4D4D8",letterSpacing:"-0.5px",lineHeight:1}}>{fmt(unpaid)}</div>
          <div style={{fontSize:13,fontWeight:500,color:C.sub,marginTop:4}}>outstanding</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ORDER CARD
// ─────────────────────────────────────────
export function OrderCard({order,onClick}){
  const overdue=isOverdue(order);const dueToday=isDueToday(order);
  const status=orderStatus(order);const bal=getBalance(order);
  const borderColor=overdue?"rgba(255,59,48,0.3)":dueToday?"rgba(255,159,10,0.3)":status==="Ready"?"rgba(52,199,89,0.3)":C.border;
  const badgeStyle=overdue?{background:"rgba(255,59,48,0.1)",color:C.red}:dueToday?{background:"rgba(255,159,10,0.1)",color:"#FF9F0A"}:status==="Ready"?{background:"rgba(52,199,89,0.1)",color:C.green}:status==="Delivered"?{background:"rgba(52,199,89,0.08)",color:C.green}:{background:C.s3,color:C.sub};
  const badgeText=overdue?"Overdue":dueToday?"Due Today":status;
  return(
    <div className="tap" onClick={onClick} style={{...S.card,border:`1px solid ${borderColor}`,display:"flex",flexDirection:"column",gap:7}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text}}>{order._cname||order.customerName||"—"}</div>
        <div style={{...badgeStyle,fontSize:12,fontWeight:700,padding:"4px 10px",borderRadius:20,letterSpacing:"0.2px",flexShrink:0}}>{badgeText}</div>
      </div>
      <div style={{fontSize:13,color:C.sub,fontWeight:500}}>{order.type||"—"}</div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
        <div style={{fontSize:12,color:C.muted,fontWeight:600}}>📅 {fmtDate(order.date)}</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {getPaymentState(order)==="partially_paid"&&<div style={{fontSize:12,fontWeight:700,color:"#FF9F0A",background:"rgba(255,159,10,0.1)",padding:"2px 7px",borderRadius:10}}>PARTIAL</div>}
          {bal>0?<div style={{fontSize:14,fontWeight:700,color:C.red}}>{fmt(bal)} due</div>:<div style={{fontSize:14,fontWeight:700,color:C.green}}>Paid ✓</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STATUS STEPPER
// ─────────────────────────────────────────
export function StatusStepper({status,onChange}){
  const idx=STATUSES.indexOf(status);
  return(
    <div style={{display:"flex",alignItems:"center"}}>
      {STATUSES.map((s,i)=>(
        <div key={s} style={{display:"flex",alignItems:"center",flex:i<2?1:0}}>
          <div className="tap" onClick={()=>onChange(s)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
            <div style={{width:34,height:34,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,transition:"all 0.2s",background:i<idx?C.green:i===idx?C.text:C.s3,color:i<=idx?"#fff":C.sub,border:`2px solid ${i<idx?C.green:i===idx?C.text:C.border2}`}}>
              {i<idx?"✓":i===0?"✂":i===1?"★":"🏁"}
            </div>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.3px",textTransform:"uppercase",textAlign:"center",color:i<idx?C.green:i===idx?C.text:C.sub,whiteSpace:"nowrap"}}>{s}</div>
          </div>
          {i<2&&<div style={{flex:1,height:2,margin:"-14px 4px 0",background:i<idx?C.green:C.s3,transition:"background 0.3s"}}/>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// MEASUREMENT GRID
// ─────────────────────────────────────────
export function MeasGrid({measurements,onChange}){
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {MEAS_FIELDS.map(f=>(
        <div key={f.k} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 13px"}}>
          <label style={{fontSize:12,fontWeight:600,color:C.sub,letterSpacing:"0.4px",textTransform:"uppercase"}}>{f.l}</label>
          <input type="number" inputMode="decimal" placeholder="—" value={measurements[f.k]||""} onChange={e=>onChange({...measurements,[f.k]:e.target.value})}
            style={{background:"none",border:"none",outline:"none",fontSize:20,fontWeight:700,color:C.text,width:"100%",padding:0,fontFamily:"inherit",display:"block",marginTop:2}}/>
          <div style={{fontSize:12,color:C.muted,fontWeight:600}}>inches</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// ADD ORDER FLOW
// ─────────────────────────────────────────
