"use client";
// src/components/boss/tabs.jsx — TodayTab (sole remaining tab)
import { useState, useMemo } from "react";
import { C, S } from "../tokens";
import { allOrders, orderStatus, isOverdue, isDueToday, isDueThisWeek } from "../helpers";
import { useBOSS } from "../context";
import { EmptyState, SkeletonCard } from "../ui";
import { TrustScoreCard, TrustScoreSheet, TodayMoneyCard, OrderCard } from "../cards";

// ─────────────────────────────────────────
// TODAY TAB
// ─────────────────────────────────────────
export function TodayTab({tailor,onAddOrder,onOpenOrder,onReminders,onCalendar,isLoading=false}){
  const{customers}=useBOSS();
  const[scoreOpen,setScoreOpen]=useState(false);
  const[filter,setFilter]=useState("active");
  const[bannerDismissed,setBannerDismissed]=useState(false);
  // T-10: useMemo prevents recomputing allOrders on every keystroke/re-render
  const orders = useMemo(()=>allOrders(customers),[customers]);
  const toShow  = useMemo(()=>
    filter==="active"   ? orders.filter(o=>orderStatus(o)!=="Delivered")
    :filter==="overdue" ? orders.filter(o=>isOverdue(o))
    :filter==="today"   ? orders.filter(o=>isDueToday(o))
    :orders
  ,[orders,filter]);
  const sorted  = useMemo(()=>[...toShow].sort((a,b)=>{
    if(isOverdue(a)&&!isOverdue(b))return -1;if(!isOverdue(a)&&isOverdue(b))return 1;
    if(isDueToday(a)&&!isDueToday(b))return -1;if(!isDueToday(a)&&isDueToday(b))return 1;return 0;
  }),[toShow]);
  const dueThisWeekOrders = useMemo(()=>orders.filter(o=>isDueThisWeek(o)),[orders]);
  const dueThisWeekCount  = dueThisWeekOrders.length;
  const hr=new Date().getHours();
  const greeting=hr<12?"Good morning ☀️":hr<17?"Good afternoon 👋":"Good evening 🌙";
  return(
    <div style={{display:"flex",flexDirection:"column",gap:0,backgroundColor:C.bg}}>

      {/* Header — compact, 1 line */}
      <div style={{padding:"20px 24px 16px"}}>
        <div style={{fontSize:13,fontWeight:600,color:C.sub,marginBottom:4}}>{greeting}</div>
        <div style={{fontSize:28,fontWeight:800,letterSpacing:"-0.8px",color:C.text,lineHeight:1.1}}>{tailor?.shop||"BOSS"}</div>
      </div>

      {/* U-04: Money card FIRST — most urgent info at top (Apple HIG) */}
      <TodayMoneyCard customers={customers}/>

      {/* Action shortcut buttons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"12px 20px 0"}}>
        <div className="tap" onClick={onCalendar} style={{
          ...S.card,display:"flex",alignItems:"center",gap:14,cursor:"pointer",padding:"16px",
        }}>
          <div style={{width:40,height:40,backgroundColor:C.dark,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0,fontSize:20}}>📅</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,lineHeight:1.2}}>My<br/>Calendar</div>
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

      {/* Due This Week banner */}
      {dueThisWeekCount > 0 && !bannerDismissed && (
        <div className="tap" onClick={()=>{setFilter("all");setBannerDismissed(true);}} style={{
          margin:"12px 20px 0",padding:"12px 16px",borderRadius:14,
          background:"linear-gradient(135deg,#1a1a2e,#16213e)",
          display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>📅</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{dueThisWeekCount} order{dueThisWeekCount!==1?"s":""} due this week</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:1}}>Tap to view all</div>
            </div>
          </div>
          <div style={{fontSize:16,color:"rgba(255,255,255,0.4)"}}>→</div>
        </div>
      )}

      {/* Filter pills */}
      <div style={{display:"flex",gap:8,padding:"16px 20px 0",overflowX:"auto",scrollbarWidth:"none"}}>
        {[["active","Active"],["overdue","Overdue"],["today","Due Today"],["all","All"]].map(([k,l])=>(
          <button key={k} className="tap" onClick={()=>setFilter(k)} style={{
            padding:"12px 20px",borderRadius:20,fontSize:14,fontWeight:filter===k?700:600,
            minHeight:48, // U-16: minimum tap target (Apple HIG 44pt / Material 48dp)
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
          {isLoading
            ?[1,2,3].map(i=><SkeletonCard key={i}/>)
            :sorted.length===0 && !tailor
              ?<EmptyState icon="✂️" title="Your first order is one tap away." sub="Every tailor trusted in Lagos started right here. You're next."/>
              :sorted.length===0 && tailor
                ?<div style={{textAlign:"center",padding:"24px 0",color:C.sub}}>
                  <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>Could not load orders</div>
                  <div className="tap" onClick={()=>window.location.reload()} style={{fontSize:14,color:C.accent,cursor:"pointer",fontWeight:600,fontFamily:"inherit",background:"none",border:"none",padding:0}}>Tap to retry</div>
                </div>
              :sorted.map(o=><OrderCard key={o.id} order={o} onClick={()=>onOpenOrder(o.id)}/>)}
        </div>
      </div>

      {/* U-04: Trust Score at bottom — passive metric, not the primary action */}
      <div style={{marginTop:20}}>
        <TrustScoreCard customers={customers} onPress={()=>setScoreOpen(true)}/>
      </div>

      <div style={{height:120}}/>
      <TrustScoreSheet customers={customers} open={scoreOpen} onClose={()=>setScoreOpen(false)}/>
    </div>
  );
}


