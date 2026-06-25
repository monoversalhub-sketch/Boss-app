"use client";
export default function Error({ error, reset }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:24,background:"#0A0A0B",color:"#F5F5F7",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
      <div style={{fontSize:22,fontWeight:800,marginBottom:8,color:"#FF453A"}}>Admin Error</div>
      <div style={{fontSize:14,color:"#8E8E93",lineHeight:1.6,textAlign:"center",maxWidth:360,marginBottom:24}}>An unexpected error occurred in the admin panel.</div>
      <button onClick={reset} style={{padding:"14px 32px",borderRadius:14,border:"none",background:"#0066CC",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Try Again</button>
    </div>
  );
}
