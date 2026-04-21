import { SetupManager } from "@/components/setup-manager";
import { requirePageAuth } from "@/lib/auth-guards";
import { isUiAuthConfigured } from "@/lib/auth";
import { getRuntimeConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  await requirePageAuth({ allowWhenUnconfigured: true, nextPath: "/setup" });
  const [config, authConfigured] = await Promise.all([
    getRuntimeConfig(),
    isUiAuthConfigured(),
  ]);

  return <SetupManager initialConfig={config} authConfigured={authConfigured} />;
}
