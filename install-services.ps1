# install-services.ps1
# 관리자 권한으로 실행 필요
# Backend-A와 Backend-B를 Windows 서비스로 등록합니다.

param(
    [string]$BackendAPath = "C:\Users\Alpha\Projects\tsc-ifc-test2\backend-a",
    [string]$BackendBPath = "C:\Users\Alpha\Projects\tsc-ifc-test2\backend-b"
)

# 관리자 권한 확인
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "✗ 이 스크립트는 관리자 권한으로 실행해야 합니다." -ForegroundColor Red
    Write-Host "  PowerShell을 관리자 권한으로 실행한 후 다시 시도하세요." -ForegroundColor Yellow
    exit 1
}

# Node.js 경로 확인
try {
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    Write-Host "✓ Node.js found: $nodePath" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js를 찾을 수 없습니다. PATH에 Node.js가 포함되어 있는지 확인하세요." -ForegroundColor Red
    exit 1
}

# 경로 확인
if (-not (Test-Path $BackendAPath)) {
    Write-Host "✗ Backend-A 경로를 찾을 수 없습니다: $BackendAPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $BackendBPath)) {
    Write-Host "✗ Backend-B 경로를 찾을 수 없습니다: $BackendBPath" -ForegroundColor Red
    exit 1
}

# 서버 파일 확인
$serverA = Join-Path $BackendAPath "dist\server.js"
$serverB = Join-Path $BackendBPath "dist\server.js"

if (-not (Test-Path $serverA)) {
    Write-Host "✗ Backend-A 서버 파일을 찾을 수 없습니다: $serverA" -ForegroundColor Red
    Write-Host "  먼저 'npm run build'를 실행하여 빌드하세요." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $serverB)) {
    Write-Host "✗ Backend-B 서버 파일을 찾을 수 없습니다: $serverB" -ForegroundColor Red
    Write-Host "  먼저 'npm run build'를 실행하여 빌드하세요." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Windows 서비스 설치 시작 ===" -ForegroundColor Cyan
Write-Host ""

# 기존 서비스 제거 (있는 경우)
$services = @("IFC-Backend-A", "IFC-Backend-B")
foreach ($serviceName in $services) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "기존 서비스 발견: $serviceName" -ForegroundColor Yellow
        if ($service.Status -eq "Running") {
            Stop-Service -Name $serviceName -Force
            Write-Host "  서비스 중지됨" -ForegroundColor Yellow
        }
        sc.exe delete $serviceName | Out-Null
        Write-Host "  기존 서비스 제거됨" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

# Backend-A 서비스 등록
Write-Host "Backend-A 서비스 등록 중..." -ForegroundColor Cyan
try {
    $serviceA = New-Service -Name "IFC-Backend-A" `
        -BinaryPathName "`"$nodePath`" `"$serverA`"" `
        -DisplayName "IFC Backend-A Service" `
        -Description "IFC Processing Service - Processes IFC files and serves filtered geometry data" `
        -StartupType Automatic `
        -WorkingDirectory $BackendAPath `
        -ErrorAction Stop
    
    Write-Host "✓ IFC-Backend-A 서비스 설치 완료" -ForegroundColor Green
} catch {
    Write-Host "✗ IFC-Backend-A 서비스 설치 실패: $_" -ForegroundColor Red
    exit 1
}

# Backend-B 서비스 등록
Write-Host "Backend-B 서비스 등록 중..." -ForegroundColor Cyan
try {
    $serviceB = New-Service -Name "IFC-Backend-B" `
        -BinaryPathName "`"$nodePath`" `"$serverB`"" `
        -DisplayName "IFC Backend-B Service" `
        -Description "IFC API Gateway Service - Proxies requests to Backend-A" `
        -StartupType Automatic `
        -WorkingDirectory $BackendBPath `
        -ErrorAction Stop
    
    Write-Host "✓ IFC-Backend-B 서비스 설치 완료" -ForegroundColor Green
} catch {
    Write-Host "✗ IFC-Backend-B 서비스 설치 실패: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== 서비스 설치 완료 ===" -ForegroundColor Green
Write-Host ""
Write-Host "다음 명령어로 서비스를 관리할 수 있습니다:" -ForegroundColor Cyan
Write-Host "  Start-Service IFC-Backend-A, IFC-Backend-B  # 시작" -ForegroundColor White
Write-Host "  Stop-Service IFC-Backend-A, IFC-Backend-B   # 중지" -ForegroundColor White
Write-Host "  Get-Service IFC-Backend-A, IFC-Backend-B    # 상태 확인" -ForegroundColor White
Write-Host ""
Write-Host "또는 manage-services.ps1 스크립트를 사용하세요:" -ForegroundColor Cyan
Write-Host "  .\manage-services.ps1 start   # 시작" -ForegroundColor White
Write-Host "  .\manage-services.ps1 status  # 상태 확인" -ForegroundColor White
Write-Host ""

