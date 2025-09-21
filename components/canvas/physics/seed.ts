import type { Body } from "./store";

const TWO_PI = Math.PI * 2;

// Approx planet masses (solar masses) for big bodies
const DEFAULT_MASS_MAP: Record<string, number> = {
  Jupiter: 0.0009543,
  Saturn:  0.0002857,
  Neptune: 0.0000515,
  Uranus:  0.0000446,
  // Earth/Mars/Venus/Mercury left at 0 for now
};

type SeedOpts = {
  starName: string;
  starMass?: number;
  starRadiusScene?: number;
  starColor?: string;
  planets: Array<{
    name: string;
    aAU: number;
    periodDays: number;
    radius: number;
    color?: string;
  }>;
  mutualGravity?: boolean;
  massMap?: Record<string, number>;
};

export function seedFromPlanets({
  starName,
  starMass = 1,
  starRadiusScene = 1.2,
  starColor = "#ffcc66",
  planets,
  mutualGravity = false,
  massMap = DEFAULT_MASS_MAP,
}: SeedOpts): Body[] {
  const bodies: Body[] = [];

  // Star placeholder (we’ll set velocity later for barycenter)
  const star: Body = {
    id: `star:${starName}`,
    name: starName,
    massSolar: starMass,
    radiusScene: starRadiusScene,
    color: starColor,
    pos: [0, 0],
    vel: [0, 0],
  };
  bodies.push(star);

  for (const p of planets) {
    const v = (TWO_PI * p.aAU) / p.periodDays; // AU/day circular speed
    const m = mutualGravity && massMap[p.name] ? massMap[p.name] : 0;

    bodies.push({
      id: `planet:${p.name}`,
      name: p.name,
      massSolar: m,
      radiusScene: p.radius,
      color: p.color ?? "#88aaff",
      pos: [p.aAU, 0],
      vel: [0, v],
    });
  }

  // Barycenter: give star a counter-velocity so total momentum ~ 0
  if (mutualGravity) {
    let px = 0, py = 0;
    for (let i = 1; i < bodies.length; i++) {
      const b = bodies[i];
      px += b.massSolar * b.vel[0];
      py += b.massSolar * b.vel[1];
    }
    star.vel = [-(px / starMass), -(py / starMass)];
  }

  return bodies;
}
