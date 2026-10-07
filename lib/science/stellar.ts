export type StellarAnalysis={stage:string;lifespanGyr:number;temperatureK:number;luminositySolar:number;radiusSolar:number;nextStage:string;remnant:string;progress:number;path:string[];visualColor:string;visualRadiusMultiplier:number};
export function analyzeStar(massSolar:number,ageGyr=0,metallicity=.014):StellarAnalysis{
  const mass=Math.max(.08,massSolar),lifespanGyr=10/mass**2.5,ratio=ageGyr/lifespanGyr;
  let stage="Main sequence",nextStage="Red giant",progress=Math.min(100,ratio*70);const remnant=mass<8?"White dwarf":mass<20?"Neutron star":"Black hole";
  if(ageGyr<.001){stage="Protostar";nextStage="Main sequence";progress=3;}else if(ratio>=1&&ratio<1.12){stage=mass>=8?"Red supergiant":"Red giant";nextStage=mass>=8?"Supernova":"Planetary nebula";progress=78;}else if(ratio>=1.12){stage=mass>=8?"Supernova remnant":"White dwarf";nextStage=remnant;progress=100;}
  const luminosity=mass**3.5,temperature=5772*Math.pow(mass,.45)*(1+(metallicity-.014)*-2),radius=mass<1?mass**.8:mass**.57;
  const path=mass<8?["Protostar","Main sequence","Red giant","Planetary nebula","White dwarf"]:["Protostar","Main sequence","Red supergiant","Supernova",remnant];
  const visualColor=stage.includes("Red")?"#ff765f":stage==="White dwarf"?"#e8f3ff":stage.includes("Supernova")?"#fff4cf":temperature>9000?"#b9d8ff":temperature<4500?"#ff9b68":"#ffd36a";
  const visualRadiusMultiplier=stage.includes("giant")?1.65:stage.includes("Supernova")?2.1:stage==="White dwarf"?.55:stage==="Protostar"?.8:1;
  return{stage,lifespanGyr,temperatureK:temperature,luminositySolar:luminosity,radiusSolar:radius,nextStage,remnant,progress,path,visualColor,visualRadiusMultiplier};
}
