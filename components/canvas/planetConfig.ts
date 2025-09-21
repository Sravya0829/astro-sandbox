// A tiny TypeScript type so we get autocompletion and safety
export type PlanetConfig = {
  name: string;          // label for later UI/tooltips
  radius: number;        // visual size in scene units
  aAU: number;           // semi-major axis in AU (we scale to scene units)
  periodDays: number;    // orbital period in days
  tilt?: number;         // axial tilt (degrees)
  color?: string;        // hex color
};

// A small starter set (roughly Earth/Mars/Jupiter)
export const PLANETS: PlanetConfig[] = [
  { name: "Mercury", radius: 0.25, aAU: 0.39, periodDays: 88,    color: "#c2b280", tilt: 0 },
  { name: "Venus",   radius: 0.30, aAU: 0.72, periodDays: 225,   color: "#e3c27a", tilt: 177 }, 
  { name: "Earth",   radius: 0.35, aAU: 1.00, periodDays: 365,   color: "#6fb1ff", tilt: 23.5 },
  { name: "Mars",    radius: 0.28, aAU: 1.52, periodDays: 687,   color: "#c1440e", tilt: 25 },
  { name: "Jupiter", radius: 0.80, aAU: 5.20, periodDays: 4333,  color: "#d8b07d", tilt: 3 },
];
