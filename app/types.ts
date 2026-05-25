export type Screen = "top" | "setup" | "sim" | "result";

export interface SimConfig {
  title: string;
  context: string;
  aiRole: string;
  targetPersona: string;
  firstMsg: string;
  scoreLabels: string[];
  playerOrg?: string;
}

export interface ChatLog {
  action: string;
  intent: string;
}

export interface AnalysisResult {
  scores: number[];
  overall: string;
  personality: string;
  detail: string;
  critical_point: string;
  best_approach: string;
  hiring_recommendation: string;
  onboarding_scenario: string;
  risk_points: string;
  interview_questions: string;
}
