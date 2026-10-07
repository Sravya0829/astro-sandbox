import Link from "next/link";
import BrandMark from "@/components/site/BrandMark";
import { PRESETS } from "@/lib/simulation/presets";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="colophon">
          <section>
            <h2>Start from a preset</h2>
            <ul>{Object.entries(PRESETS).map(([key, preset]) => <li key={key}><Link href={`/simulator?preset=${key}`}>{preset.name}</Link></li>)}</ul>
          </section>
          <section>
            <h2>Site</h2>
            <ul>
              <li><Link href="/simulator">Simulator</Link></li>
              <li><Link href="/#explore">Explore</Link></li>
              <li><Link href="/#science">Science</Link></li>
              <li><Link href="/dashboard">My simulations</Link></li>
            </ul>
          </section>
          <section>
            <h2>About</h2>
            <p>An N-body gravity sandbox. Motion is integrated with velocity Verlet in a Web Worker, in astronomical units, days and solar masses.</p>
          </section>
          <section>
            <h2>Colophon</h2>
            <p>Built with Next.js, React Three Fiber and Three.js. Set in Fraunces and IBM Plex.</p>
            <p>Distances and motion are physical. Body sizes are enlarged so you can see them.</p>
          </section>
        </div>
        <div className="footer-row">
          <div className="brand"><BrandMark size={20} /><span>Astro <em>Sandbox</em></span></div>
          <p className="mono">© {new Date().getFullYear()} · Astro Sandbox</p>
        </div>
      </div>
    </footer>
  );
}
