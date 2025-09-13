import type { GitHubStats, GitHubUserRequest } from '../types/github';

const API_BASE_URL = 'http://localhost:8000';

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export const githubApi = {
  async getStats(username: string): Promise<GitHubStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/github/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username } as GitHubUserRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GitHubApiError(
          errorData.detail || `HTTP ${response.status}`,
          response.status,
          errorData.detail
        );
      }

      const data: GitHubStats = await response.json();
      return data;
    } catch (error) {
      if (error instanceof GitHubApiError) {
        throw error;
      }
      
      // 네트워크 오류 또는 기타 오류
      throw new GitHubApiError(
        '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.',
        0,
        error instanceof Error ? error.message : String(error)
      );
    }
  },
};
