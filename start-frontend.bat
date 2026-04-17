@echo off
echo ========================================
echo Starting Frontend Server
echo ========================================
echo.
cd meeting-app-frontend
echo Installing dependencies (if needed)...
call npm install
echo.
echo Starting development server...
echo Frontend will be available at: http://localhost:5173
echo.
call npm run dev
