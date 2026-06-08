"use client";
// src/components/boss/cards.jsx — Composite Cards
// TrustScoreCard, TrustScoreSheet, TodayMoneyCard,
// OrderCard, StatusStepper, MeasGrid
import { useState, useMemo, useEffect, useRef } from "react";
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
          <div style={{fontSize:13,fontWeight:700,color:C.sub,letterSpacing:"0.5px"}}>SCORE</div>
        </div>
      </div>
      {/* Text */}
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:4}}>BOSS Trust Score</div>
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
  const totalOrders=useMemo(()=>allOrders(customers).length,[customers]);
  const scoreColor=ts.score>=70?C.green:ts.score>=45?C.amber:C.red;

  const factors=[
    {
      icon:"✅",label:"Order Completion",weight:30,
      pct:ts.breakdown.completion,value:ts.breakdown.completion+"%",
      tip:ts.breakdown.completion<80
        ?"Mark orders as Delivered when the customer picks them up."
        :"Great — you complete most of your orders.",
    },
    {
      icon:"🔄",label:"Repeat Customers",weight:25,
      pct:ts.breakdown.repeatRate,value:ts.breakdown.repeatRate+"%",
      tip:ts.breakdown.repeatRate<50
        ?"Customers who return more than once push this score up. Send reminders."
        :"Strong — your clients keep coming back.",
    },
    {
      icon:"💰",label:"Payment Collection",weight:25,
      pct:ts.breakdown.paymentRate,value:ts.breakdown.paymentRate+"%",
      tip:ts.breakdown.paymentRate<70
        ?"Record all payments, including cash. Uncollected balances lower this."
        :"Good payment discipline. Lenders pay attention to this.",
    },
    {
      icon:"📈",label:"Revenue Signal",weight:20,
      pct:Math.min(100,Math.round((ts.breakdown.revenue/50000)*100)),
      value:fmt(ts.breakdown.revenue),
      tip:ts.breakdown.revenue<20000
        ?"Add more orders with amounts to build your revenue history."
        :"Solid revenue on record. Keep adding orders.",
    },
  ];

  return(
    <Sheet open={open} onClose={onClose} title="Your BOSS Score">
      {/* Score hero */}
      <div style={{display:"flex",alignItems:"center",gap:16,background:C.dark,borderRadius:20,padding:"20px",marginBottom:20}}>
        <div style={{width:68,height:68,borderRadius:20,
          background:`rgba(${ts.score>=70?"52,199,89":ts.score>=45?"255,159,10":"255,59,48"},0.15)`,
          border:`2px solid ${scoreColor}`,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <div style={{fontSize:26,fontWeight:900,color:scoreColor,lineHeight:1}}>{ts.score}</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase"}}>SCORE</div>
        </div>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:"-0.5px"}}>{ts.level} Business</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:3}}>
            Credit Readiness: <span style={{color:scoreColor,fontWeight:700}}>{ts.readiness}</span>
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.3)",marginTop:2}}>{totalOrders} order{totalOrders!==1?"s":""} recorded</div>
        </div>
      </div>

      <div style={{fontSize:13,color:C.sub,marginBottom:16,lineHeight:1.6,padding:"0 2px"}}>
        Your score is built from real activity — no guessing. Every order, payment, and returning customer improves it. Lenders and partners use this to understand how trustworthy your business is.
      </div>

      {/* Factor breakdown */}
      <div style={{fontSize:13,fontWeight:800,color:C.sub,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:10}}>Score Breakdown</div>
      {factors.map(f=>{
        const bar=Math.min(100,Math.max(0,f.pct));
        return(
          <div key={f.label} style={{marginBottom:12,background:C.s2,borderRadius:16,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>{f.icon}</span>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{f.label}</div>
                  <div style={{fontSize:13,color:C.sub}}>Weight: {f.weight}% of score</div>
                </div>
              </div>
              <div style={{fontSize:15,fontWeight:900,color:C.text}}>{f.value}</div>
            </div>
            <div style={{height:6,background:C.s3,borderRadius:4,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${bar}%`,borderRadius:4,
                background:bar>=70?C.green:bar>=45?C.amber:C.red,
                transition:"width 0.4s ease"}}/>
            </div>
            <div style={{fontSize:13,color:C.sub,lineHeight:1.5}}>{f.tip}</div>
          </div>
        );
      })}

      {/* Overdue penalty */}
      {ts.breakdown.overdue>0&&(
        <div style={{background:"rgba(255,59,48,0.06)",border:"1px solid rgba(255,59,48,0.2)",borderRadius:14,padding:"12px 14px",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:4}}>⚠️ Overdue Orders: {ts.breakdown.overdue}</div>
          <div style={{fontSize:13,color:C.sub,lineHeight:1.5}}>Each overdue order deducts points. Update their delivery dates or mark as Delivered to remove the penalty.</div>
        </div>
      )}

      {/* How to improve */}
      <div style={{background:"rgba(0,102,204,0.06)",border:"1px solid rgba(0,102,204,0.15)",borderRadius:14,padding:"14px 16px"}}>
        <div style={{fontSize:13,fontWeight:700,color:C.accent,marginBottom:8}}>💡 How to grow your score</div>
        {[
          "Complete and deliver every order on time",
          "Record all payments including cash installments",
          "Send WhatsApp reminders for unpaid balances",
          "Build repeat customers — they count more than new ones",
        ].map(t=>(
          <div key={t} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:"rgba(0,102,204,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:C.accent,flexShrink:0,marginTop:1}}>✓</div>
            <div style={{fontSize:13,color:C.sub,lineHeight:1.5}}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:12,fontSize:13,color:C.muted,lineHeight:1.6}}>
        BOSS Score is an internal signal only and is not a regulated credit score. Consult a financial advisor for lending decisions.
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
    <div style={{padding:"0 20px",...S.col,gap:12}}>
      {/* Dark hero card - matches reference */}
      <div style={TODAY_HERO}>
        <div style={{fontSize:13,fontWeight:700,color:"#A1A1AA",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:12}}>Expected Today</div>
        <div style={{fontSize:42,fontWeight:800,letterSpacing:"-1.5px",color:"#fff",lineHeight:1}}>{fmt(todayIncome)}</div>
        <div style={{fontSize:14,fontWeight:500,color:"#A1A1AA",marginTop:10}}>from {dueToday.length} job{dueToday.length!==1?"s":""} due today</div>
      </div>
      {/* Stats grid */}
      <div style={TODAY_GRID}>
        <div style={{...S.card,padding:20}}>
          <div style={STAT_LABEL}>Overdue</div>
          <div style={{...STAT_NUMBER,color:overdue.length?C.red:"#D4D4D8"}}>{overdue.length}</div>
          <div style={STAT_SUB}>jobs</div>
        </div>
        <div style={{...S.card,padding:20}}>
          <div style={STAT_LABEL}>Unpaid</div>
          <div style={{fontSize:22,fontWeight:800,color:unpaid?C.accent:"#D4D4D8",letterSpacing:"-0.5px",lineHeight:1}}>{fmt(unpaid)}</div>
          <div style={STAT_SUB}>outstanding</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ORDER CARD
// ─────────────────────────────────────────
// ── Static style objects ─────────────────────────────────────────────
const ORDER_IMG = {width:80,height:80,borderRadius:12,objectFit:"cover",flexShrink:0,background:C.s3};
const ORDER_PLACEHOLDER = {width:80,height:80,borderRadius:12,background:C.s3,flexShrink:0,...S.flexCenter,fontSize:24};
const ORDER_BODY = {flex:1,...S.col,gap:7};
const ORDER_ROW = {...S.rowBetween,gap:8};
const ORDER_META = {...S.rowBetween,marginTop:4};
const ORDER_BALANCE = {fontSize:14,fontWeight:700};
const BADGE_BASE = {fontSize:13,fontWeight:700,padding:"4px 10px",borderRadius:20,letterSpacing:"0.2px",flexShrink:0};
const PARTIAL_BADGE = {fontSize:13,fontWeight:700,color:"#FF9F0A",background:"rgba(255,159,10,0.1)",padding:"2px 7px",borderRadius:10};
const TODAY_HERO = {backgroundColor:C.dark,color:"#fff",borderRadius:24,padding:"28px 24px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",border:"none"};
const TODAY_GRID = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12};
const STAT_LABEL = {fontSize:13,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8};
const STAT_NUMBER = {fontSize:28,fontWeight:800,lineHeight:1};
const STAT_SUB = {fontSize:13,fontWeight:500,color:C.sub,marginTop:4};

export function OrderCard({order,onClick}){
  const overdue=isOverdue(order);const dueToday=isDueToday(order);
  const status=orderStatus(order);const bal=getBalance(order);
  const borderColor=overdue?"rgba(255,59,48,0.3)":dueToday?"rgba(255,159,10,0.3)":status==="Ready"?"rgba(52,199,89,0.3)":C.border;
  const badgeStyle=overdue?{background:"rgba(255,59,48,0.1)",color:C.red}:dueToday?{background:"rgba(255,159,10,0.1)",color:"#FF9F0A"}:status==="Ready"?{background:"rgba(52,199,89,0.1)",color:C.green}:status==="Delivered"?{background:"rgba(52,199,89,0.08)",color:C.green}:{background:C.s3,color:C.sub};
  const badgeText=overdue?"Overdue":dueToday?"Due Today":status;
  const imgUrl=order.imageUrls?.[0];
  return(
    <div className="tap" onClick={onClick} style={{...S.card,border:`1px solid ${borderColor}`,...S.row}}>
      {imgUrl?(
        <img src={imgUrl} alt="" style={ORDER_IMG}/>
      ):(
        <div style={ORDER_PLACEHOLDER}>✂️</div>
      )}
      <div style={ORDER_BODY}>
        <div style={ORDER_ROW}>
          <div style={{fontSize:16,fontWeight:700,color:C.text}}>{order._cname||order.customerName||"—"}</div>
          <div style={{...badgeStyle,...BADGE_BASE}}>{badgeText}</div>
        </div>
        <div style={{fontSize:13,color:C.sub,fontWeight:500}}>{order.type||"—"}</div>
        <div style={ORDER_META}>
          <div style={{fontSize:13,color:C.muted,fontWeight:600}}>📅 {fmtDate(order.date)}</div>
          <div style={S.row}>
            {getPaymentState(order)==="partially_paid"&&<div style={PARTIAL_BADGE}>PARTIAL</div>}
            {bal>0?<div style={{...ORDER_BALANCE,color:C.red}}>{fmt(bal)} due</div>:<div style={{...ORDER_BALANCE,color:C.green}}>Paid ✓</div>}
          </div>
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
            <div style={{fontSize:13,fontWeight:700,letterSpacing:"0.3px",textTransform:"uppercase",textAlign:"center",color:i<idx?C.green:i===idx?C.text:C.sub,whiteSpace:"nowrap"}}>{s}</div>
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
  // Debounce: hold local state, fire onChange only 500ms after last keystroke.
  // Prevents a targeted db.updateCustomer() call on every character typed.
  const[local,setLocal]=useState(measurements);
  const timerRef=useRef(null);
  useEffect(()=>{setLocal(measurements);},[measurements]);
  useEffect(()=>()=>clearTimeout(timerRef.current),[]);
  function handleChange(k,v){
    const next={...local,[k]:v};
    setLocal(next);
    clearTimeout(timerRef.current);
    timerRef.current=setTimeout(()=>onChange(next),500);
  }
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {MEAS_FIELDS.map(f=>(
        <div key={f.k} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 13px"}}>
          <label style={{fontSize:13,fontWeight:600,color:C.sub,letterSpacing:"0.4px",textTransform:"uppercase"}}>{f.l}</label>
          <input type="number" inputMode="decimal" placeholder="—" value={local[f.k]||""} onChange={e=>handleChange(f.k,e.target.value)}
            style={{background:"none",border:"none",outline:"none",fontSize:20,fontWeight:700,color:C.text,width:"100%",padding:0,fontFamily:"inherit",display:"block",marginTop:2}}/>
          <div style={{fontSize:13,color:C.muted,fontWeight:600}}>inches</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// ADD ORDER FLOW
// ─────────────────────────────────────────
