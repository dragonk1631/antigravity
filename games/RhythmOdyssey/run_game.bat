@echo off
TITLE RhythmOdyssey Developer Server
echo ---------------------------------------------------
echo 🎵 RhythmOdyssey - 개발 서버를 실행하는 중...
echo ---------------------------------------------------
echo.
echo 브라우저에서 아래 주소로 접속해 주세요:
echo http://localhost:5173
echo.
echo [서버를 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요]
echo.

npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ 서버 시작에 실패했습니다. Node.js와 종속성이 설치되어 있는지 확인하세요.
    echo (npm install 명령어를 먼저 실행해야 할 수도 있습니다.)
    pause
)
