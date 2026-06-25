// src/components/boss/tokens.js
// ─────────────────────────────────────────────────────────────────
//  T-09: Design tokens, constants, and global styles
//  Extracted from BOSSApp.jsx to reduce file size and improve
//  tree-shakability. Import what you need.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────
// MEASUREMENT FIELD SETS
// Terms use plain Nigerian tailor language, not textbook.
// Fields are ordered top-to-bottom, front-to-back —
// matching the physical sequence tailors already follow.
// Core = shown by default (8–10 fields max).
// Suggestions = shown in the quick-add picker.
// ─────────────────────────────────────────────────────

export const MEAS_FIELDS_FEMALE = [
  // Core — shown by default for female customers
  { k: "burst",        l: "Burst"        },
  { k: "under_bust",   l: "Under Bust"   },
  { k: "waist",        l: "Waist"        },
  { k: "stomach",      l: "Stomach"      },
  { k: "hip",          l: "Hip"          },
  { k: "shoulder",     l: "Shoulder"     },
  { k: "sleeve",       l: "Sleeve"       },
  { k: "armhole",      l: "Armhole"      },
  { k: "back",         l: "Back"         },
  { k: "length",       l: "Length"       },
];

export const MEAS_FIELDS_MALE = [
  // Core — shown by default for male customers
  { k: "chest",        l: "Chest"        },
  { k: "waist",        l: "Waist"        },
  { k: "stomach",      l: "Stomach"      },
  { k: "hip",          l: "Hip"          },
  { k: "shoulder",     l: "Shoulder"     },
  { k: "sleeve",       l: "Sleeve"       },
  { k: "armhole",      l: "Armhole"      },
  { k: "back",         l: "Back"         },
  { k: "neck",         l: "Neck"         },
  { k: "trouser",      l: "Trouser"      },
];

// Suggestions for female — common extras tailors add
export const MEAS_SUGGESTIONS_FEMALE = [
  { k: "neck",          l: "Neck"           },
  { k: "thigh",         l: "Thigh"          },
  { k: "knee",          l: "Knee"           },
  { k: "calf",          l: "Calf"           },
  { k: "ankle",         l: "Ankle"          },
  { k: "wrist",         l: "Wrist"          },
  { k: "arm_length",    l: "Arm Length"     },
  { k: "inseam",        l: "Inseam"         },
  { k: "waist_to_knee", l: "Waist to Knee"  },
  { k: "blouse_length", l: "Blouse Length"  },
  { k: "skirt_length",  l: "Skirt Length"   },
  { k: "over_bust",     l: "Over Bust"      },
  { k: "height",        l: "Height"         },
  { k: "shoulder_bust", l: "Shoulder–Bust"  },
];

// Suggestions for male — common extras tailors add
export const MEAS_SUGGESTIONS_MALE = [
  { k: "inseam",        l: "Inseam"         },
  { k: "thigh",         l: "Thigh"          },
  { k: "knee",          l: "Knee"           },
  { k: "calf",          l: "Calf"           },
  { k: "ankle",         l: "Ankle"          },
  { k: "wrist",         l: "Wrist"          },
  { k: "arm_length",    l: "Arm Length"     },
  { k: "waist_to_knee", l: "Waist to Knee"  },
  { k: "shirt_length",  l: "Shirt Length"   },
  { k: "agbada_length", l: "Agbada Length"  },
  { k: "height",        l: "Height"         },
  { k: "neck_depth",    l: "Neck Depth"     },
];

// Keep legacy fallback for existing data
export const MEAS_FIELDS = MEAS_FIELDS_FEMALE;

export function getDefaultMeasFields(gender) {
  return gender === "male"
    ? MEAS_FIELDS_MALE
    : MEAS_FIELDS_FEMALE;
}

export function getMeasSuggestions(gender) {
  return gender === "male"
    ? MEAS_SUGGESTIONS_MALE
    : MEAS_SUGGESTIONS_FEMALE;
}
// U-23: 3 statuses (removed "Pending" — tailors start work immediately)
export const STATUSES = ["In Progress","Ready","Delivered"];

export const VAT_RATE = 0.075; // Nigerian VAT 7.5%

export const NG_BANKS = [
  {name:"Access Bank",code:"044"},{name:"Fidelity Bank",code:"070"},
  {name:"First Bank of Nigeria",code:"011"},{name:"First City Monument Bank",code:"214"},
  {name:"Guaranty Trust Bank",code:"058"},{name:"Heritage Bank",code:"030"},
  {name:"Keystone Bank",code:"082"},{name:"Polaris Bank",code:"076"},
  {name:"Stanbic IBTC Bank",code:"221"},{name:"Sterling Bank",code:"232"},
  {name:"Union Bank",code:"032"},{name:"United Bank for Africa",code:"033"},
  {name:"Unity Bank",code:"215"},{name:"Wema Bank",code:"035"},
  {name:"Zenith Bank",code:"057"},{name:"Kuda Bank",code:"090267"},
  {name:"Opay",code:"100004"},{name:"Palmpay",code:"100033"},
  {name:"Moniepoint MFB",code:"090405"},{name:"Carbon",code:"565"},
];

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─────────────────────────────────────────
// APP URL — builds public invoice links
// ─────────────────────────────────────────
export const APP_URL =
  (typeof process !== "undefined" &&
   process.env?.NEXT_PUBLIC_APP_URL &&
   process.env.NEXT_PUBLIC_APP_URL !== "undefined"
    ? process.env.NEXT_PUBLIC_APP_URL
    : null) ||
  (typeof window !== "undefined" ? window.location.origin : "https://boss-app-nine.vercel.app");

// ─────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────
export const C = {
  bg:"#F5F5F7", s1:"#FFFFFF", s2:"#F4F4F5", s3:"#E4E4E7", s4:"#D4D4D8",
  accent:"#0066CC",
  // gold/goldDim/goldGlow REMOVED — all UI uses C.accent (correct token)
  red:"#FF3B30",   redDim:"rgba(255,59,48,0.08)",
  green:"#34C759", greenDim:"rgba(52,199,89,0.08)",
  amber:"#FF9F0A", amberDim:"rgba(255,159,10,0.08)",
  text:"#111111", sub:"#6E6E73", muted:"#8E8E93", subLight:"#A1A1AA",
  border:"#E5E5EA", border2:"#E4E4E7",
  dark:"#1A1A1A",
};

export const S = {
  card: {
    backgroundColor:C.s1,
    borderRadius:20,
    padding:20,
    boxShadow:"0 4px 12px rgba(0,0,0,0.03)",
    border:"1px solid #E5E5EA",
    boxSizing:"border-box",
  },
  input: {
    width:"100%",
    padding:"16px",
    backgroundColor:"#F4F4F5",
    border:"1px solid #E4E4E7",
    borderRadius:12,
    fontSize:15,
    fontWeight:500,
    color:C.text,
    outline:"none",
    WebkitAppearance:"none",
    fontFamily:"inherit",
    boxSizing:"border-box",
  },
  label: {
    fontSize:13,
    fontWeight:700,
    color:"#8E8E93",
    display:"block",
    marginBottom:8,
    letterSpacing:"0.2px",
  },
  btn: {
    width:"100%",
    padding:"16px",
    borderRadius:12,
    fontSize:15,
    fontWeight:700,
    border:"none",
    cursor:"pointer",
    letterSpacing:"-0.1px",
    transition:"transform 0.12s,opacity 0.12s",
    fontFamily:"inherit",
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    gap:8,
  },
  row: {
    display:"flex",
    alignItems:"center",
    gap:12,
  },
  rowBetween: {
    display:"flex",
    alignItems:"center",
    justifyContent:"space-between",
  },
  col: {
    display:"flex",
    flexDirection:"column",
  },
  flexCenter: {
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
  },
  sectionTitle: {
    fontSize:15,
    fontWeight:700,
    color:C.sub,
    marginBottom:14,
  },
  cardSection: {
    backgroundColor:C.s1,
    border:"1px solid #E5E5EA",
    borderRadius:20,
    padding:20,
  },
  pillBtn: (active) => ({
    padding:"12px 20px",
    borderRadius:20,
    fontSize:14,
    fontWeight:active ? 700 : 600,
    minHeight:48,
    backgroundColor:active ? C.dark : C.s3,
    color:active ? "#fff" : "#71717A",
    border:"none",
    cursor:"pointer",
    whiteSpace:"nowrap",
    flexShrink:0,
    transition:"all 0.15s",
  }),
};

// ─────────────────────────────────────────
// GLOBAL CSS STRING
// ─────────────────────────────────────────
export const GLOBAL_CSS = `
  @keyframes bossIn  { from{opacity:0;transform:scale(0.5) rotate(-6deg)} to{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes fillBar { from{width:0} to{width:100%} }
  @keyframes pulse   { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.05)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:none} }
  @keyframes toast   { 0%{opacity:0;transform:translateX(-50%) translateY(6px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0;transform:translateX(-50%) translateY(6px)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes voiceWave { 0%,100%{height:4px} 50%{height:16px} }

  html,body{height:100%;width:100%;margin:0;padding:0;overflow:hidden;background:#F5F5F7}
  #__next,#boss-root{height:100%;display:flex;flex-direction:column;overflow:hidden}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
  ::-webkit-scrollbar{width:0}
  input,select,textarea,button{font-family:var(--font-plus-jakarta),sans-serif}
  body{font-family:var(--font-plus-jakarta),sans-serif;background:#F5F5F7;color:#1C1C1E}

  .anim-boss  {animation:bossIn  0.6s cubic-bezier(0.34,1.56,0.64,1) both}
  .anim-up1   {animation:fadeUp  0.5s 0.3s both;opacity:0}
  .anim-up2   {animation:fadeUp  0.5s 0.5s both;opacity:0}
  .anim-up3   {animation:fadeUp  0.5s 0.7s both;opacity:0}
  .anim-fill  {animation:fillBar 2.2s 0.8s ease-in-out forwards}
  .anim-slide {animation:slideUp 0.35s cubic-bezier(0.32,0.72,0,1) both}
  .anim-toast {animation:toast   3s ease forwards}
  .scrollable {overflow-y:auto;-webkit-overflow-scrolling:touch;height:100%}
  .tap{transition:transform 0.12s,opacity 0.12s;cursor:pointer}
  .tap:active{transform:scale(0.97);opacity:0.9}

  .pill-active{background:#1C1C1E!important;color:#fff!important}
  .pill-inactive{background:#EBEBEB!important;color:#8E8E93!important}
`;
