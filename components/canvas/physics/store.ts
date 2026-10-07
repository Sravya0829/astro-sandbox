"use client";

import { create } from "zustand";
import type { CelestialBody } from "@/lib/simulation/schema";
import type { CollisionEvent } from "@/lib/simulation/nbody";

export type Body = CelestialBody;
export type RuntimeSnapshot = { id:string; massSolar:number; radiusKm:number; renderRadius:number; positionAU:[number,number]; velocityAUPerDay:[number,number] };
type V2=[number,number];

// Per-frame motion lives outside React. The worker reports ~60 times a second; pushing every report
// through React state re-rendered the whole simulator each frame, which starved Next's navigation
// transitions (links on the simulator page silently did nothing). Meshes, trails and the camera read
// this object inside useFrame; React state is refreshed at PUBLISH_INTERVAL_MS or on structural change.
export const live={positions:new Map<string,V2>(),velocities:new Map<string,V2>(),trails:new Map<string,V2[]>(),elapsedDays:0,lastTrailDay:new Map<string,number>()};
const PUBLISH_INTERVAL_MS=250,PREDICTION_INTERVAL_MS=1000,TRAIL_SPACING_DAYS=.5,TRAIL_POINTS=720;
let lastPublish=0,lastPrediction=0;

function resetLive(bodies:Body[],elapsedDays=0){
  live.positions=new Map(bodies.map(body=>[body.id,[...body.positionAU] as V2]));live.velocities=new Map(bodies.map(body=>[body.id,[...body.velocityAUPerDay] as V2]));
  live.trails=new Map();live.lastTrailDay=new Map();live.elapsedDays=elapsedDays;
}
const withLive=(body:Body):Body=>({...body,positionAU:live.positions.get(body.id)??body.positionAU,velocityAUPerDay:live.velocities.get(body.id)??body.velocityAUPerDay});

type PhysicsState = {
  bodies: Body[];
  initialBodies: Body[];
  selectedBodyId: string | null;
  focusRequest:number;
  elapsedDays:number;
  collisionCount:number;
  lastEvent:string|null;
  eventId:number;
  trajectoryRevision:number;
  setBodies: (bodies:Body[], captureInitial?:boolean) => void;
  applySnapshot: (snapshot:RuntimeSnapshot[],elapsedDays:number,events:CollisionEvent[]) => void;
  /** Bodies with their current (live) position and velocity, for one-off reads outside the render loop. */
  liveBodies: () => Body[];
  addBody: (body:Body) => void;
  clearEvent: () => void;
  selectBody: (id:string|null) => void;
  updateBody: (id:string, patch:Partial<Body>) => void;
  removeBody: (id:string) => void;
  restoreInitial: () => void;
};

export const usePhysicsStore = create<PhysicsState>((set,get) => ({
  bodies:[], initialBodies:[], selectedBodyId:null,focusRequest:0,elapsedDays:0,collisionCount:0,lastEvent:null,trajectoryRevision:0,eventId:0,
  setBodies:(bodies,captureInitial=true) => {resetLive(bodies);set({ bodies:structuredClone(bodies), trajectoryRevision:get().trajectoryRevision+1, ...(captureInitial?{initialBodies:structuredClone(bodies),elapsedDays:0,collisionCount:0,lastEvent:null}:{}), selectedBodyId:null });},
  // The worker's snapshot decides which bodies exist (collisions remove bodies there); the store keeps
  // the descriptive fields (name, colour, category…) that the worker never sees.
  applySnapshot:(snapshot,elapsedDays,events) => {
    for(const item of snapshot){
      live.positions.set(item.id,item.positionAU);live.velocities.set(item.id,item.velocityAUPerDay);
      const trail=live.trails.get(item.id)??[],last=live.lastTrailDay.get(item.id);
      if(last===undefined||elapsedDays-last>=TRAIL_SPACING_DAYS){trail.push([...item.positionAU]);if(trail.length>TRAIL_POINTS)trail.splice(0,trail.length-TRAIL_POINTS);live.trails.set(item.id,trail);live.lastTrailDay.set(item.id,elapsedDays);}
    }
    live.elapsedDays=elapsedDays;
    const current=get().bodies,activeIds=new Set(snapshot.map(item=>item.id));
    for(const id of [...live.positions.keys()])if(!activeIds.has(id)){live.positions.delete(id);live.velocities.delete(id);live.trails.delete(id);live.lastTrailDay.delete(id);}
    const known=new Map(current.map(body=>[body.id,body]));
    const structural=events.length>0||snapshot.length!==current.length||snapshot.some(item=>{const body=known.get(item.id);return !body||body.massSolar!==item.massSolar||body.radiusKm!==item.radiusKm||body.renderRadius!==item.renderRadius;});
    const now=performance.now();
    if(!structural&&now-lastPublish<PUBLISH_INTERVAL_MS)return;
    lastPublish=now;
    const bodies=snapshot.flatMap(item=>{const body=known.get(item.id);return body?[{...body,massSolar:item.massSolar,radiusKm:item.radiusKm,renderRadius:item.renderRadius,positionAU:item.positionAU,velocityAUPerDay:item.velocityAUPerDay}]:[];});
    const refreshPrediction=structural||now-lastPrediction>=PREDICTION_INTERVAL_MS;if(refreshPrediction)lastPrediction=now;
    const trajectoryRevision=get().trajectoryRevision+(refreshPrediction?1:0);
    if(!events.length){set({bodies,elapsedDays,trajectoryRevision});return;}
    const name=(id:string)=>known.get(id)?.name??"An object",survivorOf=new Map(events.map(event=>[event.removedId,event.survivorId]));
    let selectedBodyId=get().selectedBodyId;while(selectedBodyId&&survivorOf.has(selectedBodyId))selectedBodyId=survivorOf.get(selectedBodyId)!;
    const lastEvent=events.length===1?`${name(events[0].removedId)} merged into ${name(events[0].survivorId)}`:`${events.length} collisions: ${events.map(event=>name(event.removedId)).join(", ")} merged`;
    set({bodies,elapsedDays,trajectoryRevision,selectedBodyId,collisionCount:get().collisionCount+events.length,lastEvent,eventId:get().eventId+1});
  },
  liveBodies:() => get().bodies.map(withLive),
  addBody:(body) => {live.positions.set(body.id,[...body.positionAU]);live.velocities.set(body.id,[...body.velocityAUPerDay]);set({bodies:[...get().bodies.map(withLive),structuredClone(body)],trajectoryRevision:get().trajectoryRevision+1});},
  clearEvent:() => set({lastEvent:null}),
  selectBody:(selectedBodyId) => set({selectedBodyId,focusRequest:get().focusRequest+1}),
  updateBody:(id,patch) => {if(patch.positionAU)live.positions.set(id,[...patch.positionAU]);if(patch.velocityAUPerDay)live.velocities.set(id,[...patch.velocityAUPerDay]);if(patch.positionAU){live.trails.delete(id);live.lastTrailDay.delete(id);}set({bodies:get().bodies.map((body)=>body.id===id?{...withLive(body),...patch,id}:body),trajectoryRevision:get().trajectoryRevision+1});},
  removeBody:(id) => {live.positions.delete(id);live.velocities.delete(id);live.trails.delete(id);live.lastTrailDay.delete(id);set({bodies:get().bodies.filter((body)=>body.id!==id).map(withLive),selectedBodyId:get().selectedBodyId===id?null:get().selectedBodyId,trajectoryRevision:get().trajectoryRevision+1});},
  restoreInitial:() => {const bodies=structuredClone(get().initialBodies);resetLive(bodies);set({bodies,selectedBodyId:null,elapsedDays:0,collisionCount:0,lastEvent:null,trajectoryRevision:get().trajectoryRevision+1});},
}));
