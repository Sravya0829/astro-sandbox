import { live,usePhysicsStore,type Body } from "./physics/store";

// Physics runs in AU; the scene compresses distance logarithmically around the primary star/black hole
// so inner planets and distant giants are both visible.
const SCALE_K=12,SCALE_R0=.4;
export const scaleDistance=(au:number)=>SCALE_K*Math.log(1+au/SCALE_R0);
export const inverseDistance=(scene:number)=>SCALE_R0*(Math.exp(scene/SCALE_K)-1);
export function toScene(position:[number,number],origin:[number,number]):[number,number,number]{const dx=position[0]-origin[0],dy=position[1]-origin[1],r=Math.hypot(dx,dy);if(!r)return[0,0,0];const scaled=scaleDistance(r);return[dx/r*scaled,0,dy/r*scaled];}
export function toPhysics(position:[number,number],origin:[number,number]):[number,number]{const r=Math.hypot(...position);if(!r)return origin;const au=inverseDistance(r);return[origin[0]+position[0]/r*au,origin[1]+position[1]/r*au];}

export const originBody=(bodies:Body[])=>bodies.find(body=>body.category==="star"||body.category==="blackHole");
/** Current physics position of the scene origin, read from the live (per-frame) state. */
export function liveOrigin(bodies:Body[]=usePhysicsStore.getState().bodies):[number,number]{const body=originBody(bodies);return body?live.positions.get(body.id)??body.positionAU:[0,0];}
/** Current scene-space position of a body, or null if it no longer exists. */
export function liveScenePosition(id:string):[number,number,number]|null{const position=live.positions.get(id);return position?toScene(position,liveOrigin()):null;}
