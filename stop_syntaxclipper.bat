@echo off
title Stop SyntaxClipper by Syntax Nepal
echo ===================================================
echo   Stopping SyntaxClipper by Syntax Nepal
echo ===================================================

echo [1/3] Terminating port listeners (8000 and 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    echo   Killing backend process PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo   Killing frontend process PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] Stopping background video rendering processes...
taskkill /F /IM ffmpeg.exe >nul 2>&1
taskkill /F /IM ffprobe.exe >nul 2>&1
taskkill /F /IM yt-dlp.exe >nul 2>&1

echo [3/3] Checking Windows Task Scheduler...
schtasks /end /tn "SyntaxClipperAutopilot" >nul 2>&1

echo.
echo SyntaxClipper has been completely stopped.
ping 127.0.0.1 -n 3 >nul 2>&1
