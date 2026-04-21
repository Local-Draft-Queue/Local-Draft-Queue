import { SkillManager } from "@/components/skill-manager";
import { requirePageAuth } from "@/lib/auth-guards";
import { getPromptSkill } from "@/lib/skill-config";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  await requirePageAuth({ nextPath: "/skills" });
  const skill = await getPromptSkill();

  return <SkillManager initialSkill={skill} />;
}
