import type { CelestialBody } from "@/lib/simulation/schema";

export type HabitabilityAnalysis={score:number;classification:string;zone:string;equilibriumTemperatureK:number;positives:string[];negatives:string[]};
export function analyzeHabitability(planet:CelestialBody,host:CelestialBody):HabitabilityAnalysis{
  const distanceAU=Math.max(.0001,Math.hypot(planet.positionAU[0]-host.positionAU[0],planet.positionAU[1]-host.positionAU[1]));
  const luminosity=Math.max(.0001,host.luminositySolar??Math.max(.0001,host.massSolar**3.5));
  const flux=luminosity/(distanceAU**2),inner=Math.sqrt(luminosity/1.1),outer=Math.sqrt(luminosity/.35),temperature=278.5*Math.pow(flux,.25)*Math.pow((1-.3)/.7,.25);
  const inZone=distanceAU>=inner&&distanceAU<=outer,nearZone=distanceAU>=inner*.8&&distanceAU<=outer*1.2;
  const earthMasses=planet.massSolar/3.003e-6,sizeScore=Math.max(0,1-Math.abs(Math.log10(Math.max(earthMasses,.01)))/2);
  const temperatureScore=Math.max(0,1-Math.abs(temperature-288)/180),score=Math.round(100*(.55*(inZone?1:nearZone?.55:.12)+.25*sizeScore+.2*temperatureScore));
  const positives:string[]=[],negatives:string[]=[];
  (inZone?positives:negatives).push(inZone?"Receives stellar flux within the estimated habitable zone.":"Orbit lies outside the conservative habitable zone.");
  (earthMasses>=.3&&earthMasses<=5?positives:negatives).push(earthMasses>=.3&&earthMasses<=5?"Mass is compatible with a rocky world retaining an atmosphere.":"Mass differs substantially from common rocky planets.");
  (temperature>=220&&temperature<=330?positives:negatives).push(temperature>=220&&temperature<=330?"Estimated equilibrium temperature is moderate.":"Estimated equilibrium temperature is extreme.");
  return{score,classification:score>=75?"Promising":score>=45?"Marginal":"Unfavorable",zone:inZone?"Inside estimated zone":nearZone?"Near estimated zone":"Outside estimated zone",equilibriumTemperatureK:temperature,positives,negatives};
}
