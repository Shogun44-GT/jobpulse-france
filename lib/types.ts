export type Contract = "stage" | "alternance" | "cdi" | "cdd" | "graduate";

export type Job = {
  id: string;
  company: string;
  title: string;
  location: string;
  contract: Contract;
  remote: boolean;
  publishedAt: string;
  source: string;
  applyUrl: string;
  score?: number;
  matchReasons?: string[];
  profileReady?: boolean;
  logo?: string;
};
