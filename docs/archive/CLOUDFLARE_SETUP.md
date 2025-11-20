# Cloudflare Access + Tunnel 설정 가이드

회사 내부 서버를 활용하여 Cloudflare Tunnel과 Access를 통해 IFC Viewer 애플리케이션을 외부에 안전하게 노출하는 방법입니다.

## 📋 목차

1. [개요](#개요)
2. [사전 준비사항](#사전-준비사항)
3. [아키텍처 구조](#아키텍처-구조)
4. [Cloudflare Tunnel 설정](#cloudflare-tunnel-설정)
5. [Cloudflare Access 설정](#cloudflare-access-설정)
6. [Windows 서비스 자동화](#windows-서비스-자동화)
7. [테스트 및 검증](#테스트-및-검증)
8. [트러블슈팅](#트러블슈팅)
9. [비용 비교](#비용-비교)

---

## 개요

이 가이드는 다음을 목표로 합니다:

- ✅ **비용 절감**: Render 대신 회사 내부 서버 활용 ($0/월)
- ✅ **보안**: 회사 Google Workspace 계정으로만 접근 허용
- ✅ **간편함**: 백엔드 코드 수정 불필요
- ✅ **자동화**: Windows 서비스로 자동 실행

### 최종 구조

```
사용자 브라우저
    ↓
https://api.mycompany.com
    ↓
Cloudflare Access (Google OAuth 로그인)
    ↓ (승인된 이메일만 통과)
Cloudflare Tunnel
    ↓
Backend-B (회사 내부 서버:3002)
    ↓
Backend-A (회사 내부 서버:3001)
```

---

## 사전 준비사항

### 필수 요구사항

- ✅ Cloudflare 계정 (무료)
- ✅ Cloudflare Zero Trust 액세스 권한
- ✅ Google Workspace (회사 Gmail 도메인)
- ✅ Windows 서버 (Backend-A/B 실행 가능)
- ✅ Backend-A/B가 로컬에서 정상 실행 중

### 현재 서버 포트

- **Backend-A**: `3001` (IFC Processing Service)
- **Backend-B**: `3002` (API Gateway)

---

## Cloudflare Tunnel 설정

### Step 1: Cloudflared 설치

Windows에서 Cloudflare Tunnel 클라이언트 설치:

1. [Cloudflare Tunnel 다운로드 페이지](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) 접속
2. Windows용 `cloudflared-windows-amd64.exe` 다운로드
3. `C:\Program Files\Cloudflare\` 디렉토리에 복사
4. 환경변수 PATH에 추가 (선택사항)

또는 Chocolatey 사용:
```powershell
choco install cloudflared
```

### Step 2: Cloudflare 로그인

PowerShell에서 실행:

```powershell
cloudflared tunnel login
```

브라우저가 열리면 Cloudflare 계정으로 로그인하고 권한 승인합니다.

### Step 3: Tunnel 생성

```powershell
cloudflared tunnel create ifc-backend
```

출력에서 Tunnel ID (UUID)를 복사해두세요.

### Step 4: DNS 라우팅 설정

```powershell
# api.mycompany.com을 실제 회사 도메인으로 변경
cloudflared tunnel route dns ifc-backend api.mycompany.com
```

**참고**: `mycompany.com`을 실제 회사 도메인으로 변경하세요 (예: `api.sencoretech.com`).

### Step 5: Config 파일 생성

`C:\Users\<사용자명>\.cloudflared\config.yml` 파일 생성:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<사용자명>\.cloudflared\<TUNNEL_ID>.json

ingress:
  # Backend-B (API Gateway)로 모든 요청 전달
  - hostname: api.mycompany.com
    service: http://localhost:3002
  
  # Catch-all: 정의되지 않은 모든 요청 거부
  - service: http_status:404
```

**PowerShell로 자동 생성**:

```powershell
# 디렉토리 생성
$cloudflareDir = "$env:USERPROFILE\.cloudflared"
New-Item -ItemType Directory -Force -Path $cloudflareDir

# Tunnel ID 확인 (이전 단계에서 복사한 UUID 사용)
$tunnelId = "<여기에_TUNNEL_ID_붙여넣기>"

# config.yml 생성
@"
tunnel: $tunnelId
credentials-file: $cloudflareDir\$tunnelId.json

ingress:
  - hostname: api.mycompany.com
    service: http://localhost:3002
  - service: http_status:404
"@ | Out-File -FilePath "$cloudflareDir\config.yml" -Encoding utf8

Write-Host "Config file created at: $cloudflareDir\config.yml"
```

### Step 6: Tunnel 테스트 실행

```powershell
cloudflared tunnel run ifc-backend
```

**정상 작동 확인**:
- "Connection established" 메시지 확인
- 에러 없이 실행되는지 확인

**중지**: `Ctrl+C`

---

## Cloudflare Access 설정

### Step 1: Zero Trust 대시보드 접속

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 접속
2. 왼쪽 메뉴에서 **Zero Trust** 클릭
3. **Access → Applications** 클릭

### Step 2: Application 생성

1. **Add an application** 버튼 클릭
2. **Self-hosted** 선택
3. 다음 정보 입력:
   - **Application name**: `IFC-Backend-API`
   - **Session duration**: `24 hours` (또는 원하는 값)
   - **Application domain**: `api.mycompany.com` (실제 도메인으로 변경)

4. **Next** 클릭

### Step 3: Identity Provider 설정 (Google Workspace)

1. **Identity Providers** 섹션에서 **Add new** 클릭
2. **Google** 선택
3. Google Workspace 설정:
   - Cloudflare가 자동으로 Client ID/Secret 생성
   - **Email domain**: `@company.com` (회사 도메인, 예: `@sencoretech.com`)
4. **Save** 클릭

**참고**: Google Workspace가 아닌 경우, Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 생성해야 합니다.

### Step 4: Policy 생성 (회사 이메일만 허용)

1. **Policies** 섹션에서 **Add a policy** 클릭
2. Policy 설정:
   - **Policy name**: `Company Email Only`
   - **Action**: `Allow`
   - **Include** 규칙 추가:
     - **Selector**: `Email Domain`
     - **Value**: `@company.com` (회사 도메인)
3. **Save** 클릭

**Policy JSON 템플릿**:

```json
{
  "name": "Company Email Only",
  "decision": {
    "allow": []
  },
  "include": [
    {
      "email_domain": {
        "domain": "company.com"
      }
    }
  ],
  "exclude": [],
  "require": []
}
```

### Step 5: Application에 Policy 연결

1. Application 설정으로 돌아가기
2. **Policies** 탭에서 방금 만든 Policy 선택
3. **Save application** 클릭

### Step 6: 추가 보안 설정 (선택사항)

**특정 이메일만 허용**:
- Policy의 **Require** 섹션에서 `Email` 선택
- 허용할 이메일 주소 입력

**특정 이메일 제외**:
- Policy의 **Exclude** 섹션에서 `Email` 선택
- 제외할 이메일 주소 입력

---

## Windows 서비스 자동화

VS Code를 꺼도 서버가 계속 실행되도록 Windows 서비스로 등록합니다.

### Step 1: Backend-A/B 빌드

```powershell
# Backend-A 빌드
cd backend-a
npm install
npm run build

# Backend-B 빌드
cd ..\backend-b
npm install
npm run build
```

### Step 2: 환경변수 설정

**Backend-A용 환경변수**:

```powershell
# 관리자 권한 PowerShell에서 실행
[System.Environment]::SetEnvironmentVariable("PORT", "3001", "Machine")
[System.Environment]::SetEnvironmentVariable("IFC_FILE_PATH", "C:\Users\Alpha\Projects\tsc-ifc-test2\backend-a\models\model.ifc", "Machine")
[System.Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Machine")
```

**Backend-B용 환경변수**:

```powershell
[System.Environment]::SetEnvironmentVariable("PORT", "3002", "Machine")
[System.Environment]::SetEnvironmentVariable("BACKEND_A_URL", "http://localhost:3001", "Machine")
[System.Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Machine")
```

**경로 확인**: `IFC_FILE_PATH`는 실제 IFC 파일 경로로 변경하세요.

### Step 3: 서비스 설치 스크립트 생성

`install-services.ps1` 파일 생성:

```powershell
# install-services.ps1
# 관리자 권한으로 실행 필요

$backendAPath = "C:\Users\Alpha\Projects\tsc-ifc-test2\backend-a"
$backendBPath = "C:\Users\Alpha\Projects\tsc-ifc-test2\backend-b"

# Node.js 경로 확인
$nodePath = (Get-Command node).Source
if (-not $nodePath) {
    Write-Host "Node.js not found in PATH. Please install Node.js first."
    exit 1
}

# Backend-A 서비스 등록
try {
    $serviceA = New-Service -Name "IFC-Backend-A" `
        -BinaryPathName "`"$nodePath`" `"$backendAPath\dist\server.js`"" `
        -DisplayName "IFC Backend-A Service" `
        -Description "IFC Processing Service" `
        -StartupType Automatic `
        -WorkingDirectory $backendAPath `
        -ErrorAction Stop
    
    Write-Host "✓ IFC-Backend-A service installed successfully"
} catch {
    Write-Host "✗ Failed to install IFC-Backend-A service: $_"
}

# Backend-B 서비스 등록
try {
    $serviceB = New-Service -Name "IFC-Backend-B" `
        -BinaryPathName "`"$nodePath`" `"$backendBPath\dist\server.js`"" `
        -DisplayName "IFC Backend-B Service" `
        -Description "IFC API Gateway Service" `
        -StartupType Automatic `
        -WorkingDirectory $backendBPath `
        -ErrorAction Stop
    
    Write-Host "✓ IFC-Backend-B service installed successfully"
} catch {
    Write-Host "✗ Failed to install IFC-Backend-B service: $_"
}

Write-Host "`nServices installed. Start them with:"
Write-Host "  Start-Service IFC-Backend-A, IFC-Backend-B"
```

**실행 방법**:

```powershell
# 관리자 권한 PowerShell에서 실행
.\install-services.ps1
```

### Step 4: Cloudflare Tunnel 서비스 설치

```powershell
# 관리자 권한 PowerShell에서 실행
cloudflared service install

# 서비스 시작
Start-Service cloudflared

# 서비스 상태 확인
Get-Service cloudflared
```

**서비스 제거** (필요시):

```powershell
cloudflared service uninstall
```

### Step 5: 서비스 관리 스크립트 생성

`manage-services.ps1` 파일 생성:

```powershell
# manage-services.ps1
# 서비스 시작/중지/재시작 스크립트

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action
)

$services = @("IFC-Backend-A", "IFC-Backend-B", "cloudflared")

switch ($Action) {
    "start" {
        foreach ($service in $services) {
            try {
                Start-Service $service -ErrorAction Stop
                Write-Host "✓ $service started"
            } catch {
                Write-Host "✗ Failed to start $service : $_"
            }
        }
    }
    "stop" {
        foreach ($service in $services) {
            try {
                Stop-Service $service -ErrorAction Stop
                Write-Host "✓ $service stopped"
            } catch {
                Write-Host "✗ Failed to stop $service : $_"
            }
        }
    }
    "restart" {
        foreach ($service in $services) {
            try {
                Restart-Service $service -ErrorAction Stop
                Write-Host "✓ $service restarted"
            } catch {
                Write-Host "✗ Failed to restart $service : $_"
            }
        }
    }
    "status" {
        foreach ($service in $services) {
            try {
                $status = Get-Service $service -ErrorAction Stop
                $color = if ($status.Status -eq "Running") { "Green" } else { "Red" }
                Write-Host "$service : " -NoNewline
                Write-Host $status.Status -ForegroundColor $color
            } catch {
                Write-Host "✗ $service : Not installed" -ForegroundColor Red
            }
        }
    }
}
```

**사용법**:

```powershell
# 서비스 시작
.\manage-services.ps1 start

# 서비스 중지
.\manage-services.ps1 stop

# 서비스 재시작
.\manage-services.ps1 restart

# 상태 확인
.\manage-services.ps1 status
```

---

## 테스트 및 검증

### Step 1: Tunnel 연결 확인

```powershell
cloudflared tunnel run ifc-backend
```

**정상 작동 확인**:
- "Connection established" 메시지 확인
- 에러 없이 실행되는지 확인

### Step 2: 로컬 서버 확인

```powershell
# Backend-B 헬스 체크
curl http://localhost:3002/health

# Backend-A 헬스 체크 (Backend-B를 통해)
curl http://localhost:3002/api/health-backend-a
```

### Step 3: Access 인증 테스트

1. 브라우저에서 `https://api.mycompany.com/health` 접속
2. **예상 동작**:
   - Cloudflare Access 로그인 화면 표시
   - "Sign in with Google" 버튼 표시
3. 회사 Google 계정으로 로그인
4. **예상 결과**:
   - 로그인 성공 후 `/health` 엔드포인트 응답 확인
   - JSON 응답: `{"status":"ok","service":"backend-b-api-gateway"}`

### Step 4: API 엔드포인트 테스트

**Assembly 목록 조회**:

```powershell
# 브라우저에서 직접 접속
https://api.mycompany.com/api/assemblies
```

**예상 결과**: Assembly 목록 JSON 응답

**Assembly 지오메트리 조회**:

```powershell
# 브라우저 개발자 도구 콘솔에서 실행
fetch('https://api.mycompany.com/api/assembly-geometry', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tag: 'ASSEMBLY_TAG' })
})
.then(r => r.json())
.then(console.log)
```

### Step 5: 비회사 계정 접근 차단 확인

1. 회사 계정이 아닌 Google 계정으로 로그인 시도
2. **예상 결과**: 403 Forbidden 또는 Access Denied 메시지

---

## 트러블슈팅

### 문제 1: Tunnel 연결 실패

**증상**: `cloudflared tunnel run` 실행 시 연결 실패

**해결 방법**:
1. **Config 파일 확인**:
   ```powershell
   Get-Content $env:USERPROFILE\.cloudflared\config.yml
   ```
   - Tunnel ID가 올바른지 확인
   - credentials 파일 경로 확인

2. **Tunnel 재생성**:
   ```powershell
   cloudflared tunnel delete ifc-backend
   cloudflared tunnel create ifc-backend
   ```

3. **DNS 확인**:
   ```powershell
   nslookup api.mycompany.com
   ```
   - Cloudflare DNS로 올바르게 설정되었는지 확인

### 문제 2: Access 로그인 화면이 나타나지 않음

**증상**: `https://api.mycompany.com` 접속 시 Access 화면 대신 에러 표시

**해결 방법**:
1. **Application 설정 확인**:
   - Zero Trust → Access → Applications
   - Application domain이 올바른지 확인
   - Policy가 연결되었는지 확인

2. **Identity Provider 확인**:
   - Google Workspace 설정이 올바른지 확인
   - Email domain이 올바른지 확인

### 문제 3: 서비스가 시작되지 않음

**증상**: Windows 서비스 시작 실패

**해결 방법**:
1. **이벤트 뷰어 확인**:
   ```powershell
   Get-EventLog -LogName Application -Source "Service Control Manager" -Newest 10
   ```

2. **수동 실행 테스트**:
   ```powershell
   # Backend-A 수동 실행
   cd backend-a
   node dist/server.js
   ```
   - 에러 메시지 확인
   - 환경변수 확인

3. **서비스 로그 확인**:
   ```powershell
   Get-Service IFC-Backend-A | Format-List *
   ```

### 문제 4: Backend-B가 Backend-A에 연결되지 않음

**증상**: `/api/health-backend-a` 엔드포인트가 503 에러 반환

**해결 방법**:
1. **Backend-A 실행 확인**:
   ```powershell
   Get-Service IFC-Backend-A
   curl http://localhost:3001/health
   ```

2. **환경변수 확인**:
   ```powershell
   [System.Environment]::GetEnvironmentVariable("BACKEND_A_URL", "Machine")
   ```

3. **방화벽 확인**:
   - Windows 방화벽에서 포트 3001, 3002 허용 확인

### 문제 5: Google 로그인 후 403 에러

**증상**: 회사 계정으로 로그인했지만 접근 거부

**해결 방법**:
1. **Policy 확인**:
   - Zero Trust → Access → Applications → Policies
   - Email domain이 올바른지 확인 (예: `@company.com`)

2. **이메일 도메인 확인**:
   - 로그인한 계정의 이메일 도메인이 Policy와 일치하는지 확인

3. **로그 확인**:
   - Zero Trust → Access → Logs
   - 거부된 요청의 이유 확인

---

## 비용 비교

### Render 배포 (기존 방식)

| 항목 | 비용 |
|------|------|
| Backend-A (Pro, 4GB RAM) | $85/월 |
| Backend-B (Starter, 512MB) | $7/월 |
| Persistent Disk (100GB) | $25/월 |
| Professional 계정 | $19/월 |
| **총 비용** | **$136/월** |

### Cloudflare + 회사 서버 (신규 방식)

| 항목 | 비용 |
|------|------|
| Backend-A/B (회사 서버) | $0/월 |
| Cloudflare Tunnel | $0/월 (무료) |
| Cloudflare Access | $0/월 (무료, 최대 50명) |
| Cloudflare Zero Trust | $0/월 (무료 플랜) |
| **총 비용** | **$0/월** |

**월간 절감액**: **$136/월** (연간 **$1,632**)

---

## 추가 리소스

- [Cloudflare Tunnel 공식 문서](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Access 공식 문서](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Google Workspace OAuth 설정](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/google/)

---

## 체크리스트

### Phase 1: Cloudflare Tunnel 설정
- [ ] Cloudflared 설치
- [ ] `cloudflared tunnel login` 실행
- [ ] `cloudflared tunnel create ifc-backend` 실행
- [ ] `cloudflared tunnel route dns` 실행
- [ ] `config.yml` 파일 생성 및 설정
- [ ] `cloudflared tunnel run ifc-backend` 테스트 성공

### Phase 2: Cloudflare Access 설정
- [ ] Zero Trust 대시보드 접속
- [ ] Application 생성 (`IFC-Backend-API`)
- [ ] Google Workspace Identity Provider 설정
- [ ] Policy 생성 (회사 이메일 도메인만 허용)
- [ ] Application에 Policy 연결
- [ ] 브라우저에서 Access 로그인 테스트 성공

### Phase 3: Windows 서비스 설정 (선택사항)
- [ ] Backend-A/B 빌드 완료
- [ ] 환경변수 설정 완료
- [ ] `install-services.ps1` 실행
- [ ] Cloudflare Tunnel 서비스 설치
- [ ] 서비스 시작 및 상태 확인
- [ ] 재부팅 후 자동 시작 확인

---

## 지원

문제가 발생하면:
1. 이 가이드의 트러블슈팅 섹션 확인
2. Cloudflare 대시보드의 로그 확인
3. Windows 이벤트 뷰어 확인
4. GitHub Issues에 문제 보고

