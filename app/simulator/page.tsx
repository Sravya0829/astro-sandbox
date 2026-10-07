import Simulator from "@/components/simulator/Simulator";
import { DEFAULT_PRESET_KEY, PRESETS, type PresetKey } from "@/lib/simulation/presets";

export const metadata = { title: "Simulator" };

export default async function SimulatorPage({ searchParams }: { searchParams: Promise<{ preset?: string | string[] }> }) {
  const { preset } = await searchParams;
  const initialPreset = typeof preset === "string" && preset in PRESETS ? (preset as PresetKey) : DEFAULT_PRESET_KEY;
  return <main><Simulator key={initialPreset} initialPreset={initialPreset} /></main>;
}
