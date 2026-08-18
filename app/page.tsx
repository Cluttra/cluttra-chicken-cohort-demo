"use client";

import { useMemo, useState } from "react";

type CohortType = "Broiler" | "Layer" | "Breeder";
type Row = { week:number; date:string; stage:string; opening:number; mortality:number; deaths:number; closing:number; feedType:string; feedKg:number; labour:number; health:string; vetCost:number; targetWeight:number; eggs:number; opex:number; cumulative:number };

const PROFILES = {
  Broiler: { days:42, feedCycle:3.98, layStart:0, eggs:0, broodMort:.025, laterMort:.025, labour:12, female:0, weight:2.6, vet:.28 },
  Layer: { days:364, feedCycle:0, layStart:19, eggs:300, broodMort:.02, laterMort:.04, labour:18, female:1, weight:1.95, vet:.75 },
  Breeder: { days:364, feedCycle:0, layStart:24, eggs:165, broodMort:.025, laterMort:.05, labour:22, female:.9, weight:3.5, vet:1.1 },
} as const;
const money = new Intl.NumberFormat("hu-HU",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const qty = new Intl.NumberFormat("hu-HU",{maximumFractionDigits:0});
const one = new Intl.NumberFormat("hu-HU",{maximumFractionDigits:1});

function stageFor(type:CohortType,week:number,ageEnd:number):[string,string,number]{
  if(type==="Broiler") return ageEnd<=10?["Indító","Brojler indítótáp",.46]:ageEnd<=24?["Nevelő","Brojler nevelőtáp",.42]:["Befejező","Brojler befejező táp",.39];
  if(type==="Layer") return week<=6?["Csibeindító","Tojócsibe-indítótáp",.38]:week<=15?["Jércenevelő","Jércenevelő táp",.38]:week<=18?["Előtojás","Előtojás táp",.38]:["Tojástermelés","Tojótáp",.38];
  return week<=6?["Csibeindító","Tenyészcsibe-indítótáp",.41]:week<=20?["Tenyésznevelő","Tenyésznevelő táp",.41]:week<=23?["Előtenyész","Előtenyész táp",.41]:["Tenyészállomány","Tenyésztáp",.41];
}
function feedPerWeek(type:CohortType,week:number){ return type==="Layer"?(week<=6?.35:week<=15?.55:week<=18?.7:.8):(week<=6?.35:week<=20?.6:week<=23?.8:1.05); }
function healthEvent(type:CohortType,week:number,activeWeeks:number,layStart:number){
  if(week===1)return "Telepítési ellenőrzés és keltetői oltási dokumentáció";
  if(week===2)return "Newcastle / IB program felülvizsgálata";
  if(week===3)return "IBD / Gumboro program felülvizsgálata";
  if(week===4)return "Emlékeztető oltás hatásának ellenőrzése";
  if(type==="Broiler"&&week===activeWeeks)return "Vágás előtti állományvizsgálat";
  if(type!=="Broiler"&&week===layStart)return "Tojásindulás előtti egészségi és homogenitási vizsgálat";
  if(week%13===0)return "Negyedéves állomány-egészségügyi vizsgálat";
  return "Rutin megfigyelés";
}
function buildRows(type:CohortType,size:number,start:string,costFactor:number){
  const p=PROFILES[type], activeWeeks=Math.ceil(p.days/7), startDate=new Date(`${start}T00:00:00Z`), rows:Row[]=[]; let opening=size,cumulative=0;
  for(let week=1;week<=activeWeeks;week++){
    const ageStart=(week-1)*7,ageEnd=Math.min(week*7,p.days),mortality=ageEnd<=21?p.broodMort/3:p.laterMort/Math.max(1,activeWeeks-3),deaths=opening*mortality,closing=Math.max(0,opening-deaths);
    const [stage,feedType,feedPrice]=stageFor(type,week,ageEnd);
    const feedKg=type==="Broiler"?opening*p.feedCycle*(Math.pow(ageEnd/p.days,1.35)-Math.pow(ageStart/p.days,1.35)):opening*feedPerWeek(type,week);
    const labour=opening/1000*p.labour,health=healthEvent(type,week,activeWeeks,p.layStart),vetCost=health==="Rutin megfigyelés"?0:opening*p.vet/(type==="Broiler"?5:8);
    const targetWeight=type==="Broiler"?p.weight*Math.pow(ageEnd/p.days,1.55):Math.min(p.weight,p.weight*week/p.layStart);
    const eggs=week>=p.layStart&&p.layStart>0?closing*p.female*p.eggs/Math.max(1,53-p.layStart):0,opex=(feedKg*feedPrice+labour*5.5+vetCost)*costFactor; cumulative+=opex;
    const d=new Date(startDate); d.setUTCDate(d.getUTCDate()+(week-1)*7);
    rows.push({week,date:d.toISOString().slice(0,10),stage,opening,mortality,deaths,closing,feedType,feedKg,labour,health,vetCost,targetWeight,eggs,opex,cumulative}); opening=closing;
  } return rows;
}

export default function Home(){
  const [type,setType]=useState<CohortType>("Broiler"),[size,setSize]=useState(2000),[start,setStart]=useState("2027-01-04"),[scenario,setScenario]=useState("Alapeset"),[view,setView]=useState<"Plan"|"Health">("Plan");
  const costFactor=scenario==="Magas inputköltség"?1.15:scenario==="Hatékonysági eset"?.93:1;
  const rows=useMemo(()=>buildRows(type,Math.max(1,size||1),start,costFactor),[type,size,start,costFactor]);
  const totals=useMemo(()=>({survivors:rows.at(-1)?.closing??0,feed:rows.reduce((a,r)=>a+r.feedKg,0),labour:rows.reduce((a,r)=>a+r.labour,0),eggs:rows.reduce((a,r)=>a+r.eggs,0),opex:rows.at(-1)?.cumulative??0}),[rows]);
  const maxFeed=Math.max(...rows.map(r=>r.feedKg));
  function downloadCsv(){const head=["Hét","Hét kezdete","Fázis","Nyitó létszám","Mortalitás %","Záró létszám","Takarmány","Takarmány kg","Munkaóra","Állategészségügyi esemény","Célsúly kg","Tojás","Heti OPEX EUR"],data=rows.map(r=>[r.week,r.date,r.stage,r.opening,r.mortality,r.closing,r.feedType,r.feedKg,r.labour,r.health,r.targetWeight,r.eggs,r.opex]),csv="\uFEFF"+[head,...data].map(line=>line.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`csirke-kohorsz-${type.toLowerCase()}.csv`;a.click();URL.revokeObjectURL(a.href);}
  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="Cluttra Demo"><img src="/cluttra-logo.png" alt="Cluttra"/><span>Demo</span></a><div className="live"><i/> Tervezési demó</div><button className="export" onClick={downloadCsv}>Heti terv exportálása <span>↓</span></button></header>
    <section className="hero" id="top"><div><p className="eyebrow">Digitális iker koncepció · baromfitartás</p><h1>Egy kohorsz.<br/><em>Minden működési jelzés.</em></h1><p className="intro">Prezentációra kész, heti tervezési nézet az állomány alakulásáról, takarmányigényéről, munkaerő-szükségletéről, egészségügyi eseményeiről és tojástermeléséről.</p></div><div className="heroStatus"><span>Modellállapot</span><b>ÜZEMKÉSZ</b><small>Szemléltető feltételezések · élő IoT-adatkapcsolat nélkül</small></div></section>
    <section className="workspace"><aside className="controls"><div className="sectionTitle"><span>01</span><div><b>Kohorszbeállítások</b><small>Minden mező azonnal újraszámol</small></div></div><label>Faj<input value="Csirke" readOnly/></label><label>Kohorsz típusa<select value={type} onChange={e=>setType(e.target.value as CohortType)}><option value="Broiler">Brojler</option><option value="Layer">Tojó</option><option value="Breeder">Tenyészállomány</option></select></label><label>Telepített állomány<input type="number" min="1" step="100" value={size} onChange={e=>setSize(Number(e.target.value))}/></label><label>Kezdőnap<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Szcenárió<select value={scenario} onChange={e=>setScenario(e.target.value)}><option>Alapeset</option><option>Magas inputköltség</option><option>Hatékonysági eset</option></select></label><div className="assumptionNote"><b>{type==="Broiler"?"Brojler":type==="Layer"?"Tojó":"Tenyészállomány"} profil</b><p>{PROFILES[type].days} nap · {PROFILES[type].weight.toFixed(2)} kg célsúly{type!=="Broiler"?` · tojástermelés kezdete: ${PROFILES[type].layStart}. hét`:" · 1,53 cél-FCR"}</p></div></aside>
      <div className="mainPanel"><div className="kpis"><article><span>Várható záróállomány</span><b>{qty.format(totals.survivors)}</b><small>{((totals.survivors/size)*100).toFixed(1)}% életképesség</small></article><article><span>Teljes takarmányigény</span><b>{one.format(totals.feed/1000)} t</b><small>{one.format(totals.feed/size)} kg / telepített állat</small></article><article><span>Közvetlen kohorsz-OPEX</span><b>{money.format(totals.opex)}</b><small>{money.format(totals.opex/size)} / telepített állat</small></article><article><span>{type==="Broiler"?"Munkaerőigény":"Becsült tojásszám"}</span><b>{type==="Broiler"?`${qty.format(totals.labour)} óra`:qty.format(totals.eggs)}</b><small>{type==="Broiler"?"tervezett közvetlen munkaóra":`${one.format(totals.eggs/size)} / telepített állat`}</small></article></div>
      <div className="chartCard"><div className="cardHead"><div><p className="eyebrow">Heti igénygörbe</p><h2>Takarmányigény és állomány-alakulás</h2></div><div className="legend"><span><i className="dot blue"/>Takarmány kg</span><span><i className="dot green"/>Élő állomány</span></div></div><div className="chart">{rows.map((r,i)=><div className="barCol" key={r.week}><div className="survival" style={{height:`${Math.max(6,r.closing/size*82)}%`}}/><div className="feedbar" style={{height:`${Math.max(4,r.feedKg/maxFeed*100)}%`}}/><span>{rows.length<=12||i%4===0?`${r.week}. h.`:""}</span></div>)}</div></div></div>
    </section>
    <section className="tableSection"><div className="tableToolbar"><div><p className="eyebrow">Működési idővonal</p><h2>Heti kohorszterv</h2></div><div className="tabs"><button className={view==="Plan"?"active":""} onClick={()=>setView("Plan")}>Termelési terv</button><button className={view==="Health"?"active":""} onClick={()=>setView("Health")}>Állategészségügy</button></div></div><div className="tableWrap"><table><thead><tr><th>Hét</th><th>Kezdés</th><th>Fázis</th><th>Nyitó</th><th>Mortalitás</th><th>Záró</th>{view==="Plan"?<><th>Takarmányprogram</th><th>Takarmány kg</th><th>Célsúly</th><th>Tojás</th><th>Heti OPEX</th></>:<><th className="wide">Állategészségügyi esemény</th><th>Állatorvosi keret</th><th>Állapot</th></>}</tr></thead><tbody>{rows.map(r=><tr key={r.week}><td><b>{String(r.week).padStart(2,"0")}</b></td><td>{r.date}</td><td><span className="stage">{r.stage}</span></td><td>{qty.format(r.opening)}</td><td>{(r.mortality*100).toFixed(2)}%</td><td>{qty.format(r.closing)}</td>{view==="Plan"?<><td>{r.feedType}</td><td>{one.format(r.feedKg)}</td><td>{r.targetWeight.toFixed(2)} kg</td><td>{qty.format(r.eggs)}</td><td>{money.format(r.opex)}</td></>:<><td className="wide">{r.health}</td><td>{money.format(r.vetCost)}</td><td><span className={r.health==="Rutin megfigyelés"?"status normal":"status event"}>{r.health==="Rutin megfigyelés"?"Normál":"Ellenőrzés"}</span></td></>}</tr>)}</tbody></table></div></section>
    <footer><p><b>Cluttra LLC Demo · döntéstámogató prototípus.</b> Az egészségügyi és oltási események szerkeszthető helyőrzők; a felelős állatorvosnak és a helyi hatósági előírásoknak kell jóváhagyniuk őket.</p><p>Forrásalap: Aviagen Ross műszaki portál · Hy-Line tartástechnológiai útmutató</p></footer>
  </main>;
}
