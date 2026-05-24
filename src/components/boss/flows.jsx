"use client";
// src/components/boss/flows.jsx — Full-screen flows
// AddOrderFlow, OrderDetailFlow, CustomerDetailFlow,
// RemindersFlow, AddClientFlow
import { useState, useEffect, useMemo } from "react";
import { C, S, CLOTH_TYPES, STATUSES, MEAS_FIELDS } from "./tokens";
import { uid, fmt, fmtDate, getBalance, getTotalPaid, getPaymentState, allOrders, orderStatus, waLink, buildReceiptText, buildReminderMsg, buildInvoiceLinkMsg, invoiceUrl } from "./helpers";
import { useBOSS } from "./context";
import { Btn, Input, Select, Textarea, Flow, Sheet, SectionLabel, EmptyState, DatePicker } from "./ui";
import { StatusStepper, MeasGrid, OrderCard } from "./cards";
import { SmartPricingCalculator } from "./tabs";
import { openPaystackPopup } from "../../lib/paystack";
import { db } from "../../lib/db";

export function AddOrderFlow({open,onClose,prefilledCid}){
  const{customers,setCustomers,toast,tailor}=useBOSS();
  const pre=customers.find(c=>c.id===prefilledCid);
  const[name,setName]=useState(pre?.name||"");const[phone,setPhone]=useState(pre?.phone||"");
  const[type,setType]=useState("");const[price,setPrice]=useState("");
  const[deposit,setDeposit]=useState("");const[date,setDate]=useState("");
  const[notes,setNotes]=useState("");const[matches,setMatches]=useState([]);
  const[showCalc,setShowCalc]=useState(false);
  const[isSaving,setIsSaving]=useState(false); // FIX-6: guard against double-tap duplicates
  // Auto-receipt state
  const[receiptPrompt,setReceiptPrompt]=useState(null); // {order, customer}
  useEffect(()=>{
    if(open){const p=customers.find(c=>c.id===prefilledCid);
      setName(p?.name||"");setPhone(p?.phone||"");setType("");setPrice("");setDeposit("");setDate("");setNotes("");setMatches([]);setShowCalc(false);setIsSaving(false);}
  },[open,prefilledCid]);
  function onNameChange(v){setName(v);if(v.length<1){setMatches([]);return;}setMatches(customers.filter(c=>c.name.toLowerCase().includes(v.toLowerCase())).slice(0,5));}
  function pickExisting(c){setName(c.name);setPhone(c.phone||"");setMatches([]);}
  async function save(){
    if(isSaving) return; // FIX-6: block double-tap
    if(!name.trim()){toast("⚠️ Enter customer name");return;}
    if(!date){toast("⚠️ Set a delivery date");return;}
    setIsSaving(true);
    try{
      const order={id:uid(),type,price:parseFloat(price)||0,deposit:parseFloat(deposit)||0,paid:0,date,notes,status:"In Progress",createdAt:new Date().toISOString()};
      const next=[...customers];
      let cust=next.find(c=>c.id===prefilledCid)||next.find(c=>c.name.toLowerCase()===name.trim().toLowerCase());
      const isNewCustomer=!cust;
      if(isNewCustomer){cust={id:uid(),name:name.trim(),phone:phone.trim(),measurements:{},orders:[]};next.push(cust);}
      else{if(phone.trim())cust.phone=phone.trim();}
      cust.orders=[order,...(cust.orders||[])];
      // Optimistic local update immediately
      setCustomers(next);
      // Targeted writes — no full array rewrite
      const tailorId=await db.getTailorId();
      if(tailorId){
        let ok=true;
        if(isNewCustomer){
          const r=await db.addCustomer(cust,tailorId);
          if(!r.ok){ok=false;console.error("[AddOrderFlow] addCustomer failed",r.error);}
        } else if(phone.trim()){
          await db.updateCustomer(cust.id,{phone:phone.trim()});
        }
        if(ok){
          const r=await db.addOrder(order,cust.id,tailorId);
          if(!r.ok){ok=false;console.error("[AddOrderFlow] addOrder failed",r.error);}
        }
        if(!ok) toast("⚠️ Saved locally — sync failed. Check connection.");
      } else {
        toast("⚠️ Saved locally — not signed in.");
      }
      // Auto-receipt: if customer has a phone and a deposit was paid
      const hasPaid=(parseFloat(deposit)||0)>0;
      const hasPhone=!!(cust.phone||"").trim();
      if(hasPaid&&hasPhone){
        setReceiptPrompt({order,customer:{...cust}});
      } else {
        onClose();toast("✅ Order saved!");
      }
    }catch(e){
      console.error("[AddOrderFlow save]",e);
      toast("❌ Could not save. Try again.");
    }finally{
      setIsSaving(false);
    }
  }

  function sendReceipt(){
    if(!receiptPrompt)return;
    const{order,customer}=receiptPrompt;
    const shop=tailor?.shop||"BOSS Shop";
    const va=tailor?.virtual_account_number?{
      number:tailor.virtual_account_number,
      bank:tailor.virtual_bank_name||"Wema Bank",
      name:tailor.virtual_account_name||shop,
    }:null;
    const msg=buildReceiptText(order,customer,shop,va);
    window.open(waLink(customer.phone,msg),"_blank");
    setReceiptPrompt(null);
    onClose();toast("✅ Order saved + receipt sent!");
  }

  function skipReceipt(){
    setReceiptPrompt(null);
    onClose();toast("✅ Order saved!");
  }
  // U-17: Track form completeness — shows a progress bar at the top of the form
  // so the tailor always knows what's left before they can save.
  const progress = useMemo(()=>{
    const fields=[
      !!name.trim(),        // required
      !!phone.trim(),       // optional but shown
      !!type,               // cloth type
      !!(price),            // price entered
      !!date,               // required
    ];
    return Math.round((fields.filter(Boolean).length/fields.length)*100);
  },[name,phone,type,price,date]);

  return(
    <>
    <Flow open={open} onClose={onClose} title="New Order" action={isSaving?"Saving…":"Save"} onAction={isSaving?undefined:save}>
      {/* U-17: Progress bar */}
      <div style={{marginBottom:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:600,color:C.sub}}>Form progress</span>
          <span style={{fontSize:12,fontWeight:700,color:progress===100?C.green:C.accent}}>{progress}%</span>
        </div>
        <div style={{height:4,background:C.s3,borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,borderRadius:4,
            background:progress===100?C.green:C.accent,
            transition:"width 0.3s ease"}}/>
        </div>
      </div>
      {/* BUG FIX: Input was detached from props by a refactor — restored */}
      <div style={{position:"relative"}}>
        <Input label="Search or Add Customer *" value={name} onChange={e=>onNameChange(e.target.value)} placeholder="Type name to search or add new…" autoComplete="off"/>
        {name.length>=1&&matches.length===0&&customers.length>0&&(
          <div style={{fontSize:12,color:C.sub,padding:"5px 4px",fontWeight:500}}>No match — a new customer will be created</div>
        )}
        {matches.length>0&&(
          <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.1)",marginTop:4}}>
            <div style={{padding:"8px 14px 4px",fontSize:10,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.5px"}}>Existing Customers</div>
            {matches.map(c=>(
              <div key={c.id} className="tap" onMouseDown={()=>pickExisting(c)}
                style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:C.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:C.text,flexShrink:0}}>{c.name[0].toUpperCase()}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.text}}>{c.name}</div>
                  <div style={{fontSize:12,color:C.sub,marginTop:1}}>{c.phone||"No phone"} · {(c.orders||[]).length} order{(c.orders||[]).length!==1?"s":""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

      <DatePicker label="Delivery Date *" value={date} onChange={setDate}/>
      <Textarea label="Notes" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Style details, fabric colour, special requests…"/>
    </Flow>

    {/* Auto-receipt prompt — shown after save when customer has a phone + deposit paid */}
    {receiptPrompt&&(
      <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end"}}>
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)"}} onClick={skipReceipt}/>
        <div className="anim-slide" style={{position:"relative",zIndex:1,background:C.s1,borderRadius:"32px 32px 0 0",padding:"28px 24px 48px",width:"100%"}}>
          <div style={{fontSize:24,marginBottom:8,textAlign:"center"}}>🧾</div>
          <div style={{fontSize:19,fontWeight:900,color:C.text,marginBottom:8,textAlign:"center"}}>
            Send receipt to {receiptPrompt.customer.name}?
          </div>
          <div style={{fontSize:14,color:C.sub,lineHeight:1.6,marginBottom:24,textAlign:"center"}}>
            A professional WhatsApp receipt with their order details and your payment account. One tap — they get it instantly.
          </div>
          <Btn variant="wa" onClick={sendReceipt} style={{marginBottom:12}}>
            <span>💬</span> Send on WhatsApp
          </Btn>
          <Btn variant="outline" onClick={skipReceipt}>Skip for now</Btn>
        </div>
      </div>
    )}
    </>
  );
}

// ─────────────────────────────────────────
// ORDER DETAIL FLOW  (with Paystack)
// ─────────────────────────────────────────
export function OrderDetailFlow({open,onClose,orderId,tailor}){
  const{customers,setCustomers,toast}=useBOSS();
  const[payAmt,setPayAmt]=useState("");
  const[confirmDelete,setConfirmDelete]=useState(false); // U-02: prevents accidental deletes
  const found=(()=>{for(const c of customers){const o=(c.orders||[]).find(x=>x.id===orderId);if(o)return{order:o,customer:c};}return null;})();
  if(!found)return null;
  const{order,customer}=found;
  const bal=getBalance(order);const paid=(parseFloat(order.deposit)||0)+(parseFloat(order.paid)||0);
  const shop=tailor?.shop||"BOSS Shop";
  async function updateOrder(patch){
    // Optimistic UI update
    const next=customers.map(c=>({...c,orders:(c.orders||[]).map(o=>o.id===orderId?{...o,...patch}:o)}));
    setCustomers(next);
    // Targeted single-row write — no N+1 loop
    await db.updateOrder(orderId, patch);
  }
  async function updateMeas(meas){
    const next=customers.map(c=>c.id===customer.id?{...c,measurements:meas}:c);
    setCustomers(next);
    await db.updateCustomer(customer.id, {measurements: meas});
  }
  async function recordPay(){
    const amt=parseFloat(payAmt);if(!amt||amt<=0){toast("⚠️ Enter an amount");return;}
    if(amt>bal){toast("⚠️ Amount exceeds balance of "+fmt(bal));return;}
    const newPaid=(parseFloat(order.paid)||0)+amt;
    // Add to installment history
    const installment={id:uid(),amount:amt,date:new Date().toISOString(),method:"cash"};
    const history=[...(order.installmentHistory||[]),installment];
    await updateOrder({paid:newPaid,installmentHistory:history});
    // Write to payments audit table
    await db.recordPayment({orderId:order.id,amount:amt,method:"cash"});
    setPayAmt("");
    const state=getPaymentState({...order,paid:newPaid});
    toast(state==="fully_paid"?"✅ Fully paid! Great work. 🎉":"✅ Payment recorded — "+fmt(getBalance({...order,paid:newPaid}))+" remaining");
  }
  async function deleteOrder(){
    // Optimistic local update first
    const next=customers.map(c=>({...c,orders:(c.orders||[]).filter(o=>o.id!==orderId)}));
    setCustomers(next);
    // Targeted single-row delete — no N+1 loop
    await db.deleteOrder(orderId);
    onClose();
    toast("Order deleted");
  }
  function waMsg(msg){window.open(waLink(customer.phone,msg),"_blank");}
  function waReady(){waMsg(`Hello *${customer.name}*! 🎉\n\nYour *${order.type||"order"}* is ready o! You can come pick it up anytime from *${shop}*.\n\nWe can't wait for you to see it! 🙏`);}
  function waReminder(){waMsg(buildReminderMsg(order,customer,shop));}
  function waReceipt(){waMsg(buildReceiptText(order,customer,shop,true));}
  function waInvoiceLink(){waMsg(buildInvoiceLinkMsg(order,customer,shop));}
  function copyInvoiceLink(){
    const url=invoiceUrl(order.id);
    if(navigator.clipboard){navigator.clipboard.writeText(url).then(()=>toast("✅ Invoice link copied!"));}
    else{toast("Link: "+url);}
  }

  // Collect payment via Paystack popup (card).
  // No subaccountCode — money goes to BOSS Paystack balance,
  // credited to tailor wallet by webhook.
  function collectOnline(){
    if(bal<=0){toast("No balance to collect");return;}
    // U-06: On mobile, Paystack iframe is often blocked by Android WebView.
    // Send the customer the invoice link to pay via Paystack's redirect flow.
    if(window.innerWidth<768){
      const url=invoiceUrl(order.id);
      navigator.clipboard?.writeText(url).catch(()=>{});
      toast("📋 Invoice link copied — send to customer to pay online");
      return;
    }
    openPaystackPopup({
      email:`${(customer.phone||"boss").replace(/\D/g,"")}@boss.app`,
      amount:bal,name:customer.name,phone:customer.phone,
      ref:`BOSS_${order.id}_${Date.now()}`,
      onSuccess:async(ref)=>{
        const installment={id:uid(),amount:bal,date:new Date().toISOString(),method:"paystack",ref};
        const history=[...(order.installmentHistory||[]),installment];
        await updateOrder({paid:(parseFloat(order.paid)||0)+bal,paystackRef:ref,installmentHistory:history});
        await db.recordPayment({orderId:order.id,amount:bal,method:"paystack",paystackRef:ref});
        toast("✅ Payment confirmed! "+fmt(bal));
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
    <>
    <Flow open={open} onClose={onClose} title={customer.name}>
      <StatusStepper status={orderStatus(order)} onChange={s=>{updateOrder({status:s});toast("✅ "+s);}}/>
      <div style={{...S.card,display:"flex",flexDirection:"column"}}>
        <Row label="Customer"    value={customer.name}/>
        <Row label="Phone"       value={customer.phone||"—"} valueStyle={{color:C.accent}}/>
        <Row label="Cloth Type"  value={order.type||"—"}/>
        <Row label="Delivery"    value={fmtDate(order.date)}/>
        <Row label="Total Price" value={fmt(order.price)}/>
        <Row label="Paid So Far" value={fmt(paid)} valueStyle={{color:C.green}}/>
        <Row label="Balance Due" value={bal>0?fmt(bal):"Fully Paid ✓"} valueStyle={{color:bal>0?C.red:C.green}}/>
        <Row label="Payment Status" value={
          getPaymentState(order)==="fully_paid"?"✅ Fully Paid":
          getPaymentState(order)==="partially_paid"?"🔶 Partial — "+Math.round((getTotalPaid(order)/Math.max(order.price,1))*100)+"%":
          "⬜ Unpaid"
        } valueStyle={{fontWeight:700,color:getPaymentState(order)==="fully_paid"?C.green:getPaymentState(order)==="partially_paid"?"#FF9F0A":C.red}}/>
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
          <div style={{fontSize:12,color:C.muted||C.sub,marginTop:6,lineHeight:1.5}}>
            Customer sees your shop name, full order breakdown, and can pay their balance online.
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Btn variant="wa" onClick={waInvoiceLink} style={{fontSize:13}}><span>🔗</span> Send on WhatsApp</Btn>
          <Btn variant="outline" onClick={copyInvoiceLink} style={{fontSize:13}}>📋 Copy Link</Btn>
        </div>
      </div>

      {/* ── Collect full balance online (direct popup) ── */}
      {bal>0&&(
        <div>
          <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Collect Payment Now</SectionLabel>
          <Btn variant="primary" onClick={collectOnline} style={{background:"#0EA5E9",color:"#fff"}}>
            💳 Open Paystack Here — Collect {fmt(bal)}
          </Btn>
          <div style={{fontSize:12,color:C.sub,textAlign:"center",marginTop:8,lineHeight:1.5}}>
            Use this if the customer is with you in person or on a call. Opens the Paystack popup directly on this device.
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

      {/* Installment History */}
      {(order.installmentHistory||[]).length>0&&(
        <div>
          <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Payment History</SectionLabel>
          <div style={{...S.card,display:"flex",flexDirection:"column",gap:0}}>
            {/* Initial deposit */}
            {(parseFloat(order.deposit)||0)>0&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>Initial Deposit</div>
                  <div style={{fontSize:12,color:C.sub}}>At booking</div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:C.green}}>{fmt(order.deposit)}</div>
              </div>
            )}
            {(order.installmentHistory||[]).map((inst,i)=>(
              <div key={inst.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>Payment {i+1}</div>
                  <div style={{fontSize:12,color:C.sub}}>{inst.method==="cash"?"Cash":inst.method} · {fmtDate(inst.date?.slice(0,10))}</div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:C.green}}>{fmt(inst.amount)}</div>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0"}}>
              <div style={{fontSize:13,fontWeight:800,color:C.text}}>Total Paid</div>
              <div style={{fontSize:15,fontWeight:900,color:C.green}}>{fmt(getTotalPaid(order))}</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Measurements (inches)</SectionLabel>
        <MeasGrid measurements={customer.measurements||{}} onChange={m=>{updateMeas(m);toast("✅ Saved");}}/>
      </div>

      {/* Delete — at the bottom, far from accidental taps. Never in the header. */}
      <button className="tap" onClick={()=>setConfirmDelete(true)}
        style={{width:"100%",padding:"15px",borderRadius:14,fontSize:14,fontWeight:700,
          border:"1.5px solid rgba(255,59,48,0.2)",cursor:"pointer",
          background:"rgba(255,59,48,0.05)",color:C.red,fontFamily:"inherit",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        🗑 Delete This Order
      </button>
    </Flow>

    {/* U-02: Delete confirmation — prevents accidental permanent data loss */}
    {confirmDelete&&(
      <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"flex-end"}}>
        <div onClick={()=>setConfirmDelete(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)"}}/>
        <div className="anim-slide" style={{position:"relative",zIndex:1,background:C.s1,borderRadius:"32px 32px 0 0",padding:"28px 24px 48px",width:"100%"}}>
          <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:10}}>Delete this order?</div>
          <div style={{fontSize:14,color:C.sub,lineHeight:1.6,marginBottom:24}}>
            This cannot be undone. The customer's measurements and all payment records for this order will be permanently lost.
          </div>
          <Btn variant="danger" onClick={deleteOrder} style={{marginBottom:12}}>Yes, Delete Order</Btn>
          <Btn variant="outline" onClick={()=>setConfirmDelete(false)}>Cancel</Btn>
        </div>
      </div>
    )}
    </>
  );
}

// ─────────────────────────────────────────
// CUSTOMER DETAIL FLOW
// ─────────────────────────────────────────
export function CustomerDetailFlow({open,onClose,customerId,onAddOrder,onOpenOrder}){
  const{customers,setCustomers,toast}=useBOSS();
  const customer=customers.find(c=>c.id===customerId);

  // Edit state
  const[editing,setEditing]=useState(false);
  const[editName,setEditName]=useState("");
  const[editPhone,setEditPhone]=useState("");
  const[saving,setSaving]=useState(false);
  const[confirmDel,setConfirmDel]=useState(false);
  const[deleting,setDeleting]=useState(false);

  // Pre-fill edit form when customer loads or changes
  useEffect(()=>{
    if(customer){setEditName(customer.name||"");setEditPhone(customer.phone||"");}
  },[customer?.id]);

  if(!customer)return null;

  const orders=customer.orders||[];
  const totalSpent=orders.reduce((s,o)=>s+(parseFloat(o.deposit)||0)+(parseFloat(o.paid)||0),0);
  const outstanding=orders.reduce((s,o)=>s+getBalance(o),0);

  async function saveEdit(){
    if(!editName.trim()){toast("⚠️ Name cannot be empty");return;}
    setSaving(true);
    const patch={name:editName.trim(),phone:editPhone.trim()};
    const next=customers.map(c=>c.id===customerId?{...c,...patch}:c);
    setCustomers(next);
    await db.updateCustomer(customerId,patch);
    setSaving(false);setEditing(false);
    toast("✅ Customer updated");
  }

  async function deleteCustomer(){
    setDeleting(true);
    const next=customers.filter(c=>c.id!==customerId);
    setCustomers(next);
    await db.deleteCustomer(customerId);
    setDeleting(false);setConfirmDel(false);
    onClose();toast("Customer deleted");
  }

  async function updateMeas(meas){
    const next=customers.map(c=>c.id===customerId?{...c,measurements:meas}:c);
    setCustomers(next);
    await db.updateCustomer(customerId,{measurements:meas});
  }

  const Row=({label,value,valueStyle={}})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:13,color:C.sub}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,...valueStyle}}>{value}</div>
    </div>
  );

  return(
    <>
    <Flow
      open={open}
      onClose={onClose}
      title={editing?"Edit Customer":customer.name}
      action={editing?(saving?"Saving…":"Save"):null}
      onAction={editing?(saving?undefined:saveEdit):null}
    >
      {editing?(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Input
            label="Customer Name *"
            value={editName}
            onChange={e=>setEditName(e.target.value)}
            placeholder="Full name"
          />
          <Input
            label="Phone Number"
            value={editPhone}
            onChange={e=>setEditPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            placeholder="080XXXXXXXX"
          />
          <Btn variant="primary" onClick={saveEdit} disabled={saving}>
            {saving?"Saving…":"Save Changes"}
          </Btn>
          <Btn variant="outline" onClick={()=>setEditing(false)}>Cancel</Btn>
        </div>
      ):(
        <>
          <div style={S.card}>
            <Row label="Phone"        value={customer.phone||"—"} valueStyle={{color:C.accent}}/>
            <Row label="Total Orders" value={orders.length}/>
            <Row label="Total Spent"  value={fmt(totalSpent)}/>
            <Row label="Outstanding"  value={fmt(outstanding)} valueStyle={{color:outstanding>0?C.red:C.green}}/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Btn variant="outline" onClick={()=>setEditing(true)}>✏️ Edit Details</Btn>
            <Btn variant="danger" onClick={()=>setConfirmDel(true)}>🗑️ Delete</Btn>
          </div>

          <div>
            <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Saved Measurements</SectionLabel>
            <MeasGrid measurements={customer.measurements||{}} onChange={m=>{updateMeas(m);toast("✅ Saved");}}/>
          </div>

          <div>
            <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Order History</SectionLabel>
            {orders.length===0
              ?<EmptyState icon="📋" title="No orders yet" sub="Tap + Order to create the first one."/>
              :[...orders].reverse().map(o=>(
                  <div key={o.id} style={{marginBottom:10}}>
                    <OrderCard order={{...o,_cname:customer.name,_cphone:customer.phone}} onClick={()=>onOpenOrder(o.id)}/>
                  </div>
                ))
            }
          </div>
        </>
      )}
    </Flow>

    {confirmDel&&(
      <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end"}}>
        <div
          style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}
          onClick={()=>setConfirmDel(false)}
        />
        <div className="anim-slide" style={{
          position:"relative",zIndex:1,background:C.s1,
          borderRadius:"28px 28px 0 0",padding:"24px 20px 48px",width:"100%",
        }}>
          <div style={{width:40,height:4,background:C.s3,borderRadius:4,margin:"0 auto 20px"}}/>
          <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>
            Delete {customer.name}?
          </div>
          <div style={{fontSize:13,color:C.sub,lineHeight:1.7,marginBottom:20}}>
            This will permanently delete <strong>{customer.name}</strong> and all <strong>{orders.length} order{orders.length!==1?"s":""}</strong> linked to them. This cannot be undone.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Btn variant="danger" onClick={deleteCustomer} disabled={deleting}>
              {deleting?"Deleting…":"Yes, Delete Customer & All Orders"}
            </Btn>
            <Btn variant="outline" onClick={()=>setConfirmDel(false)}>Cancel — Keep Customer</Btn>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export function RemindersFlow({open,onClose}){
  const{customers,tailor}=useBOSS();
  const shop=tailor?.shop||"BOSS Shop";
  const orders=allOrders(customers).filter(o=>getBalance(o)>0&&orderStatus(o)!=="Delivered");
  function send(o){
    // Builds reminder with invoice link so customer can pay directly
    const msg=buildReminderMsg(o,{name:o._cname,phone:o._cphone},shop);
    window.open(waLink(o._cphone,msg),"_blank");
  }
  function copyLink(o){
    const url=invoiceUrl(o.id);
    if(navigator.clipboard){navigator.clipboard.writeText(url).then(()=>toast("✅ Invoice link copied!"));}
    else{toast("Link: "+url);}
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
// ─────────────────────────────────────────
// SMART PRICING ENGINE (Feature 1)
// ─────────────────────────────────────────



export function AddClientFlow({open,onClose,onDone}){
  const{customers,setCustomers,toast}=useBOSS();
  const[name,setName]=useState("");
  const[phone,setPhone]=useState("");
  const[gender,setGender]=useState("female");
  const[meas,setMeas]=useState({});
  const[isSaving,setIsSaving]=useState(false); // FIX-6: prevent double-tap duplicates

  useEffect(()=>{if(open){setName("");setPhone("");setGender("female");setMeas({});setIsSaving(false);}},[open]);

  async function save(){
    if(isSaving) return;
    if(!name.trim()){toast("⚠️ Enter client name");return;}
    setIsSaving(true);
    try{
      const c={id:uid(),name:name.trim(),phone:phone.trim(),gender,measurements:meas,orders:[],createdAt:new Date().toISOString()};
      const next=[c,...customers];
      // Optimistic local update first
      setCustomers(next);
      // Targeted single INSERT — not full array rewrite
      const tailorId=await db.getTailorId();
      if(tailorId){
        const r=await db.addCustomer(c,tailorId);
        if(!r.ok) toast("⚠️ Client saved locally — sync failed. Check connection.");
      } else {
        toast("⚠️ Client saved locally — not signed in.");
      }
      toast("✅ Client saved!");onDone(c.id);
    }catch(e){
      console.error("[AddClientFlow save]",e);
      toast("❌ Could not save. Try again.");
    }finally{
      setIsSaving(false);
    }
  }

  return(
    <Flow open={open} onClose={onClose} title="New Client" action={isSaving?"Saving…":"Save"} onAction={isSaving?undefined:save}>
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
