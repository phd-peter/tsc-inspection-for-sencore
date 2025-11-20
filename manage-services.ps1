# manage-services.ps1
# 서비스 시작/중지/재시작/상태 확인 스크립트

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action
)

$services = @("IFC-Backend-A", "IFC-Backend-B", "cloudflared")

function Write-ServiceStatus {
    param([string]$ServiceName)
    
    try {
        $service = Get-Service -Name $ServiceName -ErrorAction Stop
        $status = $service.Status
        $color = if ($status -eq "Running") { "Green" } else { "Yellow" }
        Write-Host "$ServiceName : " -NoNewline
        Write-Host $status -ForegroundColor $color
    } catch {
        Write-Host "$ServiceName : " -NoNewline
        Write-Host "Not installed" -ForegroundColor Red
    }
}

switch ($Action) {
    "start" {
        Write-Host "=== 서비스 시작 ===" -ForegroundColor Cyan
        Write-Host ""
        foreach ($service in $services) {
            try {
                $svc = Get-Service -Name $service -ErrorAction Stop
                if ($svc.Status -eq "Running") {
                    Write-Host "✓ $service 이미 실행 중" -ForegroundColor Green
                } else {
                    Start-Service -Name $service -ErrorAction Stop
                    Write-Host "✓ $service 시작됨" -ForegroundColor Green
                }
            } catch {
                Write-Host "✗ $service 시작 실패: $_" -ForegroundColor Red
            }
        }
        Write-Host ""
    }
    "stop" {
        Write-Host "=== 서비스 중지 ===" -ForegroundColor Cyan
        Write-Host ""
        foreach ($service in $services) {
            try {
                $svc = Get-Service -Name $service -ErrorAction Stop
                if ($svc.Status -eq "Stopped") {
                    Write-Host "✓ $service 이미 중지됨" -ForegroundColor Green
                } else {
                    Stop-Service -Name $service -ErrorAction Stop
                    Write-Host "✓ $service 중지됨" -ForegroundColor Green
                }
            } catch {
                Write-Host "✗ $service 중지 실패: $_" -ForegroundColor Red
            }
        }
        Write-Host ""
    }
    "restart" {
        Write-Host "=== 서비스 재시작 ===" -ForegroundColor Cyan
        Write-Host ""
        foreach ($service in $services) {
            try {
                Restart-Service -Name $service -ErrorAction Stop
                Write-Host "✓ $service 재시작됨" -ForegroundColor Green
            } catch {
                Write-Host "✗ $service 재시작 실패: $_" -ForegroundColor Red
            }
        }
        Write-Host ""
    }
    "status" {
        Write-Host "=== 서비스 상태 ===" -ForegroundColor Cyan
        Write-Host ""
        foreach ($service in $services) {
            Write-ServiceStatus -ServiceName $service
        }
        Write-Host ""
    }
}

