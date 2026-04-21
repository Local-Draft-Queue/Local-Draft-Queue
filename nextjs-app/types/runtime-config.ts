export type AiProvider = "ollama" | "openai";

export interface RuntimeConfig {
  uiAuthPassword: string;
  pythonServiceUrl: string;
  aiProvider: AiProvider;
  ollamaBaseUrl: string;
  ollamaModel: string;
  openAiApiKey: string;
  openAiBaseUrl: string;
  openAiModel: string;
  wpSitesFile: string;
  draftOutputDir: string;
  promptSkillFile: string;
}
