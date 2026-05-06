// v1.1.1
import { useState, useEffect, useCallback } from "react";

const VERSION  = "1.1.1";
const PLC_IP   = "192.168.178.250";
const AUTH_KEY = "casa_auth_v2";

// ── LUCI ──────────────────────────────────────────────────────────────────────
const LUCI_DEF = [
  { id:0,  nome:"Bagno Blu",  icona:"🚿", zona:"Notte",
    varStatus:'"GestioneLuci".LuceBagnoBlu.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceBagnoBlu.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceBagnoBlu.DatiHMI.Manuale.PB_Off' },
  { id:1,  nome:"Bagno Bianco",  icona:"🛁", zona:"Notte",
    varStatus:'"GestioneLuci".LuceBagnoBianco.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceBagnoBianco.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceBagnoBianco.DatiHMI.Manuale.PB_Off' },
  { id:2,  nome:"Camera",         icona:"🛏️", zona:"Notte",
    varStatus:'"GestioneLuci".LuceCamera.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceCamera.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceCamera.DatiHMI.Manuale.PB_Off' },
  { id:3,  nome:"Cameretta",      icona:"👶", zona:"Notte",
    varStatus:'"GestioneLuci".LuceCameretta.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceCameretta.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceCameretta.DatiHMI.Manuale.PB_Off' },
  { id:4,  nome:"Cantina",        icona:"📦", zona:"Esterno",
    varStatus:'"GestioneLuci".luceCantina.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".luceCantina.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".luceCantina.DatiHMI.Manuale.PB_Off' },
  { id:5,  nome:"Cucina",         icona:"🍳", zona:"Giorno",
    varStatus:'"GestioneLuci".LuciCucina.DatiHMI.Status.OutLuce_1',
    varOn:    '"GestioneLuci".LuciCucina.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuciCucina.DatiHMI.Manuale.PB_Off' },
  { id:6,  nome:"Esterna",        icona:"🌿", zona:"Esterno",
    varStatus:'"GestioneLuci".LuceEsterna.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceEsterna.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceEsterna.DatiHMI.Manuale.PB_Off' },
  { id:7,  nome:"Crepuscolare",         icona:"🌅", zona:"Esterno",
    varStatus:'"GestioneLuci".LuceCrepuscolare.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceCrepuscolare.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceCrepuscolare.DatiHMI.Manuale.PB_Off' },
  { id:8,  nome:"Ingresso",       icona:"🚪", zona:"Giorno",
    varStatus:'"GestioneLuci".LuceIngresso.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceIngresso.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceIngresso.DatiHMI.Manuale.PB_Off' },
  { id:9,  nome:"Sala",           icona:"🛋️", zona:"Giorno",
    varStatus:'"GestioneLuci".LuceSala.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceSala.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceSala.DatiHMI.Manuale.PB_Off' },
  { id:10, nome:"Scale",          icona:"🪜", zona:"Giorno",
    varStatus:'"GestioneLuci".LuceScale.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceScale.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceScale.DatiHMI.Manuale.PB_Off' },
  { id:11, nome:"Studio",         icona:"💻", zona:"Giorno",
    varStatus:'"GestioneLuci".LuceStudio.DatiHMI.Status.OutLuce',
    varOn:    '"GestioneLuci".LuceStudio.DatiHMI.Manuale.PB_Luce',
    varOff:   '"GestioneLuci".LuceStudio.DatiHMI.Manuale.PB_Off' },
];

// ── RISCALDAMENTO ─────────────────────────────────────────────────────────────
const SP0 = [16,16,16,16,16,16,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,16,16];
const ZONE_DEF = [
  { id:0, nome:"Camera",      icona:"🛏️", zona:"Notte",  tempAtt:20.0, setpAtt:18.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".Camera.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".Camera.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".Camera.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".Camera.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".Camera.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".Camera.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".Camera' },
  { id:1, nome:"Cameretta",   icona:"👶", zona:"Notte",  tempAtt:19.5, setpAtt:18.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".Cameretta.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".Cameretta.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".Cameretta.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".Cameretta.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".Cameretta.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".Cameretta.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".Cameretta' },
  { id:2, nome:"Bagno Blu",   icona:"🛁", zona:"Notte",  tempAtt:18.5, setpAtt:18.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".BagnoBlu.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".BagnoBlu.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".BagnoBlu.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".BagnoBlu.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".BagnoBlu.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".BagnoBlu.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".BagnoBlu' },
  { id:3, nome:"Bagno Bianco",icona:"🚿", zona:"Notte",  tempAtt:19.0, setpAtt:18.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".BagnoBianco.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".BagnoBianco.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".BagnoBianco.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".BagnoBianco.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".BagnoBianco.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".BagnoBianco.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".BagnoBianco' },
  { id:4, nome:"Ingresso",    icona:"🚪", zona:"Giorno", tempAtt:18.0, setpAtt:18.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".Ingresso.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".Ingresso.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".Ingresso.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".Ingresso.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".Ingresso.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".Ingresso.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".Ingresso' },
  { id:5, nome:"Studio",      icona:"💻", zona:"Giorno", tempAtt:19.5, setpAtt:18.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".Studio.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".Studio.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".Studio.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".Studio.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".Studio.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".Studio.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".Studio' },
  { id:6, nome:"Corridoio",   icona:"🚶", zona:"Giorno", tempAtt:18.5, setpAtt:18.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".Corridoio.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".Corridoio.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".Corridoio.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".Corridoio.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".Corridoio.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".Corridoio.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".Corridoio' },
  { id:7, nome:"Salone",      icona:"🛋️", zona:"Giorno", tempAtt:19.5, setpAtt:18.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".Salone.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".Salone.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".Salone.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".Salone.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".Salone.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".Salone.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".Salone' },
  { id:8, nome:"Cucina",      icona:"🍳", zona:"Giorno", tempAtt:19.5, setpAtt:18.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".Cucina.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".Cucina.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".Cucina.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".Cucina.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".Cucina.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".Cucina.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".Cucina' },
  { id:9, nome:"Cantina",     icona:"📦", zona:"Giorno", tempAtt:14.0, setpAtt:15.0, valvola:false, sp:[...SP0],
    varT:'"DbRiscaldamento".Cantina.DatiHMI.Status.ActTemp',
    varSP:'"DbRiscaldamento".Cantina.DatiHMI.Status.ActSetpoint',
    varOut:'"DbRiscaldamento".Cantina.DatiHMI.Status.Out',
    varEnable:'"DbRiscaldamento".Cantina.DatiHMI.Enable',
    varManAuto:'"DbRiscaldamento".Cantina.DatiHMI.Manuale.ManAuto',
    varSetMAN:'"DbRiscaldamento".Cantina.DatiHMI.Manuale.SetpointMAN',
    spBase:'"DbRiscaldamento".Cantina' },
];

// Variabili globali riscaldamento
const VAR_ESTATE_INVERNO   = '"DbRiscaldamento".Setup.EstateInverno';
const VAR_EXT_ENABLE       = '"DbRiscaldamento".Setup.ExtSetpointEnable';
const VAR_EXT_GRADI        = '"DbRiscaldamento".Setup.ExtSetpointGradi';

// ── API PLC ───────────────────────────────────────────────────────────────────
const plcUrl = `http://${PLC_IP}/api/jsonrpc`;
let _id = 1;
async function plcCall(method, params={}, token=null) {
  const h = {"Content-Type":"application/json"};
  if(token) h["X-Auth-Token"] = token;
  const r = await fetch(plcUrl,{method:"POST",headers:h,
    body:JSON.stringify({jsonrpc:"2.0",method,params,id:_id++}),
    signal:AbortSignal.timeout(3000)});
  const j = await r.json();
  if(j.error) throw new Error(j.error.message);
  return j.result;
}
const api = {
  login:  (u,p)      => plcCall("Api.Login",{user:u,password:p}),
  clock:  (tok)      => plcCall("Plc.ReadSystemClock",{},tok),
  read:   (v,tok)    => plcCall("PlcProgram.Read",{var:v,mode:"simple"},tok),
  write:  (v,val,tok)=> plcCall("PlcProgram.Write",{var:v,value:val},tok),
  pulse:  async(v,tok)=>{
    await plcCall("PlcProgram.Write",{var:v,value:true},tok);
    await new Promise(r=>setTimeout(r,150));
    await plcCall("PlcProgram.Write",{var:v,value:false},tok);
  }
};

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function CasaApp() {
  const [tab,setTab]     = useState("luci");
  const [luci,setLuci]   = useState(LUCI_DEF.map(l=>({...l,accesa:false})));
  const [zone,setZone]   = useState(ZONE_DEF);
  const [filtro,setFiltro]= useState("Tutte");
  const [conn,setConn]   = useState("searching");
  const [token,setToken] = useState(null);
  const [plcClock,setPlcClock] = useState(null);
  // Globali riscaldamento
  const [estateInverno,setEstateInverno] = useState(true);   // true=Inverno
  const [nessunoInCasa,setNessunoInCasa] = useState(false);
  const [extGradi,setExtGradi] = useState(17.0);
  const [plcCreds,setPlcCreds] = useState(
    JSON.parse(localStorage.getItem(AUTH_KEY)||'{"user":"","pass":""}'));
  const ora = new Date().getHours();

  // ── Connessione ──────────────────────────────────────────────────────────
  const connect = useCallback(async(u,p)=>{
    setConn("searching");
    try{
      const res = await api.login(u,p);
      const tok = res?.token; if(!tok) throw new Error("no token");
      setToken(tok);
      const ts = await api.clock(tok);
      setPlcClock(ts?.timestamp??null);
      setConn("local");
      return tok;
    }catch{ setConn("aws"); return null; }
  },[]);

  useEffect(()=>{
    if(plcCreds.user) connect(plcCreds.user,plcCreds.pass);
    else setConn("aws");
  },[]);

  // ── Refresh live ogni 5s ─────────────────────────────────────────────────
  useEffect(()=>{
    if(conn!=="local"||!token) return;
    const refresh = async()=>{
      try{
        // Luci
        const luciNew = await Promise.all(LUCI_DEF.map(async l=>{
          const v = await api.read(l.varStatus,token);
          return{...l,accesa:!!v};
        }));
        setLuci(luciNew);
        // Zone
        const zoneNew = await Promise.all(ZONE_DEF.map(async z=>{
          const [t,sp,out,en,man] = await Promise.all([
            api.read(z.varT,token), api.read(z.varSP,token),
            api.read(z.varOut,token), api.read(z.varEnable,token),
            api.read(z.varManAuto,token),
          ]);
          return{...z,tempAtt:t??z.tempAtt,setpAtt:sp??z.setpAtt,
            valvola:!!out,enable:en!==false,manAuto:!!man};
        }));
        setZone(zoneNew);
        // Globali
        const [ei,ne,eg] = await Promise.all([
          api.read(VAR_ESTATE_INVERNO,token),
          api.read(VAR_EXT_ENABLE,token),
          api.read(VAR_EXT_GRADI,token),
        ]);
        if(ei!==null) setEstateInverno(!!ei);
        if(ne!==null) setNessunoInCasa(!!ne);
        if(eg!==null) setExtGradi(eg);
      }catch(e){console.warn("refresh",e);}
    };
    refresh();
    const t = setInterval(refresh,5000);
    return()=>clearInterval(t);
  },[conn,token]);

  // ── Azioni luci ─────────────────────────────────────────────────────────
  const toggleLuce = async(id)=>{
    const l = luci.find(x=>x.id===id);
    const ns = !l.accesa;
    setLuci(prev=>prev.map(x=>x.id===id?{...x,accesa:ns}:x));
    if(conn==="local"&&token)
      await api.pulse(ns?l.varOn:l.varOff,token).catch(console.warn);
  };

  const spegniTutte = async()=>{
    setLuci(prev=>prev.map(l=>({...l,accesa:false})));
    if(conn==="local"&&token)
      await Promise.all(LUCI_DEF.map(l=>api.pulse(l.varOff,token).catch(()=>{})));
  };

  // ── Azioni riscaldamento ─────────────────────────────────────────────────
  const toggleEstateInverno = async()=>{
    const nv = !estateInverno;
    setEstateInverno(nv);
    if(conn==="local"&&token) await api.write(VAR_ESTATE_INVERNO,nv,token).catch(console.warn);
  };

  const toggleNessunoInCasa = async()=>{
    const nv = !nessunoInCasa;
    setNessunoInCasa(nv);
    if(conn==="local"&&token) await api.write(VAR_EXT_ENABLE,nv,token).catch(console.warn);
  };

  const cambiaExtGradi = async(delta)=>{
    const nv = Math.round(Math.max(10,Math.min(22,extGradi+delta))*2)/2;
    setExtGradi(nv);
    if(conn==="local"&&token) await api.write(VAR_EXT_GRADI,nv,token).catch(console.warn);
  };

  const setSetpoint = async(zonaId,h,val)=>{
    const nv = Math.round(Math.max(10,Math.min(30,val))*2)/2;
    setZone(prev=>prev.map(z=>{
      if(z.id!==zonaId) return z;
      const sp=[...z.sp]; sp[h]=nv; return{...z,sp};
    }));
    if(conn==="local"&&token){
      const z = zone.find(x=>x.id===zonaId);
      await api.write(`${z.spBase}.DatiHMI.Setup.Setpoint[${h}]`,nv,token).catch(console.warn);
    }
  };

  const toggleZonaEnable = async(zonaId)=>{
    const z = zone.find(x=>x.id===zonaId);
    const nv = !z.enable;
    setZone(prev=>prev.map(x=>x.id===zonaId?{...x,enable:nv}:x));
    if(conn==="local"&&token) await api.write(z.varEnable,nv,token).catch(console.warn);
  };

  const setManAuto = async(zonaId,manAuto)=>{
    setZone(prev=>prev.map(x=>x.id===zonaId?{...x,manAuto}:x));
    if(conn==="local"&&token){
      const z = zone.find(x=>x.id===zonaId);
      await api.write(z.varManAuto,manAuto,token).catch(console.warn);
    }
  };

  const setSetpointMAN = async(zonaId,val)=>{
    const nv = Math.round(Math.max(10,Math.min(30,val))*2)/2;
    setZone(prev=>prev.map(x=>x.id===zonaId?{...x,setpMAN:nv}:x));
    if(conn==="local"&&token){
      const z = zone.find(x=>x.id===zonaId);
      await api.write(z.varSetMAN,nv,token).catch(console.warn);
    }
  };

  const luciAccese = luci.filter(l=>l.accesa).length;
  const valvAperte = zone.filter(z=>z.valvola).length;
  const tempMedia  = (zone.reduce((s,z)=>s+z.tempAtt,0)/zone.length).toFixed(1);
  const CI = {
    local:    {label:`LOCALE · ${PLC_IP}`, color:"#4ade80"},
    aws:      {label:"AWS IoT Core",       color:"#60a5fa"},
    searching:{label:"Connessione…",       color:"#facc15"},
  };
  const ci = CI[conn];

  return(
    <div style={S.root}>
      {/* STATUS */}
      <div style={S.statusBar}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:ci.color,display:"inline-block",
            boxShadow:conn==="searching"?"none":`0 0 8px ${ci.color}`}}/>
          <span style={{fontSize:11,fontWeight:700,color:ci.color}}>{ci.label}</span>
        </div>
        <button style={S.connBtn} onClick={()=>connect(plcCreds.user,plcCreds.pass)}>↺</button>
      </div>

      {/* HEADER */}
      <div style={S.header}>
        <div>
          <div style={{fontSize:26,fontWeight:900,letterSpacing:"-0.03em",color:"#f1f5f9"}}>Casa</div>
          <div style={{fontSize:11,color:"#4b5563",marginTop:1}}>S7-1200 · CPU 1215C</div>
        </div>
        <div style={{display:"flex",gap:7}}>
          <Pill icon="💡" val={`${luciAccese}/12`}/>
          <Pill icon="🌡️" val={`${tempMedia}°`}/>
          <Pill icon={estateInverno?"❄️":"☀️"} val={estateInverno?"INV":"EST"}/>
        </div>
      </div>

      {/* CONTENT */}
      <div style={S.scroll}>
        {tab==="luci" && (
          <LuciTab luci={luci} filtro={filtro} setFiltro={setFiltro}
            toggleLuce={toggleLuce} spegniTutte={spegniTutte}/>
        )}
        {tab==="risc" && (
          <RiscTab zone={zone} ora={ora}
            estateInverno={estateInverno} toggleEstateInverno={toggleEstateInverno}
            nessunoInCasa={nessunoInCasa} toggleNessunoInCasa={toggleNessunoInCasa}
            extGradi={extGradi} cambiaExtGradi={cambiaExtGradi}
            setSetpoint={setSetpoint} valvAperte={valvAperte}
            toggleZonaEnable={toggleZonaEnable}
            setManAuto={setManAuto} setSetpointMAN={setSetpointMAN}/>
        )}
        {tab==="stato" && (
          <StatoTab luci={luci} zone={zone} conn={conn} ci={ci} ora={ora}
            plcClock={plcClock} plcCreds={plcCreds} setPlcCreds={setPlcCreds}
            connect={connect}/>
        )}
      </div>

      {/* NAV */}
      <div style={S.nav}>
        {[{id:"luci",icon:"💡",label:"Luci"},{id:"risc",icon:"🔥",label:"Clima"},{id:"stato",icon:"📊",label:"Stato"}]
          .map(t=>(
          <button key={t.id} style={S.navBtn} onClick={()=>setTab(t.id)}>
            <span style={{fontSize:22}}>{t.icon}</span>
            <span style={{fontSize:10,color:tab===t.id?"#f59e0b":"#6b7280",fontWeight:600}}>{t.label}</span>
            {tab===t.id&&<div style={S.navBar}/>}
          </button>
        ))}
      </div>
      <div style={{position:"fixed",bottom:70,right:10,fontSize:9,color:"#2d2d44",fontWeight:700}}>v{VERSION}</div>
    </div>
  );
}

// ── LUCI TAB ──────────────────────────────────────────────────────────────────
function LuciTab({luci,filtro,setFiltro,toggleLuce,spegniTutte}){
  const [confirming,setConfirming] = useState(false);
  const zL = ["Tutte","Giorno","Notte","Esterno"];
  const lista = filtro==="Tutte" ? luci : luci.filter(l=>l.zona===filtro);
  const accese = luci.filter(l=>l.accesa).length;

  const handleSpegni = ()=>{
    if(accese===0) return;
    if(!confirming){ setConfirming(true); setTimeout(()=>setConfirming(false),3000); return; }
    spegniTutte(); setConfirming(false);
  };

  return(
    <div style={{padding:"0 14px 16px"}}>
      {/* Controllo globale */}
      <div style={{...S.card,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>Luci</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:1}}>{accese} di 12 accese</div>
          </div>
          {/* Bottone spegni tutte */}
          <button onClick={handleSpegni} style={{
            background: confirming?"#7f1d1d":accese===0?"#1f2937":"#92400e",
            border:`1px solid ${confirming?"#ef4444":accese===0?"#374151":"#f59e0b"}`,
            color: confirming?"#fca5a5":accese===0?"#4b5563":"#fcd34d",
            borderRadius:10, padding:"8px 14px", fontSize:12,
            fontWeight:700, cursor:accese===0?"not-allowed":"pointer",
            transition:"all .2s",
          }}>
            {confirming ? "⚠️ Conferma" : "🌑 Spegni tutte"}
          </button>
        </div>
        {confirming && (
          <div style={{fontSize:11,color:"#f87171",textAlign:"center",
            padding:"6px",background:"#1f0000",borderRadius:8}}>
            Premi di nuovo per spegnere TUTTE le luci
          </div>
        )}
      </div>

      {/* Filtri */}
      <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
        {zL.map(z=>(
          <button key={z} onClick={()=>setFiltro(z)}
            style={{...S.filtroBtn,...(filtro===z?S.filtroBtnOn:{})}}>{z}</button>
        ))}
      </div>

      {/* Griglia */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {lista.map(l=><LuceCard key={l.id} luce={l} onToggle={()=>toggleLuce(l.id)}/>)}
      </div>
    </div>
  );
}

function LuceCard({luce,onToggle}){
  const [p,setP]=useState(false);
  return(
    <div onClick={onToggle} onPointerDown={()=>setP(true)} onPointerUp={()=>setP(false)}
      style={{...S.luceCard,...(luce.accesa?S.luceCardOn:{}),transform:p?"scale(0.93)":"scale(1)"}}>
      <div style={{position:"relative",width:36,marginBottom:8}}>
        <span style={{fontSize:28}}>{luce.icona}</span>
        {luce.accesa&&<div style={S.glow}/>}
      </div>
      <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9",marginBottom:2}}>{luce.nome}</div>
      <div style={{fontSize:10,color:"#6b7280",marginBottom:8}}>{luce.zona}</div>
      <div style={{display:"inline-block",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
        background:luce.accesa?"#92400e":"#1f2937",color:luce.accesa?"#fcd34d":"#6b7280"}}>
        {luce.accesa?"● ON":"○ OFF"}
      </div>
    </div>
  );
}

// ── CLIMA TAB ─────────────────────────────────────────────────────────────────
function RiscTab({zone,ora,estateInverno,toggleEstateInverno,
  nessunoInCasa,toggleNessunoInCasa,extGradi,cambiaExtGradi,
  setSetpoint,valvAperte,toggleZonaEnable,setManAuto,setSetpointMAN}){
  const [sel,setSel] = useState(null);
  const z = zone.find(x=>x.id===sel);
  if(sel!==null&&z)
    return <ZonaDetail zona={z} ora={ora} setSetpoint={setSetpoint}
      onBack={()=>setSel(null)} toggleEnable={()=>toggleZonaEnable(z.id)}
      setManAuto={(v)=>setManAuto(z.id,v)} setSetpointMAN={(v)=>setSetpointMAN(z.id,v)}/>;

  const tempMedia = (zone.reduce((s,x)=>s+x.tempAtt,0)/zone.length).toFixed(1);

  return(
    <div style={{padding:"0 14px 16px"}}>

      {/* ── Controlli globali ── */}
      <div style={{fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:"0.08em",
        textTransform:"uppercase",marginBottom:8}}>Controlli globali</div>

      {/* Estate / Inverno */}
      <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>
            {estateInverno?"❄️ Modalità Inverno":"☀️ Modalità Estate"}
          </div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>
            {estateInverno?"Riscaldamento attivo":"Riscaldamento spento"}
          </div>
        </div>
        <Toggle on={estateInverno} onClick={toggleEstateInverno} big/>
      </div>

      {/* Nessuno in casa */}
      <div style={{...S.card,marginBottom:8,
        border:`1px solid ${nessunoInCasa?"#1d4ed8":"#1f2937"}`,
        background:nessunoInCasa?"#0f1f3d":"#111827"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom: nessunoInCasa?10:0}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>🏠 Nessuno in casa</div>
            <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>
              {nessunoInCasa?`Setpoint ridotto a ${extGradi.toFixed(1)}°C`:"Setpoint normali attivi"}
            </div>
          </div>
          <Toggle on={nessunoInCasa} onClick={toggleNessunoInCasa} big/>
        </div>
        {nessunoInCasa&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            marginTop:10,paddingTop:10,borderTop:"1px solid #1e3a5f"}}>
            <span style={{fontSize:12,color:"#9ca3af"}}>Temperatura ridotta</span>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <button onClick={()=>cambiaExtGradi(-0.5)} style={S.spBtnSm}>−</button>
              <span style={{fontSize:20,fontWeight:800,color:"#60a5fa",minWidth:50,textAlign:"center"}}>
                {extGradi.toFixed(1)}°C
              </span>
              <button onClick={()=>cambiaExtGradi(+0.5)} style={S.spBtnSm}>+</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Riepilogo ── */}
      <div style={{...S.card,display:"flex",justifyContent:"space-around",marginBottom:8,marginTop:16}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:11,color:"#6b7280"}}>Valvole aperte</div>
          <div style={{fontSize:22,fontWeight:800,color:"#f97316"}}>{valvAperte}/{zone.length}</div>
        </div>
        <div style={{width:1,background:"#1f2937",alignSelf:"stretch"}}/>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:11,color:"#6b7280"}}>Temp. media</div>
          <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9"}}>{tempMedia}°C</div>
        </div>
      </div>

      {/* ── Lista zone ── */}
      <div style={{fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:"0.08em",
        textTransform:"uppercase",marginBottom:8}}>Zone</div>
      {zone.map(z=>(
        <div key={z.id} onClick={()=>setSel(z.id)}
          style={{...S.card,marginBottom:8,cursor:"pointer",
            opacity:z.enable===false?0.45:1,
            borderColor:z.valvola?"#92400e":"#1f2937"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>{z.icona}</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{z.nome}</div>
                <div style={{fontSize:10,color:z.valvola?"#f97316":"#6b7280"}}>
                  {z.enable===false?"⏹ Disabilitata":z.valvola?"🔥 Valvola aperta":"⏸ Chiusa"}
                </div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9"}}>
                {z.tempAtt.toFixed(1)}<span style={{fontSize:11,color:"#9ca3af"}}>°C</span>
              </div>
              <div style={{fontSize:10,color:"#6b7280"}}>SP: {z.sp[ora]}°</div>
            </div>
          </div>
          {/* Mini barra temp */}
          <div style={{marginTop:8,height:3,background:"#1f2937",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(100,((z.tempAtt-10)/20)*100)}%`,
              background:z.valvola?"#f97316":"#374151",borderRadius:2,transition:"width .5s"}}/>
            <div style={{position:"relative",top:-3,
              left:`${Math.min(98,((z.sp[ora]-10)/20)*100)}%`,
              width:2,height:3,background:"#60a5fa",borderRadius:1}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DETTAGLIO ZONA ────────────────────────────────────────────────────────────
function ZonaDetail({zona,ora,setSetpoint,onBack,toggleEnable,setManAuto,setSetpointMAN}){
  const [editOra,setEditOra] = useState(null);
  const [spManInput,setSpManInput] = useState(zona.setpMAN||18.0);

  return(
    <div style={{padding:"0 14px 16px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <button onClick={onBack} style={S.backBtn}>‹</button>
        <span style={{fontSize:20}}>{zona.icona}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9"}}>{zona.nome}</div>
          <div style={{fontSize:11,color:zona.valvola?"#f97316":"#6b7280"}}>
            {zona.valvola?"🔥 Valvola aperta":"⏸ Chiusa"}</div>
        </div>
        <div style={{fontSize:28,fontWeight:900,color:"#f1f5f9"}}>
          {zona.tempAtt.toFixed(1)}<span style={{fontSize:13,color:"#9ca3af"}}>°C</span>
        </div>
      </div>

      {/* Abilitazione zona */}
      <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Zona abilitata</div>
          <div style={{fontSize:11,color:"#6b7280"}}>{zona.enable!==false?"Attiva":"Disabilitata"}</div>
        </div>
        <Toggle on={zona.enable!==false} onClick={toggleEnable} big/>
      </div>

      {/* Modalità Manuale / Automatico */}
      <div style={{...S.card,marginBottom:8}}>
        <div style={{fontSize:11,color:"#6b7280",marginBottom:8,fontWeight:700,letterSpacing:"0.06em"}}>
          MODALITÀ CONTROLLO</div>
        <div style={{display:"flex",gap:8,marginBottom: zona.manAuto===false?10:0}}>
          {[{v:true,label:"🤖 Automatico"},{v:false,label:"🖐 Manuale"}].map(opt=>(
            <button key={String(opt.v)} onClick={()=>setManAuto(opt.v)}
              style={{flex:1,padding:"8px 0",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",
                background:zona.manAuto===opt.v||(!zona.manAuto===!opt.v&&zona.manAuto===undefined&&opt.v)
                  ?"#1e3a5f":"#1f2937",
                border:`1px solid ${zona.manAuto===opt.v?"#3b82f6":"#374151"}`,
                color:zona.manAuto===opt.v?"#60a5fa":"#9ca3af"}}>
              {opt.label}
            </button>
          ))}
        </div>
        {zona.manAuto===false&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            paddingTop:10,borderTop:"1px solid #1f2937"}}>
            <span style={{fontSize:12,color:"#9ca3af"}}>Setpoint manuale</span>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <button onClick={()=>setSetpointMAN((zona.setpMAN||18)-0.5)} style={S.spBtnSm}>−</button>
              <span style={{fontSize:20,fontWeight:800,color:"#f59e0b",minWidth:50,textAlign:"center"}}>
                {(zona.setpMAN||18).toFixed(1)}°C
              </span>
              <button onClick={()=>setSetpointMAN((zona.setpMAN||18)+0.5)} style={S.spBtnSm}>+</button>
            </div>
          </div>
        )}
      </div>

      {/* Grafico 24h */}
      <div style={{...S.card,marginBottom:8}}>
        <div style={{fontSize:11,color:"#6b7280",marginBottom:8,fontWeight:700,letterSpacing:"0.06em"}}>
          PROGRAMMA 24 ORE — tocca per modificare</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:2,height:52,marginBottom:4}}>
          {zona.sp.map((val,h)=>(
            <div key={h} onClick={()=>setEditOra(h===editOra?null:h)}
              style={{flex:1,cursor:"pointer",height:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <div style={{width:"100%",height:`${((val-10)/20)*100}%`,minHeight:4,
                background:h===editOra?"#f59e0b":h===ora?"#3b82f6":"#374151",
                borderRadius:"2px 2px 0 0"}}/>
            </div>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#4b5563"}}>
          {["00","04","08","12","16","20","23"].map(h=><span key={h}>{h}h</span>)}
        </div>
      </div>

      {editOra!==null&&(
        <div style={{...S.card,marginBottom:8}}>
          <div style={{fontSize:12,color:"#9ca3af",marginBottom:10}}>
            Ora <span style={{color:"#f59e0b",fontWeight:800}}>{String(editOra).padStart(2,"0")}:00</span>
            {editOra===ora&&<span style={{color:"#60a5fa",marginLeft:8}}>← attuale</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>setSetpoint(zona.id,editOra,zona.sp[editOra]-0.5)} style={S.spBtn}>−</button>
            <div style={{fontSize:34,fontWeight:900,color:"#f1f5f9",textAlign:"center"}}>
              {zona.sp[editOra].toFixed(1)}<span style={{fontSize:13,color:"#9ca3af"}}>°C</span>
            </div>
            <button onClick={()=>setSetpoint(zona.id,editOra,zona.sp[editOra]+0.5)} style={S.spBtn}>+</button>
          </div>
        </div>
      )}

      {/* Griglia 24 celle */}
      <div style={S.card}>
        <div style={{fontSize:11,color:"#6b7280",marginBottom:8,fontWeight:700,letterSpacing:"0.06em"}}>
          SETPOINT ORARI</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4}}>
          {zona.sp.map((val,h)=>(
            <div key={h} onClick={()=>setEditOra(h===editOra?null:h)}
              style={{background:h===editOra?"#78350f":h===ora?"#1e3a5f":"#1f2937",
                border:`1px solid ${h===editOra?"#f59e0b":h===ora?"#3b82f6":"#374151"}`,
                borderRadius:8,padding:"5px 2px",textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:9,color:"#6b7280"}}>{String(h).padStart(2,"0")}h</div>
              <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>{val}°</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── STATO TAB ─────────────────────────────────────────────────────────────────
function StatoTab({luci,zone,conn,ci,ora,plcClock,plcCreds,setPlcCreds,connect}){
  const [edit,setEdit]=useState(false);
  const [u,setU]=useState(plcCreds.user); const [p,setP]=useState(plcCreds.pass);
  const [testing,setTesting]=useState(false); const [res,setRes]=useState(null);
  const luciOn=luci.filter(l=>l.accesa);
  const doTest=async()=>{
    setTesting(true); setRes(null);
    try{
      const r=await api.login(u||plcCreds.user,p||plcCreds.pass);
      const tok=r?.token; if(!tok) throw new Error("Login fallito");
      const ts=await api.clock(tok);
      setRes({ok:true,msg:`✅ PLC raggiunto! Ora: ${ts?.timestamp||"—"}`});
    }catch(e){ setRes({ok:false,msg:`❌ ${e.message}`}); }
    setTesting(false);
  };
  const save=()=>{ const nc={user:u,pass:p};
    localStorage.setItem(AUTH_KEY,JSON.stringify(nc));
    setPlcCreds(nc); setEdit(false); connect(u,p); };
  return(
    <div style={{padding:"0 14px 16px"}}>
      <Section title="Connessione PLC">
        <Row k="Stato"    v={ci.label} vc={ci.color}/>
        <Row k="IP"       v={`${PLC_IP}:80`}/>
        <Row k="Firmware" v="V4.6"/>
        {plcClock&&<Row k="Ora PLC" v={plcClock}/>}
        {conn==="local"&&<Row k="Aggiornamento" v="ogni 5 sec" vc="#4ade80"/>}
      </Section>
      <Section title="Credenziali Web Server">
        {!edit?(
          <>
            <Row k="Utente"   v={plcCreds.user||"—"}/>
            <Row k="Password" v={plcCreds.pass?"••••••":"—"}/>
            <div style={{padding:"10px 14px",display:"flex",gap:8}}>
              <button onClick={()=>setEdit(true)} style={S.btnSec}>Modifica</button>
              <button onClick={doTest} disabled={testing||!plcCreds.user}
                style={{...S.btnPrim,opacity:(!plcCreds.user||testing)?0.4:1}}>
                {testing?"…":"Test connessione"}</button>
            </div>
            {res&&<div style={{padding:"6px 14px 12px",fontSize:12,
              color:res.ok?"#4ade80":"#f87171"}}>{res.msg}</div>}
          </>
        ):(
          <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
            <input value={u} onChange={e=>setU(e.target.value)} placeholder="Utente PLC"
              style={S.input} autoCapitalize="none" autoCorrect="off"/>
            <input value={p} onChange={e=>setP(e.target.value)} placeholder="Password PLC"
              type="password" style={S.input}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setEdit(false)} style={S.btnSec}>Annulla</button>
              <button onClick={save} style={S.btnPrim}>Salva e connetti</button>
            </div>
          </div>
        )}
      </Section>
      <Section title={`Luci accese (${luciOn.length}/12)`}>
        {luciOn.length===0
          ?<div style={{padding:"12px 14px",color:"#4b5563",fontSize:13}}>Nessuna luce accesa</div>
          :luciOn.map(l=><Row key={l.id} k={`${l.icona} ${l.nome}`} v="● ON" vc="#f59e0b"/>)}
      </Section>
      <Section title="Temperature">
        {zone.map(z=><Row key={z.id} k={`${z.icona} ${z.nome}`}
          v={`${z.tempAtt.toFixed(1)}°C → SP ${z.sp[ora]}°C`}
          vc={z.valvola?"#f97316":"#9ca3af"}/>)}
      </Section>
      <div style={{textAlign:"center",fontSize:10,color:"#374151",paddingTop:4,paddingBottom:8}}>
        {conn==="local"?"● LIVE — dati reali dal PLC":"⚙️ MOCK — abilita web server PLC"}
      </div>
    </div>
  );
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function Toggle({on,onClick,big}){
  const w=big?54:42,h=big?28:22,d=big?20:16;
  return(<div onClick={onClick} style={{width:w,height:h,borderRadius:h,
    background:on?"#f59e0b":"#374151",position:"relative",cursor:"pointer",flexShrink:0,
    transition:"background .2s",boxShadow:on?"0 0 14px rgba(245,158,11,.4)":"none"}}>
    <div style={{position:"absolute",top:(h-d)/2,left:on?w-d-(h-d)/2:(h-d)/2,
      width:d,height:d,borderRadius:"50%",background:"#fff",transition:"left .2s",
      boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
  </div>);}
function Pill({icon,val}){return(<div style={S.pill}>
  <span style={{fontSize:12}}>{icon}</span>
  <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{val}</span>
</div>);}
function Section({title,children}){return(<div style={{marginBottom:16}}>
  <div style={{fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:"0.08em",
    textTransform:"uppercase",marginBottom:6}}>{title}</div>
  <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:14,overflow:"hidden"}}>{children}</div>
</div>);}
function Row({k,v,vc}){return(<div style={{display:"flex",justifyContent:"space-between",
  alignItems:"center",padding:"9px 14px",borderBottom:"1px solid #1a1a2e"}}>
  <span style={{fontSize:12,color:"#9ca3af"}}>{k}</span>
  <span style={{fontSize:12,fontWeight:600,color:vc||"#e2e8f0"}}>{v}</span>
</div>);}

const S={
  root:{fontFamily:"'DM Sans',system-ui,sans-serif",background:"#0a0a0f",minHeight:"100vh",
    maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column",color:"#e2e8f0",paddingBottom:70},
  statusBar:{display:"flex",justifyContent:"space-between",alignItems:"center",
    padding:"10px 16px 6px",borderBottom:"1px solid #12121e"},
  connBtn:{background:"#1f2937",border:"none",color:"#9ca3af",
    borderRadius:6,padding:"2px 10px",cursor:"pointer",fontSize:16},
  header:{padding:"12px 16px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",
    borderBottom:"1px solid #12121e",background:"linear-gradient(180deg,#0d0d1a,#0a0a0f)"},
  pill:{display:"flex",alignItems:"center",gap:4,background:"#1a1a2e",
    borderRadius:16,padding:"4px 9px",border:"1px solid #2d2d44"},
  scroll:{flex:1,overflowY:"auto",paddingTop:14},
  nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,
    background:"#0d0d1a",borderTop:"1px solid #1a1a2e",display:"flex",height:66,zIndex:100},
  navBtn:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
    background:"none",border:"none",cursor:"pointer",position:"relative",gap:2},
  navBar:{position:"absolute",bottom:0,width:30,height:2,borderRadius:2,background:"#f59e0b"},
  card:{background:"#111827",border:"1px solid #1f2937",borderRadius:14,padding:14},
  filtroBtn:{background:"#1f2937",border:"1px solid #374151",color:"#9ca3af",
    borderRadius:20,padding:"5px 13px",fontSize:12,cursor:"pointer",fontWeight:500},
  filtroBtnOn:{background:"#1e3a5f",border:"1px solid #3b82f6",color:"#60a5fa"},
  luceCard:{background:"#111827",border:"1px solid #1f2937",borderRadius:16,padding:14,
    cursor:"pointer",transition:"transform 0.15s",userSelect:"none"},
  luceCardOn:{background:"#1c1400",border:"1px solid #92400e",boxShadow:"0 0 20px rgba(245,158,11,.12)"},
  glow:{position:"absolute",top:0,left:0,width:36,height:36,
    borderRadius:"50%",background:"rgba(245,158,11,.25)",filter:"blur(8px)"},
  backBtn:{background:"#1f2937",border:"none",color:"#e2e8f0",
    borderRadius:8,padding:"4px 12px",fontSize:22,cursor:"pointer",lineHeight:1},
  spBtn:{width:48,height:48,borderRadius:"50%",background:"#1f2937",border:"1px solid #374151",
    color:"#e2e8f0",fontSize:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  spBtnSm:{width:36,height:36,borderRadius:"50%",background:"#1f2937",border:"1px solid #374151",
    color:"#e2e8f0",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  btnPrim:{background:"#1e3a5f",border:"1px solid #3b82f6",color:"#60a5fa",
    borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",flex:1},
  btnSec:{background:"#1f2937",border:"1px solid #374151",color:"#9ca3af",
    borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer"},
  input:{background:"#1f2937",border:"1px solid #374151",color:"#f1f5f9",
    borderRadius:10,padding:"10px 12px",fontSize:14,outline:"none",width:"100%"},
};
