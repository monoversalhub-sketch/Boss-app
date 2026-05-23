"use client";
// src/components/boss/tabs.jsx — Tab screens
// SmartPricingCalculator, TodayTab, CustomersTab, WalletTab,
// ProfileTab, AuthScreen, SetupScreen, SplashScreen
import { useState, useEffect, useMemo, useId, useRef, useCallback } from "react";
import { C, S, CLOTH_TYPES, NG_BANKS, SERVICE_FEE, VAT_RATE } from "./tokens";
import { uid, fmt, fmtDate, getBalance, getTotalPaid, getNetEarning, getServiceFee, getPaymentState, allOrders, orderStatus, isOverdue, isDueToday, waLink, buildReminderMsg, invoiceUrl, computeTrustScore } from "./helpers";
import { useBOSS } from "./context";
import { Btn, Input, Select, Textarea, Sheet, SectionLabel, EmptyState, SkeletonCard } from "./ui";
import { TrustScoreCard, TrustScoreSheet, TodayMoneyCard, OrderCard } from "./cards";
import { db } from "../../lib/db";

export function SmartPricingCalculator({ onUsePrice, compact = false }) {
  const [hourlyRate, setHourlyRate] = useState("");
  const [hours, setHours] = useState("");
  const [margin, setMargin] = useState("30");
  const [vatOn, setVatOn] = useState(false);
  const [paystackOn, setPaystackOn] = useState(false); // PAY-02: fee pass-through toggle
  const [items, setItems] = useState([
    { id: uid(), label: "Fabric", amount: "" },
    { id: uid(), label: "Thread & Accessories", amount: "" },
  ]);

  const labour = (parseFloat(hourlyRate) || 0) * (parseFloat(hours) || 0);
  const production = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const subtotal = labour + production;
  const profit = subtotal * ((parseFloat(margin) || 0) / 100);
  const vatAmount = vatOn ? (subtotal + profit) * VAT_RATE : 0;
  const basePrice = subtotal + profit + vatAmount;

  // PAY-02: Paystack card fee formula (Nigerian local)
  // Final = ((basePrice + 100) / (1 - 0.015)) + 0.01
  // ₦100 flat fee waived for transactions under ₦2,500
  // Total fee capped at ₦2,000
  function calcPaystackFee(price){
    if(!paystackOn) return 0;
    const applicableFee = (0.015 * price) + 100;
    if(applicableFee >= 2000) return 2000;
    if(price < 2500) return Math.ceil(price * 0.015 * 100) / 100;
    return Math.ceil(((price + 100) / (1 - 0.015) - price) * 100) / 100;
  }

  const paystackFee = calcPaystackFee(basePrice);
  const finalPrice = basePrice + paystackFee;

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

      {/* Margin + VAT + Paystack fee */}
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
        {/* PAY-02: Paystack fee toggle */}
        <div style={{marginTop:10}}>
          <label style={S.label}>Pass Paystack Card Fee to Customer</label>
          <button onClick={()=>setPaystackOn(v=>!v)} style={{
            ...S.input,width:"100%",
            background:paystackOn?"rgba(0,102,204,0.08)":C.s2,
            border:`1px solid ${paystackOn?C.accent:C.border2}`,
            color:paystackOn?C.accent:C.sub,fontWeight:700,cursor:"pointer",textAlign:"left",
          }}>
            {paystackOn?"✅ Fee ON — customer pays card charge":"⬜ Fee OFF — you absorb card charge"}
          </button>
          {paystackOn&&basePrice>0&&(
            <div style={{fontSize:12,color:C.sub,marginTop:6,lineHeight:1.5}}>
              Card fee added: <strong style={{color:C.accent}}>+{fmt(Math.round(paystackFee))}</strong>
              {" "}· Formula: (Price + ₦100) ÷ 0.985, capped at ₦2,000
            </div>
          )}
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
              ...(paystackOn&&paystackFee>0 ? [{ label: "Paystack Card Fee", val: "+"+fmt(Math.round(paystackFee)) }] : []),
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
export function TodayTab({tailor,onAddOrder,onOpenOrder,onReminders,isLoading=false}){
  const{customers}=useBOSS();
  const[scoreOpen,setScoreOpen]=useState(false);
  const[filter,setFilter]=useState("active");
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
            :sorted.length===0
              ?<EmptyState icon="✂️" title="Your first order is one tap away." sub="Every tailor trusted in Lagos started right here. You're next."/>
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

// ─────────────────────────────────────────
// ─────────────────────────────────────────
// CUSTOMERS TAB
// ─────────────────────────────────────────
export function CustomersTab({onOpenCustomer}){
  const{customers}=useBOSS();
  const[q,setQ]=useState("");
  // T-10: memoize — list re-derives only when customers or q changes
  const list = useMemo(()=>
    customers
      .filter(c=>!q||c.name.toLowerCase().includes(q.toLowerCase())||(c.phone||"").includes(q))
      .sort((a,b)=>a.name.localeCompare(b.name))
  ,[customers,q]);
  return(
    <div style={{background:C.bg}}>
      <div style={{padding:"20px 24px 0"}}>
        <div style={{fontSize:28,fontWeight:800,letterSpacing:"-0.8px",color:C.text,marginBottom:16}}>Customers</div>
        <input value={q} onChange={e=>setQ(e.target.value)} style={{...S.input}} placeholder="🔍  Search by name or phone…" type="search" autoComplete="off"/>
      </div>
      <div style={{padding:"12px 20px 0",display:"flex",flexDirection:"column",gap:10}}>
        {list.length===0?<EmptyState icon="👥" title="No customers yet." sub="Add your first order and your customer is saved automatically — measurements, deposits, and all."/>
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
export function AuthScreen({onAuthSuccess}){
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
    if(password.length<8){setErr("Password must be at least 8 characters.");return;}
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

  const logoBlock=(
    <div style={{textAlign:"center",marginBottom:32}}>
      <div style={{width:72,height:72,background:C.text,borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,fontWeight:900,color:"#fff",margin:"0 auto 14px",boxShadow:"0 8px 30px rgba(0,0,0,0.15)"}}>B</div>
      <div style={{fontSize:28,fontWeight:900,letterSpacing:"-0.8px",color:C.text}}>BOSS</div>
      <div style={{fontSize:12,color:C.sub,marginTop:4,letterSpacing:"1px",textTransform:"uppercase"}}>Build Trust. Grow Faster.</div>
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
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SETUP SCREEN — First-time shop profile
// ─────────────────────────────────────────
export function SetupScreen({onComplete}){
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
// SPLASH SCREEN
// ─────────────────────────────────────────
export function SplashScreen(){
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
// WALLET TAB
// Shows: BOSS Wallet balance + Virtual account + earnings
// Per master doc: money stays in BOSS wallet, tailor withdraws
// at their convenience. Only virtual account is shown, not real bank.
// ─────────────────────────────────────────
export function WalletTab({tailor}){
  const{customers,toast}=useBOSS();
  // MISSING-02: Unmatched payments — transfers that didn't auto-match to an order
  const[unmatchedPayments,setUnmatchedPayments]=useState([]);
  const[matchSheet,setMatchSheet]=useState(null); // payment to assign
  const[matchLoading,setMatchLoading]=useState(false);

  useEffect(()=>{
    db.getUnmatchedPayments().then(setUnmatchedPayments).catch(()=>{});
  },[tailor?.wallet_balance]); // re-fetch when wallet changes (payment arrived)

  async function assignPayment(payment,order){
    setMatchLoading(true);
    const result=await db.matchPaymentToOrder(payment.id,order.id,payment.amount);
    if(result.ok){
      setUnmatchedPayments(prev=>prev.filter(p=>p.id!==payment.id));
      setMatchSheet(null);
      toast("✅ Payment matched to order");
    } else {
      toast("❌ Could not match payment. Try again.");
    }
    setMatchLoading(false);
  }

  // T-10: memoize all derived financial values — customers array can be large
  const orders        = useMemo(()=>allOrders(customers),[customers]);
  const now           = new Date();
  const thisMonth     = useMemo(()=>orders.filter(o=>{
    if(!o.createdAt)return false;
    const d=new Date(o.createdAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  }),[orders]);
  const totalRevenue  = useMemo(()=>orders.reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0),[orders]);
  const monthRevenue  = useMemo(()=>thisMonth.reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0),[thisMonth]);
  const outstanding   = useMemo(()=>orders.reduce((s,o)=>s+getBalance(o),0),[orders]);
  const delivered     = useMemo(()=>orders.filter(o=>orderStatus(o)==="Delivered").length,[orders]);
  // BUG-1 FIX: totalFees + totalGross were referenced in JSX but never declared — ReferenceError crash
  const totalFees  = useMemo(()=>orders.reduce((s,o)=>s+getServiceFee(o),0),[orders]);
  const totalGross = useMemo(()=>orders.reduce((s,o)=>s+getTotalPaid(o),0),[orders]);
  const walletBalance=parseFloat(tailor?.wallet_balance)||0;
  const hasVA=!!(tailor?.virtual_account_number&&tailor?.virtual_account_status==="active");

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

  function copyVA(){
    const num=tailor?.virtual_account_number||"";
    const bank=tailor?.virtual_bank_name||"";
    const name=tailor?.virtual_account_name||"";
    if(!num)return;
    const text=`Bank: ${bank}\nAccount Number: ${num}\nAccount Name: ${name}`;
    navigator.clipboard?.writeText(text);
  }
  function shareVAWA(){
    const num=tailor?.virtual_account_number||"";
    const bank=tailor?.virtual_bank_name||"";
    const name=tailor?.virtual_account_name||"";
    if(!num)return;
    // PAY-04: Offer BOTH payment options — bank transfer AND card via invoice.
    // Card payments pass Paystack's fee to the customer (dashboard toggle).
    // Bank transfers deduct Paystack's 1% from BOSS margin.
    // Giving both options protects BOSS revenue while giving customer choice.
    const msg=[
      `Hello! Here are my payment details 🙏`,
      ``,
      `🏦 *Bank Transfer* (reflects instantly):`,
      `Bank: *${bank}*`,
      `Account: *${num}*`,
      `Name: *${name}*`,
      ``,
      `_Powered by BOSS — Build Trust. Grow Faster._`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
  }

  return(
    <div className="scrollable" style={{flex:1,paddingBottom:100}}>
      <div style={{padding:"24px 20px 0"}}>
        <div style={{fontSize:13,fontWeight:600,color:C.sub,marginBottom:2}}>Overview</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:"-1px",color:C.text}}>Wallet</div>
      </div>

      {/* ── BOSS Wallet Balance (primary hero) ── */}
      <div style={{padding:"16px 20px 0"}}>
        <div style={{background:"linear-gradient(135deg,#1C1C1E,#2C2C2E)",borderRadius:24,padding:"24px 20px",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
          <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:6}}>
            BOSS Wallet Balance
          </div>
          <div style={{fontSize:40,fontWeight:900,letterSpacing:"-2px",color:"#fff",lineHeight:1}}>
            {fmt(walletBalance)}
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:6,lineHeight:1.5}}>
            Payments received · Available to withdraw
          </div>

          {/* Withdraw button — Phase 2 placeholder */}
          <button
            style={{marginTop:16,padding:"12px 20px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.6)",fontSize:13,fontWeight:700,cursor:"default",fontFamily:"inherit",width:"100%",letterSpacing:"-0.1px"}}
            onClick={()=>toast("💳 Wallet withdrawal is coming soon — you'll be able to transfer your balance to any Nigerian bank account directly from BOSS.")}>
            💸 Withdraw to Bank — Coming Soon
          </button>

          {/* Earnings split */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:16}}>
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:14,padding:"12px 14px"}}>
              <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4}}>This Month</div>
              <div style={{fontSize:20,fontWeight:900,color:C.green}}>{fmt(monthRevenue)}</div>
            </div>
            <div style={{background:outstanding?"rgba(255,59,48,0.15)":"rgba(255,255,255,0.06)",borderRadius:14,padding:"12px 14px",border:outstanding?"1px solid rgba(255,59,48,0.25)":"none"}}>
              <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4}}>Outstanding</div>
              <div style={{fontSize:20,fontWeight:900,color:outstanding?C.red:"rgba(255,255,255,0.4)"}}>{fmt(outstanding)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Virtual Account card ── */}
      <SectionLabel>Business Account Number</SectionLabel>
      <div style={{padding:"0 20px"}}>
        {hasVA?(
          <div style={{...S.card}}>
            {/* Account number display */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>
                  {tailor?.virtual_bank_name||"Wema Bank"}
                </div>
                <div style={{fontSize:26,fontWeight:900,letterSpacing:"2.5px",color:C.text,fontFamily:"monospace, monospace"}}>
                  {tailor?.virtual_account_number||"—"}
                </div>
                <div style={{fontSize:13,color:C.sub,marginTop:4,fontWeight:600}}>
                  {tailor?.virtual_account_name||tailor?.shop||"—"}
                </div>
              </div>
              <div style={{background:C.greenDim||"rgba(52,199,89,0.1)",border:"1px solid rgba(52,199,89,0.25)",borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:"0.4px",flexShrink:0}}>
                Active
              </div>
            </div>

            {/* Instruction */}
            <div style={{background:"rgba(0,102,204,0.06)",border:"1px solid rgba(0,102,204,0.12)",borderRadius:12,padding:"12px 14px",fontSize:12,color:C.sub,lineHeight:1.6,marginBottom:14}}>
              📲 <strong style={{color:C.text}}>Share this account number with your customers.</strong> When they transfer money here, it appears in your BOSS wallet balance automatically. No confirmation needed.
            </div>

            {/* Share actions */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Btn variant="outline" onClick={copyVA}>📋 Copy Details</Btn>
              <Btn variant="wa" onClick={shareVAWA}><span>💬</span>Share on WhatsApp</Btn>
            </div>
          </div>
        ):(
          <div style={{...S.card,background:"rgba(255,159,10,0.06)",border:"1px solid rgba(255,159,10,0.2)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#FF9F0A",marginBottom:6}}>🏦 No Account Number Yet</div>
            <div style={{fontSize:13,color:C.sub,lineHeight:1.6,marginBottom:14}}>
              Set up your virtual account in <strong style={{color:C.text}}>Settings → Financial Identity</strong> to get a dedicated bank account number for your business.
            </div>
            <div style={{fontSize:12,color:"#FF9F0A",fontWeight:600}}>Settings → Financial Identity →</div>
          </div>
        )}
      </div>

      {/* ── All-time revenue ── */}
      {/* ── MISSING-02: Unmatched Payments Banner ── */}
      {unmatchedPayments.length>0&&(
        <div style={{padding:"0 20px",marginBottom:0}}>
          <div style={{background:"rgba(255,159,10,0.06)",border:"2px solid rgba(255,159,10,0.3)",borderRadius:20,padding:20}}>
            <div style={{fontSize:13,fontWeight:800,color:"#FF9F0A",marginBottom:6}}>
              ⚠️ {unmatchedPayments.length} Unmatched Payment{unmatchedPayments.length>1?"s":""}
            </div>
            <div style={{fontSize:12,color:C.sub,lineHeight:1.6,marginBottom:12}}>
              These transfers arrived but couldn't be matched to an order automatically. Tap to assign each one.
            </div>
            {unmatchedPayments.map(p=>(
              <button key={p.id} onClick={()=>setMatchSheet(p)} style={{
                width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"12px 14px",background:C.s2,border:"1px solid "+C.border,
                borderRadius:14,marginBottom:8,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
              }}>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:C.text}}>{fmt(p.amount)}</div>
                  <div style={{fontSize:11,color:C.sub,marginTop:1}}>{p.sender_name||"Unknown sender"}</div>
                </div>
                <div style={{fontSize:12,color:"#FF9F0A",fontWeight:700}}>Assign →</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Match Payment Sheet ── */}
      {matchSheet&&(
        <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setMatchSheet(null)}/>
          <div className="anim-slide" style={{position:"relative",zIndex:1,background:C.s1,borderRadius:"28px 28px 0 0",padding:"24px 20px 48px",width:"100%",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{width:40,height:4,background:C.s3,borderRadius:4,margin:"0 auto 16px"}}/>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>Assign {fmt(matchSheet.amount)}</div>
            <div style={{fontSize:12,color:C.sub,marginBottom:16}}>From: {matchSheet.sender_name||"Unknown"} — tap the order this payment belongs to</div>
            {allOrders(customers).filter(o=>getBalance(o)>0).slice(0,20).map(o=>(
              <button key={o.id} onClick={()=>assignPayment(matchSheet,o)} disabled={matchLoading} style={{
                width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"14px",background:C.s2,border:"1px solid "+C.border,
                borderRadius:14,marginBottom:8,cursor:"pointer",fontFamily:"inherit",opacity:matchLoading?0.5:1,textAlign:"left",
              }}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{o._cname}</div>
                  <div style={{fontSize:12,color:C.sub,marginTop:2}}>{o.type||"—"} · Balance: {fmt(getBalance(o))}</div>
                </div>
                <div style={{fontSize:12,color:"#0066CC",fontWeight:700}}>Match</div>
              </button>
            ))}
            <button onClick={()=>setMatchSheet(null)} style={{width:"100%",padding:14,background:"transparent",border:"1px solid "+C.border,borderRadius:14,color:C.sub,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>Cancel</button>
          </div>
        </div>
      )}

      <SectionLabel>All-Time Revenue</SectionLabel>
      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4}}>Net Earnings</div>
            <div style={{fontSize:28,fontWeight:900,color:C.text}}>{fmt(totalRevenue)}</div>
            <div style={{fontSize:12,color:C.sub,marginTop:3}}>After BOSS fees</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:C.sub,marginBottom:4}}>Orders Delivered</div>
            <div style={{fontSize:22,fontWeight:900,color:C.text}}>{delivered}</div>
          </div>
        </div>
        {totalFees>0&&(
          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.02)"}}>
            <div style={{fontSize:13,color:C.sub}}>Gross collected</div>
            <div style={{fontSize:14,fontWeight:700,color:C.sub}}>{fmt(totalGross)}</div>
          </div>
        )}
        {totalFees>0&&(
          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.02)"}}>
            <div>
              <div style={{fontSize:13,color:C.sub}}>BOSS service fees</div>
              <div style={{fontSize:12,color:C.muted}}>₦{SERVICE_FEE} per completed order</div>
            </div>
            <div style={{fontSize:14,fontWeight:700,color:C.sub}}>-{fmt(totalFees)}</div>
          </div>
        )}
      </div>

      {/* ── Bar chart ── */}
      <SectionLabel>Revenue — Last 6 Months</SectionLabel>
      <div style={{padding:"0 20px"}}>
        <div style={{...S.card,display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:6,height:130,padding:"16px 16px 0"}}>
          {months.map(m=>(
            <div key={m.label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
              {m.rev>0&&<div style={{fontSize:12,fontWeight:600,color:C.sub}}>{fmt(m.rev).replace("₦","")}</div>}
              <div style={{width:"100%",background:C.accent,opacity:m.rev>0?0.85:0.12,borderRadius:"4px 4px 0 0",height:`${Math.round((m.rev/maxRev)*70)+4}px`,minHeight:4,transition:"height 0.5s ease"}}/>
              <div style={{fontSize:12,fontWeight:600,color:C.sub,paddingBottom:8}}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cashflow list ── */}
      <SectionLabel>All Orders</SectionLabel>
      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:8}}>
        {orders.length===0
          ?<EmptyState icon="💰" title="Your earnings will show up here." sub="Every paid order lands in your wallet automatically."/>
          :[...orders].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,40).map(o=>(
            <div key={o.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.text}}>{o._cname}</div>
                <div style={{fontSize:12,color:C.sub,marginTop:1}}>{o.type||"—"} · {fmtDate(o.createdAt?.slice(0,10)||o.date)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,fontSize:15,color:C.green}}>{fmt((parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0))}</div>
                {getBalance(o)>0&&<div style={{fontSize:12,color:C.red,marginTop:2}}>{fmt(getBalance(o))} due</div>}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SETTINGS TAB — Full Control Center
// Sections: Profile · Security · Financial Identity · Data & Backup · Tools
// ─────────────────────────────────────────
export function ProfileTab(){
  const{tailor,setTailor,customers}=useBOSS();
  const[section,setSection]=useState(null); // null=home | 'edit'|'security'|'data'|'tools'|'about'
  const[shop,setShop]=useState(tailor?.shop||"");
  const[phone,setPhone]=useState(tailor?.phone||"");
  const[city,setCity]=useState(tailor?.city||"");
  const[saved,setSaved]=useState(false);

  // Financial Identity — Virtual Account
  const[vaLoading,setVaLoading]=useState(false);
  const[vaMsg,setVaMsg]=useState("");
  const[deactivateConfirm,setDeactivateConfirm]=useState(false);
  const[deactivating,setDeactivating]=useState(false);
  const[requeryMsg,setRequeryMsg]=useState("");

  // Security
  const[newPw,setNewPw]=useState("");
  const[pwMsg,setPwMsg]=useState("");
  const[pwLoading,setPwLoading]=useState(false);

  // Data & Backup
  const[restoreMsg,setRestoreMsg]=useState("");
  const restoreRef=useRef(null);

  // T-04 / S-09: All bare setTimeout state-setters replaced with useEffect+cleanup.
  // Prevents "setState on unmounted component" when ProfileTab is navigated away from.
  useEffect(()=>{if(!saved)return;const id=setTimeout(()=>setSaved(false),2200);return()=>clearTimeout(id);},[saved]);
  useEffect(()=>{if(!requeryMsg)return;const id=setTimeout(()=>setRequeryMsg(""),5000);return()=>clearTimeout(id);},[requeryMsg]);
  useEffect(()=>{if(!vaMsg)return;const id=setTimeout(()=>setVaMsg(""),2500);return()=>clearTimeout(id);},[vaMsg]);

  const ts=computeTrustScore(customers);
  const orders=useMemo(()=>allOrders(customers),[customers]);
  const hasVA=!!(tailor?.virtual_account_number&&tailor?.virtual_account_status==="active");

  async function saveProfile(){
    const t={...(tailor||{}),shop:shop.trim(),phone:phone.trim(),city:city.trim()};
    await db.setTailor(t);setTailor(t);setSaved(true);
  }

  async function setupVirtualAccount(){
    if(!tailor?.shop&&!shop.trim()){setVaMsg("Save your shop name first.");return;}
    setVaLoading(true);setVaMsg("Setting up your virtual account…");
    try{
      const res=await fetch("/api/paystack-virtual-account",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({business_name:(tailor?.shop||shop).trim(),phone:tailor?.phone||phone||""}),
      });
      const data=await res.json();
      if(data.error){setVaMsg("❌ "+data.error);setVaLoading(false);return;}
      const updated={...(tailor||{}),
        paystack_dva_id:        data.dva_id||null,
        virtual_account_number: data.virtual_account_number,
        virtual_bank_name:      data.virtual_bank_name,
        virtual_account_name:   data.virtual_account_name,
        virtual_account_status: "active",
        paystack_customer_code: data.customer_code,
      };
      await db.setTailor(updated);setTailor(updated);
      setVaMsg("✅ Virtual account ready! Share it with customers to receive payments.");
    }catch{setVaMsg("❌ Network error. Check your connection and try again.");}
    setVaLoading(false);
  }

  async function clearVALocally(){
    const cleared={...(tailor||{}),paystack_dva_id:null,virtual_account_number:null,virtual_bank_name:null,virtual_account_name:null,virtual_account_status:"inactive"};
    await db.setTailor(cleared);setTailor(cleared);
  }
  async function deactivateVirtualAccount(){
    setDeactivating(true);
    try{
      if(tailor?.paystack_dva_id){
        const res=await fetch("/api/paystack-deactivate-virtual-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dva_id:tailor.paystack_dva_id})});
        const data=await res.json();
        if(!data.ok){setVaMsg("❌ "+(data.error||"Could not deactivate. Try again."));setDeactivating(false);setDeactivateConfirm(false);return;}
      }
      await clearVALocally();
      setVaMsg("Account deactivated. You can now create a new one.");
    }catch{setVaMsg("❌ Network error. Try again.");}
    setDeactivating(false);setDeactivateConfirm(false);
  }
  async function requeryVA(){
    if(!tailor?.virtual_account_number)return;
    setRequeryMsg("Checking for missing payments…");
    try{
      const slug=tailor?.virtual_bank_name?.toLowerCase().includes("titan")?"titan-paystack-bank":"wema-bank";
      const res=await fetch("/api/paystack-requery-virtual-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({account_number:tailor.virtual_account_number,provider_slug:slug})});
      const data=await res.json();
      setRequeryMsg(data.message||"Requery triggered. Check your wallet in a moment.");
    }catch{setRequeryMsg("Requery failed. Try again.");}
  }
  async function copyVirtualAccount(){
    const num=tailor?.virtual_account_number||"";const bank=tailor?.virtual_bank_name||"";const name=tailor?.virtual_account_name||"";
    if(!num){setVaMsg("No virtual account yet.");return;}
    const text=`Bank: ${bank}\nAccount Number: ${num}\nAccount Name: ${name}`;
    try{await navigator.clipboard.writeText(text);setVaMsg("✅ Copied!");}
    catch{setVaMsg("Long-press the details to copy manually.");}
  }
  async function shareVAWA(){
    const num=tailor?.virtual_account_number||"";const bank=tailor?.virtual_bank_name||"";const name=tailor?.virtual_account_name||"";
    if(!num)return;
    const msg=`Hello! Here are my payment details:\n\n🏦 Bank: *${bank}*\n🔢 Account: *${num}*\n👤 Name: *${name}*\n\nTransfer your payment to this account — it reflects immediately. Thank you! 🙏\n_Powered by BOSS_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
  }
  async function handlePasswordReset(){
    if(!newPw||newPw.length<8){setPwMsg("Password must be at least 8 characters.");return;}
    setPwLoading(true);setPwMsg("");
    try{
      // FIX-4: Send userId so admin.updateUserById() works server-side (no session needed)
      const session=await db.getSession();
      const userId=session?.id||session?.user?.id||null;
      if(!userId){
        setPwMsg("Not logged in. Please sign out and log in again.");
        setPwLoading(false);return;
      }
      const res=await fetch("/api/auth/reset-password",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({password:newPw,userId}),
      });
      const data=await res.json();
      if(data.error){setPwMsg(data.error);}
      else{setPwMsg("✅ Password updated successfully.");setNewPw("");}
    }catch{setPwMsg("Error updating password. Try again.");}
    setPwLoading(false);
  }
  function exportBackup(){
    const data={tailor,customers,exportedAt:new Date().toISOString(),version:"boss-v7"};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`boss-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
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
  async function handleSignOut(){
    await db.signOut();
    window.location.reload();
  }

  // ── Sub-screen header ──────────────────────────────────────────
  const SubHeader=({title})=>(
    <div style={{height:64,display:"flex",alignItems:"center",padding:"0 20px",gap:14,flexShrink:0,borderBottom:`1px solid ${C.border}`,backgroundColor:C.s1}}>
      <button className="tap" onClick={()=>setSection(null)}
        style={{width:38,height:38,backgroundColor:C.s2,border:"none",borderRadius:12,fontSize:20,cursor:"pointer",color:C.text,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>←</button>
      <div style={{flex:1,fontSize:17,fontWeight:800,color:C.text}}>{title}</div>
    </div>
  );

  // ── EDIT PROFILE sub-screen ────────────────────────────────────
  if(section==="edit") return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <SubHeader title="Edit Profile"/>
      <div className="scrollable" style={{flex:1,padding:"20px",display:"flex",flexDirection:"column",gap:14,paddingBottom:80}}>
        <Input label="Shop / Business Name *" value={shop} onChange={e=>setShop(e.target.value)} placeholder="e.g. Chidi's Fashion House"/>
        <Input label="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="080XXXXXXXX"/>
        <Input label="City" value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Lagos"/>
        <Btn variant={saved?"green":"primary"} onClick={saveProfile}>{saved?"✅ Saved!":"Save Changes"}</Btn>
      </div>
    </div>
  );

  // ── SECURITY sub-screen ────────────────────────────────────────
  if(section==="security") return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <SubHeader title="Security"/>
      <div className="scrollable" style={{flex:1,padding:"20px",display:"flex",flexDirection:"column",gap:12,paddingBottom:80}}>
        <div style={{...S.card,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>Change Password</div>
          <Input label="New Password (min. 8 characters)" value={newPw} onChange={e=>{setNewPw(e.target.value);setPwMsg("");}} type="password" placeholder="••••••••"/>
          {pwMsg&&<div style={{fontSize:13,color:pwMsg.startsWith("✅")?C.green:C.red,fontWeight:500}}>{pwMsg}</div>}
          <Btn variant="outline" onClick={handlePasswordReset} disabled={pwLoading}>{pwLoading?"Updating…":"Update Password"}</Btn>
        </div>
        <div style={{...S.card,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>Login Options</div>
          <div style={{fontSize:12,color:C.sub}}>More sign-in methods coming soon.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button className="tap" style={{padding:"11px",borderRadius:12,border:`1px solid ${C.border}`,background:C.s2,fontSize:13,fontWeight:700,color:C.sub,cursor:"pointer",fontFamily:"inherit"}}>🇬 Google</button>
            <button className="tap" style={{padding:"11px",borderRadius:12,border:`1px solid ${C.border}`,background:C.s2,fontSize:13,fontWeight:700,color:C.sub,cursor:"pointer",fontFamily:"inherit"}}>🍎 Apple</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── DATA & BACKUP sub-screen ───────────────────────────────────
  if(section==="data") return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <SubHeader title="Data & Backup"/>
      <div className="scrollable" style={{flex:1,padding:"20px",display:"flex",flexDirection:"column",gap:12,paddingBottom:80}}>
        <div style={{...S.card}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>Export Backup</div>
          <div style={{fontSize:12,color:C.sub,lineHeight:1.6,marginBottom:12}}>Download all your customers, orders, measurements, and settings as a JSON file. Save to Google Drive or WhatsApp Saved Messages.</div>
          <Btn variant="primary" onClick={exportBackup}>⬇️ Download Backup File</Btn>
        </div>
        <div style={{...S.card}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>Restore from Backup</div>
          <div style={{fontSize:12,color:C.sub,lineHeight:1.6,marginBottom:12}}>Upload a previously downloaded BOSS backup file to restore your data.</div>
          <input ref={restoreRef} type="file" accept=".json" onChange={handleRestoreFile} style={{display:"none"}}/>
          <Btn variant="outline" onClick={()=>restoreRef.current?.click()}>📂 Choose Backup File</Btn>
          {restoreMsg&&<div style={{fontSize:13,color:restoreMsg.startsWith("✅")?C.green:C.red,marginTop:8,fontWeight:500}}>{restoreMsg}</div>}
        </div>
        <div style={{...S.card,background:"rgba(255,159,10,0.06)",border:"1px solid rgba(255,159,10,0.2)"}}>
          <div style={{fontSize:12,color:"#FF9F0A",fontWeight:700}}>💡 Auto-backup to Google Drive coming soon</div>
          <div style={{fontSize:12,color:C.sub,marginTop:4}}>We'll automatically back up your data to Google Drive daily.</div>
        </div>
      </div>
    </div>
  );

  // ── TOOLS sub-screen ──────────────────────────────────────────
  if(section==="tools") return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <SubHeader title="Smart Pricing Calculator"/>
      <div className="scrollable" style={{flex:1,padding:"20px",paddingBottom:80}}>
        <div style={{fontSize:13,color:C.sub,lineHeight:1.6,marginBottom:16}}>Calculate the right price for any job — labour, materials, and your profit margin.</div>
        <SmartPricingCalculator compact={false} onUsePrice={()=>{}}/>
      </div>
    </div>
  );

  // ── ABOUT sub-screen ──────────────────────────────────────────
  if(section==="about") return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <SubHeader title="About BOSS"/>
      <div className="scrollable" style={{flex:1,padding:"20px",display:"flex",flexDirection:"column",gap:12,paddingBottom:80}}>
        <div style={{...S.card,display:"flex",flexDirection:"column",gap:10}}>
          {[
            {l:"App Version",v:"BOSS v7.0"},
            {l:"Built by",v:"Monoversal Hub"},
            {l:"Payment Partner",v:"Paystack"},
            {l:"CAC/BN",v:"BN 9319562"},
          ].map(r=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:13,color:C.sub,fontWeight:500}}>{r.l}</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{r.v}</div>
            </div>
          ))}
        </div>
        <div style={{...S.card,background:"rgba(0,102,204,0.04)",border:"1px solid rgba(0,102,204,0.15)"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.accent,marginBottom:4}}>BOSS — Build Trust. Grow Faster.</div>
          <div style={{fontSize:12,color:C.sub,lineHeight:1.7}}>A lightweight trust and operations system for informal African businesses. Made in Nigeria 🇳🇬 for tailors, artisans, and service providers.</div>
        </div>
      </div>
    </div>
  );

  // ── PROFILE HOME ───────────────────────────────────────────────
  const initials=(tailor?.shop||"B").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const menuItems=[
    {icon:"👤",label:"Edit Profile",sub:"Shop name, phone, city",key:"edit"},
    {icon:"🔐",label:"Security",sub:"Password & login options",key:"security"},
    {icon:"☁️",label:"Data & Backup",sub:"Export, restore your data",key:"data"},
    {icon:"🧮",label:"Smart Pricing",sub:"Calculate your job prices",key:"tools"},
    {icon:"ℹ️",label:"About BOSS",sub:"Version, credits",key:"about"},
  ];

  return(
    <div className="scrollable" style={{flex:1,paddingBottom:120}}>

      {/* BLOCK 1 — IDENTITY HERO */}
      <div style={{background:`linear-gradient(160deg,${C.dark},#2C2C2E)`,padding:"32px 20px 28px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-20,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.03)"}}/>
        <div style={{position:"absolute",bottom:-30,left:-10,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.02)"}}/>
        {/* Avatar */}
        <div style={{width:72,height:72,borderRadius:22,background:`linear-gradient(135deg,${C.accent},rgba(0,102,204,0.5))`,border:"2px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:900,color:"#fff",marginBottom:16,letterSpacing:"-1px"}}>
          {initials}
        </div>
        <div style={{fontSize:24,fontWeight:900,color:"#fff",letterSpacing:"-0.5px",lineHeight:1.2,marginBottom:4}}>
          {tailor?.shop||"Your Shop Name"}
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
          {tailor?.city&&<span style={{fontSize:12,color:"rgba(255,255,255,0.45)",fontWeight:500}}>📍 {tailor.city}</span>}
          {tailor?.phone&&<span style={{fontSize:12,color:"rgba(255,255,255,0.45)",fontWeight:500}}>📞 {tailor.phone}</span>}
        </div>
        {/* BLOCK 2 — TRUST + STATS BAND */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[
            {top:String(ts.score),mid:ts.level,btm:"Trust Score",color:ts.score>=70?C.green:ts.score>=45?"#FF9F0A":C.red},
            {top:String(allOrders(customers).filter(o=>orderStatus(o)==="Delivered").length),mid:"completed",btm:"Orders"},
            {top:String(customers.length),mid:"served",btm:"Customers"},
          ].map((s,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 10px",textAlign:"center",border:"1px solid rgba(255,255,255,0.08)"}}>
              <div style={{fontSize:22,fontWeight:900,color:s.color||"#fff",lineHeight:1}}>{s.top}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:3,fontWeight:600}}>{s.mid}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginTop:1}}>{s.btm}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BLOCK 3 — FINANCIAL IDENTITY CARD */}
      <div style={{padding:"16px 20px 0"}}>
        {hasVA?(
          <div style={{background:"linear-gradient(135deg,#1C1C1E,#2C2C2E)",borderRadius:20,padding:"20px",boxShadow:"0 6px 24px rgba(0,0,0,0.18)"}}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{background:C.greenDim,border:"1px solid rgba(52,199,89,0.3)",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:"0.4px"}}>
                  ✅ Active
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="tap" onClick={copyVirtualAccount} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.8)",borderRadius:10,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{vaMsg==="✅ Copied!"?"✅ Done":"📋 Copy"}</button>
                <button className="tap" onClick={shareVAWA} style={{background:"rgba(37,211,102,0.15)",border:"1px solid rgba(37,211,102,0.25)",color:"#25D366",borderRadius:10,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>💬 Share</button>
              </div>
            </div>
            {/* Account details */}
            <div style={{marginBottom:4}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Bank</div>
              <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:12}}>{tailor?.virtual_bank_name||"Wema Bank"}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Account Number</div>
              <div style={{fontSize:28,fontWeight:900,letterSpacing:"3px",color:"#fff",marginBottom:12,fontFamily:"monospace"}}>{tailor?.virtual_account_number||"—"}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>Account Name</div>
              <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{tailor?.virtual_account_name||tailor?.shop||"—"}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:4}}>💡 This is what your customers see when they transfer.</div>
            </div>
            {/* Account settings accordion */}
            <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.08)"}}>
              {requeryMsg&&<div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginBottom:10,fontWeight:500}}>{requeryMsg}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button className="tap" onClick={requeryVA}
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.6)",borderRadius:10,padding:"10px 8px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",lineHeight:1.4}}>
                  🔄 Transfer not showing?
                </button>
                <button className="tap" onClick={()=>setDeactivateConfirm(true)}
                  style={{background:"rgba(255,59,48,0.08)",border:"1px solid rgba(255,59,48,0.2)",color:"rgba(255,100,90,0.9)",borderRadius:10,padding:"10px 8px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",lineHeight:1.4}}>
                  ⚠️ Change number
                </button>
              </div>
            </div>
          </div>
        ):(
          <div style={{...S.card,background:"rgba(0,102,204,0.04)",border:"1px solid rgba(0,102,204,0.15)"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.accent,marginBottom:8}}>🏦 Get Your Business Account Number</div>
            <div style={{fontSize:13,color:C.sub,lineHeight:1.6,marginBottom:12}}>
              BOSS gives you a dedicated bank account number. Customers transfer money directly — it appears in your wallet automatically.
            </div>
            <div style={{display:"flex",gap:8,flexDirection:"column",marginBottom:12}}>
              {["Your own permanent account number","Wema Bank or Titan Trust","Free · Instant · Powered by Paystack"].map(t=>(
                <div key={t} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.text,fontWeight:500}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:C.greenDim,border:"1px solid rgba(52,199,89,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.green,flexShrink:0}}>✓</div>
                  {t}
                </div>
              ))}
            </div>
            {vaMsg&&<div style={{fontSize:13,color:vaMsg.startsWith("❌")?C.red:C.green,fontWeight:500,marginBottom:10,lineHeight:1.5}}>{vaMsg}</div>}
            <Btn variant="primary" onClick={setupVirtualAccount} disabled={vaLoading}>{vaLoading?"Setting up…":"🏦 Activate My Business Account"}</Btn>
          </div>
        )}
      </div>

      {/* BLOCK 4 — SETTINGS MENU */}
      <div style={{padding:"16px 20px 0",display:"flex",flexDirection:"column",gap:8}}>
        {menuItems.map(item=>(
          <button key={item.key} className="tap" onClick={()=>setSection(item.key)}
            style={{...S.card,display:"flex",alignItems:"center",gap:14,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit",padding:"14px 16px"}}>
            <div style={{width:40,height:40,borderRadius:13,background:C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{item.label}</div>
              <div style={{fontSize:12,color:C.sub,marginTop:1}}>{item.sub}</div>
            </div>
            <div style={{fontSize:18,color:C.muted,flexShrink:0}}>›</div>
          </button>
        ))}
      </div>

      {/* BLOCK 5 — DANGER ZONE */}
      <div style={{padding:"16px 20px 0"}}>
        <button className="tap" onClick={handleSignOut}
          style={{width:"100%",padding:"15px",borderRadius:16,fontSize:15,fontWeight:700,border:"1.5px solid rgba(255,59,48,0.2)",cursor:"pointer",background:"rgba(255,59,48,0.05)",color:C.red,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          🚪 Sign Out
        </button>
      </div>

      {/* Service fee note — shown in context, not next to a specific order */}
      <div style={{padding:"14px 20px 0"}}>
        <div style={{fontSize:11,color:C.muted,textAlign:"center",lineHeight:1.7,padding:"10px 0"}}>
          BOSS earns ₦75 when you get fully paid — so we only win when you do. 🤝
        </div>
      </div>

      <div style={{padding:"16px 20px 32px",textAlign:"center"}}>
        <div style={{fontSize:11,color:C.muted,lineHeight:1.8}}>BOSS · Build Trust. Grow Faster.<br/>© 2025 Monoversal Hub · All rights reserved</div>
      </div>

      {/* DEACTIVATE CONFIRMATION SHEET */}
      {deactivateConfirm&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setDeactivateConfirm(false)}/>
          <div className="anim-slide" style={{width:"100%",background:C.s1,borderTopLeftRadius:28,borderTopRightRadius:28,padding:"24px 20px 40px",position:"relative",zIndex:1}}>
            <div style={{width:40,height:4,background:C.s3,borderRadius:4,margin:"0 auto 20px"}}/>
            <div style={{fontSize:18,fontWeight:800,marginBottom:10}}>Deactivate Account?</div>
            <div style={{fontSize:13,color:C.sub,lineHeight:1.7,marginBottom:20}}>
              This will permanently stop your current account number (<strong>{tailor?.virtual_account_number}</strong>) from receiving payments.<br/>Customers who have saved this number will need a new one. Your existing wallet balance is not affected.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Btn variant="red" onClick={deactivateVirtualAccount} disabled={deactivating}>{deactivating?"Deactivating…":"Yes, Deactivate & Get New Number"}</Btn>
              <Btn variant="outline" onClick={()=>setDeactivateConfirm(false)}>Cancel — Keep My Current Number</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FINANCIAL IDENTITY SUB-SCREEN (from menu) ──────────────────
// Renders as section==="financial" inside ProfileTab
// Handled inline above in the section switch



// ADD CLIENT FLOW  (standalone, separate from order)
// ─────────────────────────────────────────
