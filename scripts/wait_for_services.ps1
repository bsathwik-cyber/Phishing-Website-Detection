$ErrorActionPreference = "Stop"

$backendUrl = "http://127.0.0.1:5001/api/health"
$frontendUrl = "http://127.0.0.1:3000"
$timeoutMinutes = 20
$deadline = (Get-Date).AddMinutes($timeoutMinutes)
$backendReady = $false
$frontendReady = $false
$modelLoaded = $false
$lastFrontendError = "Frontend has not responded yet."

Write-Host "Waiting for PhishGuard services to become ready..."
Write-Host "Backend health check: $backendUrl"
Write-Host "Frontend: $frontendUrl"
Write-Host ""

while ((Get-Date) -lt $deadline) {
    try {
        $health = Invoke-RestMethod -Uri $backendUrl -Method Get -TimeoutSec 3
        if ($health.status -eq "ok") {
            $backendReady = $true
            $modelLoaded = [bool]$health.model_loaded
        }
    }
    catch {
        $backendReady = $false
    }

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $frontendUrl -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            $frontendReady = $true
            $lastFrontendError = ""
        }
        else {
            $frontendReady = $false
            $lastFrontendError = "Frontend returned HTTP $($response.StatusCode)."
        }
    }
    catch {
        $frontendReady = $false
        $lastFrontendError = $_.Exception.Message
    }

    if ($backendReady -and $frontendReady) {
        Write-Host "Backend API is responding."
        Write-Host "Frontend is responding."
        if (-not $modelLoaded) {
            Write-Warning "The backend is running, but the Random Forest model is not loaded. Check the Backend window for the training error."
        }
        Write-Host ""
        Write-Host "Opening PhishGuard in your browser..."
        Start-Process $frontendUrl
        exit 0
    }

    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "ERROR: PhishGuard did not become ready within $timeoutMinutes minutes."
Write-Host "Check the Backend and Frontend terminal windows for the first reported error."
Write-Host "Last frontend check: $lastFrontendError"
Write-Host "Common causes are a frontend window that exited after npm install, a Next.js compile error, missing Node.js, a blocked package download, or port 3000 already being in use."
exit 1
