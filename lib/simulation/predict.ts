import type { CelestialBody } from "./schema";

const GRAVITY=.00029591220828559;
export function predictTrajectories(source:CelestialBody[],steps=120,stepDays=3):Record<string,Array<[number,number]>>{
  const bodies=source.map(body=>({id:body.id,mass:body.massSolar,position:[...body.positionAU] as [number,number],velocity:[...body.velocityAUPerDay] as [number,number]}));
  const paths=Object.fromEntries(bodies.map(body=>[body.id,[[...body.position] as [number,number]]]));
  const acceleration=()=>bodies.map((body,index)=>{let x=0,y=0;for(let other=0;other<bodies.length;other++){if(index===other)continue;const dx=bodies[other].position[0]-body.position[0],dy=bodies[other].position[1]-body.position[1],r2=dx*dx+dy*dy+1e-6,inverse=1/Math.sqrt(r2),scale=GRAVITY*bodies[other].mass*inverse**3;x+=scale*dx;y+=scale*dy;}return[x,y] as [number,number];});
  // Integrate with a step small enough for the fastest orbit (≈125 steps per orbit), but only record
  // one point per stepDays. A fixed 3-day step turned short orbits (the Moon, the compact worlds) into
  // jagged polygons that drifted away from the real path.
  let shortestTimescale=Infinity;
  for(let a=0;a<bodies.length;a++)for(let b=a+1;b<bodies.length;b++){const r=Math.hypot(bodies[a].position[0]-bodies[b].position[0],bodies[a].position[1]-bodies[b].position[1]),mass=bodies[a].mass+bodies[b].mass;if(r>0&&mass>0)shortestTimescale=Math.min(shortestTimescale,Math.sqrt(r**3/(GRAVITY*mass)));}
  const substeps=Math.min(64,Math.max(1,Math.ceil(stepDays/(.05*shortestTimescale)))),h=stepDays/substeps;
  let currentAcceleration=acceleration();
  for(let step=0;step<steps;step++){
    for(let sub=0;sub<substeps;sub++){
      for(let index=0;index<bodies.length;index++){bodies[index].position[0]+=bodies[index].velocity[0]*h+.5*currentAcceleration[index][0]*h**2;bodies[index].position[1]+=bodies[index].velocity[1]*h+.5*currentAcceleration[index][1]*h**2;}
      const nextAcceleration=acceleration();
      for(let index=0;index<bodies.length;index++){bodies[index].velocity[0]+=.5*(currentAcceleration[index][0]+nextAcceleration[index][0])*h;bodies[index].velocity[1]+=.5*(currentAcceleration[index][1]+nextAcceleration[index][1])*h;}
      currentAcceleration=nextAcceleration;
    }
    for(const body of bodies)paths[body.id].push([...body.position]);
  }
  return paths;
}
