@echo off
REM ============================================================
REM  EventEase - start everything with one double-click.
REM  Opens 3 windows: Database, Backend API, Frontend.
REM  KEEP ALL THREE WINDOWS OPEN while you use the app.
REM  Closing a window stops that part. Your data is saved and
REM  survives restarts - you do NOT need to re-seed each time.
REM ============================================================

cd /d "%~dp0"

echo Starting the database...
start "EventEase - Database" cmd /k "cd /d %~dp0server && npx prisma dev --name eventease-v2"

echo Waiting for the database to come up...
timeout /t 9 /nobreak >nul

echo Starting the backend API...
start "EventEase - Backend API" cmd /k "cd /d %~dp0server && npm run dev"

echo Starting the frontend...
start "EventEase - Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ============================================================
echo  Three windows are opening. Give it ~15 seconds, then open:
echo      http://localhost:5173
echo  Log in with your UID email, e.g. 24bit044@eventease.local
echo.
echo  To STOP everything: close the three windows.
echo ============================================================
echo.
pause
