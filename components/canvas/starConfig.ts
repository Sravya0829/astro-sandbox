// Shape of a star preset
export type StarConfig = {
  name: string;           // display name
  type: string;           // spectral class
  massSolar: number;      // mass in solar masses
  radiusScene: number;    // visual radius in scene units (your Sun is ~1.2)
  color: string;          // base color
  emissive: string;       // glow color
  emissiveIntensity: number;
};

// A few sample stars (tweak colors/intensities to taste)
export const STARS: Record<string, StarConfig> = {
  Sun: {
    name: "Sun",
    type: "G2V (G-type main sequence)",
    massSolar: 1,
    radiusScene: 1.2,
    color: "#ffcc66",
    emissive: "#ffbb55",
    emissiveIntensity: 1.2,
  },
  "Red Dwarf (M5V)": {
    name: "Red Dwarf",
    type: "M5V (cool, small)",
    massSolar: 0.2,
    radiusScene: 0.8,
    color: "#ff6b5a",
    emissive: "#ff5a3c",
    emissiveIntensity: 0.9,
  },
  "White A-Type": {
    name: "A-Type Star",
    type: "A2V (hot, white)",
    massSolar: 2.1,
    radiusScene: 1.6,
    color: "#cfe6ff",
    emissive: "#d8f0ff",
    emissiveIntensity: 1.4,
  },
};

export const STAR_DEFAULT_KEY = "Sun";
