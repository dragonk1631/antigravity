@echo off
setlocal
title Nexus Wiki Launcher

echo ==========================================
echo       Nexus Wiki 실행 중...
echo ==========================================

:: 스크립트가 있는 폴더로 이동
cd /d "%~dp0"

:: node_modules가 없으면 설치
if not exist "node_modules" (
    echo [알림] 첫 실행입니다. 필요한 파일을 설치하고 있습니다...
    echo (이 과정은 몇 분 정도 걸릴 수 있습니다)
    call npm install
    if %errorlevel% neq 0 (
        echo [오류] 설치 중 문제가 발생했습니다. Node.js가 설치되어 있는지 확인해주세요.
        pause
        exit /b
    )
)

:: 브라우저 자동 실행 (Vite 서버가 켜질 때까지 잠시 대기 후 실행할 수도 있으나, --open 옵션 사용 권장)
:: 여기서는 npm run dev에 -- --open을 전달하여 Vite가 브라우저를 열게 합니다.
echo.
echo [알림] 서버를 시작합니다. 잠시 후 브라우저가 열립니다.
echo (종료하려면 이 창을 닫거나 Ctrl+C를 누르세요)
echo.

call npm run dev -- --open

endlocal
