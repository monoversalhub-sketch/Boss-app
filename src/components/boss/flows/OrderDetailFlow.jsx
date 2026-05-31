"use client";
// src/components/boss/flows/OrderDetailFlow.jsx
import { useState, useRef } from "react";
import { C, S } from "../tokens";
import { uid, fmt, fmtDate, getBalance, getTotalPaid, getPaymentState, orderStatus, waLink, buildReceiptText, buildReminderMsg } from "../helpers";
import { useBOSS } from "../context";
import { Btn, Input, Flow, SectionLabel } from "../ui";
import { StatusStepper, MeasGrid } from "../cards";
import { db } from "../../../lib/db";

export function OrderDetailFlow({open,onClose,orderId,tailor}){
  const{customers,setCustomers,toast}=useBOSS();
  const[payAmt,setPayAmt]=useState("");
  const[confirmDelete,setConfirmDelete]=useState(false);
  const[lightboxUrl,setLightboxUrl]=useState(null);
  const photoInputRef=useRef(null);
  const found=(()=>{for(const c of customers){const o=(c.orders||[]).find(x=>x.id===orderId);if(o)return{order:o,customer:c};}return null;})();
  if(!found)return null;
  const{order,customer}=found;
  const bal=getBalance(order);const paid=(parseFloat(order.deposit)||0)+(parseFloat(order.paid)||0);
  const shop=tailor?.shop||"BOSS Shop";
  async function updateOrder(patch){
    const next=customers.map(c=>({...c,orders:(c.orders||[]).map(o=>o.id===orderId?{...o,...patch}:o)}));
    setCustomers(next);
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
    const installment={id:uid(),amount:amt,date:new Date().toISOString(),method:"cash"};
    const history=[...(order.installmentHistory||[]),installment];
    await updateOrder({paid:newPaid,installmentHistory:history});
    await db.recordPayment({orderId:order.id,amount:amt,method:"cash"});
    setPayAmt("");
    const state=getPaymentState({...order,paid:newPaid});
    toast(state==="fully_paid"?"✅ Fully paid! Great work. 🎉":"✅ Payment recorded — "+fmt(getBalance({...order,paid:newPaid}))+" remaining");
  }
  async function deleteOrder(){
    const next=customers.map(c=>({...c,orders:(c.orders||[]).filter(o=>o.id!==orderId)}));
    setCustomers(next);
    await db.deleteOrder(orderId);
    onClose();
    toast("Order deleted");
  }
  const vaDetails = tailor?.account_number ? {
    number: tailor.account_number,
    bank:   tailor.bank_name || "",
    name:   tailor.account_name || "",
  } : null;

  function waMsg(msg){window.open(waLink(customer.phone,msg),"_blank");}
  function waReady(){waMsg(`Hello *${customer.name}*! 🎉\n\nYour *${order.type||"order"}* is ready o! You can come pick it up anytime from *${shop}*.\n\nWe can't wait for you to see it! 🙏`);}
  function waReminder(){waMsg(buildReminderMsg(order,customer,shop,vaDetails));}
  function waReceipt(){waMsg(buildReceiptText(order,customer,shop,vaDetails));}
  const Row=({label,value,valueStyle={}})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:13,color:C.sub,fontWeight:500}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,textAlign:"right",...valueStyle}}>{value}</div>
    </div>
  );
  const payStateIcon = getPaymentState(order)==="fully_paid"?"✅":
    getPaymentState(order)==="partially_paid"?"🔶":"⬜";
  const payStateText = getPaymentState(order)==="fully_paid"?"Fully Paid":
    getPaymentState(order)==="partially_paid"?"Partial — "+Math.round((getTotalPaid(order)/Math.max(order.price,1))*100)+"%":
    "Unpaid";
  const payStateColor = getPaymentState(order)==="fully_paid"?C.green:
    getPaymentState(order)==="partially_paid"?"#FF9F0A":C.red;
  return(
    <>
    <Flow open={open} onClose={onClose} title={`${customer.name} — ${fmt(order.price)}`}>
      {/* ── Money Zone ── */}
      <div style={{background:`linear-gradient(135deg,${C.dark},${C.s1})`,borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 20px 12px"}}>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:"-0.5px",color:C.text}}>{fmt(order.price)}</div>
          <div style={{fontSize:13,fontWeight:700,color:payStateColor,padding:"4px 10px",borderRadius:20,background:payStateColor+"14"}}>{payStateIcon} {payStateText}</div>
        </div>
        <div style={{display:"flex",gap:0,borderTop:`1px solid ${C.border}`}}>
          <div style={{flex:1,padding:"14px 20px",borderRight:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,color:C.sub,fontWeight:600,marginBottom:2}}>Paid</div>
            <div style={{fontSize:20,fontWeight:900,color:C.green}}>{fmt(paid)}</div>
          </div>
          <div style={{flex:1,padding:"14px 20px"}}>
            <div style={{fontSize:12,color:C.sub,fontWeight:600,marginBottom:2}}>Balance</div>
            <div style={{fontSize:20,fontWeight:900,color:bal>0?C.red:C.green}}>{bal>0?fmt(bal):"✓ None"}</div>
          </div>
        </div>
      </div>

      {/* ── Record Cash Payment ── */}
      {bal>0&&(
        <div>
          <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Record Cash Payment</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}>
            <Input value={payAmt} onChange={e=>setPayAmt(e.target.value)} type="number" inputMode="numeric" placeholder="Amount (₦)" label="Amount"/>
            <Btn variant="green" onClick={recordPay} style={{width:"auto",padding:"13px 20px"}}>Record ✓</Btn>
          </div>
        </div>
      )}

      {/* ── Payment History ── */}
      {(order.installmentHistory||[]).length>0&&(
        <div>
          <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Payment History</SectionLabel>
          <div style={{...S.card,display:"flex",flexDirection:"column",gap:0}}>
            {(parseFloat(order.deposit)||0)>0&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>Initial Deposit</div>
                  <div style={{fontSize:13,color:C.sub}}>At booking</div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:C.green}}>{fmt(order.deposit)}</div>
              </div>
            )}
            {(order.installmentHistory||[]).map((inst,i)=>(
              <div key={inst.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>Payment {i+1}</div>
                  <div style={{fontSize:13,color:C.sub}}>{inst.method==="cash"?"Cash":inst.method} · {fmtDate(inst.date?.slice(0,10))}</div>
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

      {/* ── Status Stepper ── */}
      <StatusStepper status={orderStatus(order)} onChange={s=>{updateOrder({status:s});toast("✅ "+s);}}/>

      {/* ── Order Info ── */}
      <div style={{...S.card,display:"flex",flexDirection:"column"}}>
        <Row label="Customer"    value={customer.name}/>
        <Row label="Phone"       value={customer.phone||"—"} valueStyle={{color:C.accent}}/>
        <Row label="Cloth Type"  value={order.type||"—"}/>
        <Row label="Delivery"    value={fmtDate(order.date)}/>
        {order.notes&&<Row label="Notes" value={order.notes} valueStyle={{fontSize:13,fontWeight:500,color:C.sub}}/>}
      </div>

      {/* ── Style Photos ── */}
      <div>
        <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Style Photos</SectionLabel>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:8}}>
          {(order.imageUrls||[]).map((url,i)=>(
            <div key={i} className="tap" onClick={()=>setLightboxUrl(url)}
              style={{aspectRatio:1,borderRadius:12,overflow:"hidden",background:C.s3,cursor:"pointer",position:"relative"}}>
              <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
            </div>
          ))}
          {(order.imageUrls?.length||0) < 5 && (
            <button onClick={()=>photoInputRef.current?.click()}
              style={{aspectRatio:1,borderRadius:12,border:`1.5px dashed ${C.border2}`,background:C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:C.sub,cursor:"pointer",fontFamily:"inherit"}}>
              +
            </button>
          )}
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={async (e)=>{
          const files=Array.from(e.target.files||[]); e.target.value="";
          if(!files.length)return;
          const tailorId=await db.getTailorId();
          if(!tailorId)return;
          const urls=await db.uploadOrderImages(tailorId, order.id, files);
          if(urls.length){
            const next=[...(order.imageUrls||[]),...urls].slice(0,5);
            await updateOrder({imageUrls:next});
            toast("✅ "+(urls.length===1?"Photo added":"Photos added"));
          }
        }}/>
      </div>

      {/* ── Payment Details for Receipts ── */}
      {vaDetails && (
        <div>
          <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Payment Details for Receipts</SectionLabel>
          <div style={{...S.card,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:13,color:C.sub,fontWeight:500}}>Bank: <span style={{fontWeight:700,color:C.text}}>{vaDetails.bank}</span></div>
            <div style={{fontSize:13,color:C.sub,fontWeight:500}}>Account: <span style={{fontWeight:700,color:C.text}}>{vaDetails.number}</span></div>
            <div style={{fontSize:13,color:C.sub,fontWeight:500}}>Name: <span style={{fontWeight:700,color:C.text}}>{vaDetails.name}</span></div>
          </div>
        </div>
      )}

      {/* ── WhatsApp Messages ── */}
      <div>
        <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>WhatsApp Messages</SectionLabel>
        <Btn variant="wa" onClick={waReady}><span>💬</span> Order Ready for Pickup</Btn>
        <div style={{height:10}}/>
        <Btn variant="wa" onClick={waReminder}><span>📲</span> Payment Reminder + Link</Btn>
        <div style={{height:10}}/>
        <Btn variant="wa" onClick={waReceipt}><span>🧾</span> Full Receipt + Link</Btn>
      </div>

      {/* ── Measurements ── */}
      <div>
        <SectionLabel style={{padding:0,marginTop:0,marginBottom:12}}>Measurements (inches)</SectionLabel>
        <MeasGrid measurements={customer.measurements||{}} onChange={m=>{updateMeas(m);toast("✅ Saved");}}/>
      </div>

      {/* ── Delete ── */}
      <button className="tap" onClick={()=>setConfirmDelete(true)}
        style={{width:"100%",padding:"15px",borderRadius:14,fontSize:14,fontWeight:700,
          border:"1.5px solid rgba(255,59,48,0.2)",cursor:"pointer",
          background:"rgba(255,59,48,0.05)",color:C.red,fontFamily:"inherit",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        🗑 Delete This Order
      </button>
    </Flow>
    {lightboxUrl&&(
      <div onClick={()=>setLightboxUrl(null)} style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <img src={lightboxUrl} alt="" style={{maxWidth:"92%",maxHeight:"92%",borderRadius:12,objectFit:"contain"}}/>
        <button onClick={(e)=>{e.stopPropagation(); db.removeOrderImage(lightboxUrl).then(()=>{
          const next=(order.imageUrls||[]).filter(u=>u!==lightboxUrl);
          updateOrder({imageUrls:next});
          setLightboxUrl(null);
          toast("🗑 Photo removed");
        });}} style={{position:"absolute",bottom:40,left:"50%",transform:"translateX(-50%)",background:"rgba(255,59,48,0.8)",color:"#fff",border:"none",borderRadius:24,padding:"12px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          🗑 Delete Photo
        </button>
        <button onClick={()=>setLightboxUrl(null)} style={{position:"absolute",top:20,right:20,width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
    )}
    {confirmDelete&&(
      <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"flex-end"}}>
        <div onClick={()=>setConfirmDelete(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)"}}/>
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
