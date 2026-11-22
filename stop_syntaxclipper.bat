@echo off
title Stop SyntaxClipper by Syntax Nepal
color 0C

cd /d "%~dp0"

echo =======================================================================
echo          Stopping SyntaxClipper by Syntax Nepal
echo =======================================================================
echo.

echo [1/4] Terminating backend listeners on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    echo   Stopping Backend Process PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/4] Terminating frontend listeners on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo   Stopping Frontend Process PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: PowerShell fallback targeting port listeners directly regardless of locale
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 8000, 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [3/4] Terminating background rendering and daemon processes...
taskkill /F /IM ffmpeg.exe >nul 2>&1
taskkill /F /IM ffprobe.exe >nul 2>&1
taskkill /F /IM yt-dlp.exe >nul 2>&1
schtasks /end /tn "SyntaxClipperAutopilot" >nul 2>&1

:: Clean up lock file if present
if exist "%~dp0autopilot.lock" del /f /q "%~dp0autopilot.lock" >nul 2>&1

echo [4/4] Verifying clean shutdown...
ping 127.0.0.1 -n 2 >nul 2>&1

echo.
echo =======================================================================
echo  SyntaxClipper has been completely stopped.
echo =======================================================================
timeout /t 2 >nul 2>&1
exit
