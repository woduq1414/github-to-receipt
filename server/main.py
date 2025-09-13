from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union, AsyncGenerator
import httpx
import os
import json
import asyncio
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

class TopRepository(BaseModel):
    name: str
    stargazers_count: int
    primary_language: Optional[str]
    updated_at: str

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
    top_repositories: List[TopRepository]
    followers: int
    following: int
    created_at: str

# 상태 이벤트 타입 정의
class StatusEvent:
    def __init__(self, event_type: str, message: str, progress: int = 0, data: Optional[Dict[str, Any]] = None):
        self.event_type = event_type
        self.message = message
        self.progress = progress
        self.data = data or {}
        self.timestamp = datetime.now().isoformat()

# GitHub GraphQL API 클라이언트
class GitHubClient:
    def __init__(self, status_callback=None):
        self.token = os.getenv("GITHUB_TOKEN")
        if not self.token:
            raise ValueError("GITHUB_TOKEN 환경변수가 설정되지 않았습니다.")
        
        self.base_url = "https://api.github.com/graphql"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        self.status_callback = status_callback
    
    async def emit_status(self, event_type: str, message: str, progress: int = 0, data: Optional[Dict[str, Any]] = None):
        """상태 이벤트를 발생시킵니다."""
        if self.status_callback:
            event = StatusEvent(event_type, message, progress, data)
            await self.status_callback(event)
    
    async def get_user_basic_info(self, username: str) -> Dict[str, Any]:
        """사용자의 기본 정보와 계정 생성일을 가져옵니다."""
        await self.emit_status("api_call", f"사용자 기본 정보를 조회하고 있습니다: {username}", 10)
        
        query = """
        query($username: String!) {
          user(login: $username) {
            name
            login
            avatarUrl
            createdAt
            followers {
              totalCount
            }
            following {
              totalCount
            }
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
        await self.emit_status("api_call", f"기간별 커밋 수를 조회하고 있습니다: {from_date.strftime('%Y-%m-%d')} ~ {to_date.strftime('%Y-%m-%d')}", 30)
        
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
        await self.emit_status("api_call", f"일별 커밋 데이터를 조회하고 있습니다: {from_date.strftime('%Y-%m-%d')} ~ {to_date.strftime('%Y-%m-%d')}", 50)
        
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
        await self.emit_status("api_call", "전체 기간의 커밋 데이터를 수집하고 있습니다...", 60)
        
        all_daily_data = []
        current_start = from_date
        year_count = 0
        total_years = ((to_date - from_date).days // 365) + 1
        
        while current_start < to_date:
            year_count += 1
            await self.emit_status("api_call", f"커밋 데이터 수집 중... ({year_count}/{total_years}년)", 60 + (year_count / total_years * 20))
            
            # 1년 후 또는 현재 날짜 중 더 작은 값
            current_end = min(current_start + timedelta(days=365), to_date)
            
            # 해당 기간의 일별 데이터 가져오기
            period_data = await self.get_graph_contributions(username, current_start, current_end)
            all_daily_data.extend(period_data)
            
            # 다음 기간으로 이동
            current_start = current_end
        
        return all_daily_data

    async def get_top_repositories(self, username: str, limit: int = 10) -> List[Dict[str, Any]]:
        """사용자의 상위 레포지토리를 가져옵니다. 스타 수 기준으로 정렬하고, 동일한 경우 최신 업데이트 순으로 정렬합니다."""
        await self.emit_status("api_call", f"상위 레포지토리 정보를 조회하고 있습니다 (최대 {limit}개)", 85)
        
        query = """
        query($username: String!, $first: Int!) {
          user(login: $username) {
            repositories(
              first: $first, 
              privacy: PUBLIC, 
              ownerAffiliations: OWNER,
              orderBy: {field: STARGAZERS, direction: DESC}
            ) {
              nodes {
                name
                stargazerCount
                primaryLanguage {
                  name
                }
                updatedAt
              }
            }
          }
        }
        """
        
        variables = {
            "username": username,
            "first": limit
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
            
            repositories = data["data"]["user"]["repositories"]["nodes"]
            
            # 스타 수로 정렬하고, 동일한 경우 최신 업데이트 순으로 정렬
            sorted_repos = sorted(repositories, key=lambda x: (-x["stargazerCount"], x["updatedAt"]), reverse=True)
            
            result = []
            for repo in sorted_repos:
                result.append({
                    "name": repo["name"],
                    "stargazers_count": repo["stargazerCount"],
                    "primary_language": repo["primaryLanguage"]["name"] if repo["primaryLanguage"] else None,
                    "updated_at": repo["updatedAt"]
                })
            
            return result

    async def get_user_stats(self, username: str) -> Dict[str, Any]:
        """사용자의 기본 정보와 전체/6개월 커밋 통계를 가져옵니다."""
        
        await self.emit_status("start", f"GitHub 사용자 '{username}' 정보 수집을 시작합니다", 0)
        
        # 1. 기본 정보와 계정 생성일 가져오기
        user_info = await self.get_user_basic_info(username)
        created_at = datetime.fromisoformat(user_info["createdAt"].replace('Z', '+00:00')).replace(tzinfo=None)
        
        # 2. 6개월 그래프용 데이터 가져오기
        end_date = datetime.now()
        graph_start_date = end_date - timedelta(days=180)
        daily_commits_data = await self.get_graph_contributions(username, graph_start_date, end_date)
        
        # 3. 전체 기간 일별 데이터 가져오기 (통계 계산용)
        all_daily_data = await self.get_all_daily_contributions(username, created_at, end_date)
        
        # 4. 상위 레포지토리 정보 가져오기
        top_repositories = await self.get_top_repositories(username, 10)
        
        await self.emit_status("processing", "데이터를 분석하고 통계를 계산하고 있습니다", 90)
        
        # 5. 전체 기간 통계 계산
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
        
        await self.emit_status("complete", "데이터 수집이 완료되었습니다!", 100)
        
        # 결과 반환
        return {
            **user_info,
            "total_contributions": total_contributions,
            "daily_commits_data": daily_commits_data,
            "active_days": active_days,
            "max_streak": max_streak,
            "best_day": best_day,
            "top_repositories": top_repositories
        }

# 활성 SSE 연결을 저장하는 딕셔너리
active_connections: Dict[str, List[asyncio.Queue]] = {}

# GitHub 클라이언트 인스턴스
github_client = GitHubClient()

async def event_generator(username: str) -> AsyncGenerator[str, None]:
    """SSE 이벤트를 생성하는 제너레이터"""
    # 연결 큐 생성
    queue = asyncio.Queue()
    
    # 활성 연결 목록에 추가
    if username not in active_connections:
        active_connections[username] = []
    active_connections[username].append(queue)
    
    try:
        while True:
            # 큐에서 이벤트 대기
            event = await queue.get()
            if event is None:  # 연결 종료 신호
                break
            
            # SSE 형식으로 이벤트 전송
            event_data = {
                "type": event.event_type,
                "message": event.message,
                "progress": event.progress,
                "data": event.data,
                "timestamp": event.timestamp
            }
            
            yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
            
    except asyncio.CancelledError:
        pass
    finally:
        # 연결 정리
        if username in active_connections:
            if queue in active_connections[username]:
                active_connections[username].remove(queue)
            if not active_connections[username]:
                del active_connections[username]

async def broadcast_event(username: str, event: StatusEvent):
    """특정 사용자의 모든 연결에 이벤트를 브로드캐스트"""
    if username in active_connections:
        for queue in active_connections[username]:
            try:
                await queue.put(event)
            except:
                # 큐가 닫혔을 경우 무시
                pass

@app.get("/")
async def root():
    """헬스 체크 엔드포인트"""
    return {"message": "GitHub to Receipt API is running!"}

@app.get("/api/github/stats/stream/{username}")
async def stream_github_stats(username: str):
    """GitHub 사용자 통계를 SSE로 스트리밍합니다."""
    return StreamingResponse(
        event_generator(username),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.post("/api/github/stats/async")
async def get_github_stats_async(request: GitHubUserRequest):
    """GitHub 사용자 통계를 비동기로 가져오고 SSE로 진행상황을 전송합니다."""
    username = request.username
    
    # 상태 콜백 함수 정의
    async def status_callback(event: StatusEvent):
        await broadcast_event(username, event)
    
    # 상태 콜백을 가진 GitHub 클라이언트 생성
    client_with_callback = GitHubClient(status_callback)
    
    # 백그라운드에서 데이터 수집 시작
    async def collect_data():
        try:
            user_data = await client_with_callback.get_user_stats(username)
            
            # 완료 이벤트와 함께 데이터 전송
            await broadcast_event(username, StatusEvent("data", "데이터 수집 완료", 100, user_data))
            
        except Exception as e:
            # 오류 이벤트 전송
            await broadcast_event(username, StatusEvent("error", f"오류 발생: {str(e)}", 0))
    
    # 백그라운드 태스크로 실행
    asyncio.create_task(collect_data())
    
    return {"message": f"사용자 '{username}'의 데이터 수집을 시작했습니다. SSE 스트림을 연결하세요."}

@app.post("/api/github/stats", response_model=GitHubStatsResponse)
async def get_github_stats(request: GitHubUserRequest):
    """GitHub 사용자의 통계 정보를 가져옵니다. (기존 동기 방식)"""
    
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
        
        # 상위 레포지토리 데이터 변환
        top_repositories = []
        for repo_data in user_data["top_repositories"]:
            top_repositories.append(TopRepository(
                name=repo_data["name"],
                stargazers_count=repo_data["stargazers_count"],
                primary_language=repo_data["primary_language"],
                updated_at=repo_data["updated_at"]
            ))
        
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
            ),
            top_repositories=top_repositories,
            followers=user_data["followers"]["totalCount"],
            following=user_data["following"]["totalCount"],
            created_at=user_data["createdAt"]
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
