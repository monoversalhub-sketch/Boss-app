"use client";
// src/components/BOSSApp.jsx — Root orchestration only (~50 lines)
// All components live in ./boss/* — this file just imports and wires them.
//
// boss/tokens.js    — design tokens (C, S, STATUSES, MONTHS…)
// boss/helpers.js   — pure functions (fmt, getBalance, allOrders…)
// boss/context.jsx  — ErrorBoundary, BOSSContext, useBOSS
// boss/ui.jsx       — Btn, Input, Sheet, Flow, Toast, DatePicker…
// boss/cards.jsx    — TrustScoreCard, OrderCard, StatusStepper…
// boss/flows.jsx    — AddOrderFlow, OrderDetailFlow, RemindersFlow…
// boss/tabs.jsx     — TodayTab, WalletTab, ProfileTab, AuthScreen…
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../lib/db";

import { C } from "./boss/tokens";
import { ErrorBoundary, BOSSContext } from "./boss/context";
import { GlobalStyles, Toast } from "./boss/ui";
import { SplashScreen, AuthScreen, SetupScreen } from "./boss/tabs";
import { TodayTab, CustomersTab, WalletTab, ProfileTab } from "./boss/tabs";
import { AddOrderFlow, OrderDetailFlow, CustomerDetailFlow, RemindersFlow, AddClientFlow } from "./boss/flows";

// ── Nav icons — defined outside component to avoid recreation on every render
const IconHome    = ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconClients = ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconWallet  = ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
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

  useEffect(()=>{
    // Show splash for minimum 800ms. Hard cap at 5000ms so the app
    // never gets stuck on the splash screen even if network is dead.
    const minWait   = new Promise(r=>setTimeout(r,800));
    const hardLimit = new Promise(r=>setTimeout(r,5000));

    const dataLoad = (async()=>{
      try{
        const session=await db.getSession();
        const t=await db.getTailor();
        const c=await db.getCustomers();
        setTailorState(t);setCustomersState(c||[]);
        return{session,t};
      }catch(e){
        console.error("BOSS load error:",e);
        return{session:null,t:null};
      }
    })();

    // Race the data load against the hard limit.
    // If data takes > 5s (dead network, misconfigured env), go to auth anyway.
    Promise.race([
      Promise.all([minWait, dataLoad]).then(([,result])=>result),
      hardLimit.then(()=>({ session: null, t: null, _timedOut: true })),
    ]).then(({session,t,_timedOut})=>{
      if(_timedOut){
        console.warn("[BOSS] Splash timed out — forcing auth screen");
        setScreen("auth");return;
      }
      if(!session){setScreen("auth");return;}
      setScreen(t?"app":"setup");
    });
  },[]);

  const toast=useCallback((msg)=>{setToastMsg(msg);setToastKey(k=>k+1);},[]);
  const setTailor=useCallback(async(t)=>{setTailorState(t);await db.setTailor(t);},[]);
  const setCustomers=useCallback(async(c)=>{
    setCustomersState(c);
    setSyncStatus("syncing");
    const result=await db.setCustomers(c);
    clearTimeout(syncTimerRef.current);
    if(result?.ok===false){
      setSyncStatus("offline");
    } else {
      setSyncStatus("saved");
      syncTimerRef.current=setTimeout(()=>setSyncStatus("idle"),2500);
    }
  },[]);

  // T-13: memoized context value — child components call useBOSS() to access these
  const bossCtx = useMemo(()=>({
    customers,setCustomers,tailor,setTailor,toast,
  }),[customers,tailor,toast]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // MISSING-03: Sync status indicator — shows cloud save state to tailor
  // States: "idle" | "syncing" | "saved" | "offline"
  const[syncStatus,setSyncStatus]=useState("idle");
  const syncTimerRef=React.useRef(null);

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

  const NAV_LEFT=[
    {id:"today",    icon:<IconHome/>,     label:"Today"   },
    {id:"customers",icon:<IconClients/>,  label:"Customers"},
  ];
  const NAV_RIGHT=[
    {id:"wallet",   icon:<IconWallet/>,   label:"Wallet"  },
    {id:"profile",  icon:<IconProfile/>,  label:"Profile"},
  ];

  return(
    <BOSSContext.Provider value={bossCtx}>
    <>
      <GlobalStyles/>
      <div id="boss-root" style={{height:"100svh",display:"flex",flexDirection:"column",backgroundColor:C.bg,overflow:"hidden",position:"relative"}}>

        {/* ── MISSING-03: Sync Status Pill ── */}
        {syncStatus!=="idle"&&(
          <div style={{
            position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",
            zIndex:100,display:"flex",alignItems:"center",gap:6,
            padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,
            backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",
            whiteSpace:"nowrap",
            ...(syncStatus==="syncing"?{background:"rgba(0,102,204,0.15)",color:"#0066CC",border:"1px solid rgba(0,102,204,0.25)"}:
                syncStatus==="saved"  ?{background:"rgba(52,199,89,0.15)",color:"#34C759",border:"1px solid rgba(52,199,89,0.25)"}:
                                       {background:"rgba(255,159,10,0.15)",color:"#FF9F0A",border:"1px solid rgba(255,159,10,0.3)"}),
          }}>
            {syncStatus==="syncing"&&"🔄 Saving…"}
            {syncStatus==="saved"  &&"☁️ Saved"}
            {syncStatus==="offline"&&"⚠️ Offline — saved on this device only"}
          </div>
        )}

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="scrollable" style={{flex:1,paddingBottom:140}}>
          {tab==="today"    &&<TodayTab     tailor={tailor} onAddOrder={()=>setActionSheetOpen(true)} onOpenOrder={openOrderDetail} onReminders={()=>setRemindersOpen(true)}/>}
          {tab==="customers"&&<CustomersTab onOpenCustomer={openCustomerDetail}/>}
          {tab==="wallet"   &&<WalletTab    tailor={tailor}/>}
          {tab==="profile"  &&<ProfileTab/>}
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

        {/* ── FLOWS — all read customers/setCustomers/toast from BOSSContext ── */}
        <AddOrderFlow open={addOrderOpen} onClose={()=>setAddOrderOpen(false)} prefilledCid={prefilledCid}/>
        <AddClientFlow open={addClientOpen} onClose={()=>setAddClientOpen(false)} onDone={(cid)=>{setAddClientOpen(false);setCustomerDetailId(cid);}}/>
        <OrderDetailFlow open={!!orderDetailId} onClose={()=>setOrderDetailId(null)} orderId={orderDetailId} tailor={tailor}/>
        <CustomerDetailFlow open={!!customerDetailId} onClose={()=>setCustomerDetailId(null)} customerId={customerDetailId}
          onAddOrder={()=>{setCustomerDetailId(null);openAddOrder(customerDetailId);}}
          onOpenOrder={(oid)=>{setCustomerDetailId(null);openOrderDetail(oid);}}/>
        <RemindersFlow open={remindersOpen} onClose={()=>setRemindersOpen(false)}/>

        {toastMsg&&<Toast key={toastKey} msg={toastMsg}/>}
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
