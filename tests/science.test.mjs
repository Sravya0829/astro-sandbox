import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBlackHole } from "../lib/science/black-hole.ts";
import { analyzeHabitability } from "../lib/science/habitability.ts";
import { analyzeStar } from "../lib/science/stellar.ts";
import { predictTrajectories } from "../lib/simulation/predict.ts";

const sun={id:"sun",name:"Sun",category:"star",massSolar:1,radiusKm:696340,renderRadius:1,positionAU:[0,0],velocityAUPerDay:[0,0],color:"#ffcc66",luminositySolar:1};
const earth={id:"earth",name:"Earth",category:"planet",massSolar:3.003e-6,radiusKm:6371,renderRadius:.3,positionAU:[1,0],velocityAUPerDay:[0,.0172],color:"#6699ff",parentId:"sun"};

test("one solar mass Schwarzschild radius is approximately 2.95 km",()=>{const result=analyzeBlackHole(1);assert.ok(Math.abs(result.schwarzschildRadiusKm-2.953)<.01);assert.ok(Math.abs(result.photonSphereRadiusKm/result.schwarzschildRadiusKm-1.5)<1e-9);});
test("Earth analogue receives a favorable explainable habitability estimate",()=>{const result=analyzeHabitability(earth,sun);assert.ok(result.score>=70);assert.equal(result.zone,"Inside estimated zone");assert.ok(result.positives.length>=2);});
test("a solar-mass star has an approximately ten-billion-year main sequence lifetime",()=>{const result=analyzeStar(1,4.6,.014);assert.equal(result.stage,"Main sequence");assert.ok(Math.abs(result.lifespanGyr-10)<.01);assert.equal(result.remnant,"White dwarf");});
test("massive stars end as compact remnants",()=>{const result=analyzeStar(25,.01,.014);assert.equal(result.remnant,"Black hole");assert.ok(result.lifespanGyr<.01);});
test("trajectory prediction recalculates paths for every body",()=>{const before=predictTrajectories([sun,earth],20,1),jupiter={...earth,id:"jupiter",name:"Jupiter",massSolar:.0009543,positionAU:[5.2,0],velocityAUPerDay:[0,.00754]},after=predictTrajectories([sun,earth,jupiter],20,1);assert.equal(after.jupiter.length,21);assert.equal(after.earth.length,21);assert.notDeepEqual(after.earth.at(-1),before.earth.at(-1));});

// ---- N-body core: integration and collisions ----
import { closestApproachAU,createState,GAUSSIAN_G,KM_PER_AU,schwarzschildRadiusKm,stepState } from "../lib/simulation/nbody.ts";

const MERGE={G:GAUSSIAN_G,softening2:1e-6,collisions:"merge"};
const nb=(id,massSolar,radiusKm,positionAU,velocityAUPerDay,category="planet",renderRadius=.3)=>({id,category,massSolar,radiusKm,renderRadius,positionAU,velocityAUPerDay});
const momentum=bodies=>bodies.reduce((sum,b)=>[sum[0]+b.massSolar*b.velocityAUPerDay[0],sum[1]+b.massSolar*b.velocityAUPerDay[1]],[0,0]);

test("head-on collision merges into one body conserving mass and momentum",()=>{
  const r=10000,gap=3*r/KM_PER_AU;
  const state=createState([nb("a",1e-5,r,[-gap,0],[.01,0]),nb("b",1e-5,r,[gap,0],[-.004,.002])],GAUSSIAN_G,MERGE.softening2);
  const before=momentum(state.bodies),totalMass=2e-5;
  const events=stepState(state,1,24,MERGE);
  assert.equal(events.length,1);assert.equal(state.bodies.length,1);
  const [merged]=state.bodies;assert.ok(Math.abs(merged.massSolar-totalMass)<1e-18);
  const after=momentum(state.bodies);assert.ok(Math.abs(after[0]-before[0])<1e-12&&Math.abs(after[1]-before[1])<1e-12);
  assert.ok(Math.abs(merged.radiusKm-Math.cbrt(2)*r)<1e-6);
});

test("fast bodies that pass through each other within one substep still collide (no tunneling)",()=>{
  // Earth-sized bodies, 0.01 AU apart, closing at 0.5 AU/day: they cross mid-substep and the
  // endpoints are far apart, so a point-in-time check would miss it.
  const state=createState([nb("a",3e-6,6371,[-.005,0],[.25,0]),nb("b",3e-6,6371,[.005,0],[-.25,0])],GAUSSIAN_G,MERGE.softening2);
  const events=stepState(state,1/24,1,MERGE);
  assert.equal(events.length,1);assert.equal(state.bodies.length,1);
});

test("a near miss just outside the combined radius does not merge",()=>{
  const reach=2*6371/KM_PER_AU;
  assert.ok(closestApproachAU([0,0],[0,0],[-.01,reach*1.01],[.01,reach*1.01])>reach);
  const state=createState([nb("a",1e-12,6371,[0,0],[0,0]),nb("b",1e-12,6371,[-.005,reach*1.05],[.25,0])],GAUSSIAN_G,MERGE.softening2);
  assert.equal(stepState(state,1/24,1,MERGE).length,0);assert.equal(state.bodies.length,2);
});

test("a black hole swallowing a star keeps a Schwarzschild radius and survives",()=>{
  const hole=nb("hole",10,schwarzschildRadiusKm(10),[0,0],[0,0],"blackHole",.8),star=nb("star",12,700000,[.001,0],[0,0],"star",1);
  const state=createState([hole,star],GAUSSIAN_G,MERGE.softening2),events=stepState(state,1/24,1,MERGE);
  assert.equal(events[0].survivorId,"hole");assert.equal(state.bodies[0].category,"blackHole");
  assert.ok(Math.abs(state.bodies[0].radiusKm-schwarzschildRadiusKm(22))<1e-9);assert.ok(Math.abs(state.bodies[0].radiusKm-64.97)<.05);
});

test("several overlapping bodies collapse into one in a single substep",()=>{
  const state=createState([nb("a",1e-6,50000,[0,0],[0,0]),nb("b",2e-6,50000,[1e-4,0],[0,0]),nb("c",3e-6,50000,[0,1e-4],[0,0])],GAUSSIAN_G,MERGE.softening2);
  const events=stepState(state,1/24,1,MERGE);
  assert.equal(events.length,2);assert.equal(state.bodies.length,1);assert.ok(Math.abs(state.bodies[0].massSolar-6e-6)<1e-18);
});

test("the Solar System preset runs two years with no false collisions and a stable Earth orbit",()=>{
  // Mirrors the "solar-system" preset in lib/simulation/presets.ts (which can't be imported here: extensionless imports).
  const planet=(id,massSolar,radiusKm,distance)=>nb(id,massSolar,radiusKm,[distance,0],[0,Math.sqrt(GAUSSIAN_G/distance)]);
  const bodies=[nb("sun",1,696340,[0,0],[0,0],"star"),planet("mercury",1.66e-7,2439.7,.39),planet("venus",2.45e-6,6051.8,.72),planet("earth",3.003e-6,6371,1),planet("mars",3.23e-7,3389.5,1.52),planet("jupiter",.0009543,69911,5.2)];
  const state=createState(bodies,GAUSSIAN_G,MERGE.softening2);
  let collisions=0;for(let day=0;day<730;day++)collisions+=stepState(state,1,24,MERGE).length;
  assert.equal(collisions,0);assert.equal(state.bodies.length,bodies.length);
  const sunNow=state.bodies.find(b=>b.category==="star"),earthNow=state.bodies.find(b=>b.id==="earth");
  const r=Math.hypot(earthNow.positionAU[0]-sunNow.positionAU[0],earthNow.positionAU[1]-sunNow.positionAU[1]);
  assert.ok(Math.abs(r-1)<.02,`Earth at ${r} AU`);
});
