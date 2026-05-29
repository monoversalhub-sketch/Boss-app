"use client";
// src/components/boss/tabs.jsx — Tab screens
// SmartPricingCalculator, TodayTab, CustomersTab, EarningsTab,
// ProfileTab, AuthScreen, SetupScreen, SplashScreen
import { useState, useEffect, useMemo, useId, useRef, useCallback } from "react";
import { C, S, CLOTH_TYPES, NG_BANKS, SERVICE_FEE, VAT_RATE } from "./tokens";
import { uid, fmt, fmtDate, getBalance, getTotalPaid, getNetEarning, getServiceFee, getPaymentState, allOrders, orderStatus, isOverdue, isDueToday, waLink, buildReminderMsg, invoiceUrl, computeTrustScore, computeEarnings } from "./helpers";
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
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");

  useEffect(()=>{
    db.getSession().then(session=>{
      if(session?.email) onAuthSuccess({email:session.email});
    });
  },[]);

  async function handleGoogle(){
    setLoading(true);setErr("");
    try{
      const{error}=await db.signInWithGoogle();
      if(error){setErr(error.message);setLoading(false);}
    }catch{
      setErr("Could not connect to Google. Try again.");
      setLoading(false);
    }
  }

  return(
    <div style={{
      height:"100%",background:C.bg,
      display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",
      padding:32,fontFamily:"'Plus Jakarta Sans',sans-serif"
    }}>
      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:48}}>
        <div style={{
          width:80,height:80,background:C.text,borderRadius:24,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:40,fontWeight:900,color:"#fff",
          margin:"0 auto 16px",boxShadow:"0 8px 30px rgba(0,0,0,0.15)"
        }}>B</div>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",color:C.text}}>BOSS</div>
        <div style={{fontSize:13,color:C.sub,marginTop:6,letterSpacing:"1px",textTransform:"uppercase"}}>
          Build Trust. Grow Faster.
        </div>
      </div>

      {/* Google button */}
      <button
        className="tap"
        onClick={handleGoogle}
        disabled={loading}
        style={{
          ...S.btn,
          background:"#fff",
          color:"#1C1C1E",
          border:"1.5px solid #E5E5EA",
          display:"flex",alignItems:"center",justifyContent:"center",
          gap:12,fontSize:16,fontWeight:700,
          opacity:loading?0.6:1,
          boxShadow:"0 2px 12px rgba(0,0,0,0.08)",
          maxWidth:320,width:"100%",
        }}>
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.9 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
          <path fill="#FBBC05" d="M10.7 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.2-6.1z"/>
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.7 2.3-6.2 0-11.5-4.2-13.3-9.8l-8.2 6.1C6.6 42.5 14.7 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        {loading?"Connecting…":"Continue with Google"}
      </button>

      {/* Error */}
      {err&&(
        <div style={{marginTop:16,fontSize:13,color:C.red,fontWeight:500,textAlign:"center",maxWidth:280}}>
          {err}
        </div>
      )}

      {/* Footer note */}
      <div style={{position:"absolute",bottom:32,fontSize:11,color:C.muted,textAlign:"center",padding:"0 32px",lineHeight:1.6}}>
        By continuing you agree to BOSS terms of service.{"\n"}Your Google account is used only for sign-in.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SETUP SCREEN — First-time shop profile
// ─────────────────────────────────────────
// MISSING-13: Structured Nigerian city list for analytics + AI readiness.
// Using a dropdown prevents typos ("Lasgos", "lagos") and enables
// regional analytics across the tailor network.
const NIGERIAN_CITIES = [
  "Lagos","Abuja","Kano","Ibadan","Port Harcourt","Benin City","Kaduna",
  "Enugu","Owerri","Abeokuta","Onitsha","Warri","Calabar","Uyo","Aba",
  "Akure","Ilorin","Jos","Maiduguri","Bauchi","Sokoto","Zaria","Katsina",
  "Minna","Makurdi","Awka","Asaba","Yola","Lafia","Gombe","Damaturu",
  "Dutse","Jalingo","Lokoja","Umuahia","Yenagoa","Ekiti","Osogbo",
  "Ile-Ife","Lekki","Victoria Island","Ikeja","Ajah",
];

export function SetupScreen({onComplete}){
  const[shop,setShop]=useState("");
  const[phone,setPhone]=useState("");
  const[city,setCity]=useState("");
  const[cityOther,setCityOther]=useState("");
  const[saving,setSaving]=useState(false);
  // MISSING-06: Self-declaration for cold-start score.
  // New tailors have zero history — self-reported experience gives an honest
  // starting point (capped at 30/100) while real orders accumulate.
  const[showDeclaration,setShowDeclaration]=useState(false);
  const[yearsInBusiness,setYearsInBusiness]=useState("");
  const[monthlyOrders,setMonthlyOrders]=useState("");
  const[monthlyRevenue,setMonthlyRevenue]=useState("");

  // MISSING-06: compute starting self-declared score (max 30 points)
  function computeSelfScore(){
    let score=0;
    if(yearsInBusiness==="10+ years")        score+=12;
    else if(yearsInBusiness==="5–10 years")  score+=9;
    else if(yearsInBusiness==="3–5 years")   score+=6;
    else if(yearsInBusiness==="1–3 years")   score+=3;
    const mo=parseFloat(monthlyOrders)||0;
    if(mo>=20)score+=10;else if(mo>=10)score+=7;else if(mo>=5)score+=4;else if(mo>=1)score+=2;
    const mr=parseFloat(monthlyRevenue)||0;
    if(mr>=500000)score+=8;else if(mr>=200000)score+=6;else if(mr>=50000)score+=4;else if(mr>0)score+=2;
    return Math.min(30,score);
  }

  const selfScore=computeSelfScore();
  const hasSelfData=!!(yearsInBusiness||monthlyOrders||monthlyRevenue);

  async function go(){
    if(!shop.trim())return;
    setSaving(true);
    const finalCity=city==="Other"?cityOther.trim():city;
    const t={
      shop:shop.trim(),phone:phone.trim(),city:finalCity,
      self_declared_score: hasSelfData ? selfScore : 0,
      self_declared_years: yearsInBusiness||null,
    };
    await db.setTailor(t);
    // Welcome email — fire and forget, never block onboarding
    try{
      const session=await db.getSession();
      if(session?.email){
        fetch("/api/welcome-email",{
          method:"POST",headers:{"Content-Type":"application/json"},
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

          <Input label="Shop / Business Name *" value={shop}
            onChange={e=>setShop(e.target.value)} placeholder="e.g. Taiwo's Fashion House" autoFocus/>
          <Input label="Your Phone Number" value={phone}
            onChange={e=>setPhone(e.target.value)} type="tel" placeholder="080XXXXXXXX"/>

          {/* MISSING-13: structured city dropdown */}
          <div style={{display:"flex",flexDirection:"column"}}>
            <label style={S.label}>City</label>
            <select value={city} onChange={e=>setCity(e.target.value)}
              style={{...S.input,color:city?C.text:C.sub,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%23888'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center",paddingRight:36}}>
              <option value="">Select your city…</option>
              {NIGERIAN_CITIES.map(c=><option key={c} value={c}>{c}</option>)}
              <option value="Other">Other (not listed)</option>
            </select>
            {city==="Other"&&(
              <input value={cityOther} onChange={e=>setCityOther(e.target.value)}
                placeholder="Type your city" style={{...S.input,marginTop:8,color:C.text}}/>
            )}
          </div>

          {/* MISSING-06: optional self-declaration for cold-start score boost */}
          <div className="tap" onClick={()=>setShowDeclaration(v=>!v)}
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:C.s2,borderRadius:12,cursor:"pointer",border:`1px solid ${showDeclaration?C.accent:C.border}`}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>📋 Tell us about your experience</div>
              <div style={{fontSize:11,color:C.sub,marginTop:1}}>Optional · Boosts your starting BOSS score</div>
            </div>
            <div style={{fontSize:14,color:C.sub}}>{showDeclaration?"▲":"▼"}</div>
          </div>

          {showDeclaration&&(
            <div style={{background:C.s2,borderRadius:14,padding:16,display:"flex",flexDirection:"column",gap:12,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,color:C.sub,lineHeight:1.6}}>
                This gives you a starting score while your real record builds. It is marked self-reported and improves automatically as you add orders.
              </div>
              <Select label="Years in business"
                options={[{value:"",label:"Select…"},"Less than 1 year","1–3 years","3–5 years","5–10 years","10+ years"]}
                value={yearsInBusiness} onChange={e=>setYearsInBusiness(e.target.value)}/>
              <Input label="Approx. monthly orders" type="number" inputMode="numeric"
                value={monthlyOrders} onChange={e=>setMonthlyOrders(e.target.value)} placeholder="e.g. 15"/>
              <Input label="Approx. monthly revenue (₦)" type="number" inputMode="numeric"
                value={monthlyRevenue} onChange={e=>setMonthlyRevenue(e.target.value)} placeholder="e.g. 150000"/>
              {hasSelfData&&(
                <div style={{background:"rgba(52,199,89,0.08)",border:"1px solid rgba(52,199,89,0.2)",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.green}}>Starting BOSS score: {selfScore} / 30 ⭐</div>
                  <div style={{fontSize:11,color:C.sub,marginTop:2}}>Self-reported · Grows automatically with real orders</div>
                </div>
              )}
            </div>
          )}

          <button className="tap" onClick={go} disabled={!shop.trim()||saving}
            style={{...S.btn,background:C.text,color:"#fff",opacity:!shop.trim()||saving?0.5:1}}>
            {saving?"Setting up…":"Start Using BOSS →"}
          </button>
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


// ─────────────────────────────────────────
// SETTINGS TAB — Full Control Center
// Sections: Profile · Security · Data & Backup · Tools
// ─────────────────────────────────────────
export function ProfileTab(){
  const{tailor,setTailor,customers}=useBOSS();
  const[section,setSection]=useState(null); // null=home | 'edit'|'security'|'data'|'tools'|'about'
  const[shop,setShop]=useState(tailor?.shop||"");
  const[phone,setPhone]=useState(tailor?.phone||"");
  const[city,setCity]=useState(tailor?.city||"");
  const[saved,setSaved]=useState(false);

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

  const ts=computeTrustScore(customers);
  const orders=useMemo(()=>allOrders(customers),[customers]);

  async function saveProfile(){
    const t={...(tailor||{}),shop:shop.trim(),phone:phone.trim(),city:city.trim()};
    await db.setTailor(t);setTailor(t);setSaved(true);
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

      {/* BLOCK 3 — SETTINGS MENU */}
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

    </div>
  );
}

// ─────────────────────────────────────────
// EARNINGS TAB
// ─────────────────────────────────────────
export function EarningsTab(){
  const{customers}=useBOSS();
  const earnings=useMemo(()=>computeEarnings(customers),[customers]);
  const { totalCollected, totalOwed, debtors, thisMonth, bestJob, worstJob, totalOrders, paidOrders } = earnings;
  const orders=useMemo(()=>allOrders(customers),[customers]);

  const now=new Date();
  const monthLabel=now.toLocaleString("default",{month:"long",year:"numeric"});

  return(
    <div className="scrollable" style={{padding:16,paddingBottom:40}}>
      <div style={{fontSize:30,fontWeight:900,letterSpacing:"-1px",color:C.text,marginBottom:20}}>Earnings</div>

      {/* Card 1 — Money Collected */}
      <div style={{background:C.s1,borderRadius:20,padding:20,marginBottom:12}}>
        <div style={{fontSize:13,color:C.sub,fontWeight:600,marginBottom:6}}>Money Collected</div>
        <div style={{fontSize:36,fontWeight:900,color:C.text,letterSpacing:"-1px"}}>{fmt(totalCollected)}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:4}}>Your total revenue from all orders</div>
      </div>

      {/* Card 2 — This Month */}
      <div style={{background:C.s1,borderRadius:20,padding:20,marginBottom:12}}>
        <div style={{fontSize:13,color:C.sub,fontWeight:600}}>Collected This Month</div>
        <div style={{fontSize:28,fontWeight:800,color:C.text}}>{fmt(thisMonth)}</div>
        <div style={{fontSize:12,color:C.muted}}>{monthLabel}</div>
      </div>

      {/* Card 3 — Still Owed */}
      <div style={{background:C.s1,borderRadius:20,padding:20,marginBottom:20}}>
        <div style={{fontSize:13,color:C.sub,fontWeight:600}}>Still Owed to You</div>
        <div style={{fontSize:28,fontWeight:800,color:totalOwed>0?C.red:C.sub}}>{fmt(totalOwed)}</div>
        <div style={{fontSize:12,color:C.muted}}>
          {totalOwed>0?`from ${debtors.length} customer${debtors.length===1?"":"s"}`:"You are all settled up 🎉"}
        </div>
      </div>

      {/* Debtors list */}
      {debtors.length>0&&(
        <>
          <SectionLabel>Who Owes You</SectionLabel>
          {debtors.map(d=>(
            <div key={d.name} style={{
              background:C.s2,borderRadius:14,padding:"14px 16px",marginBottom:8,
              display:"flex",justifyContent:"space-between",alignItems:"center"
            }}>
              <div style={{fontSize:15,fontWeight:700,color:C.text}}>{d.name}</div>
              <div style={{fontSize:15,fontWeight:700,color:C.red}}>{fmt(d.owed)}</div>
            </div>
          ))}
        </>
      )}

      {/* Best and Worst jobs */}
      {bestJob&&worstJob&&bestJob.type!==worstJob.type&&(
        <>
          <SectionLabel>Your Jobs</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:C.s1,borderRadius:16,padding:16}}>
              <div style={{fontSize:11,color:C.sub,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>💪 Best Job</div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>{bestJob.type}</div>
              <div style={{fontSize:14,fontWeight:700,color:C.accent}}>{fmt(bestJob.avg)}</div>
              <div style={{fontSize:11,color:C.muted}}>avg per order</div>
            </div>
            <div style={{background:C.s1,borderRadius:16,padding:16}}>
              <div style={{fontSize:11,color:C.sub,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>📉 Lowest Pay</div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>{worstJob.type}</div>
              <div style={{fontSize:14,fontWeight:700,color:C.muted}}>{fmt(worstJob.avg)}</div>
              <div style={{fontSize:11,color:C.muted}}>avg per order</div>
            </div>
          </div>
        </>
      )}

      {/* Summary line */}
      <div style={{fontSize:13,color:C.muted,textAlign:"center",marginTop:16}}>
        {totalOrders} orders total · {paidOrders} fully paid
      </div>

      {/* Empty state */}
      {orders.length===0&&(
        <EmptyState icon="💰" title="No earnings yet." sub="Add your first order to start tracking your money." />
      )}
    </div>
  );
}

// ADD CLIENT FLOW  (standalone, separate from order)
// ─────────────────────────────────────────
