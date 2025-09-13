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

export interface StatusEvent {
  type: 'start' | 'api_call' | 'processing' | 'complete' | 'data' | 'error';
  message: string;
  progress: number;
  data?: any;
  timestamp: string;
}

export interface SSECallbacks {
  onStatusUpdate?: (event: StatusEvent) => void;
  onComplete?: (data: GitHubStats) => void;
  onError?: (error: string) => void;
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

  async getStatsWithSSE(username: string, callbacks: SSECallbacks): Promise<void> {
    try {
      // 1. 비동기 데이터 수집 시작
      const startResponse = await fetch(`${API_BASE_URL}/api/github/stats/async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username } as GitHubUserRequest),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({}));
        throw new GitHubApiError(
          errorData.detail || `HTTP ${startResponse.status}`,
          startResponse.status,
          errorData.detail
        );
      }

      // 2. SSE 연결 시작
      const eventSource = new EventSource(`${API_BASE_URL}/api/github/stats/stream/${encodeURIComponent(username)}`);

      eventSource.onmessage = (event) => {
        try {
          const statusEvent: StatusEvent = JSON.parse(event.data);
          
          // 상태 업데이트 콜백 호출
          if (callbacks.onStatusUpdate) {
            callbacks.onStatusUpdate(statusEvent);
          }

          // 데이터 완료 시 처리
          if (statusEvent.type === 'data' && statusEvent.data) {
            const data = statusEvent.data;
            
            // 데이터 변환 (서버에서 받은 raw 데이터를 GitHubStats 형식으로)
            const githubStats: GitHubStats = {
              username: data.login,
              daily_commits: data.daily_commits_data.map((day: any) => ({
                date: day.date,
                count: day.count
              })),
              total_commits: data.total_contributions,
              avatar_url: data.avatarUrl,
              name: data.name || data.login,
              public_repos: data.repositories.totalCount,
              active_days: data.active_days,
              max_streak: data.max_streak,
              best_day: {
                date: data.best_day.date,
                count: data.best_day.count
              },
              top_repositories: data.top_repositories.map((repo: any) => ({
                name: repo.name,
                stargazers_count: repo.stargazers_count,
                primary_language: repo.primary_language,
                updated_at: repo.updated_at
              })),
              followers: data.followers.totalCount,
              following: data.following.totalCount,
              created_at: data.createdAt
            };

            if (callbacks.onComplete) {
              callbacks.onComplete(githubStats);
            }
            eventSource.close();
          }

          // 오류 시 처리
          if (statusEvent.type === 'error') {
            if (callbacks.onError) {
              callbacks.onError(statusEvent.message);
            }
            eventSource.close();
          }

        } catch (parseError) {
          console.error('SSE 이벤트 파싱 오류:', parseError);
          if (callbacks.onError) {
            callbacks.onError('데이터 파싱 오류가 발생했습니다.');
          }
          eventSource.close();
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE 연결 오류:', error);
        if (callbacks.onError) {
          callbacks.onError('서버 연결이 끊어졌습니다.');
        }
        eventSource.close();
      };

      // 정리 함수 반환 (필요시 연결 종료용)
      return () => {
        eventSource.close();
      };

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
