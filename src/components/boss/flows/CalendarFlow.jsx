"use client";
import { useState, useMemo } from "react";
import { C } from "../tokens";
import { fmt, orderStatus } from "../helpers";
import { useBOSS } from "../context";
import { Flow } from "../ui";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOT_COLORS = [C.accent, C.amber, C.red];
const CELL_TINTS = ["", `rgba(0,102,204,0.06)`, `rgba(255,159,10,0.10)`, `rgba(255,59,48,0.10)`];

function pad(n){return String(n).padStart(2,"0");}

export function CalendarFlow({open,onClose}){
  const{customers}=useBOSS();
  const todayStr=new Date().toISOString().slice(0,10);
  const[viewMonth,setViewMonth]=useState(()=>new Date());
  const[selectedDate,setSelectedDate]=useState(todayStr);

  const yr=viewMonth.getFullYear();
  const mo=viewMonth.getMonth();

  function prevMonth(){const d=new Date(yr,mo-1,1);setViewMonth(d);if(!selectedDate.startsWith(dateStr(d).slice(0,7)))setSelectedDate(dateStr(d));}
  function nextMonth(){const d=new Date(yr,mo+1,1);setViewMonth(d);if(!selectedDate.startsWith(dateStr(d).slice(0,7)))setSelectedDate(dateStr(d));}

  const ordersByDate=useMemo(()=>{
    const map={};
    customers.forEach(c=>{(c.orders||[]).forEach(o=>{if(o.date&&orderStatus(o)!=="Delivered"){const k=o.date.slice(0,10);if(!map[k])map[k]=[];map[k].push({...o,_cname:c.name});}});});
    return map;
  },[customers]);

  function dateStr(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}

  // Build calendar grid (Mon-start)
  const grid=useMemo(()=>{
    const daysInMo=new Date(yr,mo+1,0).getDate();
    const firstDow=new Date(yr,mo,1).getDay(); // 0=Sun
    const padStart=(firstDow+6)%7;
    const prevMo=mo===0?11:mo-1;
    const prevYr=mo===0?yr-1:yr;
    const daysInPrev=new Date(prevYr,prevMo+1,0).getDate();
    const cells=[];
    for(let i=0;i<padStart;i++){
      const d=daysInPrev-padStart+1+i;
      const ds=`${prevYr}-${pad(prevMo+1)}-${pad(d)}`;
      cells.push({date:ds,day:d,other:true});
    }
    for(let d=1;d<=daysInMo;d++){
      const ds=`${yr}-${pad(mo+1)}-${pad(d)}`;
      cells.push({date:ds,day:d,other:false});
    }
    const total=Math.ceil((cells.length)/7)*7;
    while(cells.length<total){
      const d=cells.length-padStart-daysInMo+1;
      const nextMo=mo===11?0:mo+1;
      const nextYr=mo===11?yr+1:yr;
      const ds=`${nextYr}-${pad(nextMo+1)}-${pad(d)}`;
      cells.push({date:ds,day:d,other:true});
    }
    return cells;
  },[yr,mo]);

  // Selected date orders
  const selOrders=useMemo(()=>ordersByDate[selectedDate]||[],[ordersByDate,selectedDate]);

  // Accessor helpers
  const selDateObj=new Date(selectedDate);
  const dayName=DAYS[(selDateObj.getDay()+6)%7];
  const monthName=MONTHS[selDateObj.getMonth()];
  const selDisplay=`${dayName}, ${pad(selDateObj.getDate())} ${monthName} ${selDateObj.getFullYear()}`;

  return(
    <Flow open={open} onClose={onClose} title="My Calendar">
      {/* Month nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 4px",marginBottom:8}}>
        <button className="tap" onClick={prevMonth} style={{width:44,height:44,borderRadius:22,background:"transparent",border:"none",color:C.accent,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>‹</button>
        <div style={{fontSize:16,fontWeight:700,color:C.text}}>{MONTHS[mo].toUpperCase()} {yr}</div>
        <button className="tap" onClick={nextMonth} style={{width:44,height:44,borderRadius:22,background:"transparent",border:"none",color:C.accent,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>›</button>
      </div>

      {/* Day headers */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,paddingBottom:6,marginBottom:4}}>
        {DAYS.map(d=>(
          <div key={d} style={{flex:1,textAlign:"center",fontSize:11,fontWeight:700,color:C.sub,textTransform:"uppercase"}}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{display:"flex",flexWrap:"wrap"}}>
        {grid.map((cell,i)=>{
          const orderCount=ordersByDate[cell.date]?.length||0;
          const tintIdx=orderCount>3?3:orderCount;
          const isToday=cell.date===todayStr;
          const isSel=cell.date===selectedDate;
          return(
            <div key={i} className="tap" onClick={()=>setSelectedDate(cell.date)}
              style={{width:"14.285%",aspectRatio:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",paddingTop:6,position:"relative",background:CELL_TINTS[tintIdx],borderRadius:4}}>
              <div style={{width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:15,
                fontSize:14,fontWeight:isToday?800:isSel?700:500,
                color:cell.other?C.muted:isToday?"#fff":isSel?C.accent:C.text,
                backgroundColor:isToday?C.accent:"transparent",
                border:isSel&&!isToday?`2px solid ${C.accent}`:"none",
              }}>{cell.day}</div>
              {orderCount>0&&(
                <div style={{display:"flex",gap:2,marginTop:3}}>
                  {[0,1,2].map(j=>j<Math.min(orderCount,3)&&<div key={j} style={{width:5,height:5,borderRadius:3,backgroundColor:DOT_COLORS[j<orderCount?Math.min(j,2):0]}}/>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected date detail */}
      <div style={{marginTop:20}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12}}>{selDisplay}</div>
        {selOrders.length===0?(
          <div style={{fontSize:14,color:C.green,textAlign:"center",padding:16,backgroundColor:C.greenDim,borderRadius:14}}>✅ Free day — no deliveries due</div>
        ):(
          selOrders.map((order,i)=>(
            <div key={order.id||i} style={{backgroundColor:C.s1,borderRadius:14,padding:12,marginBottom:8,display:"flex",flexDirection:"row",gap:10,border:`1px solid ${C.border}`,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
              <div style={{flexShrink:0}}>
                {order.imageUrls?.[0]?(
                  <img src={order.imageUrls[0]} alt="" style={{width:60,height:60,borderRadius:10,objectFit:"cover",background:C.s3}}/>
                ):(
                  <div style={{width:60,height:60,borderRadius:10,background:C.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✂️</div>
                )}
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:4,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{order._cname||"—"}</div>
                  <div style={{fontSize:12,fontWeight:700,color:orderStatus(order)==="Ready"?C.green:C.sub,background:orderStatus(order)==="Ready"?`${C.green}14`:C.s3,padding:"2px 8px",borderRadius:12,whiteSpace:"nowrap",flexShrink:0}}>{orderStatus(order)}</div>
                </div>
                <div style={{fontSize:13,color:C.sub}}>{order.type||"—"}</div>
                <div style={{fontSize:13,fontWeight:700,color:(order.price||0)>(order.deposit||0)?C.red:C.green}}>Balance due: {fmt((order.price||0)-(order.deposit||0))}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:12,padding:"12px 16px",borderTop:`1px solid ${C.border}`,marginTop:8,fontSize:11,color:C.sub,justifyContent:"center"}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}>● Free</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:DOT_COLORS[0]}}>●</span> Light (1)</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:DOT_COLORS[1]}}>●</span> Busy (2)</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:DOT_COLORS[2]}}>●</span> Full (3+)</span>
      </div>
    </Flow>
  );
}
