"use client";
// src/components/BOSSApp.jsx — Root orchestration only (~50 lines)
// All components live in ./boss/* — this file just imports and wires them.
//
// boss/tokens.js    — design tokens (C, S, STATUSES, MONTHS…)
// boss/helpers.js   — pure functions (fmt, getBalance, allOrders…)
// boss/context.jsx  — ErrorBoundary, BOSSContext, useBOSS
// boss/ui.jsx       — Btn, Input, Sheet, Flow, Toast, DatePicker…
// boss/cards.jsx    — TrustScoreCard, OrderCard, StatusStepper…
// boss/flows/       — AddOrderFlow, OrderDetailFlow, RemindersFlow…
// boss/tabs/        — TodayTab, EarningsTab, CustomersTab, ProfileTab…
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { db } from "../lib/db";
import { feedback } from "../lib/feedback";
import { referral } from "../lib/referral";
import { FeedbackSheet } from "./boss/FeedbackSheet";
import { OnboardingTour } from "./boss/OnboardingTour";

import { C } from "./boss/tokens";
import { allOrders, vibrate } from "./boss/helpers";
import { ErrorBoundary, BOSSContext } from "./boss/context";
import { GlobalStyles, Toast, Sheet, Btn } from "./boss/ui";
import { SplashScreen } from "./boss/SplashScreen";
import { SessionGate } from "./boss/SessionGate";
import { AuthScreen } from "./boss/AuthScreen";
import { SetupScreen } from "./boss/SetupScreen";
import { CustomersTab } from "./boss/tabs/CustomersTab";
import { EarningsTab } from "./boss/tabs/EarningsTab";
import { ProfileTab } from "./boss/tabs/ProfileTab";
import { TodayTab } from "./boss/tabs/TodayTab";
import { RemindersFlow } from "./boss/flows/RemindersFlow";
import { CalendarFlow } from "./boss/flows/CalendarFlow";
import { AddClientFlow } from "./boss/flows/AddClientFlow";
import { CustomerDetailFlow } from "./boss/flows/CustomerDetailFlow";
import { AddOrderFlow } from "./boss/flows/AddOrderFlow";
import { OrderDetailFlow } from "./boss/flows/OrderDetailFlow";

// ── Constants & pure helpers (defined outside component) ─────────────
const PRIORITY = ["syncing", "error", "offline", "connected", "saved", "idle"];
const rank = s => PRIORITY.indexOf(s);

// ── Nav icons — defined outside component to avoid recreation on every render
const IconHome    = ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconClients = ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconEarnings = ()=><span style={{fontSize:20,fontWeight:900,lineHeight:1}}>₦</span>;
const IconProfile = ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

function BOSSApp(){
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
  const[calendarOpen,setCalendarOpen]=useState(false);
  const[pendingSession,setPendingSession]=useState(null);
  const[loadingData,setLoadingData]=useState(false);
  const[feedbackOpen,setFeedbackOpen]=useState(false);
  const[feedbackConfig,setFeedbackConfig]=useState(null);
  const[tourOpen,setTourOpen]=useState(false);
  const[isOnline,setIsOnline]=useState(typeof navigator!=="undefined"?navigator.onLine:true);
  const[justCameOnline,setJustCameOnline]=useState(false);

  useEffect(()=>{
    const minWait   = new Promise(r=>setTimeout(r,800));
    const hardLimit = new Promise(r=>setTimeout(r,5000));

    const checkSession = (async()=>{
      try{
        const session=await db.getSession();
        if(!session){
          localStorage.removeItem("boss_tailor");
          localStorage.removeItem("boss_customers");
          return{session:null};
        }
        return{session};
      }catch(e){
        console.error("BOSS load error:",e);
        return{session:null};
      }
    })();

    Promise.race([
      Promise.all([minWait, checkSession]).then(([,result])=>result),
      hardLimit.then(()=>({ session: null, _timedOut: true })),
    ]).then(({session,_timedOut})=>{
      if(_timedOut){
        console.warn("[BOSS] Splash timed out — forcing auth screen");
        setScreen("auth");return;
      }
      if(!session){setScreen("auth");return;}
      setPendingSession(session);
      setScreen("gate");
    });
  },[]);

  async function handleSessionContinue(){
    setLoadingData(true);
    try{
      localStorage.removeItem("boss_tailor");
      localStorage.removeItem("boss_customers");
      const t=await db.getTailor();
      const c=await db.getCustomers();
      if (!t) console.error("[BOSS] getTailor returned null — data may not load");
      setTailorState(t);setCustomersState(c||[]);
      setPendingSession(null);
      if(t?.id) referral.attachReferral(t.id);
      setScreen(t?.id && t?.shop ? "app" : "setup");
      setLoadingData(false);
    }catch(e){
      console.error("[BOSS] session continue error:",e);
      setLoadingData(false);
    }
  }

  async function handleSessionSwitch(){
    await db.signOut();
    setPendingSession(null);
    setScreen("auth");
  }

  const toast=useCallback((msg)=>{setToastMsg(msg);setToastKey(k=>k+1);},[]);
  const setTailor=useCallback(async(t)=>{setTailorState(t);await db.setTailor(t);},[]);
  const setCustomers=useCallback(async(c)=>{
    setCustomersState(c);
    await db.setCustomers(c);
  },[]);

  // T-13: memoized context value — child components call useBOSS() to access these
  const bossCtx = useMemo(()=>({
    customers,setCustomers,tailor,setTailor,toast,
  }),[customers,tailor,toast]); // eslint-disable-line react-hooks/exhaustive-deps

  function openAddOrder(cid=null){setPrefilledCid(cid);setAddOrderOpen(true);}
  function openOrderDetail(oid){setOrderDetailId(oid);}
  function openCustomerDetail(cid){setCustomerDetailId(cid);}
  async function handleSetupComplete(t){setTailorState(t);setCustomersState([]);setScreen("app");}
  async function handleSetupCompleteAndAddOrder(t){
    setTailorState(t);setCustomersState([]);setScreen("app");
    setTimeout(()=>openAddOrder(null),400);
  }
  function handleFeedbackTrigger(trigger){
    setFeedbackConfig({type: trigger === "bug" || trigger === "feature" ? trigger : "micro", trigger, screen: tab});
    setFeedbackOpen(true);
  }
  async function handleAuthSuccess(){
    try{
      const t=await db.getTailor();
      const c=await db.getCustomers();
      setTailorState(t);setCustomersState(c||[]);
      if(t?.id) referral.attachReferral(t.id);
      setScreen(t?.id && t?.shop ? "app" : "setup");
    }catch(e){
      console.error("[BOSS] handleAuthSuccess error:",e);
      toast("Connection error — pull down to retry");
    }
  }

  const[addClientOpen,setAddClientOpen]=useState(false);
  // MISSING-03: Sync + network status indicator
  const[syncStatus,setSyncStatus]=useState("idle"); // "syncing"|"saved"|"error"|"idle"
  const[netStatus,setNetStatus]=useState("idle");   // "connected"|"offline"|"idle"
  const syncTimerRef=useRef(null);
  const networkTimerRef=useRef(null);

  const reportSyncing=useCallback(()=>{clearTimeout(syncTimerRef.current);setSyncStatus("syncing");},[]);
  const reportSaved=useCallback(()=>{clearTimeout(syncTimerRef.current);setSyncStatus("saved");syncTimerRef.current=setTimeout(()=>setSyncStatus("idle"),2500);},[]);
  const reportError=useCallback(()=>{clearTimeout(syncTimerRef.current);clearTimeout(networkTimerRef.current);setSyncStatus("error");},[]);
  const reportConnected=useCallback(()=>{clearTimeout(networkTimerRef.current);setNetStatus("connected");networkTimerRef.current=setTimeout(()=>setNetStatus("idle"),1500);},[]);
  const reportOffline=useCallback(()=>{clearTimeout(syncTimerRef.current);clearTimeout(networkTimerRef.current);setNetStatus("offline");},[]);

  const statusDisplay = useMemo(() =>
    [syncStatus, netStatus === "offline" ? "offline" : netStatus]
      .reduce((best, c) => c === "idle" ? best : rank(c) < rank(best) ? c : best, "idle"),
    [syncStatus, netStatus],
  );

  // Register sync callback with db, and track browser network state
  // Empty dep array is correct — refs and useCallback fns are stable
  useEffect(()=>{
    // Check initial connectivity state before any write
    if(!navigator.onLine)reportOffline();
    db.setSyncCallback(s=>{
      if(s==="syncing")reportSyncing();
      else if(s==="saved")reportSaved();
      else if(s==="error")reportError();
    });
    window.addEventListener("online",reportConnected);
    window.addEventListener("offline",reportOffline);
    return()=>{
      window.removeEventListener("online",reportConnected);
      window.removeEventListener("offline",reportOffline);
      clearTimeout(syncTimerRef.current);
      clearTimeout(networkTimerRef.current);
    };
  },[]);// eslint-disable-line react-hooks/exhaustive-deps

  // Handle ?drive=* URL params from Google OAuth callback
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const status=params.get("drive");
    if(status==="connected")toast("☁️ Google Drive connected");
    else if(status==="denied")toast("Drive access denied");
    else if(status==="no_token")toast("Could not get Drive access. Reconnect.");
    else if(status==="error"||status==="db_error")toast("Could not connect Drive");
    if(status){ // clean URL without page reload
      const u=new URL(window.location);
      u.searchParams.delete("drive");u.searchParams.delete("auth_error");
      window.history.replaceState({},"",u);
    }
  },[]);

  // NPS check + referral capture on app open
  useEffect(()=>{
    referral.captureReferralCode();
    if(screen==="app"&&feedback.shouldShowNPS()){
      const totalOrders = allOrders(customers).length;
      if (totalOrders < 3) return;
      const timer=setTimeout(()=>{
        const anyFlowOpen = addOrderOpen || !!orderDetailId || !!customerDetailId || remindersOpen || calendarOpen || addClientOpen;
        if (anyFlowOpen) return;
        setFeedbackConfig({type:"nps",trigger:"scheduled",screen:tab});
        setFeedbackOpen(true);
        feedback.markNPSShown();
      },60000);
      return()=>clearTimeout(timer);
    }
  },[screen, customers, addOrderOpen, orderDetailId, customerDetailId, remindersOpen, calendarOpen, addClientOpen]);

  // Web Push: register SW, update last_seen, prompt on first order
  useEffect(()=>{
    if(screen!=="app")return;
    db.updateLastSeen();
    db.processPendingQueue().then(r=>{
      if(r?.processed > 0) toast(`☁️ ${r.processed} pending item${r.processed > 1 ? "s" : ""} synced`);
    }).catch(()=>{});
    if("serviceWorker" in navigator && "PushManager" in window){
      navigator.serviceWorker.register("/sw.js").catch(e=>console.warn("[push] SW reg failed",e));
    }
  },[screen]);

  // Network status tracking
  useEffect(()=>{
    const handleOnline=()=>{setIsOnline(true);setJustCameOnline(true);setTimeout(()=>setJustCameOnline(false),2500);};
    const handleOffline=()=>{setIsOnline(false);setJustCameOnline(false);};
    window.addEventListener("online",handleOnline);
    window.addEventListener("offline",handleOffline);
    return()=>{window.removeEventListener("online",handleOnline);window.removeEventListener("offline",handleOffline);};
  },[]);

  const pushPromptedRef = useRef(false);
  const prevOrderCountRef = useRef(allOrders(customers).length);
  const[pushConsentOpen,setPushConsentOpen]=useState(false);

  useEffect(()=>{
    if(screen!=="app")return;
    const count = allOrders(customers).length;
    if(count > 0 && prevOrderCountRef.current === 0 && !pushPromptedRef.current && "Notification" in window && Notification.permission === "default"){
      pushPromptedRef.current = true;
      const timer = setTimeout(()=>{
        setPushConsentOpen(true);
      }, 4000);
      return()=>clearTimeout(timer);
    }
    prevOrderCountRef.current = count;
  },[customers, screen]);

  async function subscribeToPush(){
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      await fetch("/api/push/subscribe",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({endpoint:sub.endpoint,keys:{p256dh:arrayBufferToBase64(sub.getKey("p256dh")),auth:arrayBufferToBase64(sub.getKey("auth"))}}),
      });
      toast("✅ Notifications enabled");
    }catch(e){
      console.warn("[push] subscribe failed",e);
      toast("Could not enable notifications");
    }
  }
  function urlBase64ToUint8Array(base64String){
    const padding="=".repeat((4-base64String.length%4)%4);
    const b64=(base64String+padding).replace(/\-/g,"+").replace(/_/g,"/");
    const raw=atob(b64);
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }
  function arrayBufferToBase64(buf){
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

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
    <div id="boss-root" style={{height:"100svh",overflow:"hidden"}}><SetupScreen onComplete={handleSetupComplete} onCompleteAndAddOrder={handleSetupCompleteAndAddOrder}/></div></>
  );
  if(screen==="gate"&&pendingSession)return(
    <><GlobalStyles/>
    <div id="boss-root" style={{height:"100svh",overflow:"hidden"}}>
      <SessionGate session={pendingSession} onContinue={handleSessionContinue} onSwitch={handleSessionSwitch}/>
    </div></>
  );

  // Nav: Today | Clients | [+] | Wallet | Settings
  // Nav icon SVGs — matching reference design

  const NAV_LEFT=[
    {id:"today",    icon:<IconHome/>,     label:"Today"   },
    {id:"customers",icon:<IconClients/>,  label:"Customers"},
  ];
  const NAV_RIGHT=[
    {id:"earnings", icon:<IconEarnings/>, label:"Earnings"},
    {id:"profile",  icon:<IconProfile/>,  label:"Profile"},
  ];

  return(
    <BOSSContext.Provider value={bossCtx}>
    <>
      <GlobalStyles/>
      <div id="boss-root" style={{height:"100svh",display:"flex",flexDirection:"column",backgroundColor:C.bg,overflow:"hidden",position:"relative"}}>

        {/* ── MISSING-03: Sync + network status indicator ── */}
        {statusDisplay!=="idle"&&(
          <div style={{
            position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",
            zIndex:100,display:"flex",alignItems:"center",gap:6,
            padding:"6px 14px",borderRadius:20,fontSize:13,fontWeight:700,
            whiteSpace:"nowrap",transition:"all 0.2s ease",
            ...(statusDisplay==="syncing"   ?{background:"rgba(99,102,241,0.15)",color:"#6366f1",border:"1px solid rgba(99,102,241,0.25)"}:
                statusDisplay==="saved"     ?{background:"rgba(16,185,129,0.15)",color:"#10b981",border:"1px solid rgba(16,185,129,0.25)"}:
                statusDisplay==="connected" ?{background:"rgba(16,185,129,0.15)",color:"#10b981",border:"1px solid rgba(16,185,129,0.25)"}:
                statusDisplay==="error"     ?{background:"rgba(239,68,68,0.15)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.25)"}:
                                             {background:"rgba(245,158,11,0.15)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.3)"}),
          }}>
            {statusDisplay==="syncing"   &&"🔄 Saving…"}
            {statusDisplay==="saved"     &&"☁️ Saved"}
            {statusDisplay==="connected" &&"📡 Connected"}
            {statusDisplay==="error"     &&"⚠️ Sync error"}
            {statusDisplay==="offline"   &&"⚠️ Offline"}
          </div>
        )}
        {statusDisplay==="error" && (
          <div className="tap" onClick={async ()=>{
            setSyncStatus("syncing");
            try{await Promise.all([db.getTailor(), db.getCustomers()]);setSyncStatus("saved");}catch{setSyncStatus("error");}
            setTimeout(()=>setSyncStatus("idle"),2500);
          }} style={{
            position:"absolute",top:52,left:"50%",transform:"translateX(-50%)",zIndex:100,
            background:"rgba(239,68,68,0.12)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.25)",
            padding:"8px 18px",borderRadius:20,fontSize:13,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",whiteSpace:"nowrap",
          }}>
            ↻ Retry sync
          </div>
        )}

        {!isOnline && (
          <div style={{background:"#FFC107",color:"#000",fontSize:13,fontWeight:700,padding:"10px 16px",textAlign:"center",flexShrink:0}}>
            Offline — changes saved on your phone, will sync when back online
          </div>
        )}
        {justCameOnline && (
          <div style={{background:C.green,color:"#fff",fontSize:13,fontWeight:700,padding:"10px 16px",textAlign:"center",flexShrink:0}}>
            Back online — syncing your data...
          </div>
        )}

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="scrollable" style={{flex:1,paddingBottom:140}}>
          {tab==="today"    &&<TodayTab     tailor={tailor} onAddOrder={()=>openAddOrder(null)} onOpenOrder={openOrderDetail} onReminders={()=>setRemindersOpen(true)} onCalendar={()=>setCalendarOpen(true)} isLoading={loadingData}/>}
          {tab==="customers"&&<CustomersTab onOpenCustomer={openCustomerDetail} onAddClient={()=>setAddClientOpen(true)}/>}
          {tab==="earnings" &&<EarningsTab/>}
          {tab==="profile"  &&<ProfileTab onFeedbackTrigger={handleFeedbackTrigger} onTour={()=>setTourOpen(true)}/>}
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
            backgroundColor:"rgba(28,28,30,0.97)",
            borderRadius:32,
            border:"1px solid rgba(255,255,255,0.08)",
            boxShadow:"0 8px 32px rgba(0,0,0,0.3)",
          }}>
            {/* Left items */}
            {NAV_LEFT.map(n=>{
              const active=tab===n.id;
              return(
                <button key={n.id} onClick={()=>{setTab(n.id);vibrate(4);}} style={{
                  flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:4,backgroundColor:"transparent",border:"none",
                  cursor:"pointer",padding:"10px 0",
                  color:active?"#FFFFFF":"rgba(255,255,255,0.4)",
                  transition:"color 0.15s",
                }}>
                  <div style={{transform:active?"scale(1.1)":"scale(1)",transition:"transform 0.2s cubic-bezier(0.34,1.56,0.64,1)"}}>{n.icon}</div>
                  <div style={{fontSize:13,fontWeight:active?800:600,letterSpacing:"0px",textTransform:"none"}}>{n.label}</div>
                </button>
              );
            })}

            {/* Center + button — opens Add Order directly */}
            <button className="tap" onClick={()=>openAddOrder(null)} style={{
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
                <button key={n.id} onClick={()=>{setTab(n.id);vibrate(4);}} style={{
                  flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:4,backgroundColor:"transparent",border:"none",
                  cursor:"pointer",padding:"10px 0",
                  color:active?"#FFFFFF":"rgba(255,255,255,0.4)",
                  transition:"color 0.15s",
                }}>
                  <div style={{transform:active?"scale(1.1)":"scale(1)",transition:"transform 0.2s cubic-bezier(0.34,1.56,0.64,1)"}}>{n.icon}</div>
                  <div style={{fontSize:13,fontWeight:active?800:600,letterSpacing:"0px",textTransform:"none"}}>{n.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── FLOWS — all read customers/setCustomers/toast from BOSSContext ── */}
        <AddOrderFlow open={addOrderOpen} onClose={()=>setAddOrderOpen(false)} prefilledCid={prefilledCid} onFeedbackTrigger={handleFeedbackTrigger}/>
        <AddClientFlow open={addClientOpen} onClose={()=>setAddClientOpen(false)} onDone={(cid)=>{setAddClientOpen(false);setCustomerDetailId(cid);}}/>
        <OrderDetailFlow open={!!orderDetailId} onClose={()=>setOrderDetailId(null)} orderId={orderDetailId} tailor={tailor} onFeedbackTrigger={handleFeedbackTrigger}/>
        <CustomerDetailFlow open={!!customerDetailId} onClose={()=>setCustomerDetailId(null)} customerId={customerDetailId}
          onAddOrder={()=>{setCustomerDetailId(null);openAddOrder(customerDetailId);}}
          onOpenOrder={(oid)=>{setCustomerDetailId(null);openOrderDetail(oid);}}/>
        <RemindersFlow open={remindersOpen} onClose={()=>setRemindersOpen(false)}/>
        <CalendarFlow open={calendarOpen} onClose={()=>setCalendarOpen(false)}/>

        {toastMsg&&<Toast key={toastKey} msg={toastMsg}/>}

        <FeedbackSheet
          open={feedbackOpen}
          type={feedbackConfig?.type}
          trigger={feedbackConfig?.trigger}
          screen={feedbackConfig?.screen}
          onClose={()=>{setFeedbackOpen(false);setFeedbackConfig(null);}}
        />
        <OnboardingTour open={tourOpen} onClose={()=>setTourOpen(false)}/>

        <Sheet open={pushConsentOpen} onClose={()=>setPushConsentOpen(false)} title="">
          <div style={{textAlign:"center",padding:"8px 0 16px"}}>
            <div style={{fontSize:32,marginBottom:8}}>🔔</div>
            <div style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:6}}>Get delivery reminders?</div>
            <div style={{fontSize:14,color:C.sub,lineHeight:1.6,marginBottom:20}}>
              We&apos;ll notify you 3 days before an order is due so you&apos;re never late.
            </div>
            <Btn variant="primary" onClick={()=>{subscribeToPush();setPushConsentOpen(false);}} style={{marginBottom:12,width:"100%"}}>Allow notifications</Btn>
            <button onClick={()=>setPushConsentOpen(false)}
              style={{fontSize:14,color:C.sub,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Not now</button>
          </div>
        </Sheet>
      </div>
    </>
    </BOSSContext.Provider>
  );
}

// T-07: ErrorBoundary wraps the whole app — any uncaught render error
// shows a graceful recovery screen instead of a blank white crash.
export default function BOSSAppWithBoundary(){
  return(
    <ErrorBoundary>
      <BOSSApp/>
    </ErrorBoundary>
  );
}
