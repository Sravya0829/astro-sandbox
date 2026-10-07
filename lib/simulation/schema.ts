import { z } from "zod";

export const SIMULATION_SCHEMA_VERSION = 1 as const;
export const bodyCategories = ["star", "planet", "moon", "asteroid", "blackHole"] as const;
export type BodyCategory = (typeof bodyCategories)[number];

const finiteNumber = z.number().finite();
const vector2Schema = z.tuple([finiteNumber, finiteNumber]);

export const celestialBodySchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(60),
  category: z.enum(bodyCategories),
  massSolar: finiteNumber.nonnegative().max(1e11),
  radiusKm: finiteNumber.positive().max(1e12),
  renderRadius: finiteNumber.positive().max(20),
  positionAU: vector2Schema,
  velocityAUPerDay: vector2Schema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  parentId: z.string().min(1).optional(),
  luminositySolar: finiteNumber.nonnegative().optional(),
  ageGyr: finiteNumber.nonnegative().optional(),
  metallicity: finiteNumber.nonnegative().optional(),
});

export const simulationDocumentSchema = z.object({
  schemaVersion: z.literal(SIMULATION_SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(400),
  presetKey: z.string().optional(),
  bodies: z.array(celestialBodySchema).min(1).max(250),
  settings: z.object({
    timeScaleDaysPerSecond: finiteNumber.nonnegative().max(10000),
    gravitationalSofteningAU: finiteNumber.positive().max(1),
    collisions: z.enum(["merge", "none"]),
    showLabels: z.boolean(),
    showOrbits: z.boolean(),
  }),
});

export type CelestialBody = z.infer<typeof celestialBodySchema>;
export type SimulationDocument = z.infer<typeof simulationDocumentSchema>;

export function parseSimulationDocument(input: unknown): SimulationDocument {
  const document = simulationDocumentSchema.parse(input);
  const ids = new Set(document.bodies.map((body) => body.id));
  if (ids.size !== document.bodies.length) throw new Error("Every celestial body must have a unique id.");
  for (const body of document.bodies) {
    if (body.parentId && !ids.has(body.parentId)) throw new Error(`${body.name} references a missing parent body.`);
    if (body.parentId === body.id) throw new Error(`${body.name} cannot be its own parent.`);
  }
  return document;
}

export function cloneSimulation(document: SimulationDocument): SimulationDocument {
  return structuredClone(document);
}
