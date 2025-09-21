// Server-side auth & signOut helpers
import { auth, signOut } from "@/lib/auth";

// Import the client wrapper that holds slider state and renders the Scene
import DashboardClient from "@/components/dashboard/Client";

export default async function Dashboard() {
  // Get the current session on the server
  const session = await auth();

  return (
    <main className="p-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={async () => { "use server"; await signOut(); }}>
          <button className="rounded bg-white/10 px-3 py-1">Sign out</button>
        </form>
      </div>

      {/* Controls + Scene */}
      <DashboardClient />

      {/* Footer note */}
      <p className="mt-4 text-sm text-white/60">
        Logged in as {session?.user?.email}
      </p>
    </main>
  );
}
