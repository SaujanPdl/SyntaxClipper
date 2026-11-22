@echo off
title Stop SyntaxClipper
echo Stopping SyntaxClipper backend and frontend processes...

for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    echo Terminating backend process PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo Terminating frontend process PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo SyntaxClipper stopped successfully.
timeout /t 2 /nobreak >nul
