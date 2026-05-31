"use client";
// src/components/boss/ui.jsx — UI Atoms
// Btn, Input, Select, Textarea, SectionLabel, EmptyState,
// SkeletonCard, Toast, Sheet, Flow, GlobalStyles, DatePicker
import { useState, useEffect, useId, useMemo } from "react";
import { C, S, GLOBAL_CSS, MONTHS } from "./tokens";

export function GlobalStyles(){
  useEffect(()=>{
    const el=document.createElement("style");el.textContent=GLOBAL_CSS;
    document.head.appendChild(el);return()=>document.head.removeChild(el);
  },[]);return null;
}

// ─────────────────────────────────────────
// U-09: CUSTOM DATE PICKER
// Android Chrome's native date picker is inconsistent.
// Day / Month / Year dropdowns render identically on all devices.
// ─────────────────────────────────────────
export function DatePicker({label,value,onChange}){
  // value is "YYYY-MM-DD" or ""
  const parts=value?value.split("-"):["","",""];
  const [yr,setYr]=useState(parts[0]||"");
  const [mo,setMo]=useState(parts[1]||"");
  const [dy,setDy]=useState(parts[2]||"");

  useEffect(()=>{
    if(yr&&mo&&dy){
      // zero-pad day and month
      const pad=n=>String(n).padStart(2,"0");
      onChange(`${yr}-${pad(mo)}-${pad(dy)}`);
    }
  },[yr,mo,dy]); // eslint-disable-line

  // Days in selected month
  const daysInMonth=useMemo(()=>{
    if(!mo)return 31;
    const y=parseInt(yr)||2025;
    return new Date(y,parseInt(mo),0).getDate();
  },[mo,yr]);

  const thisYear=new Date().getFullYear();
  const years=Array.from({length:5},(_,i)=>thisYear+i);
  const days=Array.from({length:daysInMonth},(_,i)=>i+1);
  const selStyle={
    flex:1,height:48,borderRadius:12,border:`1.5px solid ${C.border2}`,
    background:C.s2,fontSize:14,fontWeight:600,color:C.text,
    padding:"0 8px",fontFamily:"inherit",appearance:"none",WebkitAppearance:"none",cursor:"pointer",
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%"}}>
      {label&&<label style={S.label}>{label}</label>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr 1fr",gap:8}}>
        <select value={dy} onChange={e=>setDy(e.target.value)} style={selStyle} aria-label="Day">
          <option value="">Day</option>
          {days.map(d=><option key={d} value={String(d).padStart(2,"0")}>{d}</option>)}
        </select>
        <select value={mo} onChange={e=>setMo(e.target.value)} style={selStyle} aria-label="Month">
          <option value="">Month</option>
          {MONTHS.map((m,i)=><option key={m} value={String(i+1).padStart(2,"0")}>{m}</option>)}
        </select>
        <select value={yr} onChange={e=>setYr(e.target.value)} style={selStyle} aria-label="Year">
          <option value="">Year</option>
          {years.map(y=><option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

export function Btn({children,variant="primary",onClick,style={},disabled}){
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
export function Input({label,...props}){
  const inputId=useId();
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",boxSizing:"border-box"}}>
      {label&&<label htmlFor={inputId} style={S.label}>{label}</label>}
      <input id={inputId} style={{...S.input}} {...props}/>
    </div>
  );
}
export function Select({label,options,...props}){
  return(
    <div style={{display:"flex",flexDirection:"column"}}>
      {label&&<label style={S.label}>{label}</label>}
      <select style={{...S.input,color:C.text,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%23888'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center",paddingRight:36}} {...props}>
        {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
      </select>
    </div>
  );
}
export function Textarea({label,...props}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",boxSizing:"border-box"}}>
      {label&&<label style={S.label}>{label}</label>}
      <textarea style={{...S.input,minHeight:80,resize:"none",lineHeight:1.5}} {...props}/>
    </div>
  );
}
export function SectionLabel({children,style={}}){
  return<div style={{fontSize:12,fontWeight:700,color:C.muted,letterSpacing:"0.8px",textTransform:"uppercase",padding:"0 20px",marginTop:28,marginBottom:12,...style}}>{children}</div>;
}
export function EmptyState({icon,title,sub}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"56px 32px",textAlign:"center",gap:12}}>
      <div style={{fontSize:52,opacity:0.35}}>{icon}</div>
      <div style={{fontSize:16,fontWeight:800,color:C.sub}}>{title}</div>
      {sub&&<div style={{fontSize:13,fontWeight:500,color:C.muted,lineHeight:1.6,maxWidth:240}}>{sub}</div>}
    </div>
  );
}
// U-01: Skeleton loading card — shown while data fetches from Supabase
export function SkeletonCard({height=80}){
  return(
    <div style={{
      background:"linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%)",
      backgroundSize:"200% 100%",
      animation:"shimmer 1.2s infinite",
      borderRadius:16,
      height,
      border:"1px solid #E5E5EA",
    }}/>
  );
}
export function Toast({msg}){
  if(!msg)return null;
  return<div className="anim-toast" style={{position:"fixed",bottom:160,left:"50%",transform:"translateX(-50%)",backgroundColor:C.dark,color:"#fff",fontWeight:700,fontSize:14,padding:"13px 24px",borderRadius:40,zIndex:9999,whiteSpace:"nowrap",maxWidth:"calc(100% - 48px)",textAlign:"center",pointerEvents:"none",boxShadow:"0 8px 32px rgba(0,0,0,0.25)"}}>{msg}</div>;
}
export function Sheet({open,onClose,title,children}){
  if(!open)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,backgroundColor:"rgba(0,0,0,0.4)"}}/>
      <div className="anim-slide" style={{position:"relative",zIndex:1,backgroundColor:C.s1,borderRadius:"32px 32px 0 0",padding:"8px 24px 48px",width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 -8px 48px rgba(0,0,0,0.14)"}}>
        <div style={{width:36,height:4,backgroundColor:C.s3,borderRadius:4,margin:"12px auto 20px"}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div style={{fontSize:20,fontWeight:800,letterSpacing:"-0.5px",color:C.text}}>{title}</div>
          <button aria-label="Close" className="tap" onClick={onClose} style={{backgroundColor:C.s2,border:"none",borderRadius:"50%",width:34,height:34,fontSize:16,color:C.sub,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Flow({open,onClose,title,action,onAction,children}){
  if(!open)return null;
  return(
    <div style={{position:"fixed",inset:0,backgroundColor:C.bg,zIndex:300,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{height:64,display:"flex",alignItems:"center",padding:"0 20px",gap:14,flexShrink:0,borderBottom:`1px solid ${C.border}`,backgroundColor:C.s1}}>
        <button aria-label="Go back" className="tap" onClick={onClose} style={{width:38,height:38,backgroundColor:C.s2,border:"none",borderRadius:12,fontSize:18,cursor:"pointer",color:C.text,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
        <div style={{flex:1,fontSize:17,fontWeight:800,letterSpacing:"-0.3px",color:C.text}}>{title}</div>
        {action&&(
        <button
          className={onAction?"tap":undefined}
          onClick={onAction||undefined}
          disabled={!onAction}
          style={{
            backgroundColor:"transparent",border:"none",
            color:onAction?C.accent:C.sub,
            fontSize:15,fontWeight:700,
            cursor:onAction?"pointer":"default",
            padding:"8px 0",opacity:onAction?1:0.5,
            fontFamily:"inherit",
          }}
        >
          {action}
        </button>
      )}
      </div>
      <div className="scrollable" style={{flex:1,padding:"20px 20px",display:"flex",flexDirection:"column",gap:16,backgroundColor:C.bg}}>
        {children}<div style={{height:40}}/>
      </div>
    </div>
  );
}

