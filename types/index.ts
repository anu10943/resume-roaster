export interface ScoreBreakdown {
  clarity: number;
  impact: number;
  formatting: number;
  relevance: number;
  conciseness: number;
}

export interface Improvement {
  before: string;
  after: string;
}

export interface RoastResponse {
  roast: string;
  score: {
    overall: number;
    breakdown: ScoreBreakdown;
  };
  improvements: Improvement[];
  vibe: string;
}
