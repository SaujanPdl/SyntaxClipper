@echo off
title SyntaxClipper by Syntax Nepal - Local Launcher
color 0A

cd /d "%~dp0"

echo =======================================================================
echo          SyntaxClipper by Syntax Nepal - Local Desktop App
echo =======================================================================
echo.

echo [1/4] Verifying runtime dependencies...
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

:: Ensure logs directory exists
if not exist "%~dp0logs" mkdir "%~dp0logs"

:: Stop existing listeners on 8000 and 3000 to prevent port collisions
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/4] Launching FastAPI Backend (Silent Background)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c', 'python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 > logs\backend.log 2>&1' -WorkingDirectory '%~dp0' -WindowStyle Hidden"

:: Wait up to 10s for backend API to be ready before starting frontend proxy
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready = $false; for ($i = 0; $i -lt 20; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Milliseconds 500 } }; if (-not $ready) { Start-Sleep -Seconds 1 }"

echo [3/4] Launching Next.js Frontend (Silent Background)...
if exist "%~dp0frontend\.next" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c', 'npm run start > ..\logs\frontend.log 2>&1' -WorkingDirectory '%~dp0frontend' -WindowStyle Hidden"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c', 'npm run dev > ..\logs\frontend.log 2>&1' -WorkingDirectory '%~dp0frontend' -WindowStyle Hidden"
)

echo [4/4] Waiting for services to initialize...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready = $false; for ($i = 0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Milliseconds 500 } }; if (-not $ready) { Start-Sleep -Seconds 1 }"

start "" "http://localhost:3000"

:: Exit immediately so zero terminal windows remain open
exit
