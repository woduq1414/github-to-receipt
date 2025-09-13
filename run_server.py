#!/usr/bin/env python3
"""
GitHub to Receipt 서버 실행 스크립트
"""

import os
import sys
from pathlib import Path

def main():
    # 프로젝트 루트로 이동
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    # .env 파일 확인
    env_file = project_root / ".env"
    if not env_file.exists():
        print("⚠️  .env 파일이 없습니다!")
        print("env.example을 참고하여 .env 파일을 생성하고 GITHUB_TOKEN을 설정해주세요.")
        print("\n1. GitHub에서 Personal Access Token을 생성하세요:")
        print("   https://github.com/settings/tokens")
        print("2. 필요한 권한: public_repo, read:user")
        print("3. .env 파일에 다음과 같이 추가하세요:")
        print("   GITHUB_TOKEN=your_token_here")
        return 1
    
    # 가상환경 확인
    if not (project_root / ".venv").exists():
        print("❌ 가상환경이 없습니다!")
        print("다음 명령어로 가상환경을 생성하세요:")
        print("uv venv .venv")
        return 1
    
    # 서버 실행
    print("🚀 GitHub to Receipt 서버를 시작합니다...")
    print("📍 서버 주소: http://localhost:8000")
    print("📖 API 문서: http://localhost:8000/docs")
    print("⏹️  종료하려면 Ctrl+C를 누르세요")
    print()
    
    os.system("source .venv/bin/activate && python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload")

if __name__ == "__main__":
    sys.exit(main())
