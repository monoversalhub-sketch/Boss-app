"use client";
// src/components/boss/cards.jsx — Composite Cards
// TrustScoreCard, TrustScoreSheet, TodayMoneyCard,
// OrderCard, StatusStepper, MeasGrid
import { useState, useMemo, useEffect, useRef } from "react";
import { C, S, STATUSES, getDefaultMeasFields, getMeasSuggestions } from "./tokens";
import { fmt, fmtDate, getBalance, getTotalPaid, getPaymentState, allOrders, orderStatus, isOverdue, isDueToday, computeTrustScore } from "./helpers";
import { Sheet, SectionLabel } from "./ui";
import { useBOSS } from "./context";
import { db } from "../../lib/db";

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
const TODAY_HERO = {background:"#1C1C1E",borderRadius:24,padding:24,display:"flex",flexDirection:"column"};
const TODAY_GRID = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12};
const STAT_LABEL = {fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:4};
const STAT_NUMBER = {fontSize:32,fontWeight:800,color:C.text,lineHeight:1,letterSpacing:"-1px"};
const STAT_SUB = {fontSize:13,color:C.sub,fontWeight:500,marginTop:4};
const ORDER_IMG = {width:80,height:80,borderRadius:12,objectFit:"cover",flexShrink:0,background:C.s3};
const ORDER_PLACEHOLDER = {width:80,height:80,borderRadius:12,background:C.s3,flexShrink:0,...S.flexCenter,fontSize:24};
const ORDER_BODY = {flex:1,...S.col,gap:7};
const ORDER_ROW = {...S.rowBetween,gap:8};
const ORDER_META = {...S.rowBetween,marginTop:4};
const ORDER_BALANCE = {fontSize:14,fontWeight:700};
const BADGE_BASE = {fontSize:13,fontWeight:700,padding:"4px 10px",borderRadius:20,letterSpacing:"0.2px",flexShrink:0};
const PARTIAL_BADGE = {fontSize:13,fontWeight:700,color:"#FF9F0A",background:"rgba(255,159,10,0.1)",padding:"2px 7px",borderRadius:10};
const MEAS_BADGE = {fontSize:13,fontWeight:700,color:C.accent,background:"rgba(0,102,204,0.1)",padding:"2px 7px",borderRadius:10,cursor:"pointer",border:"none",fontFamily:"inherit"};

export function OrderCard({order,onClick}){
  const {customers}=useBOSS();

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
          <div style={S.row}>
            <div style={{fontSize:13,color:C.muted,fontWeight:600}}>📅 {fmtDate(order.date)}</div>
            {(customers||[]).find(c=>c.name===order._cname)?.measurements&&Object.keys((customers||[]).find(c=>c.name===order._cname).measurements).length>0&&(
              <button className="tap" onClick={e=>{e.stopPropagation();onClick?.();}} style={MEAS_BADGE}>📏</button>
            )}
          </div>
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
// MEASUREMENT GRID (renameable, suggestions, custom add)
// ─────────────────────────────────────────
export function MeasGrid({
  measurements,
  onChange,
  gender        = "female",
  measConfig,
  onConfigChange,
  unit          = "inches",
  onUnitToggle,
}) {
  // Priority: tailor's saved config > gender default
  const configKey    = gender === "male" ? "male" : "female";
  const activeFields =
    measConfig?.[configKey] ?? getDefaultMeasFields(gender);
  const suggestions  = getMeasSuggestions(gender);

  // ── State ────────────────────────────────────────────
  const [local, setLocal]               = useState(measurements);
  const [renamingKey, setRenamingKey]   = useState(null);
  const [renameDraft, setRenameDraft]   = useState("");
  const [showPicker, setShowPicker]     = useState(false);
  const [customInput, setCustomInput]   = useState("");
  const timerRef                        = useRef(null);
  const renameInputRef                  = useRef(null);

  useEffect(() => { setLocal(measurements); }, [measurements]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Auto-focus rename input when it appears
  useEffect(() => {
    if (renamingKey && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingKey]);

  // ── Value change (debounced) ─────────────────────────
  function handleValue(k, v) {
    const next = { ...local, [k]: v };
    setLocal(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), 400);
  }

  // ── Config persistence ───────────────────────────────
  function saveConfig(updatedFields) {
    const newConfig = {
      ...(measConfig || {}),
      [configKey]: updatedFields,
    };
    onConfigChange?.(newConfig);
  }

  // ── Rename ───────────────────────────────────────────
  function startRename(field) {
    if (!onConfigChange) return;
    setRenamingKey(field.k);
    setRenameDraft(field.l);
    setShowPicker(false);
  }

  function commitRename() {
    const label = renameDraft.trim();
    if (!label || !renamingKey) {
      setRenamingKey(null);
      return;
    }
    const updated = activeFields.map(f =>
      f.k === renamingKey ? { ...f, l: label } : f
    );
    saveConfig(updated);
    setRenamingKey(null);
  }

  // ── Remove field ─────────────────────────────────────
  function removeField(key) {
    if (activeFields.length <= 1) return;
    const updated = activeFields.filter(f => f.k !== key);
    saveConfig(updated);
    const next = { ...local };
    delete next[key];
    setLocal(next);
    onChange(next);
  }

  // ── Add from suggestion ──────────────────────────────
  function addSuggestion(s) {
    if (activeFields.find(f => f.k === s.k)) return;
    saveConfig([...activeFields, s]);
    setShowPicker(false);
  }

  // ── Add custom term ──────────────────────────────────
  function addCustom() {
    const label = customInput.trim();
    if (!label) return;
    const key = label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 40);
    if (!key || activeFields.find(f => f.k === key)) return;
    saveConfig([...activeFields, { k: key, l: label }]);
    setCustomInput("");
  }

  // ── Reset to gender default ──────────────────────────
  function resetToDefault() {
    saveConfig(getDefaultMeasFields(gender));
    setShowPicker(false);
  }

  // Available suggestions = suggestions not already active
  const available = suggestions.filter(
    s => !activeFields.find(f => f.k === s.k)
  );

  // ─────────────────────────────────────────────────────
  return (
    <div>


      {/* ── Header row ─────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: C.sub, textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          Measurements
          {onConfigChange && (
            <span style={{
              fontSize: 11, color: C.muted,
              fontWeight: 500, marginLeft: 8,
              textTransform: "none", letterSpacing: 0,
            }}>
              · tap label to rename
            </span>
          )}
        </div>


        {/* Unit toggle */}
        {onUnitToggle && (
          <div style={{
            display: "flex",
            background: C.s2,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 3,
            gap: 2,
          }}>
            {["in", "cm"].map(u => {
              const isActive =
                (u === "in" && unit === "inches") ||
                (u === "cm" && unit === "cm");
              return (
                <button
                  key={u}
                  onClick={() =>
                    onUnitToggle(u === "in" ? "inches" : "cm")
                  }
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    border: "none",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: isActive
                      ? C.accent : "transparent",
                    color: isActive ? "#fff" : C.sub,
                    transition: "all 0.15s",
                  }}
                >
                  {u}
                </button>
              );
            })}
          </div>
        )}
      </div>


      {/* ── Field grid ─────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}>
        {activeFields.map(f => (
          <div
            key={f.k}
            style={{
              background: C.s2,
              border: renamingKey === f.k
                ? `1.5px solid ${C.accent}`
                : `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "10px 13px",
              position: "relative",
              transition: "border-color 0.15s",
            }}
          >
            {/* Remove × button */}
            {onConfigChange && renamingKey !== f.k && (
              <button
                onClick={() => removeField(f.k)}
                style={{
                  position: "absolute",
                  top: 6, right: 7,
                  width: 18, height: 18,
                  borderRadius: 5,
                  border: "none",
                  background: "rgba(255,59,48,0.12)",
                  color: "#ff3b30",
                  fontSize: 11,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "inherit",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            )}


            {/* Label — tap to rename */}
            {renamingKey === f.k ? (
              <input
                ref={renameInputRef}
                value={renameDraft}
                onChange={e => setRenameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingKey(null);
                }}
                placeholder="Field name…"
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontSize: 11,
                  fontWeight: 800,
                  color: C.accent,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  width: "100%",
                  padding: 0,
                  fontFamily: "inherit",
                  marginBottom: 2,
                }}
              />
            ) : (
              <div
                onClick={() => startRename(f)}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.sub,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 2,
                  cursor: onConfigChange ? "pointer" : "default",
                  paddingRight: onConfigChange ? 18 : 0,
                  userSelect: "none",
                }}
              >
                {f.l}
              </div>
            )}


            {/* Number input */}
            <input
              type="number"
              inputMode="decimal"
              placeholder="—"
              value={local[f.k] || ""}
              onChange={e => handleValue(f.k, e.target.value)}
              style={{
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 22,
                fontWeight: 700,
                color: C.text,
                width: "100%",
                padding: 0,
                fontFamily: "inherit",
                display: "block",
                marginTop: 2,
              }}
            />


            {/* Unit label */}
            <div style={{
              fontSize: 12,
              color: C.muted,
              fontWeight: 600,
              marginTop: 1,
            }}>
              {unit === "inches" ? "inches" : "cm"}
            </div>
          </div>
        ))}
      </div>


      {/* ── Add field section (only if editable) ───── */}
      {onConfigChange && (
        <div style={{ marginTop: 14 }}>


          {/* Toggle button */}
          <button
            onClick={() => {
              setShowPicker(s => !s);
              setRenamingKey(null);
            }}
            style={{
              width: "100%",
              padding: "13px",
              background: showPicker ? C.s3 : C.s2,
              border: `1px dashed ${C.border}`,
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              color: C.sub,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "-0.2px",
            }}
          >
            {showPicker ? "▲ Close" : "＋ Add field"}
          </button>


          {showPicker && (
            <div style={{
              marginTop: 12,
              padding: "16px",
              background: C.s2,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}>


              {/* Suggestion chips */}
              {available.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.sub,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: 10,
                  }}>
                    Common Fields
                  </div>
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}>
                    {available.map(s => (
                      <button
                        key={s.k}
                        onClick={() => addSuggestion(s)}
                        style={{
                          padding: "8px 14px",
                          background: C.s1,
                          border: `1px solid ${C.border}`,
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.text,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}


              {/* Custom term input */}
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.sub,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 10,
                }}>
                  Custom
                </div>
                <div style={{
                  display: "flex",
                  gap: 8,
                }}>
                  <input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") addCustom();
                    }}
                    placeholder="Type your own field name…"
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      background: C.s1,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 500,
                      color: C.text,
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={addCustom}
                    style={{
                      padding: "10px 16px",
                      background: C.accent,
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>


              {/* Reset to default */}
              <button
                onClick={resetToDefault}
                style={{
                  alignSelf: "flex-start",
                  padding: "8px 16px",
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.sub,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Reset to gender default
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// ADD ORDER FLOW
// ─────────────────────────────────────────
