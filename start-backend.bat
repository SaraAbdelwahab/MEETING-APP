@echo off
echo ========================================
echo Starting Backend Server
echo ========================================
echo.
cd backend
echo Installing dependencies (if needed)...
call npm install
echo.
echo Starting server...
echo Backend will be available at: http://localhost:5000
echo.
call npm start
