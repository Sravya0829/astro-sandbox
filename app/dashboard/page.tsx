import Link from "next/link";
import { ArrowRight } from "lucide-react";
// Server-side auth & signOut helpers
import { auth, signOut } from "@/lib/auth";
import SiteRail from "@/components/site/SiteRail";
import SiteFooter from "@/components/site/SiteFooter";
import { PRESETS } from "@/lib/simulation/presets";

export const metadata = { title: "My simulations" };

export default async function Dashboard() {
  // Get the current session on the server
  const session = await auth();

  return (
    <div className="site-page site-shell">
      <SiteRail />
      <div className="site-content">
        <main className="site-container dashboard">
          <div className="dashboard-heading">
            <div>
              {session?.user?.email&&<span className="kicker">Signed in as {session.user.email}</span>}
              <h1>My simulations</h1>
            </div>
            <form action={async () => { "use server"; await signOut(); }}>
              <button className="button button-secondary button-small">Sign out</button>
            </form>
          </div>

          <div className="empty-state">
            <h2>No saved simulations yet</h2>
            <p>Saving is coming in the persistence phase. Until then, start from one of the presets below. Changes you make stay in the simulator for this session.</p>
          </div>

          <h2 className="dashboard-subheading">Start from a preset</h2>
          <ol className="preset-list">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <li key={key}>
                <Link href={`/simulator?preset=${key}`}>
                  <strong>{preset.name}</strong>
                  <span>{preset.description}</span>
                  <ArrowRight size={16} />
                </Link>
              </li>
            ))}
          </ol>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
