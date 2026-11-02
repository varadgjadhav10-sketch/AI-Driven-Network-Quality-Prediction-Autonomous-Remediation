param(
    [switch]$WithMockTraffic,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Write-Host "[dev-up] Repo root: $RepoRoot"

Push-Location $RepoRoot

try {
    Write-Host "[dev-up] Starting infra containers..."
    docker compose up -d kafka kafka-setup redis postgres clickhouse

    $venvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"

    if (-not $SkipInstall) {
        if (-not (Test-Path (Join-Path $RepoRoot ".venv"))) {
            Write-Host "[dev-up] Creating Python virtual environment..."
            python -m venv .venv
        }

        Write-Host "[dev-up] Installing backend dependencies..."
        & $venvPython -m pip install --upgrade pip
        & $venvPython -m pip install -r backend/requirements.txt
        & $venvPython -m pip install torch==2.2.0

        Write-Host "[dev-up] Installing frontend dependencies..."
        npm --prefix frontend install
    }

    if (-not (Test-Path "ml_pipeline/weights/br_lstm.pth") -or -not (Test-Path "ml_pipeline/weights/detector.pth")) {
        Write-Host "[dev-up] Model weights missing. Training models once..."
        & $venvPython ml_pipeline/scripts/train_all.py
    }

    Write-Host "[dev-up] Launching backend in new terminal..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RepoRoot'; .\.venv\Scripts\Activate.ps1; uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

    Write-Host "[dev-up] Launching frontend in new terminal..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RepoRoot\frontend'; npm run dev"

    if ($WithMockTraffic) {
        Write-Host "[dev-up] Launching mock Kafka traffic producer in new terminal..."
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RepoRoot'; .\.venv\Scripts\Activate.ps1; python mock_traffic_producer.py"
    }

    Write-Host "[dev-up] Done."
    Write-Host "[dev-up] UI: http://localhost:5173"
    Write-Host "[dev-up] API: http://localhost:8000/health"
}
finally {
    Pop-Location
}
