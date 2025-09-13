export interface CommitData {
  date: string;
  count: number;
}

export interface GitHubStats {
  username: string;
  daily_commits: CommitData[];
  total_commits: number;
  avatar_url: string;
  name: string;
  public_repos: number;
  active_days: number;
  max_streak: number;
  best_day: CommitData;
}

export interface GitHubUserRequest {
  username: string;
}
