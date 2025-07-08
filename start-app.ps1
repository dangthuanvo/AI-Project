Write-Host "Starting Silky Road Application..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Backend API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\AI Project\Backend\SilkyRoad.API'; dotnet run" -WindowStyle Normal

Write-Host "Waiting 5 seconds for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\AI Project\Frontend'; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "Applications are starting..." -ForegroundColor Green
Write-Host "Backend API: https://localhost:7001" -ForegroundColor White
Write-Host "Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "Swagger UI: https://localhost:7001/swagger" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 