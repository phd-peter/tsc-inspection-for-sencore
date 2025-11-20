# check-tunnel.ps1
# Cloudflare Tunnel 연결 상태를 한 번에 확인하는 스크립트

$domain = "api.mindfutureai.com"
$backendBPort = 3002
$backendAPort = 3001

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Cloudflare Tunnel 연결 확인" -ForegroundColor Cyan
Write-Host "  도메인: $domain" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allChecksPassed = $true

# 1. 로컬 서버 확인
Write-Host "1. 로컬 서버 확인" -ForegroundColor Yellow
Write-Host "   --------------------" -ForegroundColor Gray

try {
    $responseB = Invoke-WebRequest -Uri "http://localhost:$backendBPort/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✓ Backend-B (포트 $backendBPort): " -NoNewline -ForegroundColor Green
    Write-Host "실행 중 - $($responseB.StatusCode)" -ForegroundColor White
} catch {
    Write-Host "   ✗ Backend-B (포트 $backendBPort): " -NoNewline -ForegroundColor Red
    Write-Host "실행되지 않음" -ForegroundColor White
    Write-Host "     → 해결: cd backend-b && npm start" -ForegroundColor DarkGray
    $allChecksPassed = $false
}

try {
    $responseA = Invoke-WebRequest -Uri "http://localhost:$backendAPort/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✓ Backend-A (포트 $backendAPort): " -NoNewline -ForegroundColor Green
    Write-Host "실행 중 - $($responseA.StatusCode)" -ForegroundColor White
} catch {
    Write-Host "   ✗ Backend-A (포트 $backendAPort): " -NoNewline -ForegroundColor Red
    Write-Host "실행되지 않음" -ForegroundColor White
    Write-Host "     → 해결: cd backend-a && npm start" -ForegroundColor DarkGray
    $allChecksPassed = $false
}

# 2. Tunnel 상태 확인
Write-Host "`n2. Tunnel 상태 확인" -ForegroundColor Yellow
Write-Host "   --------------------" -ForegroundColor Gray

# cloudflared 설치 여부 확인
$cloudflaredInstalled = $false
try {
    $null = Get-Command cloudflared -ErrorAction Stop
    $cloudflaredInstalled = $true
} catch {
    $cloudflaredInstalled = $false
}

if ($cloudflaredInstalled) {
    try {
        $tunnelList = cloudflared tunnel list 2>&1
        if ($tunnelList -match "ifc-backend" -or $tunnelList -match "api.mindfutureai.com") {
            Write-Host "   ✓ Tunnel 발견" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ Tunnel 목록에서 찾을 수 없음" -ForegroundColor Yellow
            Write-Host "     → 웹 대시보드에서 Tunnel이 설정되어 있다면 정상입니다" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "   ⚠ cloudflared 명령어 실행 실패" -ForegroundColor Yellow
        Write-Host "     → 웹 대시보드에서 Tunnel 상태를 확인하세요" -ForegroundColor DarkGray
    }
} else {
    Write-Host "   ⚠ cloudflared CLI가 설치되지 않음" -ForegroundColor Yellow
    Write-Host "     → 웹 대시보드에서 Tunnel을 설정했다면 CLI는 필요 없습니다" -ForegroundColor DarkGray
    Write-Host "     → 확인: https://dash.cloudflare.com → Zero Trust → Networks → Tunnels" -ForegroundColor DarkGray
    Write-Host "     → CLI 설치: choco install cloudflared" -ForegroundColor DarkGray
}

# 3. DNS 확인
Write-Host "`n3. DNS 확인" -ForegroundColor Yellow
Write-Host "   --------------------" -ForegroundColor Gray

try {
    $dnsResult = Resolve-DnsName -Name $domain -ErrorAction Stop
    $ipAddress = ($dnsResult | Where-Object { $_.Type -eq "A" }).IPAddress
    if ($ipAddress) {
        Write-Host "   ✓ DNS 해석 성공: $domain → $ipAddress" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ DNS 해석 결과 없음" -ForegroundColor Yellow
        $allChecksPassed = $false
    }
} catch {
    Write-Host "   ✗ DNS 해석 실패: $domain" -ForegroundColor Red
    Write-Host "     → 해결: Cloudflare 대시보드에서 DNS 설정 확인" -ForegroundColor DarkGray
    $allChecksPassed = $false
}

# 4. 외부 접속 테스트
Write-Host "`n4. 외부 접속 테스트" -ForegroundColor Yellow
Write-Host "   --------------------" -ForegroundColor Gray

# 헬스 체크
try {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "https://$domain/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ 헬스 체크 성공: " -NoNewline -ForegroundColor Green
        Write-Host "$($response.StatusCode) - $([math]::Round($duration))ms" -ForegroundColor White
        Write-Host "     응답: $($response.Content)" -ForegroundColor DarkGray
    } else {
        Write-Host "   ⚠ 헬스 체크 응답: $($response.StatusCode)" -ForegroundColor Yellow
        $allChecksPassed = $false
    }
} catch {
    Write-Host "   ✗ 헬스 체크 실패: " -NoNewline -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor White
    Write-Host "     → 해결: Tunnel이 실행 중인지 확인 (cloudflared tunnel run ifc-backend)" -ForegroundColor DarkGray
    $allChecksPassed = $false
}

# Backend-A 헬스 체크
try {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "https://$domain/api/health-backend-a" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ Backend-A 헬스 체크 성공: " -NoNewline -ForegroundColor Green
        Write-Host "$($response.StatusCode) - $([math]::Round($duration))ms" -ForegroundColor White
    } else {
        Write-Host "   ⚠ Backend-A 헬스 체크 응답: $($response.StatusCode)" -ForegroundColor Yellow
        $allChecksPassed = $false
    }
} catch {
    Write-Host "   ✗ Backend-A 헬스 체크 실패: " -NoNewline -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor White
    Write-Host "     → 해결: Backend-A가 실행 중인지 확인" -ForegroundColor DarkGray
    $allChecksPassed = $false
}

# Assembly 목록 테스트
try {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "https://$domain/api/assemblies" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        $content = $response.Content | ConvertFrom-Json
        $assemblyCount = if ($content -is [Array]) { $content.Count } else { 0 }
        Write-Host "   ✓ Assembly 목록 조회 성공: " -NoNewline -ForegroundColor Green
        Write-Host "$assemblyCount 개 - $([math]::Round($duration))ms" -ForegroundColor White
    } else {
        Write-Host "   ⚠ Assembly 목록 응답: $($response.StatusCode)" -ForegroundColor Yellow
        $allChecksPassed = $false
    }
} catch {
    Write-Host "   ✗ Assembly 목록 조회 실패: " -NoNewline -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor White
    Write-Host "     → 해결: Backend-A가 정상적으로 IFC 파일을 로드했는지 확인" -ForegroundColor DarkGray
    $allChecksPassed = $false
}

# 최종 결과
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allChecksPassed) {
    Write-Host "  ✓ 모든 체크 통과!" -ForegroundColor Green
    Write-Host "  Tunnel이 정상적으로 작동하고 있습니다." -ForegroundColor Green
} else {
    Write-Host "  ⚠ 일부 체크 실패" -ForegroundColor Yellow
    Write-Host "  위의 해결 방법을 참고하여 문제를 해결하세요." -ForegroundColor Yellow
    Write-Host "  자세한 내용은 TUNNEL_CHECK.md를 참조하세요." -ForegroundColor DarkGray
}
Write-Host "========================================`n" -ForegroundColor Cyan

# 브라우저에서 직접 확인하도록 안내
Write-Host "브라우저에서 직접 확인:" -ForegroundColor Cyan
Write-Host "  - 헬스 체크: https://$domain/health" -ForegroundColor White
Write-Host "  - Assembly 목록: https://$domain/api/assemblies" -ForegroundColor White
Write-Host ""

