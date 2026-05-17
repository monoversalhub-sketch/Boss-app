"use client";
// src/components/BOSSApp.jsx
// ─────────────────────────────────────────────────────────────────
//  BOSS v13 — Full production app
//  Based on boss-v12.jsx with:
//    • Supabase data layer (via src/lib/db.js)
//    • Paystack payment collection
//    • Phone-OTP auth screen
//    • Finance / Expenses tab
//    • Earnings summary
//    • Improved UI polish
// ─────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../lib/db";
import { openPaystackPopup } from "../lib/paystack";

// ─────────────────────────────────────────
// APP URL — builds public invoice links
// ─────────────────────────────────────────
const APP_URL =
  (typeof process !== "undefined" &&
   process.env?.NEXT_PUBLIC_APP_URL &&
   process.env.NEXT_PUBLIC_APP_URL !== "undefined"
    ? process.env.NEXT_PUBLIC_APP_URL
    : null) ||
  (typeof window !== "undefined" ? window.location.origin : "https://boss-app-nine.vercel.app");

function invoiceUrl(orderId) {
  const base = APP_URL.replace(/\/+$/, ""); // strip trailing slashes
  return `${base}/invoice/${orderId}`;
}

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const CLOTH_TYPES = [
  "Senator","Kaftan","Agbada","Gown","Buba & Skirt",
  "Suit","Dress","Trousers & Shirt","Ankara Set","Jalabiya","Other",
];
const MEAS_FIELDS = [
  { k:"chest",    l:"Chest"    },{ k:"waist",   l:"Waist"   },
  { k:"hip",      l:"Hip"      },{ k:"shoulder",l:"Shoulder"},
  { k:"sleeve",   l:"Sleeve"   },{ k:"inseam",  l:"Inseam"  },
  { k:"length",   l:"Length"   },{ k:"neck",    l:"Neck"    },
];
const STATUSES = ["In Progress","Ready","Delivered"];

// ─────────────────────────────────────────
// DESIGN TOKENS — Reference design (soft, clean, human)
// ─────────────────────────────────────────
const C = {
  bg:"#F5F5F7", s1:"#FFFFFF", s2:"#F4F4F5", s3:"#E4E4E7", s4:"#D4D4D8",
  accent:"#0066CC",
  gold:"#0066CC", goldDim:"rgba(0,102,204,0.08)", goldGlow:"rgba(0,102,204,0.18)",
  red:"#FF3B30",  redDim:"rgba(255,59,48,0.08)",
  green:"#34C759",greenDim:"rgba(52,199,89,0.08)",
  text:"#111111", sub:"#8E8E93", muted:"#A1A1AA", subLight:"#A1A1AA",
  border:"#E5E5EA", border2:"#E4E4E7",
  dark:"#1A1A1A",
};
const S = {
  card: {
    backgroundColor:C.s1,
    borderRadius:20,
    padding:20,
    boxShadow:"0 4px 12px rgba(0,0,0,0.03)",
    border:"1px solid #E5E5EA",
    boxSizing:"border-box",
  },
  input: {
    width:"100%",
    padding:"16px",
    backgroundColor:"#F4F4F5",
    border:"1px solid #E4E4E7",
    borderRadius:12,
    fontSize:15,
    fontWeight:500,
    color:C.text,
    outline:"none",
    WebkitAppearance:"none",
    fontFamily:"inherit",
    boxSizing:"border-box",
  },
  label: {
    fontSize:12,
    fontWeight:700,
    color:"#A1A1AA",
    display:"block",
    marginBottom:8,
    letterSpacing:"0.2px",
  },
  btn: {
    width:"100%",
    padding:"16px",
    borderRadius:12,
    fontSize:15,
    fontWeight:700,
    border:"none",
    cursor:"pointer",
    letterSpacing:"-0.1px",
    transition:"transform 0.12s,opacity 0.12s",
    fontFamily:"inherit",
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    gap:8,
  },
};

// ─────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  @keyframes bossIn  { from{opacity:0;transform:scale(0.5) rotate(-6deg)} to{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes fillBar { from{width:0} to{width:100%} }
  @keyframes pulse   { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.05)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:none} }
  @keyframes toast   { 0%{opacity:0;transform:translateX(-50%) translateY(6px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0;transform:translateX(-50%) translateY(6px)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

  html,body{height:100%;width:100%;margin:0;padding:0;overflow:hidden;background:#F5F5F7;-webkit-text-size-adjust:100%}
  /* Viewport height fix for Chrome Android — 100svh can fail on some builds */
  html{height:-webkit-fill-available}
  #__next,#boss-root{height:100%;min-height:-webkit-fill-available;display:flex;flex-direction:column;overflow:hidden}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
  ::-webkit-scrollbar{width:0}
  input,select,textarea,button{font-family:'Plus Jakarta Sans',sans-serif}
  body{font-family:'Plus Jakarta Sans',sans-serif;background:#F5F5F7;color:#1C1C1E}

  .anim-boss  {animation:bossIn  0.6s cubic-bezier(0.34,1.56,0.64,1) both}
  .anim-up1   {animation:fadeUp  0.5s 0.3s both;opacity:0}
  .anim-up2   {animation:fadeUp  0.5s 0.5s both;opacity:0}
  .anim-up3   {animation:fadeUp  0.5s 0.7s both;opacity:0}
  .anim-fill  {animation:fillBar 2.2s 0.8s ease-in-out forwards}
  .anim-slide {animation:slideUp 0.35s cubic-bezier(0.32,0.72,0,1) both}
  .anim-toast {animation:toast   3s ease forwards}
  .scrollable {overflow-y:auto;-webkit-overflow-scrolling:touch;height:100%}
  .tap{transition:transform 0.12s,opacity 0.12s;cursor:pointer}
  .tap:active{transform:scale(0.97);opacity:0.9}

  .pill-active{background:#1C1C1E!important;color:#fff!important}
  .pill-inactive{background:#EBEBEB!important;color:#8E8E93!important}
`;
function GlobalStyles(){
  useEffect(()=>{
    const el=document.createElement("style");el.textContent=GLOBAL_CSS;
    document.head.appendChild(el);return()=>document.head.removeChild(el);
  },[]);return null;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const uid  = ()=>"b"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fmt  = (n)=>"₦"+(Number(n)||0).toLocaleString("en-NG");
const today= ()=>new Date().toISOString().slice(0,10);

function fmtDate(d){
  if(!d)return"—";
  return new Date(d+"T00:00:00").toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});
}
function getBalance(order){
  return Math.max(0,(parseFloat(order.price)||0)-(parseFloat(order.deposit)||0)-(parseFloat(order.paid)||0));
}
function orderStatus(o){return o.status||"In Progress";}
function isOverdue(o){if(!o.date||orderStatus(o)==="Delivered")return false;return o.date<today();}
function isDueToday(o){if(!o.date||orderStatus(o)==="Delivered")return false;return o.date===today();}
function allOrders(customers){
  if(!customers||!Array.isArray(customers))return[];
  return customers.flatMap(c=>(c.orders||[]).map(o=>({...o,_cname:c.name,_cphone:c.phone,_cid:c.id})));
}
function waLink(phone,msg){
  const p=(phone||"").replace(/\D/g,"");
  const num=p.startsWith("0")?"234"+p.slice(1):p.startsWith("234")?p:"234"+p;
  return`https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}
function buildReceiptText(order,customer,shopName,includeLink=true){
  const paid=(parseFloat(order.deposit)||0)+(parseFloat(order.paid)||0);
  const bal=getBalance(order);
  const link=includeLink&&order.id?invoiceUrl(order.id):null;
  return[
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🧵 *${shopName}*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Customer: *${customer.name}*`,
    `Item: ${order.type||"Order"}`,
    `Delivery: ${fmtDate(order.date||order.delivery_date)}`,
    ``,
    `Total Price:  *${fmt(order.price)}*`,
    `Amount Paid:  ${fmt(paid)}`,
    `Balance Due:  *${fmt(bal)}*`,
    ``,
    `Status: ${orderStatus(order)}`,
    order.notes?`Notes: ${order.notes}`:"",
    ``,
    ...(link&&bal>0?[
      `━━━━━━━━━━━━━━━━━━━━━`,
      `💳 *Pay your balance online:*`,
      link,
    ]:[]),
    `━━━━━━━━━━━━━━━━━━━━━`,
    `_Powered by BOSS — Build Trust. Grow Faster._`,
    `━━━━━━━━━━━━━━━━━━━━━`,
  ].filter(l=>l!==undefined&&l!=="").join("\n");
}

function buildInvoiceLinkMsg(order,customer,shopName){
  const bal=getBalance(order);
  const link=invoiceUrl(order.id);
  return[
    `Hello *${customer.name}*! 👋`,
    ``,
    `Here is your invoice from *${shopName}*:`,
    ``,
    `📋 Item: ${order.type||"Order"}`,
    `💰 Total: *${fmt(order.price)}*`,
    `✅ Paid: ${fmt((parseFloat(order.deposit)||0)+(parseFloat(order.paid)||0))}`,
    `🔴 Balance: *${fmt(bal)}*`,
    ``,
    ...(bal>0?[`Tap the link to view your invoice and pay your balance securely:`]:[`Your order is *fully paid*! Thank you 🙏`]),
    ...(bal>0?[link]:[]),
    ``,
    `_${shopName} · Powered by BOSS_`,
  ].filter(l=>l!==undefined).join("\n");
}

function buildReminderMsg(order,customer,shopName){
  const bal=getBalance(order);
  const link=invoiceUrl(order.id);
  return[
    `Hello *${customer.name}*, 👋`,
    ``,
    `This is a friendly reminder from *${shopName}*.`,
    ``,
    `Your *${order.type||"order"}* is ready and your balance of *${fmt(bal)}* is outstanding.`,
    ``,
    `You can pay securely online here:`,
    link,
    ``,
    `Or pay at the shop. Thank you! 🙏`,
    `_${shopName} · Powered by BOSS_`,
  ].filter(l=>l!==undefined).join("\n");
}

// ─────────────────────────────────────────
// TRUST SCORE ENGINE
// ─────────────────────────────────────────
function computeTrustScore(customers){
  const orders=allOrders(customers);
  if(!orders.length)return{score:0,level:"New",readiness:"Low",breakdown:{}};
  const total        =orders.length;
  const delivered    =orders.filter(o=>orderStatus(o)==="Delivered").length;
  const completionRate=total>0?delivered/total:0;
  const repeatCustomers=customers.filter(c=>(c.orders||[]).length>1).length;
  const repeatRate   =customers.length>0?repeatCustomers/customers.length:0;
  const paidOrders   =orders.filter(o=>getBalance(o)===0&&orderStatus(o)==="Delivered");
  const paymentRate  =delivered>0?paidOrders.length/delivered:0;
  const revenue      =orders.reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0);
  const avgOrder     =total>0?revenue/total:0;
  const revenueScore =Math.min(1,avgOrder/50000);
  const overdue      =orders.filter(o=>isOverdue(o)).length;
  const disputePenalty=Math.min(0.3,overdue*0.05);
  const raw=(completionRate*30+repeatRate*25+paymentRate*25+revenueScore*20)-(disputePenalty*100);
  const score=Math.max(0,Math.min(100,Math.round(raw)));
  const level=score>=75?"Trusted":score>=50?"Growing":score>=25?"Building":"New";
  const readiness=score>=70?"High":score>=45?"Medium":"Low";
  return{score,level,readiness,breakdown:{completion:Math.round(completionRate*100),repeatRate:Math.round(repeatRate*100),paymentRate:Math.round(paymentRate*100),revenue,overdue}};
}

// ─────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────
function Btn({children,variant="primary",onClick,style={},disabled}){
  const variants={
    primary:  {backgroundColor:C.dark,  color:"#fff"},
    secondary:{backgroundColor:C.s3,   color:C.text, border:`1px solid ${C.border2}`},
    danger:   {backgroundColor:C.redDim,color:C.red,  border:`1px solid rgba(255,59,48,0.18)`},
    green:    {backgroundColor:C.green, color:"#fff"},
    ghost:    {backgroundColor:"transparent",color:C.sub, fontSize:14, padding:"11px 16px"},
    wa:       {backgroundColor:"#25D366",color:"#fff"},
    outline:  {backgroundColor:C.s2,   color:C.text, border:`1px solid ${C.border2}`},
    accent:   {backgroundColor:C.accent,color:"#fff"},
  };
  return(
    <button className="tap" onClick={onClick} disabled={disabled}
      style={{...S.btn,...variants[variant],opacity:disabled?0.5:1,...style}}>
      {children}
    </button>
  );
}
function Input({label,...props}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",boxSizing:"border-box"}}>
      {label&&<label style={S.label}>{label}</label>}
      <input style={{...S.input}} {...props}/>
    </div>
  );
}
function Select({label,options,...props}){
  return(
    <div style={{display:"flex",flexDirection:"column"}}>
      {label&&<label style={S.label}>{label}</label>}
      <select style={{...S.input,color:C.text,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%23888'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center",paddingRight:36}} {...props}>
        {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
      </select>
    </div>
  );
}
function Textarea({label,...props}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",boxSizing:"border-box"}}>
      {label&&<label style={S.label}>{label}</label>}
      <textarea style={{...S.input,minHeight:80,resize:"none",lineHeight:1.5}} {...props}/>
    </div>
  );
}
function SectionLabel({children,style={}}){
  return<div style={{fontSize:12,fontWeight:700,color:C.muted,letterSpacing:"0.8px",textTransform:"uppercase",padding:"0 20px",marginTop:28,marginBottom:12,...style}}>{children}</div>;
}
function EmptyState({icon,title,sub}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"56px 32px",textAlign:"center",gap:12}}>
      <div style={{fontSize:52,opacity:0.35}}>{icon}</div>
      <div style={{fontSize:16,fontWeight:800,color:C.sub}}>{title}</div>
      {sub&&<div style={{fontSize:13,fontWeight:500,color:C.muted,lineHeight:1.6,maxWidth:240}}>{sub}</div>}
    </div>
  );
}
function Toast({msg}){
  if(!msg)return null;
  return<div className="anim-toast" style={{position:"fixed",bottom:120,left:"50%",transform:"translateX(-50%)",backgroundColor:C.dark,color:"#fff",fontWeight:700,fontSize:14,padding:"13px 24px",borderRadius:40,zIndex:9999,whiteSpace:"nowrap",maxWidth:"calc(100% - 48px)",textAlign:"center",pointerEvents:"none",boxShadow:"0 8px 32px rgba(0,0,0,0.25)"}}>{msg}</div>;
}
function Sheet({open,onClose,title,children}){
  if(!open)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,backgroundColor:"rgba(0,0,0,0.4)",backdropFilter:"blur(6px)"}}/>
      <div className="anim-slide" style={{position:"relative",zIndex:1,backgroundColor:C.s1,borderRadius:"32px 32px 0 0",padding:"8px 24px 48px",width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 -8px 48px rgba(0,0,0,0.14)"}}>
        <div style={{width:36,height:4,backgroundColor:C.s3,borderRadius:4,margin:"12px auto 20px"}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div style={{fontSize:20,fontWeight:800,letterSpacing:"-0.5px",color:C.text}}>{title}</div>
          <button className="tap" onClick={onClose} style={{backgroundColor:C.s2,border:"none",borderRadius:"50%",width:34,height:34,fontSize:16,color:C.sub,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Flow({open,onClose,title,action,onAction,children}){
  if(!open)return null;
  return(
    <div style={{position:"fixed",inset:0,backgroundColor:C.bg,zIndex:300,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{height:64,display:"flex",alignItems:"center",padding:"0 20px",gap:14,flexShrink:0,borderBottom:`1px solid ${C.border}`,backgroundColor:C.s1}}>
        <button className="tap" onClick={onClose} style={{width:38,height:38,backgroundColor:C.s2,border:"none",borderRadius:12,fontSize:18,cursor:"pointer",color:C.text,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
        <div style={{flex:1,fontSize:17,fontWeight:800,letterSpacing:"-0.3px",color:C.text}}>{title}</div>
        {action&&<button className="tap" onClick={onAction} style={{backgroundColor:"transparent",border:"none",color:C.accent,fontSize:15,fontWeight:700,cursor:"pointer",padding:"8px 0"}}>{action}</button>}
      </div>
      <div className="scrollable" style={{flex:1,padding:"20px 20px",display:"flex",flexDirection:"column",gap:16,backgroundColor:C.bg}}>
        {children}<div style={{height:40}}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TRUST SCORE CARD + SHEET
// ─────────────────────────────────────────
function TrustScoreCard({customers,onPress}){
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
          <div style={{fontSize:8,fontWeight:700,color:C.sub,letterSpacing:"0.5px"}}>SCORE</div>
        </div>
      </div>
      {/* Text */}
      <div style={{flex:1}}>
        <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>BOSS Trust Score</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div style={{fontSize:22,fontWeight:800,color:C.text,letterSpacing:"-0.5px"}}>{ts.level}</div>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div style={{fontSize:13,fontWeight:500,color:C.sub}}>Credit Readiness: <span style={{color:pct>=70?C.green:pct>=45?"#FF9F0A":C.red,fontWeight:700}}>{ts.readiness}</span></div>
      </div>
    </div>
  );
}
function TrustScoreSheet({customers,open,onClose}){
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
function TodayMoneyCard({customers}){
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
        <div style={{fontSize:10,fontWeight:800,color:"#A1A1AA",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Expected Today</div>
        <div style={{fontSize:42,fontWeight:800,letterSpacing:"-1.5px",color:"#fff",lineHeight:1}}>{fmt(todayIncome)}</div>
        <div style={{fontSize:14,fontWeight:500,color:"#A1A1AA",marginTop:10}}>from {dueToday.length} job{dueToday.length!==1?"s":""} due today</div>
      </div>
      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{...S.card,padding:20}}>
          <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Overdue</div>
          <div style={{fontSize:28,fontWeight:800,color:overdue.length?C.red:"#D4D4D8",lineHeight:1}}>{overdue.length}</div>
          <div style={{fontSize:13,fontWeight:500,color:C.sub,marginTop:4}}>jobs</div>
        </div>
        <div style={{...S.card,padding:20}}>
          <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Unpaid</div>
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
function OrderCard({order,onClick}){
  const overdue=isOverdue(order);const dueToday=isDueToday(order);
  const status=orderStatus(order);const bal=getBalance(order);
  const borderColor=overdue?"rgba(255,59,48,0.3)":dueToday?"rgba(255,159,10,0.3)":status==="Ready"?"rgba(52,199,89,0.3)":C.border;
  const badgeStyle=overdue?{background:"rgba(255,59,48,0.1)",color:C.red}:dueToday?{background:"rgba(255,159,10,0.1)",color:"#FF9F0A"}:status==="Ready"?{background:"rgba(52,199,89,0.1)",color:C.green}:status==="Delivered"?{background:"rgba(52,199,89,0.08)",color:C.green}:{background:C.s3,color:C.sub};
  const badgeText=overdue?"Overdue":dueToday?"Due Today":status;
  return(
    <div className="tap" onClick={onClick} style={{...S.card,border:`1px solid ${borderColor}`,display:"flex",flexDirection:"column",gap:7}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text}}>{order._cname||order.customerName||"—"}</div>
        <div style={{...badgeStyle,fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,letterSpacing:"0.2px",flexShrink:0}}>{badgeText}</div>
      </div>
      <div style={{fontSize:13,color:C.sub,fontWeight:500}}>{order.type||"—"}</div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
        <div style={{fontSize:12,color:C.muted,fontWeight:600}}>📅 {fmtDate(order.date)}</div>
        {bal>0?<div style={{fontSize:14,fontWeight:700,color:C.red}}>{fmt(bal)} due</div>:<div style={{fontSize:14,fontWeight:700,color:C.green}}>Paid ✓</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STATUS STEPPER
// ─────────────────────────────────────────
function StatusStepper({status,onChange}){
  const idx=STATUSES.indexOf(status);
  return(
    <div style={{display:"flex",alignItems:"center"}}>
      {STATUSES.map((s,i)=>(
        <div key={s} style={{display:"flex",alignItems:"center",flex:i<2?1:0}}>
          <div className="tap" onClick={()=>onChange(s)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
            <div style={{width:34,height:34,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,transition:"all 0.2s",background:i<idx?C.green:i===idx?C.text:C.s3,color:i<=idx?"#fff":C.sub,border:`2px solid ${i<idx?C.green:i===idx?C.text:C.border2}`}}>
              {i<idx?"✓":i===0?"✂":i===1?"★":"🏁"}
            </div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.3px",textTransform:"uppercase",textAlign:"center",color:i<idx?C.green:i===idx?C.text:C.sub,whiteSpace:"nowrap"}}>{s}</div>
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
function MeasGrid({measurements,onChange}){
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {MEAS_FIELDS.map(f=>(
        <div key={f.k} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 13px"}}>
          <label style={{fontSize:10,fontWeight:600,color:C.sub,letterSpacing:"0.5px",textTransform:"uppercase"}}>{f.l}</label>
          <input type="number" inputMode="decimal" placeholder="—" value={measurements[f.k]||""} onChange={e=>onChange({...measurements,[f.k]:e.target.value})}
            style={{background:"none",border:"none",outline:"none",fontSize:20,fontWeight:700,color:C.text,width:"100%",padding:0,fontFamily:"inherit",display:"block",marginTop:2}}/>
          <div style={{fontSize:10,color:C.muted,fontWeight:600}}>inches</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// ADD ORDER FLOW
// ─────────────────────────────────────────
function AddOrderFlow({open,onClose,customers,setCustomers,prefilledCid,toast}){
  const pre=customers.find(c=>c.id===prefilledCid);
  const[name,setName]=useState(pre?.name||"");const[phone,setPhone]=useState(pre?.phone||"");
  const[type,setType]=useState("");const[price,setPrice]=useState("");
  const[deposit,setDeposit]=useState("");const[date,setDate]=useState("");
  const[notes,setNotes]=useState("");const[matches,setMatches]=useState([]);
  const[showCalc,setShowCalc]=useState(false);
  useEffect(()=>{
    if(open){const p=customers.find(c=>c.id===prefilledCid);
      setName(p?.name||"");setPhone(p?.phone||"");setType("");setPrice("");setDeposit("");setDate("");setNotes("");setMatches([]);setShowCalc(false);}
  },[open,prefilledCid]);
  function onNameChange(v){setName(v);if(v.length<2){setMatches([]);return;}setMatches(customers.filter(c=>c.name.toLowerCase().includes(v.toLowerCase())).slice(0,4));}
  function pickExisting(c){setName(c.name);setPhone(c.phone||"");setMatches([]);}
  async function save(){
    if(!name.trim()){toast("⚠️ Enter customer name");return;}if(!date){toast("⚠️ Set a delivery date");return;}
    const order={id:uid(),type,price:parseFloat(price)||0,deposit:parseFloat(deposit)||0,paid:0,date,notes,status:"In Progress",createdAt:new Date().toISOString()};
    const next=[...customers];
    let cust=next.find(c=>c.id===prefilledCid)||next.find(c=>c.name.toLowerCase()===name.trim().toLowerCase());
    if(!cust){cust={id:uid(),name:name.trim(),phone:phone.trim(),measurements:{},orders:[]};next.push(cust);}
    else{if(phone.trim())cust.phone=phone.trim();}
    cust.orders=[...(cust.orders||[]),order];
    setCustomers(next);await db.setCustomers(next);onClose();toast("✅ Order saved!");
  }
  return(
    <Flow open={open} onClose={onClose} title="New Order" action="Save" onAction={save}>
      <div style={{position:"relative"}}>
        <Input label="Search or Add Client *" value={name} onChange={e=>onNameChange(e.target.value)} placeholder="Type client name to search…" autoComplete="off" autoFocus/>
        {name.length>=1&&matches.length===0&&customers.length>0&&(
          <div style={{fontSize:12,color:C.sub,padding:"6px 4px"}}>No match — a new client will be created</div>
        )}
      </div>
      {matches.length>0&&(
        <div style={{background:C.s1,border:`1px solid ${C.border2}`,borderRadius:14,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <div style={{padding:"8px 14px 4px",fontSize:10,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.5px"}}>Existing Clients</div>
          {matches.map(cl=>(
            <div key={cl.id} className="tap" onClick={()=>pickExisting(cl)}
              style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:C.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:C.text,flexShrink:0}}>{cl.name[0].toUpperCase()}</div>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.text}}>{cl.name}</div>
                <div style={{fontSize:12,color:C.sub,marginTop:1}}>{cl.phone||"No phone"} · {(cl.orders||[]).length} order{(cl.orders||[]).length!==1?"s":""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Input label="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="080XXXXXXXX"/>
      <Select label="Cloth Type / Style" value={type} onChange={e=>setType(e.target.value)} options={[{value:"",label:"Select type…"},...CLOTH_TYPES]}/>

      {/* Price row + Smart Calculator toggle */}
      <div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Total Price (₦)" value={price} onChange={e=>setPrice(e.target.value)} type="number" inputMode="numeric" placeholder="0"/>
          <Input label="Deposit Paid (₦)" value={deposit} onChange={e=>setDeposit(e.target.value)} type="number" inputMode="numeric" placeholder="0"/>
        </div>
        <button className="tap" onClick={()=>setShowCalc(v=>!v)} style={{marginTop:8,background:showCalc?"rgba(0,102,204,0.1)":C.s3,border:`1px solid ${showCalc?"rgba(0,102,204,0.3)":C.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:700,color:showCalc?C.accent:C.sub,cursor:"pointer",width:"100%",fontFamily:"inherit"}}>
          {showCalc?"▲ Close Calculator":"🧮 Use Smart Pricing Calculator"}
        </button>
        {showCalc&&(
          <div style={{marginTop:10,background:C.s2,borderRadius:16,padding:16}}>
            <SmartPricingCalculator onUsePrice={p=>{setPrice(String(Math.round(p)));setShowCalc(false);toast(`✅ Price set to ${fmt(p)}`);}}/>
          </div>
        )}
      </div>

      <Input label="Delivery Date *" value={date} onChange={e=>setDate(e.target.value)} type="date"/>
      <Textarea label="Notes" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Style details, fabric colour, special requests…"/>
    </Flow>
  );
}

// ─────────────────────────────────────────
// ORDER DETAIL FLOW  (with Paystack)
// ─────────────────────────────────────────
function OrderDetailFlow({open,onClose,orderId,customers,setCustomers,toast,tailor}){
  const[payAmt,setPayAmt]=useState("");
  const found=(()=>{for(const c of customers){const o=(c.orders||[]).find(x=>x.id===orderId);if(o)return{order:o,customer:c};}return null;})();
  if(!found)return null;
  const{order,customer}=found;
  const bal=getBalance(order);const paid=(parseFloat(order.deposit)||0)+(parseFloat(order.paid)||0);
  const shop=tailor?.shop||"BOSS Shop";
  async function updateOrder(patch){
    const next=customers.map(c=>({...c,orders:(c.orders||[]).map(o=>o.id===orderId?{...o,...patch}:o)}));
    setCustomers(next);await db.setCustomers(next);
  }
  async function updateMeas(meas){
    const next=customers.map(c=>c.id===customer.id?{...c,measurements:meas}:c);
    setCustomers(next);await db.setCustomers(next);
  }
  async function recordPay(){
    const amt=parseFloat(payAmt);if(!amt||amt<=0){toast("⚠️ Enter an amount");return;}
    await updateOrder({paid:(parseFloat(order.paid)||0)+amt});setPayAmt("");toast("✅ Payment recorded");
  }
  async function deleteOrder(){
    const next=customers.map(c=>({...c,orders:(c.orders||[]).filter(o=>o.id!==orderId)}));
    setCustomers(next);await db.setCustomers(next);onClose();toast("Order deleted");
  }
  function waMsg(msg){window.open(waLink(customer.phone,msg),"_blank");}
  function waReady(){waMsg(`Hello *${customer.name}*, your *${order.type||"order"}* is *READY* for pickup at *${shop}*! 🎉 Please come collect it at your earliest convenience. Thank you! 🙏`);}
  function waReminder(){waMsg(buildReminderMsg(order,customer,shop));}
  function waReceipt(){waMsg(buildReceiptText(order,customer,shop,true));}
  function waInvoiceLink(){waMsg(buildInvoiceLinkMsg(order,customer,shop));}
  function copyInvoiceLink(){
    const url=invoiceUrl(order.id);
    if(navigator.clipboard){navigator.clipboard.writeText(url).then(()=>toast("✅ Invoice link copied!"));}
    else{toast("Link: "+url);}
  }

  // Paystack: collect balance via card
  function collectOnline(){
    if(bal<=0){toast("No balance to collect");return;}
    openPaystackPopup({
      email:`${(customer.phone||"boss").replace(/\D/g,"")}@boss.app`,
      amount:bal,name:customer.name,phone:customer.phone,
      ref:`BOSS_${order.id}_${Date.now()}`,

      onSuccess:async(ref)=>{
        await updateOrder({paid:(parseFloat(order.paid)||0)+bal,paystackRef:ref});
        await db.recordPayment({orderId:order.id,amount:bal,method:"paystack",paystackRef:ref});
        toast("✅ Payment confirmed! ₦"+bal.toLocaleString("en-NG"));
      },
      onClose:()=>toast("Payment cancelled"),
    });
  }

  const Row=({label,value,valueStyle={}})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:13,color:C.sub,fontWeight:500}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,textAlign:"right",...valueStyle}}>{value}</div>
    </div>
  );
  return(
    <Flow open={open} onClose={onClose} title={customer.name} action="Delete" onAction={deleteOrder}>
      <StatusStepper status={orderStatus(order)} onChange={s=>{updateOrder({status:s});toast("✅ "+s);}}/>
      <div style={{...S.card,display:"flex",flexDirection:"column"}}>
        <Row label="Customer"    value={customer.name}/>
        <Row label="Phone"       value={customer.phone||"—"} valueStyle={{color:C.accent}}/>
        <Row label="Cloth Type"  value={order.type||"—"}/>
        <Row label="Delivery"    value={fmtDate(order.date)}/>
        <Row label="Total Price" value={fmt(order.price)}/>
        <Row label="Total Price"  value={fmt(order.price||0)}/>
        <Row label="Deposit Paid" value={fmt(parseFloat(order.deposit)||0)} valueStyle={{color:C.green}}/>
        {(parseFloat(order.paid)||0)>0&&<Row label="Extra Paid"  value={fmt(parseFloat(order.paid)||0)} valueStyle={{color:C.green}}/>}
        <Row label="Total Paid"  value={fmt(paid)} valueStyle={{color:C.green,fontWeight:900}}/>
        <Row label="Balance Due" value={bal>0?fmt(bal):"Fully Paid ✓"} valueStyle={{color:bal>0?C.red:C.green,fontWeight:900}}/>
        <Row label="Status" value={bal<=0?"✅ Fully Paid":paid>0?"🔄 Partially Paid":"⏳ Unpaid"} valueStyle={{color:bal<=0?C.green:paid>0?"#FF9F0A":C.sub,fontSize:13}}/>
        {order.notes&&<Row label="Notes" value={order.notes} valueStyle={{fontSize:13,fontWeight:500,color:C.sub}}/>}
      </div>

      {/* ── Invoice link section ── */}
      <div>
        <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Invoice Link</SectionLabel>
        <div style={{background:C.s2,border:`1px solid ${C.border2}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}>
          <div style={{fontSize:12,color:C.sub,marginBottom:6,fontWeight:600}}>Public payment link for this order:</div>
          <div style={{fontSize:12,color:C.accent,wordBreak:"break-all",lineHeight:1.5,fontFamily:"monospace",background:C.s3,padding:"8px 10px",borderRadius:8}}>
            {invoiceUrl(order.id)}
          </div>
          <div style={{fontSize:11,color:C.muted||C.sub,marginTop:6,lineHeight:1.5}}>
            Customer sees your shop name, full order breakdown, and a Pay button. Money goes directly to your bank.
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="wa" onClick={waInvoiceLink} style={{fontSize:13}}><span>🔗</span> Send on WhatsApp</Btn>
          <Btn variant="outline" onClick={copyInvoiceLink} style={{fontSize:13}}>📋 Copy Link</Btn>
        </div>
      </div>

      {/* ── Collect payment — virtual account transfer ── */}
      {bal>0&&tailor?.virtual_account_number&&(
        <div>
          <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Collect Payment Now</SectionLabel>
          <div style={{background:"rgba(0,102,204,0.06)",border:"1px solid rgba(0,102,204,0.18)",borderRadius:14,padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>🏦 Ask Customer to Transfer</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:13,color:C.sub}}>Bank</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{tailor?.virtual_bank_name||"—"}</div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:13,color:C.sub}}>Account No.</div>
              <div style={{fontSize:16,fontWeight:900,color:C.text,letterSpacing:"1.5px"}}>{tailor?.virtual_account_number||"—"}</div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:13,color:C.sub}}>Account Name</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{tailor?.virtual_account_name||tailor?.shop||"—"}</div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,color:C.sub}}>Amount</div>
              <div style={{fontSize:16,fontWeight:900,color:C.red}}>{fmt(bal)}</div>
            </div>
            <Btn variant="primary" onClick={collectOnline} style={{background:"#0EA5E9",color:"#fff",marginBottom:0}}>
              💳 Open Paystack — Collect {fmt(bal)}
            </Btn>
          </div>
        </div>
      )}

      {/* ── WhatsApp shortcuts ── */}
      <div>
        <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>WhatsApp Messages</SectionLabel>
        <Btn variant="wa" onClick={waReady}><span>💬</span> Order Ready for Pickup</Btn>
        <div style={{height:10}}/>
        <Btn variant="wa" onClick={waReminder}><span>📲</span> Payment Reminder + Link</Btn>
        <div style={{height:10}}/>
        <Btn variant="wa" onClick={waReceipt}><span>🧾</span> Full Receipt + Link</Btn>
      </div>

      {bal>0&&(
        <div>
          <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Record Cash Payment</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}>
            <Input value={payAmt} onChange={e=>setPayAmt(e.target.value)} type="number" inputMode="numeric" placeholder="Amount (₦)" label="Amount"/>
            <Btn variant="green" onClick={recordPay} style={{width:"auto",padding:"13px 20px"}}>Record ✓</Btn>
          </div>
        </div>
      )}

      <div>
        <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Measurements (inches)</SectionLabel>
        <MeasGrid measurements={customer.measurements||{}} onChange={m=>{updateMeas(m);toast("✅ Saved");}}/>
      </div>
    </Flow>
  );
}

// ─────────────────────────────────────────
// CUSTOMER DETAIL FLOW
// ─────────────────────────────────────────
function CustomerDetailFlow({open,onClose,customerId,customers,setCustomers,toast,onAddOrder,onOpenOrder}){
  const customer=customers.find(c=>c.id===customerId);if(!customer)return null;
  const orders=customer.orders||[];
  const totalSpent=orders.reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0);
  const outstanding=orders.reduce((s,o)=>s+getBalance(o),0);
  async function updateMeas(meas){
    const next=customers.map(c=>c.id===customerId?{...c,measurements:meas}:c);
    setCustomers(next);await db.setCustomers(next);
  }
  const Row=({label,value,valueStyle={}})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:13,color:C.sub}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,...valueStyle}}>{value}</div>
    </div>
  );
  return(
    <Flow open={open} onClose={onClose} title={customer.name} action="+ Order" onAction={onAddOrder}>
      <div style={S.card}>
        <Row label="Phone"        value={customer.phone||"—"} valueStyle={{color:C.accent}}/>
        <Row label="Total Orders" value={orders.length}/>
        <Row label="Total Spent"  value={fmt(totalSpent)}/>
        <Row label="Outstanding"  value={fmt(outstanding)} valueStyle={{color:outstanding>0?C.red:C.green}}/>
      </div>
      <div>
        <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Saved Measurements</SectionLabel>
        <MeasGrid measurements={customer.measurements||{}} onChange={m=>{updateMeas(m);toast("✅ Saved");}}/>
      </div>
      <div>
        <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Order History</SectionLabel>
        {orders.length===0?<div style={{color:C.muted,fontSize:14}}>No orders yet</div>
          :[...orders].reverse().map(o=>(
            <div key={o.id} style={{marginBottom:10}}>
              <OrderCard order={{...o,_cname:customer.name,_cphone:customer.phone}} onClick={()=>onOpenOrder(o.id)}/>
            </div>
          ))}
      </div>
    </Flow>
  );
}

// ─────────────────────────────────────────
// REMINDERS FLOW
// ─────────────────────────────────────────
function RemindersFlow({open,onClose,customers,tailor}){
  const shop=tailor?.shop||"BOSS Shop";
  const orders=allOrders(customers).filter(o=>getBalance(o)>0&&orderStatus(o)!=="Delivered");
  function send(o){
    // Builds reminder with invoice link so customer can pay directly
    const msg=buildReminderMsg(o,{name:o._cname,phone:o._cphone},shop);
    window.open(waLink(o._cphone,msg),"_blank");
  }
  function copyLink(o){
    const url=invoiceUrl(o.id);
    if(navigator.clipboard){navigator.clipboard.writeText(url).then(()=>alert("Invoice link copied!"));}
    else{alert(url);}
  }
  return(
    <Flow open={open} onClose={onClose} title="Send Reminders">
      {orders.length===0?<EmptyState icon="🎉" title="No unpaid balances!" sub="All orders are fully paid"/>
        :orders.map(o=>(
          <div key={o.id} style={{...S.card,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,fontSize:15}}>{o._cname}</div>
              <div style={{fontWeight:800,color:C.red}}>{fmt(getBalance(o))}</div>
            </div>
            <div style={{fontSize:13,color:C.sub}}>{o.type||"—"} · {o._cphone||"No phone"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
              <Btn variant="wa" onClick={()=>send(o)}><span>📲</span> Remind + Send Link</Btn>
              <Btn variant="outline" onClick={()=>copyLink(o)} style={{width:"auto",padding:"12px 14px",fontSize:13}}>📋</Btn>
            </div>
          </div>
        ))}
    </Flow>
  );
}

// ─────────────────────────────────────────
// FINANCE TAB  (new in v13)
// ─────────────────────────────────────────
function FinanceTab({customers}){
  const orders=allOrders(customers);
  const now=new Date();
  const thisMonth=orders.filter(o=>{
    if(!o.createdAt)return false;
    const d=new Date(o.createdAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const totalRevenue=orders.reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0);
  const monthRevenue=thisMonth.reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0);
  const outstanding=orders.reduce((s,o)=>s+getBalance(o),0);
  const delivered=orders.filter(o=>orderStatus(o)==="Delivered").length;

  // Monthly trend: last 6 months
  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const label=d.toLocaleString("default",{month:"short"});
    const rev=orders.filter(o=>{
      if(!o.createdAt)return false;
      const od=new Date(o.createdAt);return od.getMonth()===d.getMonth()&&od.getFullYear()===d.getFullYear();
    }).reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0);
    months.push({label,rev});
  }
  const maxRev=Math.max(...months.map(m=>m.rev),1);

  return(
    <div className="scrollable" style={{flex:1,paddingBottom:100}}>
      <div style={{padding:"20px 20px 0"}}>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:"-1px",color:C.text}}>Earnings</div>
        <div style={{fontSize:13,color:C.sub,marginTop:4}}>Your financial snapshot</div>
      </div>

      {/* Summary cards */}
      <div style={{padding:"16px 20px 0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{...S.card,gridColumn:"1/-1",background:"linear-gradient(135deg,#1C1C1E,#2C2C2E)",boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
          <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.5)",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>All-Time Revenue</div>
          <div style={{fontSize:36,fontWeight:900,letterSpacing:"-1.5px",color:"#fff"}}>{fmt(totalRevenue)}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4}}>from {delivered} completed orders</div>
        </div>
        <div style={{...S.card}}>
          <div style={{fontSize:11,fontWeight:600,color:C.sub,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>This Month</div>
          <div style={{fontSize:24,fontWeight:900,color:C.green}}>{fmt(monthRevenue)}</div>
        </div>
        <div style={{...S.card,border:`1px solid ${outstanding?"rgba(255,59,48,0.2)":C.border}`,background:outstanding?"rgba(255,59,48,0.04)":C.s1}}>
          <div style={{fontSize:11,fontWeight:600,color:C.sub,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>Outstanding</div>
          <div style={{fontSize:24,fontWeight:900,color:outstanding?C.red:C.muted}}>{fmt(outstanding)}</div>
        </div>
      </div>

      {/* Revenue bar chart — last 6 months */}
      <SectionLabel>Revenue — Last 6 Months</SectionLabel>
      <div style={{padding:"0 20px"}}>
        <div style={{...S.card,display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:6,height:130,padding:"16px 16px 0"}}>
          {months.map(m=>(
            <div key={m.label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
              <div style={{fontSize:9,fontWeight:700,color:C.sub}}>{m.rev>0?fmt(m.rev).replace("₦",""):""}</div>
              <div style={{width:"100%",background:C.s3,borderRadius:"4px 4px 0 0",height:`${Math.round((m.rev/maxRev)*70)+4}px`,minHeight:4,transition:"height 0.5s ease"}}/>
              <div style={{fontSize:10,fontWeight:600,color:C.sub,paddingBottom:8}}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Order breakdown */}
      <SectionLabel>All Orders</SectionLabel>
      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:8}}>
        {orders.length===0?<EmptyState icon="💰" title="No orders yet" sub="Add orders to see your earnings"/>
          :[...orders].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,30).map(o=>(
            <div key={o.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{o._cname}</div>
                <div style={{fontSize:12,color:C.sub}}>{o.type||"—"} · {fmtDate(o.createdAt?.slice(0,10)||o.date)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,fontSize:15,color:C.text}}>{fmt((parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0))}</div>
                {getBalance(o)>0&&<div style={{fontSize:11,color:C.red,marginTop:2}}>{fmt(getBalance(o))} due</div>}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SMART PRICING ENGINE (Feature 1)
// ─────────────────────────────────────────
const VAT_RATE = 0.075; // Nigerian VAT 7.5%

function SmartPricingCalculator({ onUsePrice, compact = false }) {
  const [hourlyRate, setHourlyRate] = useState("");
  const [hours, setHours] = useState("");
  const [margin, setMargin] = useState("30");
  const [vatOn, setVatOn] = useState(false);
  const [items, setItems] = useState([
    { id: uid(), label: "Fabric", amount: "" },
    { id: uid(), label: "Thread & Accessories", amount: "" },
  ]);

  const labour = (parseFloat(hourlyRate) || 0) * (parseFloat(hours) || 0);
  const production = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const subtotal = labour + production;
  const profit = subtotal * ((parseFloat(margin) || 0) / 100);
  const vatAmount = vatOn ? (subtotal + profit) * VAT_RATE : 0;
  const finalPrice = subtotal + profit + vatAmount;

  function addItem() {
    setItems(prev => [...prev, { id: uid(), label: "", amount: "" }]);
  }
  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }
  function updateItem(id, field, val) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  }

  const hasResult = finalPrice > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Labour */}
      <div style={{ ...S.card }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>⚒️ Labour Cost</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Hourly Rate (₦)" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)}
            type="number" inputMode="numeric" placeholder="e.g. 2000" />
          <Input label="Hours Worked" value={hours} onChange={e => setHours(e.target.value)}
            type="number" inputMode="decimal" placeholder="e.g. 4" />
        </div>
        {labour > 0 && <div style={{ fontSize: 13, color: C.green, fontWeight: 700, marginTop: 8 }}>Labour: {fmt(labour)}</div>}
      </div>

      {/* Production costs */}
      <div style={{ ...S.card }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>🧵 Production Costs</div>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 10, alignItems: "end" }}>
            <Input label={idx === 0 ? "Item" : ""} value={item.label}
              onChange={e => updateItem(item.id, "label", e.target.value)} placeholder="e.g. Fabric" />
            <Input label={idx === 0 ? "Cost (₦)" : ""} value={item.amount}
              onChange={e => updateItem(item.id, "amount", e.target.value)}
              type="number" inputMode="numeric" placeholder="0" />
            <button onClick={() => removeItem(item.id)} style={{ background: C.redDim, border: "none", borderRadius: 10, width: 36, height: 46, fontSize: 16, color: C.red, cursor: "pointer", flexShrink: 0 }}>✕</button>
          </div>
        ))}
        <Btn variant="outline" onClick={addItem} style={{ fontSize: 13 }}>+ Add Item</Btn>
        {production > 0 && <div style={{ fontSize: 13, color: C.accent, fontWeight: 700, marginTop: 10 }}>Production: {fmt(production)}</div>}
      </div>

      {/* Margin + VAT */}
      <div style={{ ...S.card }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>📈 Profit & Tax</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Profit Margin (%)" value={margin} onChange={e => setMargin(e.target.value)}
            type="number" inputMode="numeric" placeholder="30" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={S.label}>Nigerian VAT (7.5%)</label>
            <button onClick={() => setVatOn(v => !v)} style={{
              ...S.input, background: vatOn ? "rgba(52,199,89,0.1)" : C.s2,
              border: `1px solid ${vatOn ? C.green : C.border2}`,
              color: vatOn ? C.green : C.sub, fontWeight: 700, cursor: "pointer", textAlign: "left",
            }}>
              {vatOn ? "✅ VAT ON" : "⬜ VAT OFF"}
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {hasResult && (
        <div style={{ background: "linear-gradient(135deg,#1C1C1E,#2C2C2E)", borderRadius: 20, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>
            Recommended Selling Price
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-2px", color: "#fff", lineHeight: 1 }}>{fmt(Math.ceil(finalPrice / 100) * 100)}</div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Labour", val: fmt(labour) },
              { label: "Production Costs", val: fmt(production) },
              { label: `Profit (${margin}%)`, val: fmt(profit) },
              ...(vatOn ? [{ label: "VAT (7.5%)", val: fmt(vatAmount) }] : []),
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                <span>{r.label}</span><span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>
          {onUsePrice && (
            <button onClick={() => onUsePrice(Math.ceil(finalPrice / 100) * 100)} className="tap"
              style={{ width: "100%", marginTop: 16, background: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 800, color: C.text, cursor: "pointer", fontFamily: "inherit" }}>
              ✓ Use This Price
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// TODAY TAB
// ─────────────────────────────────────────
function TodayTab({customers,tailor,onAddOrder,onOpenOrder,onReminders}){
  const[scoreOpen,setScoreOpen]=useState(false);
  const[filter,setFilter]=useState("active");
  const orders=allOrders(customers);
  const toShow=filter==="active"?orders.filter(o=>orderStatus(o)!=="Delivered"):filter==="overdue"?orders.filter(o=>isOverdue(o)):filter==="today"?orders.filter(o=>isDueToday(o)):orders;
  const sorted=[...toShow].sort((a,b)=>{
    if(isOverdue(a)&&!isOverdue(b))return -1;if(!isOverdue(a)&&isOverdue(b))return 1;
    if(isDueToday(a)&&!isDueToday(b))return -1;if(!isDueToday(a)&&isDueToday(b))return 1;return 0;
  });
  const hr=new Date().getHours();
  const greeting=hr<12?"Good morning ☀️":hr<17?"Good afternoon 👋":"Good evening 🌙";
  return(
    <div style={{display:"flex",flexDirection:"column",gap:0,backgroundColor:C.bg}}>

      {/* Header */}
      <div style={{padding:"20px 24px 16px"}}>
        <div style={{fontSize:13,fontWeight:600,color:C.sub,marginBottom:4}}>{greeting}</div>
        <div style={{fontSize:28,fontWeight:800,letterSpacing:"-0.8px",color:C.text,lineHeight:1.1}}>{tailor?.shop||"BOSS"}</div>
      </div>

      {/* Trust score */}
      <TrustScoreCard customers={customers} onPress={()=>setScoreOpen(true)}/>

      {/* Money cards */}
      <div style={{marginTop:12}}><TodayMoneyCard customers={customers}/></div>

      {/* Action shortcut buttons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"12px 20px 0"}}>
        <div className="tap" onClick={onAddOrder} style={{
          ...S.card,display:"flex",alignItems:"center",gap:14,cursor:"pointer",padding:"16px",
        }}>
          <div style={{width:40,height:40,backgroundColor:C.dark,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,lineHeight:1.2}}>Add<br/>Order</div>
        </div>
        <div className="tap" onClick={onReminders} style={{
          ...S.card,display:"flex",alignItems:"center",gap:14,cursor:"pointer",padding:"16px",
        }}>
          <div style={{width:40,height:40,backgroundColor:C.dark,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.69 3.35 2 2 0 0 1 3.67 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>Send<br/>Reminder</div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{display:"flex",gap:8,padding:"16px 20px 0",overflowX:"auto",scrollbarWidth:"none"}}>
        {[["active","Active"],["overdue","Overdue"],["today","Due Today"],["all","All"]].map(([k,l])=>(
          <button key={k} className="tap" onClick={()=>setFilter(k)} style={{
            padding:"10px 20px",borderRadius:20,fontSize:14,fontWeight:filter===k?700:600,
            backgroundColor:filter===k?C.dark:C.s3,
            color:filter===k?"#fff":"#71717A",
            border:"none",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
            transition:"all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* Orders list */}
      <div style={{padding:"12px 20px 0"}}>
        <div style={{fontSize:15,fontWeight:700,color:C.sub,marginBottom:14}}>
          {filter==="overdue"?"Overdue Jobs":filter==="today"?"Due Today":filter==="all"?"All Orders":"Active Orders"}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {sorted.length===0
            ?<EmptyState icon="✂️" title="No orders here" sub="Tap Add Order to get started"/>
            :sorted.map(o=><OrderCard key={o.id} order={o} onClick={()=>onOpenOrder(o.id)}/>)}
        </div>
      </div>

      <div style={{height:120}}/>
      <TrustScoreSheet customers={customers} open={scoreOpen} onClose={()=>setScoreOpen(false)}/>
    </div>
  );
}

// ─────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────
function OrdersTab({customers,onOpenOrder}){
  const[filter,setFilter]=useState("all");
  const orders=allOrders(customers);
  const filtered=filter==="all"?orders:orders.filter(o=>orderStatus(o)===filter);
  const sorted=[...filtered].sort((a,b)=>{
    const rank=o=>isOverdue(o)?-3:orderStatus(o)==="In Progress"?-2:orderStatus(o)==="Ready"?-1:0;
    return rank(a)-rank(b);
  });
  return(
    <div style={{background:C.bg}}>
      <div style={{padding:"20px 20px 0"}}>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:"-1px",color:C.text}}>Orders</div>
      </div>
      <div style={{display:"flex",gap:8,padding:"12px 20px 0",overflowX:"auto"}}>
        {[["all","All"],["In Progress","In Progress"],["Ready","Ready"],["Delivered","Delivered"]].map(([k,l])=>(
          <button key={k} className="tap" onClick={()=>setFilter(k)} style={{padding:"8px 18px",borderRadius:20,fontSize:13,fontWeight:700,background:filter===k?C.text:C.s3,color:filter===k?"#fff":C.sub,border:"none",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"14px 20px 0",display:"flex",flexDirection:"column",gap:10}}>
        {sorted.length===0?<EmptyState icon="📋" title="No orders" sub=""/>
          :sorted.map(o=><OrderCard key={o.id} order={o} onClick={()=>onOpenOrder(o.id)}/>)}
      </div>
      <div style={{height:100}}/>
    </div>
  );
}

// ─────────────────────────────────────────
// CUSTOMERS TAB
// ─────────────────────────────────────────
function CustomersTab({customers,onOpenCustomer}){
  const[q,setQ]=useState("");
  const list=customers.filter(c=>!q||c.name.toLowerCase().includes(q.toLowerCase())||(c.phone||"").includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
  return(
    <div style={{background:C.bg}}>
      <div style={{padding:"20px 24px 0"}}>
        <div style={{fontSize:28,fontWeight:800,letterSpacing:"-0.8px",color:C.text,marginBottom:16}}>Clients</div>
        <input value={q} onChange={e=>setQ(e.target.value)} style={{...S.input}} placeholder="🔍  Search by name or phone…" type="search" autoComplete="off"/>
      </div>
      <div style={{padding:"12px 20px 0",display:"flex",flexDirection:"column",gap:10}}>
        {list.length===0?<EmptyState icon="👥" title="No clients yet" sub="Add your first order to create a client"/>
          :list.map(c=>{
            const outstanding=(c.orders||[]).reduce((s,o)=>s+getBalance(o),0);
            return(
              <div key={c.id} className="tap" onClick={()=>onOpenCustomer(c.id)} style={{...S.card,display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:48,height:48,backgroundColor:C.dark,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#fff",flexShrink:0}}>{(c.name||"?")[0].toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:15,color:C.text}}>{c.name}</div>
                  <div style={{fontSize:12,color:C.sub,marginTop:1}}>{(c.orders||[]).length} order{(c.orders||[]).length!==1?"s":""} · {c.phone||"No phone"}</div>
                </div>
                {outstanding>0&&<div style={{fontSize:13,fontWeight:700,color:C.red,flexShrink:0}}>{fmt(outstanding)}</div>}
              </div>
            );
          })}
      </div>
      <div style={{height:100}}/>
    </div>
  );
}

// ─────────────────────────────────────────
// AUTH SCREEN — Email + OAuth
// ─────────────────────────────────────────
function AuthScreen({onAuthSuccess}){
  const[mode,setMode]=useState("login"); // login | signup | forgot | verify | forgot-sent
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");

  useEffect(()=>{
    db.getSession().then(session=>{
      if(session?.email) onAuthSuccess({email:session.email});
    });
  },[]);

  async function handleLogin(){
    if(!email.trim()||!password.trim()){setErr("Enter your email and password.");return;}
    setLoading(true);setErr("");
    try{
      const{data,error}=await db.signInWithPassword(email.trim(),password.trim());
      if(error){setErr(error.message);setLoading(false);return;}
      onAuthSuccess({email:email.trim()});
    }catch{setErr("Something went wrong. Try again.");setLoading(false);}
  }

  async function handleSignup(){
    if(!email.trim()||!password.trim()){setErr("Enter your email and password.");return;}
    if(password.length<6){setErr("Password must be at least 6 characters.");return;}
    setLoading(true);setErr("");
    try{
      const{data,error}=await db.signUpWithPassword(email.trim(),password.trim());
      if(error){
        if(error.message?.includes("already")){setMode("login");setErr("Account exists — log in instead.");}
        else setErr(error.message);
        setLoading(false);return;
      }
      if(data?.session) onAuthSuccess({email:email.trim()});
      else{setMode("verify");setLoading(false);}
    }catch{setErr("Something went wrong. Try again.");setLoading(false);}
  }

  async function handleForgot(){
    if(!email.trim()){setErr("Enter your email address first.");return;}
    setLoading(true);setErr("");
    try{
      await fetch("/api/auth/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim()})});
      setMode("forgot-sent");
    }catch{setErr("Could not send reset link. Try again.");}
    setLoading(false);
  }

  function handleLocalMode(){
    const g=email.trim()||"local@boss.app";
    db.signUpWithPassword(g,"boss_guest_2024").then(()=>onAuthSuccess({email:g,isLocal:true}));
  }

  const logoBlock=(
    <div style={{textAlign:"center",marginBottom:32}}>
      <div style={{width:72,height:72,background:C.text,borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,fontWeight:900,color:"#fff",margin:"0 auto 14px",boxShadow:"0 8px 30px rgba(0,0,0,0.15)"}}>B</div>
      <div style={{fontSize:28,fontWeight:900,letterSpacing:"-0.8px",color:C.text}}>BOSS</div>
      <div style={{fontSize:11,color:C.sub,marginTop:4,letterSpacing:"1.5px",textTransform:"uppercase"}}>Build Trust. Grow Faster.</div>
    </div>
  );

  // ── verify email ──
  if(mode==="verify") return(
    <div style={{height:"100%",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {logoBlock}
      <div style={{fontSize:48,marginBottom:12}}>📧</div>
      <div style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:8,textAlign:"center"}}>Check your email</div>
      <div style={{fontSize:14,color:C.sub,textAlign:"center",lineHeight:1.6,marginBottom:28,maxWidth:300}}>
        We sent a link to <strong>{email}</strong>. Tap it to verify, then come back to log in.
      </div>
      <button className="tap" onClick={()=>setMode("login")} style={{...S.btn,background:C.text,color:"#fff",width:"auto",padding:"14px 32px"}}>Back to Login</button>
    </div>
  );

  // ── reset link sent ──
  if(mode==="forgot-sent") return(
    <div style={{height:"100%",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {logoBlock}
      <div style={{fontSize:48,marginBottom:12}}>🔑</div>
      <div style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:8,textAlign:"center"}}>Reset link sent</div>
      <div style={{fontSize:14,color:C.sub,textAlign:"center",lineHeight:1.6,marginBottom:28,maxWidth:300}}>
        Check <strong>{email}</strong> for a password reset link. It expires in 1 hour.
      </div>
      <button className="tap" onClick={()=>setMode("login")} style={{...S.btn,background:C.text,color:"#fff",width:"auto",padding:"14px 32px"}}>Back to Login</button>
    </div>
  );

  return(
    <div style={{height:"100%",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Plus Jakarta Sans',sans-serif",overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:400,paddingTop:32,paddingBottom:40}}>
        {logoBlock}

        <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:18,letterSpacing:"-0.3px"}}>
          {mode==="login"?"Welcome back 👋":mode==="forgot"?"Reset password":"Create account"}
        </div>

        {/* Form card */}
        <div style={{background:C.s1,borderRadius:24,padding:24,boxShadow:"0 2px 20px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",gap:14}}>
          <Input label="Email address" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} type="email" placeholder="you@example.com" autoComplete="email"/>
          {mode!=="forgot"&&(
            <Input label="Password" value={password} onChange={e=>{setPassword(e.target.value);setErr("");}} type="password"
              placeholder={mode==="login"?"Your password":"Min. 6 characters"}
              autoComplete={mode==="login"?"current-password":"new-password"}/>
          )}
          {err&&<div style={{fontSize:13,color:C.red,fontWeight:500}}>{err}</div>}
          <button className="tap"
            onClick={mode==="login"?handleLogin:mode==="signup"?handleSignup:handleForgot}
            disabled={loading}
            style={{...S.btn,background:C.text,color:"#fff",opacity:loading?0.6:1}}>
            {loading?"…":mode==="login"?"Log In →":mode==="signup"?"Create Account →":"Send Reset Link →"}
          </button>
          {mode==="login"&&(
            <button className="tap" onClick={()=>{setMode("forgot");setErr("");}}
              style={{background:"none",border:"none",fontSize:13,color:C.accent,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:"2px 0",textAlign:"center"}}>
              Forgot password?
            </button>
          )}
        </div>

        {/* Divider */}
        {mode!=="forgot"&&(<>
          <div style={{display:"flex",alignItems:"center",gap:10,margin:"20px 0"}}>
            <div style={{flex:1,height:1,background:C.border2}}/>
            <div style={{fontSize:12,color:C.muted,fontWeight:600}}>or</div>
            <div style={{flex:1,height:1,background:C.border2}}/>
          </div>

          {/* Google + Apple OAuth */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            <button className="tap" onClick={()=>setErr("Google sign-in coming soon.")}
              style={{padding:"13px",borderRadius:14,border:`1px solid ${C.border2}`,background:C.s1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:14,color:C.text}}>
              <span style={{fontSize:18}}>🇬</span> Google
            </button>
            <button className="tap" onClick={()=>setErr("Apple sign-in coming soon.")}
              style={{padding:"13px",borderRadius:14,border:`1px solid ${C.border2}`,background:C.s1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:14,color:C.text}}>
              <span style={{fontSize:18}}>🍎</span> Apple
            </button>
          </div>
        </>)}

        {/* Switch mode */}
        <div style={{textAlign:"center",marginBottom:12}}>
          <button className="tap" onClick={()=>{setMode(mode==="login"?"signup":mode==="signup"?"login":"login");setErr("");}}
            style={{background:"none",border:"none",fontSize:14,color:C.accent,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            {mode==="login"?"New to BOSS? Create account":mode==="signup"?"Already have an account? Log in":"Back to Login"}
          </button>
        </div>

        {/* Local mode */}
        <div style={{textAlign:"center"}}>
          <button className="tap" onClick={handleLocalMode}
            style={{background:"none",border:"none",fontSize:12,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>
            Continue without account (local only)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SETUP SCREEN — First-time shop profile
// ─────────────────────────────────────────
function SetupScreen({onComplete}){
  const[shop,setShop]=useState("");const[phone,setPhone]=useState("");const[city,setCity]=useState("");
  const[saving,setSaving]=useState(false);
  async function go(){
    if(!shop.trim())return;
    setSaving(true);
    const t={shop:shop.trim(),phone:phone.trim(),city:city.trim()};
    await db.setTailor(t);
    // Trigger welcome email (fire-and-forget — don't block onboarding)
    try{
      const session=await db.getSession();
      if(session?.email){
        fetch("/api/welcome-email",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({email:session.email,shopName:t.shop,phone:t.phone,city:t.city}),
        }).catch(()=>{});
      }
    }catch{}
    onComplete(t);
  }
  return(
    <div style={{height:"100%",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Plus Jakarta Sans',sans-serif",overflow:"auto"}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,background:C.text,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,color:"#fff",margin:"0 auto 16px",boxShadow:"0 8px 30px rgba(0,0,0,0.12)",fontWeight:900}}>B</div>
          <div style={{fontSize:26,fontWeight:900,letterSpacing:"-0.5px",color:C.text,lineHeight:1.2,marginBottom:8}}>
            It&apos;s time your business<br/>got the respect it deserves.
          </div>
          <div style={{fontSize:13,color:C.sub,lineHeight:1.6}}>
            Set up your BOSS profile in 30 seconds.<br/>Your first record is your first proof.
          </div>
        </div>
        <div style={{background:C.s1,borderRadius:24,padding:24,boxShadow:"0 2px 20px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",gap:14}}>
          <Input label="Shop / Business Name *" value={shop} onChange={e=>setShop(e.target.value)} placeholder="e.g. Taiwo's Fashion House" autoFocus/>
          <Input label="Your Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="080XXXXXXXX"/>
          <Input label="City" value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Lagos"/>
          <button className="tap" onClick={go} disabled={!shop.trim()||saving} style={{...S.btn,background:C.text,color:"#fff",opacity:!shop.trim()||saving?0.5:1}}>{saving?"Setting up…":"Start Using BOSS →"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ERROR BOUNDARY — catches silent crashes
// ─────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={hasError:false,error:null}; }
  static getDerivedStateFromError(error){ return{hasError:true,error}; }
  componentDidCatch(error,info){ console.error("BOSS Error:",error,info); }
  render(){
    if(this.state.hasError){
      return(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 32px",textAlign:"center",height:"100%",gap:16,fontFamily:"'Plus Jakarta Sans',sans-serif",background:C.bg}}>
          <div style={{fontSize:48}}>⚠️</div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>Something went wrong</div>
          <div style={{fontSize:14,color:C.sub,lineHeight:1.6,maxWidth:280}}>
            BOSS hit an unexpected error. Your data is safe — tap below to reload.
          </div>
          <button onClick={()=>window.location.reload()} style={{...S.btn,background:C.text,color:"#fff",maxWidth:220,marginTop:8}}>
            Reload App
          </button>
          {process.env.NODE_ENV==="development"&&this.state.error&&(
            <details style={{fontSize:10,color:C.muted,maxWidth:"100%",overflow:"auto",textAlign:"left",padding:12,background:C.s2,borderRadius:10,border:`1px solid ${C.border}`}}>
              <summary style={{cursor:"pointer",marginBottom:6}}>Error details</summary>
              <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{String(this.state.error)}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────
// SPLASH SCREEN
// ─────────────────────────────────────────
function SplashScreen(){
  return(
    <div style={{height:"100%",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <div className="anim-boss" style={{width:96,height:96,background:C.text,borderRadius:26,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 16px 60px rgba(0,0,0,0.2)",fontSize:48,fontWeight:900,color:"#fff"}}>B</div>
      <div className="anim-up1" style={{fontSize:34,fontWeight:900,letterSpacing:"-1.5px",marginTop:20,color:C.text}}>BOSS</div>
      <div className="anim-up2" style={{fontSize:12,color:C.sub,fontWeight:600,letterSpacing:"2px",textTransform:"uppercase",marginTop:6}}>Build Trust. Grow Faster.</div>
      <div className="anim-up3" style={{width:100,height:3,background:C.s3,borderRadius:3,marginTop:60,overflow:"hidden"}}>
        <div className="anim-fill" style={{height:"100%",background:C.text,borderRadius:3}}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// WALLET TAB  (Earnings + cashflow inside)
// ─────────────────────────────────────────
function WalletTab({customers,tailor}){
  const orders=allOrders(customers);
  const now=new Date();
  const totalRevenue=orders.reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0);
  const outstanding=orders.reduce((s,o)=>s+getBalance(o),0);
  const delivered=orders.filter(o=>orderStatus(o)==="Delivered").length;

  // All payment transactions — sorted newest first
  const transactions=[...orders]
    .filter(o=>(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0)>0)
    .sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))
    .slice(0,50);

  const hasVirtualAccount=!!(tailor?.virtual_account_number||tailor?.account_number);

  function copyAccount(){
    const num=tailor?.virtual_account_number||tailor?.account_number||"";
    const bank=tailor?.virtual_bank_name||tailor?.bank_name||"";
    const name=tailor?.virtual_account_name||tailor?.account_name||"";
    const text=`${name}\n${num}\n${bank}`;
    navigator.clipboard?.writeText(text).catch(()=>{});
  }

  return(
    <div className="scrollable" style={{flex:1,paddingBottom:100}}>
      <div style={{padding:"24px 20px 0"}}>
        <div style={{fontSize:13,fontWeight:600,color:C.sub,marginBottom:2}}>Overview</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:"-1px",color:C.text}}>Wallet</div>
      </div>

      {/* ── Hero balance card ── */}
      <div style={{padding:"16px 20px 0"}}>
        <div style={{background:"linear-gradient(135deg,#1C1C1E,#2C2C2E)",borderRadius:24,padding:"24px 20px",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
          <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>Total Collected</div>
          <div style={{fontSize:40,fontWeight:900,letterSpacing:"-2px",color:"#fff",lineHeight:1}}>{fmt(totalRevenue)}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:6}}>from {delivered} completed orders</div>

          {/* Money In / Money Out */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:20}}>
            <div style={{background:"rgba(52,199,89,0.15)",borderRadius:14,padding:"14px",border:"1px solid rgba(52,199,89,0.25)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(52,199,89,0.7)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>💚 Money In</div>
              <div style={{fontSize:20,fontWeight:900,color:C.green}}>{fmt(totalRevenue)}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:2}}>Total received</div>
            </div>
            <div style={{background:outstanding?"rgba(255,59,48,0.15)":"rgba(255,255,255,0.06)",borderRadius:14,padding:"14px",border:outstanding?"1px solid rgba(255,59,48,0.25)":"none"}}>
              <div style={{fontSize:10,fontWeight:700,color:outstanding?"rgba(255,59,48,0.8)":"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>❤️ Outstanding</div>
              <div style={{fontSize:20,fontWeight:900,color:outstanding?C.red:"rgba(255,255,255,0.5)"}}>{fmt(outstanding)}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:2}}>Pending collection</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Virtual Account / Deposit Details ── */}
      <div style={{padding:"16px 20px 0"}}>
        {hasVirtualAccount?(
          <div style={{...S.card,background:"rgba(0,102,204,0.04)",border:"1px solid rgba(0,102,204,0.15)"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:12}}>🏦 Your Payment Account</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:13,color:C.sub}}>Bank</div>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{tailor?.virtual_bank_name||tailor?.bank_name||"—"}</div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:13,color:C.sub}}>Account No.</div>
              <div style={{fontSize:18,fontWeight:900,color:C.text,letterSpacing:"2px"}}>{tailor?.virtual_account_number||tailor?.account_number||"—"}</div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:13,color:C.sub}}>Account Name</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{tailor?.virtual_account_name||tailor?.account_name||"—"}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Btn variant="accent" onClick={copyAccount}>📋 Copy Details</Btn>
              <Btn variant="secondary" onClick={()=>{
                const num=tailor?.virtual_account_number||tailor?.account_number||"";
                const bank=tailor?.virtual_bank_name||tailor?.bank_name||"";
                const name=tailor?.virtual_account_name||tailor?.account_name||"";
                const msg=`💳 Pay me via bank transfer:\n\nBank: ${bank}\nAccount: ${num}\nName: ${name}\n\nPowered by BOSS`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
              }}>📤 Share on WhatsApp</Btn>
            </div>
          </div>
        ):(
          <div style={{...S.card,textAlign:"center",padding:"24px 20px"}}>
            <div style={{fontSize:32,marginBottom:10}}>🏦</div>
            <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>No payment account yet</div>
            <div style={{fontSize:13,color:C.sub,marginBottom:16}}>Set up your virtual account in your <strong>Profile</strong> tab to receive bank transfers from clients</div>
          </div>
        )}
      </div>

      {/* ── Transaction History ── */}
      <SectionLabel>Transaction History</SectionLabel>
      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:8}}>
        {transactions.length===0
          ?<EmptyState icon="💳" title="No transactions yet" sub="Payments will appear here once you record orders"/>
          :transactions.map(o=>{
            const received=(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0);
            const balance=getBalance(o);
            return(
              <div key={o.id} style={{...S.card,display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:42,height:42,borderRadius:12,background:balance>0?"rgba(255,59,48,0.08)":"rgba(52,199,89,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                  {balance>0?"💳":"✅"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.text}}>{o._cname}</div>
                  <div style={{fontSize:12,color:C.sub,marginTop:2}}>{o.type||"Order"} · {fmtDate(o.createdAt?.slice(0,10)||o.date)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:800,fontSize:15,color:C.green}}>+{fmt(received)}</div>
                  {balance>0&&<div style={{fontSize:11,color:C.red,marginTop:2}}>{fmt(balance)} due</div>}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────
// ─────────────────────────────────────────
// PROFILE TAB — Control Center
// Sections: Profile · Security · Financial Identity · Data & Backup · Tools
// ─────────────────────────────────────────

function SettingsTab({tailor,customers,setTailor}){
  const[shop,setShop]=useState(tailor?.shop||"");
  const[phone,setPhone]=useState(tailor?.phone||"");
  const[city,setCity]=useState(tailor?.city||"");
  const[saved,setSaved]=useState(false);

  // Financial Identity — Virtual Account only
  const[vaStatus,setVaStatus]=useState(tailor?.virtual_account_number?"connected":"idle");
  const[vaMsg,setVaMsg]=useState("");

  // Security
  const[newPw,setNewPw]=useState("");
  const[pwMsg,setPwMsg]=useState("");
  const[pwLoading,setPwLoading]=useState(false);

  // Data & Backup
  const[restoreMsg,setRestoreMsg]=useState("");
  const restoreRef=useRef(null);

  // Tools accordion
  const[toolsOpen,setToolsOpen]=useState(false);

  async function saveProfile(){
    const t={...(tailor||{}),shop:shop.trim(),phone:phone.trim(),city:city.trim()};
    await db.setTailor(t);setTailor(t);setSaved(true);setTimeout(()=>setSaved(false),2200);
  }



  async function connectVirtualAccount(){
    if(!shop.trim()){setVaMsg("Please save your shop name first.");return;}
    setVaStatus("saving");setVaMsg("Creating your virtual account…");
    try{
      const res=await fetch("/api/paystack-virtual-account",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({shop_name:tailor?.shop||shop.trim(),phone:tailor?.phone||phone.trim()}),
      });
      const data=await res.json();
      if(data.error){setVaMsg(data.error);setVaStatus("error");return;}
      const updated={...(tailor||{}),
        virtual_account_number:data.virtual_account_number,
        virtual_bank_name:data.virtual_bank_name,
        virtual_account_name:data.virtual_account_name||tailor?.shop||shop.trim(),
        virtual_account_status:"active",
        paystack_customer_code:data.customer_code||"",
      };
      await db.setTailor(updated);setTailor(updated);
      setVaStatus("connected");setVaMsg("✅ Virtual account created. Customers can now pay directly via bank transfer.");
    }catch{setVaMsg("Error connecting. Try again.");setVaStatus("error");}
  }

  async function handlePasswordReset(){
    if(!newPw||newPw.length<6){setPwMsg("Password must be at least 6 characters.");return;}
    setPwLoading(true);setPwMsg("");
    try{
      const res=await fetch("/api/auth/reset-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:newPw})});
      const data=await res.json();
      if(data.error){setPwMsg(data.error);}
      else{setPwMsg("✅ Password updated successfully.");setNewPw("");}
    }catch{setPwMsg("Error updating password. Try again.");}
    setPwLoading(false);
  }

  function exportBackup(){
    const data={tailor,customers,exportedAt:new Date().toISOString(),version:"boss-v1"};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`boss-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }

  function handleRestoreFile(e){
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(data.customers){await db.setCustomers(data.customers);}
        if(data.tailor){await db.setTailor(data.tailor);setTailor(data.tailor);}
        setRestoreMsg("✅ Data restored successfully. Refresh to see changes.");
      }catch{setRestoreMsg("❌ Invalid backup file.");}
    };
    reader.readAsText(file);
  }

  async function copyVirtualAccount(){
    const num=tailor?.virtual_account_number||tailor?.account_number||"";
    const bank=tailor?.virtual_bank_name||tailor?.bank_name||"";
    const name=tailor?.virtual_account_name||tailor?.account_name||"";
    try{
      await navigator.clipboard.writeText(`Bank: ${bank}\nAccount: ${num}\nName: ${name}`);
      setVaMsg("Copied!");setTimeout(()=>setVaMsg(""),2000);
    }catch{setVaMsg("Copy failed — long-press to copy manually.");}
  }

  const ts=computeTrustScore(customers);
  const hasVirtualAccount=!!(tailor?.virtual_account_number||tailor?.account_number);

  const sectionHead=(icon,label)=>(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"20px 20px 8px"}}>
      <div style={{width:32,height:32,borderRadius:10,background:C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{icon}</div>
      <div style={{fontSize:13,fontWeight:800,color:C.text,letterSpacing:"-0.1px",textTransform:"uppercase"}}>{label}</div>
    </div>
  );

  return(
    <div className="scrollable" style={{flex:1,paddingBottom:100}}>

      {/* Header */}
      <div style={{padding:"24px 20px 0"}}>
        <div style={{fontSize:13,fontWeight:600,color:C.sub,marginBottom:2}}>My Account</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:"-1px",color:C.text}}>Profile</div>
      </div>

      {/* BOSS Trust Score */}
      <div style={{padding:"16px 20px 0"}}>
        <div style={{background:`linear-gradient(135deg,${C.text},#3A3A3C)`,borderRadius:20,padding:"20px",display:"flex",alignItems:"center",gap:16,boxShadow:"0 6px 24px rgba(0,0,0,0.18)"}}>
          <div style={{width:60,height:60,borderRadius:18,background:ts.score>=70?"rgba(52,199,89,0.2)":ts.score>=45?"rgba(255,159,10,0.2)":"rgba(255,59,48,0.2)",border:`2px solid ${ts.score>=70?C.green:ts.score>=45?"#FF9F0A":C.red}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:ts.score>=70?C.green:ts.score>=45?"#FF9F0A":C.red}}>{ts.score}</div>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:"#fff"}}>{ts.level} Business</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:3}}>BOSS Trust Score · Credit Readiness: <span style={{fontWeight:700,color:ts.readiness==="High"?C.green:ts.readiness==="Medium"?"#FF9F0A":"rgba(255,255,255,0.5)"}}>{ts.readiness}</span></div>
          </div>
        </div>
      </div>

      {/* ── 1. PROFILE ── */}
      {sectionHead("🏪","Profile")}
      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:12}}>
        <Input label="Shop / Business Name *" value={shop} onChange={e=>setShop(e.target.value)} placeholder="e.g. Chidi's Fashion House"/>
        <Input label="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="080XXXXXXXX"/>
        <Input label="City" value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Lagos"/>
        <Btn variant={saved?"green":"primary"} onClick={saveProfile}>{saved?"✅ Saved!":"Save Changes"}</Btn>
      </div>

      {/* ── 2. SECURITY ── */}
      {sectionHead("🔒","Security")}
      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...S.card,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>Change Password</div>
          <Input label="New Password (min. 6 chars)" value={newPw} onChange={e=>{setNewPw(e.target.value);setPwMsg("");}} type="password" placeholder="••••••••"/>
          {pwMsg&&<div style={{fontSize:13,color:pwMsg.startsWith("✅")?C.green:C.red,fontWeight:500}}>{pwMsg}</div>}
          <Btn variant="outline" onClick={handlePasswordReset} disabled={pwLoading}>{pwLoading?"Updating…":"Update Password"}</Btn>
        </div>
        <div style={{...S.card,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>Login Options</div>
          <div style={{fontSize:12,color:C.sub}}>More sign-in methods coming soon.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button className="tap" onClick={()=>setPwMsg("Google sign-in coming soon.")}
              style={{padding:"11px",borderRadius:12,border:`1px solid ${C.border2}`,background:C.s2,fontSize:13,fontWeight:700,color:C.sub,cursor:"pointer",fontFamily:"inherit"}}>🇬 Google</button>
            <button className="tap" onClick={()=>setPwMsg("Apple sign-in coming soon.")}
              style={{padding:"11px",borderRadius:12,border:`1px solid ${C.border2}`,background:C.s2,fontSize:13,fontWeight:700,color:C.sub,cursor:"pointer",fontFamily:"inherit"}}>🍎 Apple</button>
          </div>
        </div>
        <button className="tap" onClick={async()=>{
            try{await db.signOut();}catch{}
            // Clear all local state to prevent stale data on next login
            ["boss_session","boss_tailor","boss_customers"].forEach(k=>{try{localStorage.removeItem(k);}catch{}});
            window.location.href="/";
          }}
          style={{width:"100%",padding:"15px",borderRadius:14,fontSize:15,fontWeight:700,border:"1.5px solid rgba(255,59,48,0.25)",cursor:"pointer",background:"rgba(255,59,48,0.06)",color:"#FF3B30",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          🚪 Log Out of BOSS
        </button>
      </div>

      {/* ── 3. FINANCIAL IDENTITY — Virtual Account ── */}
      {sectionHead("🏦","Financial Identity")}
      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:12}}>
        {hasVirtualAccount?(
          <div style={{...S.card,background:"rgba(0,102,204,0.04)",border:"1px solid rgba(0,102,204,0.15)"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.accent,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:12}}>✅ Virtual Account Active</div>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {[
                {l:"Bank",v:tailor?.virtual_bank_name||"—"},
                {l:"Account Number",v:tailor?.virtual_account_number||"—",mono:true},
                {l:"Account Name",v:tailor?.virtual_account_name||tailor?.shop||"—"},
              ].map(r=>(
                <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{fontSize:12,color:C.sub,fontWeight:600}}>{r.l}</div>
                  <div style={{fontSize:r.mono?17:13,fontWeight:r.mono?900:700,color:C.text,letterSpacing:r.mono?"2px":"0px"}}>{r.v}</div>
                </div>
              ))}
            </div>
            {vaMsg&&<div style={{fontSize:13,color:vaMsg.startsWith("✅")?C.green:C.red,marginTop:8,fontWeight:500}}>{vaMsg}</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}>
              <Btn variant="outline" onClick={copyVirtualAccount}>{vaMsg&&!vaMsg.startsWith("✅")?"Error":"📋 Copy Details"}</Btn>
              <Btn variant="outline" onClick={()=>{
                const num=tailor?.virtual_account_number||"";
                const bank=tailor?.virtual_bank_name||"";
                const name=tailor?.virtual_account_name||tailor?.shop||"";
                const msg=`💳 Pay me via bank transfer:\n\nBank: ${bank}\nAccount No: ${num}\nAccount Name: ${name}\n\nPowered by BOSS`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
              }}>📤 Share</Btn>
            </div>
          </div>
        ):(
          <>
            <div style={{background:"rgba(0,102,204,0.06)",border:"1px solid rgba(0,102,204,0.15)",borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>🏦 Get Your Virtual Account</div>
              <div style={{fontSize:12,color:C.sub,lineHeight:1.7}}>
                BOSS gives you a <strong style={{color:C.accent}}>dedicated bank account</strong> — your own account number that customers can transfer money to directly. BOSS never holds your funds.
              </div>
              <div style={{marginTop:10,padding:"10px 12px",background:"rgba(52,199,89,0.08)",borderRadius:10,border:"1px solid rgba(52,199,89,0.2)"}}>
                <div style={{fontSize:12,fontWeight:700,color:C.green}}>Your shop name is used as the account name</div>
                <div style={{fontSize:11,color:C.sub,marginTop:3}}>Make sure your shop name is saved above before creating.</div>
              </div>
            </div>
            {vaMsg&&<div style={{fontSize:13,color:vaMsg.startsWith("✅")?C.green:C.red,fontWeight:500,padding:"4px 0"}}>{vaMsg}</div>}
            <Btn variant="primary" onClick={connectVirtualAccount} disabled={vaStatus==="saving"}>
              {vaStatus==="saving"?"⏳ Creating Account…":"✅ Create My Virtual Account"}
            </Btn>
          </>
        )}
      </div>

      {/* ── 4. DATA & BACKUP ── */}
      {sectionHead("☁️","Data & Backup")}
      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{...S.card}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>Export Backup</div>
          <div style={{fontSize:12,color:C.sub,lineHeight:1.6,marginBottom:12}}>
            Download all your customers, orders, measurements, and settings as a JSON file. Save it to Google Drive, WhatsApp Saved Messages, or email yourself.
          </div>
          <Btn variant="primary" onClick={exportBackup}>⬇️ Download Backup File</Btn>
        </div>
        <div style={{...S.card}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>Restore from Backup</div>
          <div style={{fontSize:12,color:C.sub,lineHeight:1.6,marginBottom:12}}>
            Upload a previously downloaded BOSS backup file to restore your data.
          </div>
          <input ref={restoreRef} type="file" accept=".json" onChange={handleRestoreFile} style={{display:"none"}}/>
          <Btn variant="outline" onClick={()=>restoreRef.current?.click()}>📂 Choose Backup File</Btn>
          {restoreMsg&&<div style={{fontSize:13,color:restoreMsg.startsWith("✅")?C.green:C.red,marginTop:8,fontWeight:500}}>{restoreMsg}</div>}
        </div>
        <div style={{...S.card,background:"rgba(255,159,10,0.06)",border:"1px solid rgba(255,159,10,0.2)"}}>
          <div style={{fontSize:12,color:"#FF9F0A",fontWeight:700}}>💡 Auto-backup to Google Drive coming soon</div>
          <div style={{fontSize:12,color:C.sub,marginTop:4}}>We&apos;ll automatically back up your data to your Google Drive daily.</div>
        </div>
      </div>

      {/* ── 5. TOOLS ── */}
      <div style={{padding:"20px 20px 0"}}>
        <button className="tap" onClick={()=>setToolsOpen(p=>!p)}
          style={{width:"100%",background:C.s1,border:`1px solid ${C.border2}`,borderRadius:16,padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"inherit"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>🧰</span>
            <span style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:"0.3px"}}>Tools</span>
          </div>
          <div style={{fontSize:13,color:C.sub,fontWeight:600,transition:"transform 0.2s",transform:toolsOpen?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
        </button>
      </div>
      {toolsOpen&&(
        <div style={{padding:"8px 20px 0"}}>
          <div style={{...S.card}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Smart Pricing Engine</div>
            <SmartPricingCalculator compact onUsePrice={()=>{}}/>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{padding:"24px 20px 32px",textAlign:"center"}}>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.8}}>
          BOSS · Build Trust. Grow Faster.<br/>
          <span style={{fontSize:11}}>© 2025 Monoversal Hub · All rights reserved</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ADD CLIENT FLOW  (standalone, separate from order)
// ─────────────────────────────────────────
function AddClientFlow({open,onClose,customers,setCustomers,toast,onDone}){
  const[name,setName]=useState("");
  const[phone,setPhone]=useState("");
  const[gender,setGender]=useState("female");
  const[meas,setMeas]=useState({});

  useEffect(()=>{if(open){setName("");setPhone("");setGender("female");setMeas({});}},[open]);

  async function save(){
    if(!name.trim()){toast("⚠️ Enter client name");return;}
    const c={id:uid(),name:name.trim(),phone:phone.trim(),gender,measurements:meas,orders:[],createdAt:new Date().toISOString()};
    const next=[c,...customers];
    setCustomers(next);await db.setCustomers(next);
    toast("✅ Client saved!");onDone(c.id);
  }

  return(
    <Flow open={open} onClose={onClose} title="New Client" action="Save" onAction={save}>
      <Input label="Full Name *" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Amaka Johnson" autoComplete="off"/>
      <Input label="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="080XXXXXXXX"/>
      <div>
        <label style={S.label}>Gender</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {["female","male"].map(g=>(
            <button key={g} className="tap" onClick={()=>setGender(g)} style={{padding:"13px",borderRadius:14,border:`2px solid ${gender===g?C.accent:C.border2}`,background:gender===g?"rgba(0,102,204,0.06)":C.s2,fontSize:15,fontWeight:700,color:gender===g?C.accent:C.sub,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>
              {g==="female"?"👩 Female":"👨 Male"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={S.label}>Measurements (inches) — optional</label>
        <MeasGrid measurements={meas} onChange={setMeas}/>
      </div>
    </Flow>
  );
}

// ─────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────
export default function BOSSApp(){
  const[screen,setScreen]=useState("splash"); // "splash" | "auth" | "setup" | "app"
  const[tailor,setTailorState]=useState(null);
  const[customers,setCustomersState]=useState([]);
  const[tab,setTab]=useState("today");
  const[toastMsg,setToastMsg]=useState("");
  const[toastKey,setToastKey]=useState(0);
  const[addOrderOpen,setAddOrderOpen]=useState(false);
  const[prefilledCid,setPrefilledCid]=useState(null);
  const[orderDetailId,setOrderDetailId]=useState(null);
  const[customerDetailId,setCustomerDetailId]=useState(null);
  const[remindersOpen,setRemindersOpen]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const session=await db.getSession();
        const t=await db.getTailor();
        const c=await db.getCustomers();
        setTailorState(t);setCustomersState(c||[]);
        setTimeout(()=>{
          if(!session){setScreen("auth");return;}
          setScreen(t?"app":"setup");
        },1800);
      }catch(e){
        console.error("BOSS load error:",e);
        setTimeout(()=>setScreen("auth"),1800);
      }
    })();
  },[]);

  const toast=useCallback((msg)=>{setToastMsg(msg);setToastKey(k=>k+1);},[]);

  async function setTailor(t){setTailorState(t);await db.setTailor(t);}
  async function setCustomers(c){setCustomersState(c);await db.setCustomers(c);}

  function openAddOrder(cid=null){setPrefilledCid(cid);setAddOrderOpen(true);}
  function openOrderDetail(oid){setOrderDetailId(oid);}
  function openCustomerDetail(cid){setCustomerDetailId(cid);}
  async function handleSetupComplete(t){setTailorState(t);setCustomersState([]);setScreen("app");}
  async function handleAuthSuccess(){
    const t=await db.getTailor();
    const c=await db.getCustomers();
    setTailorState(t);setCustomersState(c||[]);
    setScreen(t?"app":"setup");
  }

  const[actionSheetOpen,setActionSheetOpen]=useState(false);
  const[addClientOpen,setAddClientOpen]=useState(false);

  if(screen==="splash")return(
    <><GlobalStyles/>
    <div id="boss-root" style={{height:"100svh",overflow:"hidden"}}><SplashScreen/></div></>
  );
  if(screen==="auth")return(
    <><GlobalStyles/>
    <div id="boss-root" style={{height:"100svh",overflow:"hidden"}}><AuthScreen onAuthSuccess={handleAuthSuccess}/></div></>
  );
  if(screen==="setup")return(
    <><GlobalStyles/>
    <div id="boss-root" style={{height:"100svh",overflow:"hidden"}}><SetupScreen onComplete={handleSetupComplete}/></div></>
  );

  // Nav: Today | Clients | [+] | Wallet | Settings
  // Nav icon SVGs — matching reference design
  const IconHome=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  const IconClients=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  const IconWallet=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
  const IconProfile=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;

  const NAV_LEFT=[
    {id:"today",    icon:<IconHome/>,     label:"Today"   },
    {id:"customers",icon:<IconClients/>,  label:"Clients" },
  ];
  const NAV_RIGHT=[
    {id:"wallet",   icon:<IconWallet/>,   label:"Wallet"  },
    {id:"settings", icon:<IconProfile/>,  label:"Profile" },
  ];

  return(
    <>
      <GlobalStyles/>
      <div id="boss-root" style={{
        height:"100svh",
        display:"flex",
        flexDirection:"column",
        backgroundColor:C.bg,
        overflow:"hidden",
        position:"relative",
        // Fallback for browsers that don't support svh
        minHeight:"-webkit-fill-available",
      }}>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="scrollable" style={{flex:"1 1 0",minHeight:0,paddingBottom:140,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          <ErrorBoundary>
            {tab==="today"    &&<TodayTab     customers={customers} tailor={tailor} onAddOrder={()=>setActionSheetOpen(true)} onOpenOrder={openOrderDetail} onReminders={()=>setRemindersOpen(true)}/>}
            {tab==="customers"&&<CustomersTab customers={customers} onOpenCustomer={openCustomerDetail}/>}
            {tab==="wallet"   &&<WalletTab    customers={customers} tailor={tailor}/>}
            {tab==="settings" &&<SettingsTab  tailor={tailor} customers={customers} setTailor={setTailor}/>}
          </ErrorBoundary>
        </div>

        {/* ── BOTTOM NAV — exact reference design ── */}
        <div style={{
          position:"fixed",bottom:0,left:0,right:0,
          zIndex:50,
          display:"flex",justifyContent:"center",
          padding:"0 24px 32px",
        }}>
          <div style={{
            display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"6px 10px",
            width:"100%",maxWidth:400,
            backgroundColor:"rgba(28,28,30,0.92)",
            backdropFilter:"blur(20px)",
            WebkitBackdropFilter:"blur(20px)",
            borderRadius:32,
            border:"1px solid rgba(255,255,255,0.08)",
            boxShadow:"0 8px 32px rgba(0,0,0,0.3)",
          }}>
            {/* Left items */}
            {NAV_LEFT.map(n=>{
              const active=tab===n.id;
              return(
                <button key={n.id} onClick={()=>setTab(n.id)} style={{
                  flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:4,backgroundColor:"transparent",border:"none",
                  cursor:"pointer",padding:"10px 0",
                  color:active?"#FFFFFF":"rgba(255,255,255,0.4)",
                  transition:"color 0.15s",
                }}>
                  <div style={{transform:active?"scale(1.1)":"scale(1)",transition:"transform 0.2s cubic-bezier(0.34,1.56,0.64,1)"}}>{n.icon}</div>
                  <div style={{fontSize:10,fontWeight:active?800:600,letterSpacing:"0.2px",textTransform:"uppercase"}}>{n.label}</div>
                </button>
              );
            })}

            {/* Center + button — exact reference */}
            <button className="tap" onClick={()=>setActionSheetOpen(true)} style={{
              width:56,height:56,
              backgroundColor:C.accent,
              borderRadius:20,
              border:"4px solid #2C2C2E",
              cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"#FFFFFF",
              boxShadow:"0 8px 24px rgba(0,102,204,0.4)",
              flexShrink:0,
              margin:"0 4px",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Right items */}
            {NAV_RIGHT.map(n=>{
              const active=tab===n.id;
              return(
                <button key={n.id} onClick={()=>setTab(n.id)} style={{
                  flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:4,backgroundColor:"transparent",border:"none",
                  cursor:"pointer",padding:"10px 0",
                  color:active?"#FFFFFF":"rgba(255,255,255,0.4)",
                  transition:"color 0.15s",
                }}>
                  <div style={{transform:active?"scale(1.1)":"scale(1)",transition:"transform 0.2s cubic-bezier(0.34,1.56,0.64,1)"}}>{n.icon}</div>
                  <div style={{fontSize:10,fontWeight:active?800:600,letterSpacing:"0.2px",textTransform:"uppercase"}}>{n.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── ACTION SHEET — + button ── */}
        {actionSheetOpen&&(
          <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end"}}>
            <div onClick={()=>setActionSheetOpen(false)} style={{position:"absolute",inset:0,backgroundColor:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)"}}/>
            <div className="anim-slide" style={{position:"relative",zIndex:1,width:"100%",padding:"0 24px 40px",display:"flex",flexDirection:"column",gap:12}}>
              {/* Title */}
              <div style={{backgroundColor:C.s1,borderRadius:20,padding:"16px 20px 4px",marginBottom:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>Quick Actions</div>
                {/* Add Order */}
                <button className="tap" onClick={()=>{setActionSheetOpen(false);openAddOrder(null);}} style={{
                  width:"100%",padding:"16px",marginBottom:8,
                  backgroundColor:C.dark,color:"#fff",borderRadius:16,border:"none",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:16,fontFamily:"inherit",
                }}>
                  <div style={{width:44,height:44,backgroundColor:"rgba(255,255,255,0.12)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>📋</div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:"-0.2px"}}>New Order</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:2}}>Record a new sewing job</div>
                  </div>
                </button>
                {/* Add Client */}
                <button className="tap" onClick={()=>{setActionSheetOpen(false);setAddClientOpen(true);}} style={{
                  width:"100%",padding:"16px",marginBottom:8,
                  backgroundColor:C.s2,borderRadius:16,border:`1px solid ${C.border}`,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:16,fontFamily:"inherit",
                }}>
                  <div style={{width:44,height:44,backgroundColor:C.s3,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>👤</div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:16,fontWeight:800,color:C.text,letterSpacing:"-0.2px"}}>New Client</div>
                    <div style={{fontSize:13,color:C.sub,marginTop:2}}>Save measurements & details</div>
                  </div>
                </button>
              </div>
              {/* Cancel */}
              <button className="tap" onClick={()=>setActionSheetOpen(false)} style={{
                width:"100%",padding:"17px",
                backgroundColor:C.s1,borderRadius:16,border:"none",cursor:"pointer",
                fontSize:16,fontWeight:700,color:C.accent,fontFamily:"inherit",
              }}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── FLOWS ── */}
        <AddOrderFlow open={addOrderOpen} onClose={()=>setAddOrderOpen(false)} customers={customers} setCustomers={setCustomers} prefilledCid={prefilledCid} toast={toast}/>
        <AddClientFlow open={addClientOpen} onClose={()=>setAddClientOpen(false)} customers={customers} setCustomers={setCustomers} toast={toast} onDone={(cid)=>{setAddClientOpen(false);setCustomerDetailId(cid);}}/>
        <OrderDetailFlow open={!!orderDetailId} onClose={()=>setOrderDetailId(null)} orderId={orderDetailId} customers={customers} setCustomers={setCustomers} toast={toast} tailor={tailor}/>
        <CustomerDetailFlow open={!!customerDetailId} onClose={()=>setCustomerDetailId(null)} customerId={customerDetailId} customers={customers} setCustomers={setCustomers} toast={toast}
          onAddOrder={()=>{setCustomerDetailId(null);openAddOrder(customerDetailId);}}
          onOpenOrder={(oid)=>{setCustomerDetailId(null);openOrderDetail(oid);}}/>
        <RemindersFlow open={remindersOpen} onClose={()=>setRemindersOpen(false)} customers={customers} tailor={tailor}/>

        {toastMsg&&<Toast key={toastKey} msg={toastMsg}/>}
      </div>
    </>
  );
}
