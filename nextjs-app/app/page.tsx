import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth-guards";

export default async function HomePage() {
  const { configured, authenticated } = await getAuthState();

  if (!configured) {
    redirect("/setup");
  }

  redirect(authenticated ? "/dashboard" : "/login");
}
