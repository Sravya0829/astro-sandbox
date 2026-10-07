import { cloneBody,computeAccelerations,createState,GAUSSIAN_G,stepState,type CollisionEvent,type NBody,type NBodyOptions,type NBodyState } from "../../../lib/simulation/nbody";

export type WorkerBody=NBody;
// Structural messages carry a revision; every state message echoes the latest one so the client can
// discard snapshots computed before its most recent add/remove/update/reset.
export type WorkerMsg=
  |{type:"init";revision:number;G:number;softening2:number;collisions:"merge"|"none";bodies:WorkerBody[]}
  |{type:"step";dtDays:number;substeps?:number}
  |{type:"add";revision:number;body:WorkerBody}
  |{type:"update";revision:number;id:string;body:WorkerBody}
  |{type:"remove";revision:number;id:string}
  |{type:"configure";collisions:"merge"|"none"}
  |{type:"reset";revision:number;bodies:WorkerBody[]};
export type WorkerStateMsg={type:"state";source:"step"|"sync";revision:number;elapsedDays:number;bodies:WorkerBody[];events:CollisionEvent[]};

let options:NBodyOptions={G:GAUSSIAN_G,softening2:1e-6,collisions:"merge"},state:NBodyState={bodies:[],accelerations:[]},elapsedDays=0,revision=0;

const refresh=()=>{state.accelerations=computeAccelerations(state.bodies,options.G,options.softening2);};
function publish(source:WorkerStateMsg["source"],events:CollisionEvent[]=[]){(self as DedicatedWorkerGlobalScope).postMessage({type:"state",source,revision,elapsedDays,bodies:state.bodies.map(cloneBody),events} satisfies WorkerStateMsg);}

self.onmessage=(event:MessageEvent<WorkerMsg>)=>{
  const message=event.data;
  if(message.type==="step"){const events=stepState(state,message.dtDays,message.substeps??1,options);elapsedDays+=message.dtDays;publish("step",events);return;}
  if(message.type==="configure"){options={...options,collisions:message.collisions};return;}
  revision=message.revision;
  if(message.type==="init"){options={G:message.G,softening2:message.softening2,collisions:message.collisions};state=createState(message.bodies,options.G,options.softening2);elapsedDays=0;}
  else if(message.type==="reset"){state=createState(message.bodies,options.G,options.softening2);elapsedDays=0;}
  else if(message.type==="add"){state.bodies.push(cloneBody(message.body));refresh();}
  else if(message.type==="remove"){state.bodies=state.bodies.filter(body=>body.id!==message.id);refresh();}
  else if(message.type==="update"){const index=state.bodies.findIndex(body=>body.id===message.id);if(index>=0){state.bodies[index]=cloneBody(message.body);refresh();}}
  publish("sync");
};
