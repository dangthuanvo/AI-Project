@echo off
echo Starting Silky Road Application...
echo.

echo Starting Backend API...
start "Backend API" cmd /k "cd /d D:\AI Project\Backend\SilkyRoad.API && dotnet run"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd /d D:\AI Project\Frontend && npm start"

echo.
echo Applications are starting...
echo Backend API: https://localhost:7001
echo Frontend: http://localhost:4200
echo Swagger UI: https://localhost:7001/swagger
echo.
echo Press any key to close this window...
pause > nul 