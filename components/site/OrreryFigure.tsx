const C = 260;
const SCALE = 150; // px per AU

// Inner planets: semi-major axis (AU), orbital period (days), colour from the palette.
const planets = [
  { name: "Mercury", au: 0.39, days: 88, color: "#a39a8a", r: 3, phase: 0.62 },
  { name: "Venus", au: 0.72, days: 225, color: "#e2c27a", r: 4.5, phase: 0.18 },
  { name: "Earth", au: 1.0, days: 365, color: "#6fae9e", r: 5, phase: 0.83 },
  { name: "Mars", au: 1.52, days: 687, color: "#d06a4f", r: 4, phase: 0.41 },
];

// 1 Earth year = 40 s of animation.
const SECONDS_PER_DAY = 40 / 365;

const ticks = Array.from({ length: 72 }, (_, i) => i * 5);

export default function OrreryFigure() {
  const outer = 246;
  return (
    <figure className="plate">
      <svg viewBox="0 0 520 520" role="img" aria-label="Diagram of the four inner planets orbiting the Sun, with orbital distances drawn to scale">
        <circle cx={C} cy={C} r={outer} fill="none" stroke="currentColor" strokeOpacity=".5" />
        <circle cx={C} cy={C} r={outer - 14} fill="none" stroke="currentColor" strokeOpacity=".2" />
        {ticks.map((deg) => {
          const long = deg % 30 === 0;
          const a = (deg * Math.PI) / 180;
          const r1 = outer - (long ? 14 : 6);
          return <line key={deg} x1={C + Math.cos(a) * r1} y1={C + Math.sin(a) * r1} x2={C + Math.cos(a) * outer} y2={C + Math.sin(a) * outer} stroke="currentColor" strokeOpacity={long ? .7 : .35} />;
        })}

        {planets.map((p) => (
          <circle key={`orbit-${p.name}`} cx={C} cy={C} r={p.au * SCALE} fill="none" stroke="currentColor" strokeOpacity=".32" strokeDasharray={p.name === "Earth" ? undefined : "2 4"} />
        ))}

        {/* Scale bar along the +x axis */}
        <line x1={C} y1={C} x2={C + 1.52 * SCALE} y2={C} stroke="currentColor" strokeOpacity=".25" />
        {planets.map((p) => (
          <g key={`scale-${p.name}`} fontFamily="var(--font-plex-mono), monospace" fontSize="9" fill="#7a7266">
            <line x1={C + p.au * SCALE} y1={C - 3} x2={C + p.au * SCALE} y2={C + 3} stroke="currentColor" strokeOpacity=".6" />
            <text x={C + p.au * SCALE} y={C + 15} textAnchor="middle">{p.au.toFixed(2)}</text>
          </g>
        ))}

        {planets.map((p) => {
          const duration = p.days * SECONDS_PER_DAY;
          return (
            <g key={p.name} className="orrery-arm" style={{ animationDuration: `${duration}s`, animationDelay: `${-p.phase * duration}s` }}>
              <circle cx={C + p.au * SCALE} cy={C} r={p.r} fill={p.color} />
            </g>
          );
        })}

        <circle cx={C} cy={C} r="13" fill="none" stroke="currentColor" strokeOpacity=".4" />
        <circle cx={C} cy={C} r="8" fill="currentColor" />
      </svg>
      <figcaption><strong>Fig. 1</strong> — The inner planets. Orbital distances in AU, drawn to scale; planet sizes are not. One Earth year passes every 40 seconds.</figcaption>
    </figure>
  );
}
