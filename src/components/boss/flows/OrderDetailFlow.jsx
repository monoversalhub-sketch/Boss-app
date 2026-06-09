"use client";
import { useState, useRef } from "react";
import { C } from "../tokens";
import { uid, fmt, fmtDate, getBalance, getTotalPaid, getPaymentState, orderStatus, isOverdue, isDueToday, vibrate, waLink, buildReceiptText, buildReminderMsg, addToDeviceCalendar, invoiceUrl } from "../helpers";
import { useBOSS } from "../context";
import { Btn, Input } from "../ui";
import { StatusStepper, MeasGrid } from "../cards";
import { db } from "../../../lib/db";
import { feedback } from "../../../lib/feedback";

const cardStyle = {
  backgroundColor: C.s1, borderRadius: 16, padding: 16, marginBottom: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

export function OrderDetailFlow({open,onClose,orderId,tailor,onFeedbackTrigger}){
  const{customers,setCustomers,toast}=useBOSS();
  const[payAmt,setPayAmt]=useState("");
  const[confirmDelete,setConfirmDelete]=useState(false);
  const[lightboxUrl,setLightboxUrl]=useState(null);
  const[heroIndex,setHeroIndex]=useState(0);
  const photoInputRef=useRef(null);
  const payRef=useRef(null);
  const[receiptPrompt,setReceiptPrompt]=useState(null);
  const found=(()=>{for(const c of customers){const o=(c.orders||[]).find(x=>x.id===orderId);if(o)return{order:o,customer:c};}return null;})();
  if(!found||!open)return null;
  const{order,customer}=found;
  const bal=getBalance(order);const paid=(parseFloat(order.deposit)||0)+(parseFloat(order.paid)||0);
  const shop=tailor?.shop||"BOSS Shop";
  async function updateOrder(patch){
    const next=customers.map(c=>({...c,orders:(c.orders||[]).map(o=>o.id===orderId?{...o,...patch}:o)}));
    setCustomers(next);
    await db.updateOrder(orderId, patch);
    const rt = tailor?.google_drive_refresh_token;
    if (rt && patch.date && patch.date !== order.date) {
      fireCalendarSync("update");
    }
    if (rt && patch.status === "Delivered" && order.google_event_id) {
      fireCalendarSync("delete");
    }
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

    const isFirstPayment = !localStorage.getItem("boss_feedback_micro_payment");
    if (isFirstPayment) {
      feedback.markMicroShown("micro_first_payment");
      onFeedbackTrigger?.("payment_recorded");
    }

    const state=getPaymentState({...order,paid:newPaid});
    if (state === "fully_paid") vibrate([8, 50, 8, 50, 16]);
    else vibrate([8, 60, 8]);
    toast(state==="fully_paid"?"✅ Fully paid! Great work. 🎉":"✅ Payment recorded — "+fmt(getBalance({...order,paid:newPaid}))+" remaining");

    const hasPhone=!!(customer.phone||"").trim();
    if(hasPhone){
      setTimeout(()=>setReceiptPrompt({order:{...order,paid:newPaid},customer}),1000);
    }
  }
  async function deleteOrder(){
    if (tailor?.google_drive_refresh_token && order.google_event_id) {
      fireCalendarSync("delete");
    }
    const next=customers.map(c=>({...c,orders:(c.orders||[]).filter(o=>o.id!==orderId)}));
    setCustomers(next);
    await db.deleteOrder(orderId);
    vibrate(40);
    onClose();
    toast("Order deleted");
  }
  function fireCalendarSync(action){
    fetch("/api/calendar/sync", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({orderId, customerId:customer.id, action}),
    }).then(r=>r.json()).then(d=>{
      if(!d.ok)console.warn("[calendar] sync failed", d.error);
    }).catch(e=>console.error("[calendar] sync error", e));
  }
  const vaDetails = tailor?.account_number ? {
    number: tailor.account_number,
    bank:   tailor.bank_name || "",
    name:   tailor.account_name || "",
  } : null;

  function waMsg(msg){vibrate(6); window.open(waLink(customer.phone,msg),"_blank");}
  function waReady(){waMsg(`Hello *${customer.name}*! 🎉\n\nYour *${order.type||"order"}* is ready o! You can come pick it up anytime from *${shop}*.\n\nWe can't wait for you to see it! 🙏`);}
  function waReminder(){waMsg(buildReminderMsg(order,customer,shop,vaDetails));}
  function waReceipt(){
    waMsg(buildReceiptText(order,customer,shop,vaDetails));
    const isFirstReceipt = !localStorage.getItem("boss_feedback_micro_receipt");
    if (isFirstReceipt) {
      feedback.markMicroShown("micro_first_receipt");
      setTimeout(() => onFeedbackTrigger?.("first_receipt"), 2000);
    }
  }
  const VoiceNotePlayer=({url})=>{
    const [playing,setPlaying]=useState(false);
    const audioRef=useRef(null);
    return(
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
        <audio ref={audioRef} src={url} preload="metadata" style={{display:"none"}}/>
        <button className="tap" onClick={()=>{
          if(!audioRef.current)return;
          if(playing){audioRef.current.pause();setPlaying(false);return;}
          audioRef.current.play();setPlaying(true);
          audioRef.current.addEventListener("ended",()=>setPlaying(false),{once:true});
        }} style={{width:36,height:36,borderRadius:"50%",backgroundColor:C.accent,color:"#fff",border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",flexShrink:0}}>
          {playing?"⏸":"▶️"}
        </button>
        <div style={{fontSize:13,fontWeight:700,color:C.text}}>Voice note</div>
        <div style={{fontSize:13,color:C.sub,marginLeft:"auto"}}>🔊</div>
      </div>
    );
  };
  const Row=({label,value,valueStyle={}})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:13,color:C.sub,fontWeight:500}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,textAlign:"right",...valueStyle}}>{value}</div>
    </div>
  );
  const heroImages=order.imageUrls||[];
  const heroImage=heroImages[heroIndex]||null;
  let dateColor=C.sub;
  if(isOverdue(order))dateColor=C.red;
  else if(isDueToday(order))dateColor="#FF9F0A";
  return(
    <>
    <div style={{position:"fixed",inset:0,zIndex:300,backgroundColor:C.bg,overflowY:"auto",display:"flex",flexDirection:"column"}}>
      {/* ── Zone 1: Hero Image ── */}
      <div style={{position:"relative",width:"100%",height:220,backgroundColor:C.s3,overflow:"hidden",flexShrink:0}}>
        {heroImage?(
          <>
            <img src={heroImage} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            {heroImages.length>1&&(
              <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:4}}>
                {heroImages.slice(0,5).map((url,i)=>(
                  <div key={i} onClick={(e)=>{e.stopPropagation();setHeroIndex(i);}}
                    style={{width:i===heroIndex?16:5,height:5,borderRadius:3,backgroundColor:i===heroIndex?"#fff":"rgba(255,255,255,0.5)",cursor:"pointer",transition:"width 0.2s"}}/>
                ))}
              </div>
            )}
          </>
        ):(
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:C.s3,fontSize:56}}>✂️</div>
        )}
        <div style={{position:"absolute",top:12,left:12,backgroundColor:"rgba(0,0,0,0.55)",color:"#fff",fontSize:13,fontWeight:800,padding:"5px 10px",borderRadius:20,textTransform:"uppercase",letterSpacing:"0.5px"}}>{orderStatus(order)}</div>
        <div className="tap" onClick={onClose} style={{position:"absolute",top:12,right:12,width:40,height:40,borderRadius:20,backgroundColor:"rgba(0,0,0,0.55)",color:"#fff",fontSize:22,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>‹</div>
        <div style={{position:"absolute",bottom:12,left:12,backgroundColor:bal>0?C.red:C.green,color:"#fff",fontSize:12,fontWeight:800,padding:"5px 12px",borderRadius:20}}>
          {bal>0?`${fmt(bal)} due`:"✅ Fully Paid"}
        </div>
      </div>

      {/* ── Zone 2: Identity Card ── */}
      <div style={{backgroundColor:C.s1,borderRadius:"0 0 24px 24px",padding:"16px 20px 20px",marginBottom:12,boxShadow:"0 4px 16px rgba(0,0,0,0.06)"}}>
        <div style={{fontSize:20,fontWeight:800,color:C.text}}>{customer.name}</div>
        <div style={{fontSize:14,color:C.sub,marginTop:2}}>{order.type||"Custom Order"}</div>
        <div style={{fontSize:13,color:dateColor,marginTop:6}}>📅 Due {fmtDate(order.date)}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16}}>
          <div style={{backgroundColor:C.s3,borderRadius:20,padding:"8px 16px",fontSize:16,fontWeight:800,color:C.text}}>{fmt(order.price)}</div>
          {bal>0?(
            <button className="tap" onClick={()=>payRef.current?.scrollIntoView({behavior:"smooth",block:"center"})}
              style={{backgroundColor:C.accent,color:"#fff",borderRadius:24,padding:"10px 20px",fontSize:15,fontWeight:800,border:"none",cursor:"pointer",fontFamily:"inherit"}}>Record Payment →</button>
          ):(
            <button className="tap" onClick={waReceipt}
              style={{backgroundColor:C.green,color:"#fff",borderRadius:24,padding:"10px 20px",fontSize:15,fontWeight:800,border:"none",cursor:"pointer",fontFamily:"inherit"}}>Send Receipt →</button>
          )}
        </div>
      </div>

      <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:12}}>
        {/* ── Zone 3: Status Stepper ── */}
        <div style={cardStyle}>
          <StatusStepper status={orderStatus(order)} onChange={s=>{vibrate(6);updateOrder({status:s});toast("✅ "+s);fetch("/api/push/notify-ready",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:order.id,customerName:customer.name,orderType:order.type,status:s})}).catch(()=>{});}}/>
        </div>

        {/* ── Zone 4: Record Cash Payment ── */}
        <div ref={payRef}>
          {bal>0?(
            <div style={cardStyle}>
              <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>Record Cash Payment</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}>
                <Input value={payAmt} onChange={e=>setPayAmt(e.target.value)} type="number" inputMode="numeric" placeholder="Amount (₦)" label="Amount"/>
                <Btn variant="green" onClick={recordPay} style={{width:"auto",padding:"13px 20px"}}>Record ✓</Btn>
              </div>
            </div>
          ):(
            <div style={cardStyle}>
              <div style={{fontSize:14,color:C.green,textAlign:"center",padding:8}}>✅ Fully Paid — nothing due</div>
            </div>
          )}
        </div>

        {/* ── Payment History ── */}
        {(order.installmentHistory||[]).length>0&&(
          <div style={cardStyle}>
            <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>Payment History</div>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
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

        {/* ── Zone 5: Customer Info ── */}
        <div style={cardStyle}>
          <Row label="Customer" value={customer.name}/>
          <Row label="Phone" value={<span style={{display:"inline-flex",alignItems:"center",gap:8}}>{customer.phone||"—"}{customer.phone&&<a href={`tel:${customer.phone.replace(/[^\d+]/g,"")}`} className="tap" style={{fontSize:12,fontWeight:800,color:C.accent,textDecoration:"none"}}>📞</a>}</span>} valueStyle={{color:C.accent}}/>
          <Row label="Cloth Type" value={order.type||"—"}/>
          <Row label="Delivery" value={fmtDate(order.date)}/>
          {order.notes&&<Row label="Notes" value={order.notes} valueStyle={{fontSize:13,fontWeight:500,color:C.sub}}/>}
          {order.voiceNoteUrl && <VoiceNotePlayer url={order.voiceNoteUrl} />}
          {order.date && (
            <button className="tap" onClick={()=>addToDeviceCalendar({
              title:`${order.type||"Order"} for ${customer.name}`,
              date:order.date,
              notes:order.notes||"",
              location:shop,
            })} style={{
              marginTop:12,width:"100%",padding:"12px 0",
              backgroundColor:C.s3,color:C.text,fontWeight:700,
              borderRadius:12,fontSize:13,border:"none",cursor:"pointer",fontFamily:"inherit",
            }}>
              📅 Add to Calendar
            </button>
          )}
        </div>

        {/* ── Style Photos ── */}
        <div style={cardStyle}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>Style Photos</div>
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
          <div style={cardStyle}>
            <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>Payment Details for Receipts</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:13,color:C.sub,fontWeight:500}}>Bank: <span style={{fontWeight:700,color:C.text}}>{vaDetails.bank}</span></div>
              <div style={{fontSize:13,color:C.sub,fontWeight:500}}>Account: <span style={{fontWeight:700,color:C.text}}>{vaDetails.number}</span></div>
              <div style={{fontSize:13,color:C.sub,fontWeight:500}}>Name: <span style={{fontWeight:700,color:C.text}}>{vaDetails.name}</span></div>
            </div>
          </div>
        )}

        {/* ── Zone 6: WhatsApp Actions ── */}
        <div style={cardStyle}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>WhatsApp Messages</div>
          <Btn variant="wa" onClick={waReady}><span>💬</span> Order Ready for Pickup</Btn>
          <div style={{height:10}}/>
          <Btn variant="wa" onClick={waReminder}><span>📲</span> Payment Reminder + Link</Btn>
          <div style={{height:10}}/>
          <Btn variant="outline" onClick={()=>{
            const url = invoiceUrl(order.id);
            window.open(url, "_blank");
          }} style={{padding:"14px 0",fontSize:14,textAlign:"center"}}><span>🧾</span> View Receipt</Btn>
        </div>

        {/* ── Zone 7: Measurements ── */}
        <div style={cardStyle}>
          <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>Measurements (inches)</div>
          <MeasGrid measurements={customer.measurements||{}} onChange={m=>{updateMeas(m);toast("✅ Saved");}}/>
        </div>

        {/* ── Zone 8: Danger Zone ── */}
        <button className="tap" onClick={()=>setConfirmDelete(true)}
          style={{width:"100%",padding:"15px",borderRadius:14,fontSize:14,fontWeight:700,
            border:"1.5px solid rgba(255,59,48,0.2)",cursor:"pointer",
            background:"rgba(255,59,48,0.05)",color:C.red,fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:8,marginBottom:32}}>
          🗑 Delete This Order
        </button>
      </div>
    </div>

    {lightboxUrl&&(
      <div onClick={()=>setLightboxUrl(null)} style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <img src={lightboxUrl} alt="" style={{maxWidth:"92%",maxHeight:"92%",borderRadius:12,objectFit:"contain"}}/>
        <button onClick={(e)=>{e.stopPropagation(); db.removeOrderImage(lightboxUrl).then(()=>{
          const next=(order.imageUrls||[]).filter(u=>u!==lightboxUrl);
          updateOrder({imageUrls:next});
          setLightboxUrl(null);
          toast("🗑 Photo removed");
        },()=>toast("Could not remove photo"));}} style={{position:"absolute",bottom:40,left:"50%",transform:"translateX(-50%)",background:"rgba(255,59,48,0.8)",color:"#fff",border:"none",borderRadius:24,padding:"12px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
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
    {receiptPrompt&&(
      <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end"}}>
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)"}} onClick={()=>setReceiptPrompt(null)}/>
        <div className="anim-slide" style={{position:"relative",zIndex:1,background:C.s1,borderRadius:"32px 32px 0 0",padding:"28px 24px 48px",width:"100%"}}>
          <div style={{fontSize:24,marginBottom:8,textAlign:"center"}}>🧾</div>
          <div style={{fontSize:19,fontWeight:900,color:C.text,marginBottom:8,textAlign:"center"}}>
            Send receipt to {receiptPrompt.customer.name}?
          </div>
          <div style={{fontSize:14,color:C.sub,lineHeight:1.6,marginBottom:24,textAlign:"center"}}>
            A WhatsApp receipt with the updated payment info. One tap — they see it instantly.
          </div>
          <Btn variant="wa" onClick={()=>{
            setReceiptPrompt(null);
            waReceipt();
          }} style={{marginBottom:12}}><span>💬</span> Send on WhatsApp</Btn>
          <Btn variant="outline" onClick={()=>setReceiptPrompt(null)}>Skip</Btn>
        </div>
      </div>
    )}
    </>
  );
}
