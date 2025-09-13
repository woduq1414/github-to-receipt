# GitHub to Receipt - 키오스크 웹 애플리케이션

GitHub 기여도를 영수증 형태로 변환해주는 9:16 세로 키오스크 화면 최적화 웹 애플리케이션입니다.

## 🚀 기능

- **Splash 화면**: 터치로 시작하는 직관적인 인터페이스
- **GitHub 아이디 입력**: 가상 키보드를 통한 사용자 친화적 입력
- **키오스크 최적화**: 9:16 비율의 세로 화면에 최적화된 UI/UX
- **모던 디자인**: 토스 스타일의 깔끔하고 현대적인 디자인

## 🛠 기술 스택

- **React 19** + **TypeScript**
- **Vite** - 빠른 개발 환경
- **Tailwind CSS 3.4.17** - 유틸리티 우선 CSS 프레임워크
- **Framer Motion** - 부드러운 애니메이션
- **Pretendard 폰트** - 한국어 최적화 폰트
- **pnpm** - 효율적인 패키지 관리

## 📱 화면 구성

### 1. Splash 화면
- 브랜드 소개 및 시작 안내
- 터치하여 다음 화면으로 이동
- 부드러운 애니메이션 효과

### 2. GitHub 아이디 입력 화면
- 큰 입력 필드로 시인성 확보
- 가상 키보드 UI 제공
- 영문자, 숫자, 특수문자(-,_) 지원
- 실시간 입력 검증

### 3. 가상 키보드
- QWERTY 레이아웃
- 숫자 행 포함
- Shift 키 지원 (대소문자)
- 백스페이스, 엔터, 스페이스 등 특수키
- 터치 친화적 버튼 크기

## 🎨 디자인 특징

- **Primary Color**: 주황색 (#f97316)
- **폰트**: Pretendard Variable
- **반응형**: 최대 576px 너비로 키오스크 화면 최적화
- **터치 친화적**: 최소 56px 터치 영역 확보
- **애니메이션**: Framer Motion을 활용한 자연스러운 전환

## 🚀 실행 방법

### 1. GitHub Token 설정
1. [GitHub Personal Access Token](https://github.com/settings/tokens) 생성
2. 필요한 권한: `public_repo`, `read:user`
3. `.env` 파일 생성:
```bash
cp env.example .env
# .env 파일에 토큰 입력
GITHUB_TOKEN=your_github_token_here
```

### 2. 백엔드 서버 실행
```bash
# Python 가상환경 및 의존성 설치 (이미 완료됨)
source .venv/bin/activate
uv sync

# 서버 실행
python run_server.py
# 또는
source .venv/bin/activate && uvicorn server.main:app --reload
```

### 3. 프론트엔드 실행
```bash
# 새 터미널에서
pnpm install
pnpm run dev
```

### 접속 주소
- **프론트엔드**: http://localhost:5173
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

### 빌드
```bash
pnpm run build
```

### 미리보기
```bash
pnpm run preview
```

## 📦 프로젝트 구조

```
├── server/                   # FastAPI 백엔드
│   ├── __init__.py
│   └── main.py              # FastAPI 서버 메인
├── src/                     # React 프론트엔드
│   ├── components/
│   │   ├── SplashScreen.tsx      # 시작 화면
│   │   ├── GitHubInputScreen.tsx # GitHub 아이디 입력 화면
│   │   ├── VirtualKeyboard.tsx   # 가상 키보드 컴포넌트
│   │   └── ReceiptScreen.tsx     # 영수증 화면
│   ├── services/
│   │   └── githubApi.ts         # GitHub API 클라이언트
│   ├── types/
│   │   └── github.ts            # TypeScript 타입 정의
│   ├── App.tsx                  # 메인 앱 컴포넌트
│   ├── main.tsx                 # 앱 진입점
│   └── index.css                # 글로벌 스타일
├── run_server.py            # 서버 실행 스크립트
├── pyproject.toml           # Python 의존성 관리
└── env.example              # 환경변수 예시
```

## 🔧 API 엔드포인트

### POST `/api/github/stats`
GitHub 사용자의 통계 정보를 가져옵니다.

**Request:**
```json
{
  "username": "octocat"
}
```

**Response:**
```json
{
  "username": "octocat",
  "daily_commits": [
    {"date": "2024-01-01", "count": 5},
    {"date": "2024-01-02", "count": 3}
  ],
  "total_commits": 42,
  "avatar_url": "https://github.com/octocat.png",
  "name": "The Octocat",
  "public_repos": 8
}
```

## 🎯 키오스크 최적화 특징

- **9:16 비율** 세로 화면 대응
- **큰 터치 영역** (최소 56px)
- **명확한 시각적 피드백**
- **직관적인 네비게이션**
- **접근성 고려** (색상 대비, 폰트 크기)

## 🔧 개발 환경

- Node.js 18+
- pnpm 8+
- 현대적인 브라우저 (Chrome, Firefox, Safari, Edge)

## 📝 라이센스

MIT License