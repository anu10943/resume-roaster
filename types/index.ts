export interface RoastRequest {
  resumeText: string;
}

export interface RoastResponse {
  roast: string;
  score: number;
  feedback: string[];
}
