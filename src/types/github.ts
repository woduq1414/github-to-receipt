export interface CommitData {
  date: string;
  count: number;
}

export interface TopRepository {
  name: string;
  stargazers_count: number;
  primary_language: string | null;
  updated_at: string;
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
  top_repositories: TopRepository[];
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubUserRequest {
  username: string;
}
