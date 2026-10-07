"use client";

import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { Activity,Circle,CircleDot,Focus,Gauge,Grid3X3,Info,Moon,PanelLeftClose,PanelLeftOpen,Pause,Play,Plus,RotateCcw,Save,Sparkles,Star,Trash2,X } from "lucide-react";
import Scene from "@/components/canvas/Scene";
import BrandMark from "@/components/site/BrandMark";
import { useCameraStore } from "@/components/canvas/cameraStore";
import { usePhysicsStore,type Body } from "@/components/canvas/physics/store";
import { DEFAULT_PRESET_KEY,getPreset,PRESETS,type PresetKey } from "@/lib/simulation/presets";
import { celestialBodySchema } from "@/lib/simulation/schema";
import { BODY_TEMPLATES,createBodyFromTemplate,type BodyTemplateKey } from "@/lib/simulation/templates";
import { analyzeHabitability } from "@/lib/science/habitability";
import { analyzeBlackHole } from "@/lib/science/black-hole";
import { analyzeStar } from "@/lib/science/stellar";
import { GAUSSIAN_G } from "@/lib/simulation/nbody";

type Controller={addBody:(body:Body)=>void;updateBody:(id:string,patch:Partial<Body>)=>void;removeBody:(id:string)=>void;reset:()=>void};

const categoryIcons={star:Star,planet:CircleDot,moon:Moon,asteroid:Circle,blackHole:CircleDot};
function ObjectRoster(){const bodies=usePhysicsStore(s=>s.bodies),selectedId=usePhysicsStore(s=>s.selectedBodyId),select=usePhysicsStore(s=>s.selectBody);return <section className="object-roster"><div className="roster-heading"><span>Objects</span><strong>{bodies.length}</strong></div><div className="roster-list">{bodies.map(body=>{const Icon=categoryIcons[body.category];return <button key={body.id} className={selectedId===body.id?"selected":""} onClick={()=>select(body.id)}><span className="object-swatch" style={{color:body.color}}><Icon size={14}/></span><span><strong>{body.name}</strong><small>{body.category.replace("blackHole","black hole")}</small></span><Focus size={13}/></button>;})}</div></section>}

// Random phase on the requested orbit, avoiding spots already occupied (every preset starts its planets on +x).
function clearOrbitAngle(host:Body,distance:number,bodies:Body[]){
  let best=0,bestGap=-1;
  for(let attempt=0;attempt<24;attempt++){
    const angle=Math.random()*Math.PI*2,x=host.positionAU[0]+distance*Math.cos(angle),y=host.positionAU[1]+distance*Math.sin(angle);
    const gap=Math.min(Infinity,...bodies.filter(body=>body.id!==host.id).map(body=>Math.hypot(body.positionAU[0]-x,body.positionAU[1]-y)));
    if(gap>=.05*distance)return angle;
    if(gap>bestGap){best=angle;bestGap=gap;}
  }
  return best;
}

function ObjectCreator({controller,onClose}:{controller:Controller|null;onClose:()=>void}){const[templateKey,setTemplateKey]=useState<BodyTemplateKey>("earth"),[name,setName]=useState(BODY_TEMPLATES.earth.name),[distance,setDistance]=useState(2),[error,setError]=useState("");const bodies=usePhysicsStore(s=>s.bodies),select=usePhysicsStore(s=>s.selectBody);const template=BODY_TEMPLATES[templateKey],host=bodies.find(body=>body.category==="star"||body.category==="blackHole");const chooseTemplate=(key:BodyTemplateKey)=>{setTemplateKey(key);setName(BODY_TEMPLATES[key].name);};const add=()=>{const current=usePhysicsStore.getState().liveBodies(),host=current.find(body=>body.category==="star"||body.category==="blackHole");if(!controller||!host){setError("The simulation needs a star or black hole first.");return;}if(!Number.isFinite(distance)||distance<=0){setError("Distance must be greater than zero.");return;}const angle=clearOrbitAngle(host,distance,current),speed=Math.sqrt(GAUSSIAN_G*(host.massSolar+template.massSolar)/distance),created=createBodyFromTemplate(templateKey,[host.positionAU[0]+distance*Math.cos(angle),host.positionAU[1]+distance*Math.sin(angle)],[host.velocityAUPerDay[0]-speed*Math.sin(angle),host.velocityAUPerDay[1]+speed*Math.cos(angle)]);created.name=name.trim()||template.name;created.parentId=host.id;controller.addBody(created);select(created.id);onClose();};return <section className="object-creator"><div className="creator-title"><div><span>Add an object</span><strong>Start with a stable orbit</strong></div></div><div className="planet-mockup"><div className={`mockup-space ${template.category}`}><span className="mockup-glow" style={{background:template.color}}/><span className="mockup-body" style={{background:`radial-gradient(circle at 32% 28%, #ffffffaa, ${template.color} 34%, #0c0b09 100%)`,width:`${Math.min(72,34+template.renderRadius*38)}px`,height:`${Math.min(72,34+template.renderRadius*38)}px`}}/>{template.category==="planet"&&templateKey==="gasGiant"&&<i/>}</div><div><strong>{name||template.name}</strong><span>{template.category.replace("blackHole","Black hole")} · {template.massSolar.toExponential(2)} M☉</span><small>Preview uses an enlarged visual radius so the object remains visible in space.</small></div></div><label className="field-label">Object template<select value={templateKey} onChange={event=>chooseTemplate(event.target.value as BodyTemplateKey)}>{Object.entries(BODY_TEMPLATES).map(([key,value])=><option value={key} key={key}>{value.name}</option>)}</select></label><label className="field-label">Name<input value={name} onChange={event=>setName(event.target.value)}/></label><label className="field-label">Distance from {host?.name??"central object"} (AU)<input type="number" min="0.01" step="0.1" value={distance} onChange={event=>setDistance(Number(event.target.value))}/></label><div className="orbit-preview"><span className="orbit-preview-star"/><i/><span className="orbit-preview-body" style={{background:template.color}}/><div><strong>Automatic circular velocity</strong><small>{host?`${Math.sqrt(.00029591220828559*host.massSolar/Math.max(distance,.01)).toFixed(4)} AU/day`:`Choose a central object first`}</small></div></div>{error&&<p className="field-error" role="alert">{error}</p>}<button className="button button-primary creator-submit" onClick={add} disabled={!controller}><Plus size={16}/>Add to simulation</button><p className="creator-explanation">Adding this object recalculates gravity and predicted movement for every body. It will appear in the Objects list automatically.</p></section>}

function SciencePanel({body,bodies}:{body:Body;bodies:Body[]}){
  if(body.category==="planet"||body.category==="moon"){
    const host=bodies.find(candidate=>candidate.id===body.parentId&&candidate.category==="star")??bodies.find(candidate=>candidate.category==="star");if(!host)return null;const result=analyzeHabitability(body,host);
    return <section className="science-panel"><div className="science-panel-title"><CircleDot size={16}/><span>Habitability estimate</span><strong>{result.score}/100</strong></div><div className="science-score"><i style={{width:`${result.score}%`}}/></div><div className="science-summary"><strong>{result.classification}</strong><span>{result.zone} · {result.equilibriumTemperatureK.toFixed(0)} K</span></div><ul>{result.positives.map(item=><li className="positive" key={item}>{item}</li>)}{result.negatives.map(item=><li key={item}>{item}</li>)}</ul><p className="science-disclaimer">Educational estimate using stellar flux, mass, and equilibrium temperature—not evidence of life.</p></section>;
  }
  if(body.category==="blackHole"){
    const result=analyzeBlackHole(body.massSolar);return <section className="science-panel black-hole-panel"><div className="science-panel-title"><CircleDot size={16}/><span>Black-hole physics</span></div><div className="science-summary"><strong>{result.classification}</strong><span>{body.massSolar.toLocaleString()} solar masses</span></div><dl><div><dt>Event horizon</dt><dd>{result.schwarzschildRadiusKm.toLocaleString(undefined,{maximumFractionDigits:1})} km</dd></div><div><dt>Photon sphere</dt><dd>{result.photonSphereRadiusKm.toLocaleString(undefined,{maximumFractionDigits:1})} km</dd></div><div><dt>Stable orbit begins</dt><dd>{result.innermostStableOrbitKm.toLocaleString(undefined,{maximumFractionDigits:1})} km</dd></div></dl><p className="science-disclaimer">Calculated for a non-rotating Schwarzschild black hole. Disk and lensing visuals are approximate.</p></section>;
  }
  if(body.category==="star"){
    const result=analyzeStar(body.massSolar,body.ageGyr,body.metallicity);return <section className="science-panel stellar-panel"><div className="science-panel-title"><Star size={16}/><span>Stellar lifecycle</span><strong>{result.stage}</strong></div><div className="lifecycle-path">{result.path.map(stage=><span className={stage===result.stage?"active":""} key={stage}>{stage}</span>)}</div><dl><div><dt>Est. lifespan</dt><dd>{result.lifespanGyr.toFixed(2)} Gyr</dd></div><div><dt>Temperature</dt><dd>{result.temperatureK.toFixed(0)} K</dd></div><div><dt>Luminosity</dt><dd>{result.luminositySolar.toFixed(2)} L☉</dd></div><div><dt>Final remnant</dt><dd>{result.remnant}</dd></div></dl><p className="science-disclaimer">Simplified mass-based educational model; real stellar evolution also depends on composition and mass loss.</p></section>;
  }
  return null;
}

function BodyInspector({body,controller}:{body:Body;controller:Controller|null}){
  const [draft,setDraft]=useState(body),[error,setError]=useState("");
  const numeric=(key:keyof Body,value:string)=>setDraft(current=>({...current,[key]:Number(value)}));
  const vector=(key:"positionAU"|"velocityAUPerDay",index:number,value:string)=>setDraft(current=>({...current,[key]:current[key].map((item,itemIndex)=>itemIndex===index?Number(value):item) as [number,number]}));
  const save=()=>{const result=celestialBodySchema.safeParse(draft);if(!result.success){setError(result.error.issues[0]?.message??"Check the object values.");return;}controller?.updateBody(body.id,result.data);setError("");};
  return <div className="inspector" key={body.id}>
    <div className="panel-heading compact"><div className="panel-icon purple"><Focus size={18}/></div><div><span>Selected object</span><h2>{body.name}</h2></div></div>
    <label className="field-label">Name<input value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})}/></label>
    <div className="field-grid"><label className="field-label">Type<select value={draft.category} onChange={event=>setDraft({...draft,category:event.target.value as Body["category"]})}>{["star","planet","moon","asteroid","blackHole"].map(type=><option key={type}>{type}</option>)}</select></label><label className="field-label">Color<input type="color" value={draft.color} onChange={event=>setDraft({...draft,color:event.target.value})}/></label></div>
    <div className="field-grid"><label className="field-label">Mass (M☉)<input type="number" min="0" step="any" value={draft.massSolar} onChange={event=>numeric("massSolar",event.target.value)}/></label><label className="field-label">Radius (km)<input type="number" min="1" step="any" value={draft.radiusKm} onChange={event=>numeric("radiusKm",event.target.value)}/></label></div>
    {draft.category==="star"&&<><span className="field-section-label">Stellar evolution</span><div className="field-grid"><label className="field-label">Age (Gyr)<input type="number" min="0" step="0.001" value={draft.ageGyr??0} onChange={event=>numeric("ageGyr",event.target.value)}/></label><label className="field-label">Metallicity<input type="number" min="0" step="0.001" value={draft.metallicity??.014} onChange={event=>numeric("metallicity",event.target.value)}/></label></div><label className="field-label">Luminosity (L☉)<input type="number" min="0" step="any" value={draft.luminositySolar??1} onChange={event=>numeric("luminositySolar",event.target.value)}/></label></>}
    <span className="field-section-label">Position (AU)</span><div className="field-grid"><label className="field-label">X<input type="number" step="any" value={draft.positionAU[0]} onChange={event=>vector("positionAU",0,event.target.value)}/></label><label className="field-label">Y<input type="number" step="any" value={draft.positionAU[1]} onChange={event=>vector("positionAU",1,event.target.value)}/></label></div>
    <span className="field-section-label">Velocity (AU/day)</span><div className="field-grid"><label className="field-label">Vx<input type="number" step="any" value={draft.velocityAUPerDay[0]} onChange={event=>vector("velocityAUPerDay",0,event.target.value)}/></label><label className="field-label">Vy<input type="number" step="any" value={draft.velocityAUPerDay[1]} onChange={event=>vector("velocityAUPerDay",1,event.target.value)}/></label></div>
    {error&&<p className="field-error" role="alert">{error}</p>}
    <div className="button-pair"><button className="button button-primary" onClick={save}><Save size={15}/>Apply</button><button className="button button-danger" onClick={()=>controller?.removeBody(body.id)} disabled={!controller||body.id===usePhysicsStore.getState().bodies[0]?.id}><Trash2 size={15}/>Delete</button></div>
  </div>;
}

type PanelTab="objects"|"add"|"overlays";
const PANEL_TABS:Array<{key:PanelTab;label:string}>=[{key:"objects",label:"Objects"},{key:"add",label:"Add"},{key:"overlays",label:"Overlays"}];

export default function Simulator({initialPreset=DEFAULT_PRESET_KEY}:{initialPreset?:PresetKey}){
  const[simSpeed,setSimSpeed]=useState(30),[paused,setPaused]=useState(false),[tab,setTab]=useState<PanelTab>("objects"),[leftOpen,setLeftOpen]=useState(true),[presetKey,setPresetKey]=useState<PresetKey>(initialPreset),[showTrails,setShowTrails]=useState(true),[showPredictions,setShowPredictions]=useState(true),[showVelocity,setShowVelocity]=useState(false),[showGrid,setShowGrid]=useState(false),[collisions,setCollisions]=useState<"merge"|"none">("merge"),[controller,setController]=useState<Controller|null>(null);
  const document=useMemo(()=>getPreset(presetKey),[presetKey]),effectiveSpeed=paused?0:simSpeed,setHome=useCameraStore(s=>s.setHome),selectedId=usePhysicsStore(s=>s.selectedBodyId),select=usePhysicsStore(s=>s.selectBody),bodies=usePhysicsStore(s=>s.bodies),selectedBody=bodies.find(body=>body.id===selectedId),elapsedDays=usePhysicsStore(s=>s.elapsedDays),bodyCount=bodies.length,collisionCount=usePhysicsStore(s=>s.collisionCount),lastEvent=usePhysicsStore(s=>s.lastEvent),eventId=usePhysicsStore(s=>s.eventId),clearEvent=usePhysicsStore(s=>s.clearEvent);
  useEffect(()=>{if(!eventId)return;const timer=setTimeout(clearEvent,4000);return()=>clearTimeout(timer);},[eventId,clearEvent]);
  useEffect(()=>{if(window.matchMedia("(max-width:900px)").matches)setLeftOpen(false);},[]);
  const reset=()=>{controller?.reset();setHome();setPaused(false);};
  const choosePreset=(key:PresetKey)=>{setPresetKey(key);setTab("objects");window.history.replaceState(null,"",`/simulator?preset=${key}`);};
  return <div className={`sim-stage${selectedBody?" has-selection":""}`}>
    <Scene simSpeed={effectiveSpeed} initialBodies={document.bodies} showTrails={showTrails} showPredictions={showPredictions} showVelocity={showVelocity} showGrid={showGrid} collisions={collisions} onController={setController}/>
    <div className="canvas-vignette"/>

    <header className="sim-topbar">
      <Link className="brand" href="/" aria-label="Astro Sandbox home"><BrandMark size={20}/><span>Astro <em>Sandbox</em></span></Link>
      <label className="sim-preset" title={document.description}><span>System</span><select value={presetKey} onChange={event=>choosePreset(event.target.value as PresetKey)}>{Object.entries(PRESETS).map(([key,preset])=><option value={key} key={key}>{preset.name}</option>)}</select></label>
    </header>
    <nav className="sim-topbar-right" aria-label="Site"><Link href="/dashboard">My simulations</Link><Link href="/">Home</Link></nav>

    {leftOpen?<aside className="sim-panel sim-panel-left" aria-label="Simulation tools">
      <div className="sim-tabs" role="tablist">{PANEL_TABS.map(item=><button key={item.key} role="tab" aria-selected={tab===item.key} className={tab===item.key?"active":""} onClick={()=>setTab(item.key)}>{item.label}</button>)}<button className="sim-icon-button" onClick={()=>setLeftOpen(false)} aria-label="Collapse panel"><PanelLeftClose size={16}/></button></div>
      <div className="sim-panel-body">
        {tab==="objects"&&<><ObjectRoster/><p className="preset-description">{document.description}</p></>}
        {tab==="add"&&<ObjectCreator controller={controller} onClose={()=>setTab("objects")}/>}
        {tab==="overlays"&&<><div className="overlay-controls"><label><span><Activity size={14}/>Live orbit trails</span><input type="checkbox" checked={showTrails} onChange={event=>setShowTrails(event.target.checked)}/></label><label><span><Sparkles size={14}/>Predicted movement</span><input type="checkbox" checked={showPredictions} onChange={event=>setShowPredictions(event.target.checked)}/></label><label><span><Gauge size={14}/>Velocity vectors</span><input type="checkbox" checked={showVelocity} onChange={event=>setShowVelocity(event.target.checked)}/></label><label><span><Grid3X3 size={14}/>Orbital grid</span><input type="checkbox" checked={showGrid} onChange={event=>setShowGrid(event.target.checked)}/></label><label><span><Sparkles size={14}/>Merge collisions</span><input type="checkbox" checked={collisions==="merge"} onChange={event=>setCollisions(event.target.checked?"merge":"none")}/></label></div><div className="control-tip"><Info size={16}/><p>Physics uses AU, solar masses, and days. Visual sizes are exaggerated without changing the calculations. Dashed lines predict the next 360 days.</p></div></>}
      </div>
    </aside>:<button className="sim-panel-toggle" onClick={()=>setLeftOpen(true)} aria-label="Open tools panel"><PanelLeftOpen size={16}/><span>Tools</span></button>}

    {selectedBody&&<aside className="sim-panel sim-panel-right" aria-label="Selected object">
      <button className="sim-icon-button sim-close" onClick={()=>select(null)} aria-label="Close inspector"><X size={16}/></button>
      <div className="sim-panel-body"><BodyInspector key={selectedBody.id} body={selectedBody} controller={controller}/><SciencePanel body={selectedBody} bodies={bodies}/></div>
    </aside>}

    <div className="sim-transport" role="group" aria-label="Playback">
      <button className="button button-primary sim-play" onClick={()=>setPaused(value=>!value)} aria-label={paused?"Resume":"Pause"}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>
      <button className="button button-secondary sim-play" onClick={reset} aria-label="Reset"><RotateCcw size={16}/></button>
      <label className="sim-speed"><span className="visually-hidden">Time scale</span><input type="range" min={1} max={200} value={simSpeed} onChange={event=>setSimSpeed(Number(event.target.value))} disabled={paused}/><strong>{effectiveSpeed.toFixed(0)} d/s</strong></label>
      <div className="simulation-stats"><span>{elapsedDays.toFixed(1)} days</span><span>{bodyCount} bodies</span><span>{collisionCount} collisions</span></div>
    </div>

    {lastEvent&&<div className="event-toast">{lastEvent}</div>}
    <div className="navigation-card"><strong>Navigate</strong><span>Drag: orbit · Right-drag: pan · Scroll: zoom · Click: select</span></div>
  </div>;
}
