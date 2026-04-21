import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getAuthState } from "@/lib/auth-guards";

export async function SiteHeader() {
  const { authenticated } = await getAuthState();

  return (
    <header className="site-header">
      <div>
        <p className="eyebrow">Publishing Ops</p>
        <h1>Local Draft Queue</h1>
      </div>
      {authenticated ? (
        <nav>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/queue">Queue</Link>
          <Link href="/sites">Sites</Link>
          <Link href="/skills">Skills</Link>
          <Link href="/setup">Settings</Link>
          <LogoutButton />
        </nav>
      ) : (
        <nav>
          <Link href="/setup">Setup</Link>
          <Link href="/login">Login</Link>
        </nav>
      )}
    </header>
  );
}
