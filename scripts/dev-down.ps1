$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    $pidFile = ".run/dev-pids.env"
    if (Test-Path $pidFile) {
        $content = Get-Content $pidFile
        foreach ($line in $content) {
            if ($line -match "^[A-Z_]+=(\d+)$") {
                $pid = [int]$matches[1]
                try {
                    Stop-Process -Id $pid -ErrorAction Stop
                }
                catch {
                }
            }
        }
        Remove-Item $pidFile -Force
    }

    docker compose down
    Write-Host "[dev-down] Local services and infra stopped."
}
finally {
    Pop-Location
}
