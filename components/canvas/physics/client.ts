"use client";

import { useCallback,useEffect,useRef } from "react";
import { usePhysicsStore,type Body } from "./store";
import type { WorkerBody,WorkerMsg,WorkerStateMsg } from "./physics.worker";

const MAX_FRAME_SECONDS=.1,SUBSTEPS_PER_DAY=24;
const createWorker=()=>new Worker(new URL("./physics.worker.ts",import.meta.url));
const workerBody=(body:Body):WorkerBody=>({id:body.id,category:body.category,massSolar:body.massSolar,radiusKm:body.radiusKm,renderRadius:body.renderRadius,positionAU:body.positionAU,velocityAUPerDay:body.velocityAUPerDay});

export function usePhysicsWorker({initialBodies,simSpeed,G=.00029591220828559,softening2=1e-6,collisions="merge"}:{initialBodies:Body[];simSpeed:number;G?:number;softening2?:number;collisions?:"merge"|"none"}){
  const workerRef=useRef<Worker|null>(null),collisionsRef=useRef(collisions);
  // revision: bumped on every structural change; snapshots from older revisions are stale and dropped.
  // stepInFlight/pendingSeconds: at most one step outstanding, so a slow worker can't build a backlog.
  const revisionRef=useRef(0),stepInFlightRef=useRef(false),pendingSecondsRef=useRef(0);
  const setBodies=usePhysicsStore(s=>s.setBodies),applySnapshot=usePhysicsStore(s=>s.applySnapshot);
  const post=useCallback((message:WorkerMsg)=>workerRef.current?.postMessage(message),[]);
  const nextRevision=()=>++revisionRef.current;

  useEffect(()=>{
    const worker=createWorker();workerRef.current=worker;stepInFlightRef.current=false;pendingSecondsRef.current=0;setBodies(initialBodies,true);
    worker.onmessage=(event:MessageEvent<WorkerStateMsg>)=>{
      const data=event.data;if(data.type!=="state")return;
      if(data.source==="step")stepInFlightRef.current=false;
      if(data.revision<revisionRef.current)return;
      applySnapshot(data.bodies,data.elapsedDays,data.events);
    };
    worker.postMessage({type:"init",revision:nextRevision(),G,softening2,collisions:collisionsRef.current,bodies:initialBodies.map(workerBody)} satisfies WorkerMsg);
    return()=>{worker.terminate();workerRef.current=null;};
  },[initialBodies,G,softening2,setBodies,applySnapshot]);
  useEffect(()=>{collisionsRef.current=collisions;post({type:"configure",collisions});},[collisions,post]);

  const step=useCallback((seconds:number)=>{
    if(!workerRef.current)return;
    if(simSpeed<=0){pendingSecondsRef.current=0;return;}
    pendingSecondsRef.current+=Math.min(seconds,MAX_FRAME_SECONDS);
    if(stepInFlightRef.current)return;
    const dtDays=pendingSecondsRef.current*simSpeed;pendingSecondsRef.current=0;stepInFlightRef.current=true;
    post({type:"step",dtDays,substeps:Math.max(1,Math.ceil(Math.abs(dtDays)*SUBSTEPS_PER_DAY))});
  },[post,simSpeed]);
  const addBody=useCallback((body:Body)=>{usePhysicsStore.getState().addBody(body);post({type:"add",revision:nextRevision(),body:workerBody(body)});},[post]);
  const updateBody=useCallback((id:string,patch:Partial<Body>)=>{const current=usePhysicsStore.getState().bodies.find(body=>body.id===id);if(!current)return;const next={...current,...patch,id};usePhysicsStore.getState().updateBody(id,patch);post({type:"update",revision:nextRevision(),id,body:workerBody(next)});},[post]);
  const removeBody=useCallback((id:string)=>{usePhysicsStore.getState().removeBody(id);post({type:"remove",revision:nextRevision(),id});},[post]);
  const reset=useCallback(()=>{const bodies=usePhysicsStore.getState().initialBodies;usePhysicsStore.getState().restoreInitial();post({type:"reset",revision:nextRevision(),bodies:bodies.map(workerBody)});},[post]);
  return{step,addBody,updateBody,removeBody,reset};
}
