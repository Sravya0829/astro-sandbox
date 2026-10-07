import { parseSimulationDocument, SIMULATION_SCHEMA_VERSION, type CelestialBody, type SimulationDocument } from "./schema";

const G = 0.00029591220828559;
const circularSpeed = (radiusAU: number, centralMassSolar = 1) => Math.sqrt((G * centralMassSolar) / radiusAU);
const body = (value: CelestialBody) => value;

const sun = body({ id:"sun",name:"Sun",category:"star",massSolar:1,radiusKm:696340,renderRadius:1.2,positionAU:[0,0],velocityAUPerDay:[0,0],color:"#ffcc66",luminositySolar:1,ageGyr:4.6,metallicity:0.014 });
const planet = (id:string,name:string,massSolar:number,radiusKm:number,renderRadius:number,distance:number,color:string,parentId="sun") => body({ id,name,category:"planet",massSolar,radiusKm,renderRadius,positionAU:[distance,0],velocityAUPerDay:[0,circularSpeed(distance)],color,parentId });

const settings = { timeScaleDaysPerSecond:30, gravitationalSofteningAU:.001, collisions:"merge" as const, showLabels:true, showOrbits:true };
const makePreset = (key:string,name:string,description:string,bodies:CelestialBody[]):SimulationDocument => parseSimulationDocument({ schemaVersion:SIMULATION_SCHEMA_VERSION,id:`preset:${key}`,presetKey:key,name,description,bodies,settings });

const solar = makePreset("solar-system","Solar System","Our planetary neighborhood with the five currently modeled planets.",[
  sun,
  planet("mercury","Mercury",1.66e-7,2439.7,.25,.39,"#c2b280"),
  planet("venus","Venus",2.45e-6,6051.8,.3,.72,"#e3c27a"),
  planet("earth","Earth",3.003e-6,6371,.35,1,"#6fb1ff"),
  planet("mars","Mars",3.23e-7,3389.5,.28,1.52,"#c1440e"),
  planet("jupiter","Jupiter",.0009543,69911,.8,5.2,"#d8b07d"),
]);

const blank = makePreset("blank-system","Blank System","A Sun-like star with open space for building a system from scratch.",[sun]);

const earthMoon = makePreset("sun-earth-moon","Sun, Earth & Moon","A focused three-body system for studying lunar motion.",[
  sun,
  planet("earth","Earth",3.003e-6,6371,.42,1,"#6fb1ff"),
  body({ id:"moon",name:"Moon",category:"moon",massSolar:3.69e-8,radiusKm:1737.4,renderRadius:.18,positionAU:[1.00257,0],velocityAUPerDay:[0,circularSpeed(1)+.00059],color:"#c8ced8",parentId:"earth" }),
]);

const binary = makePreset("binary-star","Binary Stars","Two Sun-like stars orbiting a shared barycenter.",[
  body({ ...sun,id:"binary-a",name:"Aster A",positionAU:[-.5,0],velocityAUPerDay:[0,-circularSpeed(1,2)/2],parentId:undefined }),
  body({ ...sun,id:"binary-b",name:"Aster B",positionAU:[.5,0],velocityAUPerDay:[0,circularSpeed(1,2)/2],color:"#ffd8a8",parentId:undefined }),
]);

const compact = makePreset("compact-system","Compact Worlds","Four tightly packed planets around a red dwarf.",[
  body({ ...sun,id:"ember",name:"Ember",massSolar:.25,radiusKm:180000,renderRadius:.85,color:"#ff765f",luminositySolar:.009 }),
  ...[.08,.13,.2,.31].map((distance,index) => body({ ...planet(`compact-${index+1}`,`World ${index+1}`,2e-6,5500,.28,distance,["#d9a46f","#67b8e8","#aa89df","#d46c62"][index],"ember"),velocityAUPerDay:[0,circularSpeed(distance,.25)] })),
]);

const blackHole = makePreset("black-hole-demo","Black Hole Encounter","A star and test planet near a stellar-mass black hole.",[
  body({ id:"black-hole",name:"Cygnus X",category:"blackHole",massSolar:15,radiusKm:44.3,renderRadius:1.05,positionAU:[0,0],velocityAUPerDay:[0,0],color:"#151526" }),
  body({ id:"companion",name:"Companion star",category:"star",massSolar:2,radiusKm:1200000,renderRadius:.8,positionAU:[1.8,0],velocityAUPerDay:[0,circularSpeed(1.8,15)],color:"#a8d4ff",parentId:"black-hole",luminositySolar:18 }),
  body({ ...planet("test-planet","Test planet",3e-6,6371,.3,.9,"#6fa9d8","black-hole"),positionAU:[-.9,0],velocityAUPerDay:[0,-circularSpeed(.9,15)] }),
]);

const lifecycle = makePreset("stellar-lifecycle","Stellar Lifecycle","A massive star ready for lifecycle exploration.",[
  body({ ...sun,id:"massive-star",name:"Aurelia",massSolar:8,radiusKm:2200000,renderRadius:1.7,color:"#b8d8ff",luminositySolar:3800,ageGyr:.035,metallicity:.012 }),
  body({ ...planet("observer","Observer world",3e-6,6371,.3,6,"#6fa9d8","massive-star"),velocityAUPerDay:[0,circularSpeed(6,8)] }),
]);

export const PRESETS = { "solar-system":solar,"blank-system":blank,"sun-earth-moon":earthMoon,"binary-star":binary,"compact-system":compact,"black-hole-demo":blackHole,"stellar-lifecycle":lifecycle } as const;
export type PresetKey = keyof typeof PRESETS;
export const DEFAULT_PRESET_KEY:PresetKey = "solar-system";
export function getPreset(key:PresetKey):SimulationDocument { return structuredClone(PRESETS[key]); }
