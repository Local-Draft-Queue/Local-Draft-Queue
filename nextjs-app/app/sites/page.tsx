import { SitesManager } from "@/components/sites-manager";
import { listSites } from "@/lib/sites";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const sites = await listSites();

  return (
    <div className="hero-grid">
      <section className="hero-copy">
        <p className="eyebrow">WordPress Sites</p>
        <h2>Save credentials once, reuse them for every task.</h2>
        <p>
          This registry is stored server-side in a shared JSON file that both the
          Next.js app and the Python worker read. Tasks only need the saved site key.
        </p>
      </section>

      <SitesManager initialSites={sites} />
    </div>
  );
}
