const SPEED_OF_LIGHT=299792458;
const GRAVITATIONAL_CONSTANT=6.67430e-11;
const SOLAR_MASS_KG=1.98847e30;

export type BlackHoleAnalysis={schwarzschildRadiusKm:number;photonSphereRadiusKm:number;innermostStableOrbitKm:number;classification:string;facts:string[]};
export function analyzeBlackHole(massSolar:number):BlackHoleAnalysis{
  const schwarzschildRadiusKm=2*GRAVITATIONAL_CONSTANT*(massSolar*SOLAR_MASS_KG)/(SPEED_OF_LIGHT**2)/1000;
  return{schwarzschildRadiusKm,photonSphereRadiusKm:schwarzschildRadiusKm*1.5,innermostStableOrbitKm:schwarzschildRadiusKm*3,classification:massSolar>=100000?"Supermassive black hole":massSolar>=100?"Intermediate-mass black hole":"Stellar-mass black hole",facts:["Event horizon uses the Schwarzschild solution for a non-rotating black hole.","Photon sphere is 1.5× the Schwarzschild radius.","The accretion disk and lensing are visually exaggerated for clarity."]};
}
