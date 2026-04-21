import { SkillManager } from "@/components/skill-manager";
import { getPromptSkill } from "@/lib/skill-config";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const skill = await getPromptSkill();

  return <SkillManager initialSkill={skill} />;
}
