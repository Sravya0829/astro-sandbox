// Pure N-body core shared by the physics worker and the tests. No imports, so it can run under
// `node --experimental-strip-types` as well as in the bundled worker.

export type V2=[number,number];
export type NBody={id:string;category:string;massSolar:number;radiusKm:number;renderRadius:number;positionAU:V2;velocityAUPerDay:V2};
export type CollisionEvent={type:"collision";survivorId:string;removedId:string};
export type NBodyOptions={G:number;softening2:number;collisions:"merge"|"none"};
export type NBodyState={bodies:NBody[];accelerations:V2[]};

export const GAUSSIAN_G=.00029591220828559; // AU³ / (M☉ · day²)
export const KM_PER_AU=149597870.7;
const SPEED_OF_LIGHT=299792458,SI_G=6.67430e-11,SOLAR_MASS_KG=1.98847e30;
export const schwarzschildRadiusKm=(massSolar:number)=>2*SI_G*massSolar*SOLAR_MASS_KG/SPEED_OF_LIGHT**2/1000;

export function computeAccelerations(bodies:NBody[],G:number,softening2:number):V2[]{
  return bodies.map((body,i)=>{
    let ax=0,ay=0;
    for(let j=0;j<bodies.length;j++){
      if(i===j)continue;
      const dx=bodies[j].positionAU[0]-body.positionAU[0],dy=bodies[j].positionAU[1]-body.positionAU[1];
      const inverse=1/Math.sqrt(dx*dx+dy*dy+softening2),scale=G*bodies[j].massSolar*inverse**3;
      ax+=scale*dx;ay+=scale*dy;
    }
    return[ax,ay];
  });
}

export function createState(bodies:NBody[],G:number,softening2:number):NBodyState{
  const copies=bodies.map(cloneBody);
  return{bodies:copies,accelerations:computeAccelerations(copies,G,softening2)};
}
export const cloneBody=(body:NBody):NBody=>({...body,positionAU:[...body.positionAU],velocityAUPerDay:[...body.velocityAUPerDay]});

// Closest approach of two bodies over a substep, assuming linear relative motion between the
// start and end positions. A point-in-time check misses collisions: Earth moves ~7×10⁻⁴ AU per
// hour, while Earth+Moon radii sum to ~5×10⁻⁵ AU.
export function closestApproachAU(startA:V2,endA:V2,startB:V2,endB:V2):number{
  const p0x=startB[0]-startA[0],p0y=startB[1]-startA[1],dx=(endB[0]-endA[0])-p0x,dy=(endB[1]-endA[1])-p0y;
  const lengthSquared=dx*dx+dy*dy,t=lengthSquared>0?Math.min(1,Math.max(0,-(p0x*dx+p0y*dy)/lengthSquared)):0;
  return Math.hypot(p0x+t*dx,p0y+t*dy);
}

// Perfectly inelastic merge: mass and momentum are conserved, the survivor sits at the centre of mass.
// A black hole always swallows a non-black-hole; otherwise the heavier body survives (ties → first).
export function mergePair(a:NBody,b:NBody):{survivor:NBody;removed:NBody}{
  const aHole=a.category==="blackHole",bHole=b.category==="blackHole";
  const aWins=aHole!==bHole?aHole:a.massSolar>=b.massSolar;
  const survivor=aWins?a:b,removed=aWins?b:a,ms=survivor.massSolar,mr=removed.massSolar,total=ms+mr;
  if(total>0){
    survivor.positionAU=[(survivor.positionAU[0]*ms+removed.positionAU[0]*mr)/total,(survivor.positionAU[1]*ms+removed.positionAU[1]*mr)/total];
    survivor.velocityAUPerDay=[(survivor.velocityAUPerDay[0]*ms+removed.velocityAUPerDay[0]*mr)/total,(survivor.velocityAUPerDay[1]*ms+removed.velocityAUPerDay[1]*mr)/total];
  }
  if(survivor.category==="blackHole"){
    survivor.radiusKm=schwarzschildRadiusKm(total);
    if(ms>0)survivor.renderRadius*=total/ms;
  }else{
    survivor.radiusKm=Math.cbrt(survivor.radiusKm**3+removed.radiusKm**3); // equal-density volume sum
    survivor.renderRadius=Math.cbrt(survivor.renderRadius**3+removed.renderRadius**3);
  }
  survivor.massSolar=total;
  return{survivor,removed};
}

function resolveCollisions(bodies:NBody[],starts:V2[],events:CollisionEvent[]):boolean{
  let merged=false;
  for(let found=true;found;){
    found=false;
    search:for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const reach=(bodies[i].radiusKm+bodies[j].radiusKm)/KM_PER_AU;
      if(closestApproachAU(starts[i],bodies[i].positionAU,starts[j],bodies[j].positionAU)>reach)continue;
      const mi=bodies[i].massSolar,mj=bodies[j].massSolar,total=mi+mj;
      const start:V2=total>0?[(starts[i][0]*mi+starts[j][0]*mj)/total,(starts[i][1]*mi+starts[j][1]*mj)/total]:starts[i];
      const{survivor,removed}=mergePair(bodies[i],bodies[j]),survivorIndex=survivor===bodies[i]?i:j,removedIndex=survivorIndex===i?j:i;
      starts[survivorIndex]=start;
      bodies.splice(removedIndex,1);starts.splice(removedIndex,1);
      events.push({type:"collision",survivorId:survivor.id,removedId:removed.id});
      merged=found=true;
      break search;
    }
  }
  return merged;
}

// Velocity Verlet with swept collision checks after every substep.
export function stepState(state:NBodyState,dtDays:number,substeps:number,options:NBodyOptions):CollisionEvent[]{
  const events:CollisionEvent[]=[],h=dtDays/Math.max(1,substeps),halfSquared=.5*h*h;
  for(let count=0;count<Math.max(1,substeps);count++){
    const{bodies}=state,old=state.accelerations,starts=bodies.map(body=>[...body.positionAU] as V2);
    for(let i=0;i<bodies.length;i++){const p=bodies[i].positionAU,v=bodies[i].velocityAUPerDay;p[0]+=v[0]*h+old[i][0]*halfSquared;p[1]+=v[1]*h+old[i][1]*halfSquared;}
    const next=computeAccelerations(bodies,options.G,options.softening2);
    for(let i=0;i<bodies.length;i++){const v=bodies[i].velocityAUPerDay;v[0]+=.5*(old[i][0]+next[i][0])*h;v[1]+=.5*(old[i][1]+next[i][1])*h;}
    state.accelerations=next;
    if(options.collisions==="merge"&&resolveCollisions(bodies,starts,events))state.accelerations=computeAccelerations(bodies,options.G,options.softening2);
  }
  return events;
}
