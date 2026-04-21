"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";

export function SiteHeader() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <header className="site-header">
      <div>
        <p className="eyebrow">Publishing Ops</p>
        <h1>Local Draft Queue</h1>
      </div>
      {isLoginPage ? null : (
        <nav>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/queue">Queue</Link>
          <Link href="/sites">Sites</Link>
          <Link href="/skills">Skills</Link>
          <Link href="/setup">Setup</Link>
          <LogoutButton />
        </nav>
      )}
    </header>
  );
}
