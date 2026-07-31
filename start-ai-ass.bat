@echo off
REM Start AI ASS with Hugging Face (no install needed - free serverless inference)
REM Created by BHARATH K, B.Sc AIML student

echo.
echo ============================================
echo  AI ASS - Hugging Face Quick Start
echo  by BHARATH K (B.Sc AIML)
echo ============================================
echo.

REM Check backend/.env has a Hugging Face token
if not exist "%~dp0backend\.env" (
    echo [!] backend\.env not found. Copy .env.example and set HUGGINGFACE_API_KEY.
    pause
    exit /b 1
)

REM Check if backend is already running
curl -s -o nul -w "%%{http_code}" http://127.0.0.1:8000/api/health > "%~dp0backend_health.tmp" 2>nul
set /p HEALTH=< "%~dp0backend_health.tmp"
del "%~dp0backend_health.tmp" >nul 2>nul

if "%HEALTH%"=="200" (
    echo [✓] Backend already running on http://127.0.0.1:8000
) else (
    echo Starting AI ASS backend...
    start "AI ASS Backend" cmd /c "cd /d %~dp0backend && python main.py"
    timeout /t 5 /nobreak
)

echo.
echo [✓] Opening AI ASS in your browser...
start http://127.0.0.1:8000

echo.
echo ============================================
echo  AI ASS is live. Model: Qwen (Hugging Face)
echo  Live web search is automatic - always current.
echo ============================================
echo.
pause
