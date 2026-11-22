@echo off
title SyntaxClipper by Syntax Nepal - Local Launcher
color 0A

echo =======================================================================
echo          SyntaxClipper by Syntax Nepal - Local Desktop App
echo =======================================================================
echo.

cd /d "%~dp0"

echo [1/4] Verifying Python and Node runtime...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH! Please install Python 3.10+.
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js 18+.
    pause
    exit /b 1
)

echo [2/4] Launching FastAPI Backend on http://127.0.0.1:8000...
start "SyntaxClipper Backend" /min cmd /c "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo [3/4] Launching Next.js Frontend on http://localhost:3000...
cd frontend
start "SyntaxClipper Frontend" /min cmd /c "npm run start"
cd ..

echo [4/4] Opening SyntaxClipper in your browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo =======================================================================
echo  SyntaxClipper is running locally!
echo  Backend:  http://127.0.0.1:8000/api/health
echo  Frontend: http://localhost:3000
echo.
echo  Keep this window open or minimize it. To stop, run stop_syntaxclipper.bat
echo =======================================================================
pause
