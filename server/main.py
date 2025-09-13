from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import httpx
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

app = FastAPI(title="GitHub to Receipt API", version="1.0.0")

# CORS 설정 (React 앱에서 접근 가능하도록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic 모델들
class GitHubUserRequest(BaseModel):
    username: str

class CommitData(BaseModel):
    date: str
    count: int

class GitHubStatsResponse(BaseModel):
    username: str
    daily_commits: List[CommitData]
    total_commits: int
    avatar_url: str
    name: str
    public_repos: int
    active_days: int
    max_streak: int
    best_day: CommitData

# GitHub GraphQL API 클라이언트
class GitHubClient:
    def __init__(self):
        self.token = os.getenv("GITHUB_TOKEN")
        if not self.token:
            raise ValueError("GITHUB_TOKEN 환경변수가 설정되지 않았습니다.")
        
        self.base_url = "https://api.github.com/graphql"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
    
    async def get_user_basic_info(self, username: str) -> Dict[str, Any]:
        """사용자의 기본 정보와 계정 생성일을 가져옵니다."""
        query = """
        query($username: String!) {
          user(login: $username) {
            name
            login
            avatarUrl
            createdAt
            repositories(privacy: PUBLIC) {
              totalCount
            }
          }
        }
        """
        
        variables = {"username": username}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                json={"query": query, "variables": variables},
                headers=self.headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"GitHub API 요청 실패: {response.text}"
                )
            
            data = response.json()
            
            if "errors" in data:
                raise HTTPException(
                    status_code=400,
                    detail=f"GitHub API 오류: {data['errors']}"
                )
            
            if not data.get("data", {}).get("user"):
                raise HTTPException(
                    status_code=404,
                    detail=f"사용자 '{username}'를 찾을 수 없습니다."
                )
            
            return data["data"]["user"]
    
    async def get_contributions_for_period(self, username: str, from_date: datetime, to_date: datetime) -> int:
        """특정 기간의 커밋 수를 가져옵니다."""
        query = """
        query($username: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                totalContributions
              }
            }
          }
        }
        """
        
        variables = {
            "username": username,
            "from": from_date.isoformat(),
            "to": to_date.isoformat()
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                json={"query": query, "variables": variables},
                headers=self.headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return 0  # 오류 시 0 반환
            
            data = response.json()
            
            if "errors" in data or not data.get("data", {}).get("user"):
                return 0
            
            return data["data"]["user"]["contributionsCollection"]["contributionCalendar"]["totalContributions"]
    
    async def get_graph_contributions(self, username: str, from_date: datetime, to_date: datetime) -> List[Dict[str, Any]]:
        """6개월 그래프용 일별 커밋 데이터를 가져옵니다."""
        query = """
        query($username: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
            }
          }
        }
        """
        
        variables = {
            "username": username,
            "from": from_date.isoformat(),
            "to": to_date.isoformat()
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                json={"query": query, "variables": variables},
                headers=self.headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            if "errors" in data or not data.get("data", {}).get("user"):
                return []
            
            daily_commits = []
            contribution_calendar = data["data"]["user"]["contributionsCollection"]["contributionCalendar"]
            
            for week in contribution_calendar["weeks"]:
                for day in week["contributionDays"]:
                    daily_commits.append({
                        "date": day["date"],
                        "count": day["contributionCount"]
                    })
            
            return daily_commits

    async def get_all_daily_contributions(self, username: str, from_date: datetime, to_date: datetime) -> List[Dict[str, Any]]:
        """전체 기간의 일별 커밋 데이터를 1년씩 분할해서 가져옵니다."""
        all_daily_data = []
        current_start = from_date
        
        while current_start < to_date:
            # 1년 후 또는 현재 날짜 중 더 작은 값
            current_end = min(current_start + timedelta(days=365), to_date)
            
            # 해당 기간의 일별 데이터 가져오기
            period_data = await self.get_graph_contributions(username, current_start, current_end)
            all_daily_data.extend(period_data)
            
            # 다음 기간으로 이동
            current_start = current_end
        
        return all_daily_data

    async def get_user_stats(self, username: str) -> Dict[str, Any]:
        """사용자의 기본 정보와 전체/6개월 커밋 통계를 가져옵니다."""
        
        # 1. 기본 정보와 계정 생성일 가져오기
        user_info = await self.get_user_basic_info(username)
        created_at = datetime.fromisoformat(user_info["createdAt"].replace('Z', '+00:00')).replace(tzinfo=None)
        
        # 2. 6개월 그래프용 데이터 가져오기
        end_date = datetime.now()
        graph_start_date = end_date - timedelta(days=180)
        daily_commits_data = await self.get_graph_contributions(username, graph_start_date, end_date)
        
        # 3. 전체 기간 일별 데이터 가져오기 (통계 계산용)
        all_daily_data = await self.get_all_daily_contributions(username, created_at, end_date)
        
        # 4. 전체 기간 통계 계산
        total_contributions = sum(day["count"] for day in all_daily_data)
        active_days = len([day for day in all_daily_data if day["count"] > 0])
        
        # 최대 연속일 계산
        max_streak = 0
        current_streak = 0
        for day in sorted(all_daily_data, key=lambda x: x["date"]):
            if day["count"] > 0:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 0
        
        # 최고 기록 날
        best_day = max(all_daily_data, key=lambda x: x["count"]) if all_daily_data else {"date": "", "count": 0}
        
        # 결과 반환
        return {
            **user_info,
            "total_contributions": total_contributions,
            "daily_commits_data": daily_commits_data,
            "active_days": active_days,
            "max_streak": max_streak,
            "best_day": best_day
        }

# GitHub 클라이언트 인스턴스
github_client = GitHubClient()

@app.get("/")
async def root():
    """헬스 체크 엔드포인트"""
    return {"message": "GitHub to Receipt API is running!"}

@app.post("/api/github/stats", response_model=GitHubStatsResponse)
async def get_github_stats(request: GitHubUserRequest):
    """GitHub 사용자의 통계 정보를 가져옵니다."""
    
    try:
        user_data = await github_client.get_user_stats(request.username)
        
        # 6개월 그래프용 일별 커밋 데이터 변환
        daily_commits = []
        for day_data in user_data["daily_commits_data"]:
            daily_commits.append(CommitData(
                date=day_data["date"],
                count=day_data["count"]
            ))
        
        # 날짜 순으로 정렬
        daily_commits.sort(key=lambda x: x.date)
        
        return GitHubStatsResponse(
            username=user_data["login"],
            daily_commits=daily_commits,
            total_commits=user_data["total_contributions"],
            avatar_url=user_data["avatarUrl"],
            name=user_data["name"] or user_data["login"],
            public_repos=user_data["repositories"]["totalCount"],
            active_days=user_data["active_days"],
            max_streak=user_data["max_streak"],
            best_day=CommitData(
                date=user_data["best_day"]["date"],
                count=user_data["best_day"]["count"]
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"서버 내부 오류: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
