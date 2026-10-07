import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteRail from "@/components/site/SiteRail";
import SiteFooter from "@/components/site/SiteFooter";
import OrreryFigure from "@/components/site/OrreryFigure";

const sections = [
  { id: "intro", label: "Introduction" },
  { id: "explore", label: "Explore" },
  { id: "science", label: "Science" },
];

const features = [
  { index: "I", preset: "blank-system", title: "Build a planetary system", copy: "Start from a lone Sun-like star. Add planets at any distance, edit their position and velocity, and see whether the orbit closes, decays, collides, or flings the planet out." },
  { index: "II", preset: "black-hole-demo", title: "Get close to a black hole", copy: "A 15 M☉ black hole with a companion star and a test planet. Select it to read off its event horizon, photon sphere and innermost stable orbit, then change its mass." },
  { index: "III", preset: "stellar-lifecycle", title: "Age a star", copy: "Adjust mass, age and metallicity and follow the star from the main sequence to whatever it leaves behind: a white dwarf, a neutron star, or a black hole." },
  { index: "IV", preset: "solar-system", title: "Score a world's habitability", copy: "Select any planet or moon to get a habitability score out of 100, calculated live from where it orbits relative to its star's habitable zone, its mass, and its equilibrium temperature." },
];

const specs = [
  ["Integrator", "Velocity Verlet"],
  ["Runs on", "Web Worker, off the main thread"],
  ["Units", "AU · days · M☉"],
  ["G", "2.959 × 10⁻⁴ AU³ M☉⁻¹ d⁻²"],
  ["Softening", "ε² = 10⁻⁶ AU²"],
  ["Collisions", "Bodies merge on contact"],
  ["Habitability", "Zone 55% · mass 25% · temperature 20%"],
];

export default function Home() {
  return (
    <div className="site-page site-shell">
      <SiteRail sections={sections} />
      <div className="site-content">
      <main>
        <section className="hero" id="intro">
          <div className="site-container hero-grid">
            <div className="hero-copy">
              <span className="kicker">An astronomy sandbox for the browser</span>
              <h1>A gravity sandbox you can <em>take apart.</em></h1>
              <p>Place stars, planets and black holes, set their velocities, and watch an N-body integrator work out what happens next. No account needed.</p>
              <div className="hero-actions">
                <Link className="button button-primary button-large" href="/simulator">Open the simulator <ArrowRight size={18} /></Link>
                <a className="button button-secondary button-large" href="#explore">What you can do</a>
              </div>
              <ul className="hero-meta">
                <li><span>7</span> preset systems</li>
                <li><span>N-body</span> gravity</li>
                <li>Real units, <span>AU</span> and <span>days</span></li>
              </ul>
            </div>
            <OrreryFigure />
          </div>
        </section>

        <section className="feature-section" id="explore">
          <div className="site-container">
            <div className="section-heading">
              <span className="kicker">§ 1 — Explore</span>
              <div>
                <h2>Four experiments to start with</h2>
                <p>Each one is a preset in the simulator. Change one number and watch the rest of the system respond.</p>
              </div>
            </div>
            <ol className="feature-list">
              {features.map(({ index, preset, title, copy }) => (
                <li className="feature-row" key={title}>
                  <span className="feature-index">{index}.</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <Link href={`/simulator?preset=${preset}`}>Try it <ArrowRight size={14} /></Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="science-section" id="science">
          <div className="site-container science-grid">
            <div className="science-copy">
              <span className="kicker">§ 2 — Science</span>
              <h2>What&rsquo;s real and what&rsquo;s exaggerated</h2>
              <p>Positions, velocities and masses are kept in physical units, and the drawing is scaled separately. Orbits behave as they should even though the planets are drawn hundreds of times larger than life.</p>
              <ul>
                <li><strong>The motion is computed, not animated</strong><span>Every frame comes from the integrator stepping Newton&rsquo;s law of gravity forward in time.</span></li>
                <li><strong>Every score shows its reasons</strong><span>Habitability scores are calculated for every planet and moon from stellar flux, mass and equilibrium temperature, and list the factors that raised or lowered them. They are educational estimates, not evidence of life.</span></li>
                <li><strong>Approximations are labelled</strong><span>Wherever the visuals stretch the truth, such as body sizes or the accretion disk, the interface says so.</span></li>
              </ul>
            </div>
            <table className="spec-sheet">
              <caption>Simulation parameters</caption>
              <tbody>
                {specs.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cta-section">
          <div className="site-container cta-band">
            <div><h2>Open the simulator</h2><p>It opens on the Solar System, already running.</p></div>
            <Link className="button button-primary button-large" href="/simulator">Start <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
      </div>
    </div>
  );
}
