@echo off
REM OddsLens one-click start — double-click this file.
REM Starts website + auto bot loop (real ESPN fixtures + sample odds, refreshes every 5 min).
REM Add ODDS_API_KEY to .env for real odds too.
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node/npm not found. Install Node 20+ from https://nodejs.org & pause & exit /b 1)
call npm run dev:all
pause
