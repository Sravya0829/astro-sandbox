import type { BodyCategory,CelestialBody } from "./schema";

type Template = Pick<CelestialBody,"name"|"category"|"massSolar"|"radiusKm"|"renderRadius"|"color">;
export const BODY_TEMPLATES = {
  earth:{name:"Earth-like planet",category:"planet",massSolar:3.003e-6,radiusKm:6371,renderRadius:.34,color:"#62a9ff"},
  gasGiant:{name:"Gas giant",category:"planet",massSolar:.0009543,radiusKm:69911,renderRadius:.72,color:"#d5aa78"},
  moon:{name:"Moon",category:"moon",massSolar:3.69e-8,radiusKm:1737.4,renderRadius:.18,color:"#c7ced8"},
  asteroid:{name:"Asteroid",category:"asteroid",massSolar:1e-12,radiusKm:25,renderRadius:.12,color:"#8d8178"},
  redDwarf:{name:"Red dwarf",category:"star",massSolar:.2,radiusKm:139000,renderRadius:.75,color:"#ff705f"},
  blackHole:{name:"Stellar black hole",category:"blackHole",massSolar:10,radiusKm:29.53,renderRadius:.8,color:"#12121f"},
} satisfies Record<string,Template>;
export type BodyTemplateKey=keyof typeof BODY_TEMPLATES;

export function createBodyFromTemplate(key:BodyTemplateKey,positionAU:[number,number]=[2,0],velocityAUPerDay:[number,number]=[0,.012]):CelestialBody{
  const template=BODY_TEMPLATES[key];
  return{...template,id:`${template.category}-${crypto.randomUUID()}`,positionAU,velocityAUPerDay,category:template.category as BodyCategory};
}
