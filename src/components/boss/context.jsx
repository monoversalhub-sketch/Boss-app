"use client";
// src/components/boss/context.jsx
// ─────────────────────────────────────────────────────────────────
//  T-07: ErrorBoundary
//  T-13: BOSSContext + useBOSS hook
// ─────────────────────────────────────────────────────────────────
import React, { createContext, useContext } from "react";

// ─────────────────────────────────────────
// T-07: ERROR BOUNDARY
// ─────────────────────────────────────────
export class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null,compStack:""};}
  static getDerivedStateFromError(error){return{hasError:true,error};}
  componentDidCatch(error,info){
    console.error("[BOSS ErrorBoundary]",error,info?.componentStack);
    this.setState({compStack:info?.componentStack||""});
  }
  render(){
    if(!this.state.hasError)return this.props.children;
    return(
      <div style={{height:"100svh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,gap:20,backgroundColor:"#F5F5F7",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
        <div style={{fontSize:52}}>⚠️</div>
        <div style={{fontSize:22,fontWeight:900,color:"#1C1C1E",letterSpacing:"-0.5px",textAlign:"center"}}>Something went wrong</div>
        <div style={{fontSize:14,color:"#8E8E93",textAlign:"center",lineHeight:1.6,maxWidth:300}}>
          BOSS hit an unexpected error. Your data is safe — tap below to reload.
        </div>
        <button
          onClick={()=>window.location.reload()}
          style={{padding:"16px 32px",backgroundColor:"#1C1C1E",color:"#fff",border:"none",borderRadius:16,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
        >
          Reload App
        </button>
        <pre style={{fontSize:11,color:"#FF3B30",maxWidth:360,overflowX:"auto",background:"#fff",padding:12,borderRadius:8,lineHeight:1.4,textAlign:"left",wordBreak:"break-word"}}>
          {this.state.error?.message}
          {"\n\n"}
          {this.state.compStack?.slice(0,400)}
        </pre>
      </div>
    );
  }
}

// ─────────────────────────────────────────
// T-13: BOSS CONTEXT
// ─────────────────────────────────────────
export const BOSSContext = createContext(null);

/**
 * useBOSS() — access shared app state from any component.
 * Returns { customers, setCustomers, tailor, setTailor, toast }
 */
export const useBOSS = () => useContext(BOSSContext);
