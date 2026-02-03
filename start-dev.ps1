param(
  [int]$ApiPort = 8011,
  [int]$WebPort = 5173
)

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $PSScriptRoot "backend"
$frontend = Join-Path $PSScriptRoot "frontend"

$env:DATABASE_URL = "sqlite:///C:/Users/dhire/AppData/Local/Temp/budget_test.db"
$env:PYTHONDONTWRITEBYTECODE = "1"

Write-Host "Running migrations..."
Push-Location $backend
py -m alembic upgrade head
Pop-Location

Write-Host "Starting backend on http://localhost:$ApiPort"
Start-Process -WorkingDirectory $backend -FilePath "py" -ArgumentList @("-m","uvicorn","app.main:app","--port","$ApiPort")

Write-Host "Starting frontend on http://localhost:$WebPort"
$env:VITE_API_URL = "http://localhost:$ApiPort"
Start-Process -WorkingDirectory $frontend -FilePath "npm" -ArgumentList @("run","dev","--","--port","$WebPort")

Write-Host "Done. Open: http://localhost:$WebPort"
