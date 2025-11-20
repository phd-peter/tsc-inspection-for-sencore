# Cloudflare 설정 가이드 (현재 운영 환경)

현재 운영 중인 Cloudflare 설정을 정리한 문서입니다.

## 📋 목차

1. [현재 아키텍처](#현재-아키텍처)
2. [도메인 설정](#도메인-설정)
3. [Cloudflare Pages 설정 (프론트엔드)](#cloudflare-pages-설정-프론트엔드)
4. [Cloudflare Tunnel 설정 (백엔드)](#cloudflare-tunnel-설정-백엔드)
5. [Cloudflare Access 설정](#cloudflare-access-설정)
6. [CORS 설정](#cors-설정)
7. [보안 상태](#보안-상태)
8. [백엔드 코드 설정](#백엔드-코드-설정)
9. [프론트엔드 코드 설정](#프론트엔드-코드-설정)
10. [트러블슈팅](#트러블슈팅)

---

## 현재 아키텍처

### 전체 구조

```
사용자 브라우저
    ↓
https://viewer.mindfutureai.com
    ↓
Cloudflare Pages (프론트엔드)
    ↓
Cloudflare Access (Google OAuth 로그인)
    ↓ (승인된 이메일만 통과)
    ↓
브라우저에서 API 호출
    ↓
https://api.mindfutureai.com
    ↓
Cloudflare Access (Google OAuth 로그인)
    ↓ (승인된 이메일만 통과)
    ↓
Cloudflare Tunnel
    ↓
Backend-B (회사 내부 서버:3002)
    ↓
Backend-A (회사 내부 서버:3001)
```

### 서비스 구성

- **프론트엔드**: Cloudflare Pages에 배포
  - 도메인: `viewer.mindfutureai.com`
  - 빌드: Vite 기반
  - 환경변수: `VITE_API_URL=https://api.mindfutureai.com/api`

- **백엔드**: 회사 내부 서버에서 실행
  - Backend-A: 포트 `3001` (IFC Processing Service)
  - Backend-B: 포트 `3002` (API Gateway)
  - Cloudflare Tunnel을 통해 외부 노출

---

## 도메인 설정

### DNS 설정 (Cloudflare DNS)

#### 1. 프론트엔드 도메인

- **도메인**: `viewer.mindfutureai.com`
- **Type**: CNAME
- **Target**: Cloudflare Pages Custom Domain
- **Proxy**: ON (주황색 클라우드)
- **설명**: Cloudflare Pages에서 자동으로 관리됨

#### 2. 백엔드 도메인

- **도메인**: `api.mindfutureai.com`
- **Type**: CNAME
- **Target**: Tunnel이 자동 생성한 도메인
- **Proxy**: ON (주황색 클라우드)
- **설명**: Cloudflare Tunnel에서 자동으로 관리됨

---

## Cloudflare Pages 설정 (프론트엔드)

### 프로젝트 설정

1. **프로젝트 생성**
   - Cloudflare Dashboard → Pages → Create a project
   - GitHub 저장소 연결
   - 프로젝트 이름: `tsc-ifc-viewer` (또는 원하는 이름)

2. **빌드 설정**
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
   - **Node version**: `18` 이상

3. **환경변수 설정**
   - `VITE_API_URL`: `https://api.mindfutureai.com/api`
   - **주의**: `/api` 경로를 포함해야 함
   - **주의**: `https://` 프로토콜 사용
   - 값 끝에 슬래시(`/`) 없이 설정

4. **Custom Domain 설정**
   - Settings → Custom domains → Add custom domain
   - `viewer.mindfutureai.com` 추가
   - SSL/TLS는 자동으로 설정됨

---

## Cloudflare Tunnel 설정 (백엔드)

### Tunnel 생성 및 설정

대쉬보드를 통해서 작업가능함
https://one.dash.cloudflare.com/
-> Networks
-> Connectors
https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/

Status-Healthy 만 확인하면됨.

---

## Cloudflare Access 설정

### Application 1: 프론트엔드 (Viewer)

#### 설정 위치
- Cloudflare Dashboard → Zero Trust → Access → Applications

#### Application 생성

1. **Add an application** 버튼 클릭
2. **Self-hosted** 선택
3. 다음 정보 입력:
   - **Application name**: `IFC-Viewer-Frontend`
   - **Session duration**: `24 hours` (또는 원하는 값)
   - **Application domain**: `viewer.mindfutureai.com`
4. **Next** 클릭

#### Identity Provider 설정

1. **Identity Providers** 섹션에서 **Add new** 클릭
2. **Google** 선택
3. Google Workspace 설정:
   - Cloudflare가 자동으로 Client ID/Secret 생성
   - **Email domain**: `@회사메일.com` (회사 도메인)
4. **Save** 클릭

#### Policy 생성

1. **Policies** 섹션에서 **Add a policy** 클릭
2. Policy 설정:
   - **Policy name**: `Company Email Only - Frontend`
   - **Action**: `Allow`
   - **Include** 규칙 추가:
     - **Selector**: `Email Domain`
     - **Value**: `@회사메일.com` (회사 도메인)
3. **Save** 클릭

#### Application에 Policy 연결

1. Application 설정으로 돌아가기
2. **Policies** 탭에서 방금 만든 Policy 선택
3. **Save application** 클릭

---

### Application 2: 백엔드 (API)

#### Application 생성

1. **Add an application** 버튼 클릭
2. **Self-hosted** 선택
3. 다음 정보 입력:
   - **Application name**: `IFC-Backend-API`
   - **Session duration**: `24 hours` (또는 원하는 값)
   - **Application domain**: `api.mindfutureai.com`
4. **Next** 클릭

#### Identity Provider 설정

- 프론트엔드와 동일한 Google Workspace Identity Provider 사용
- 또는 새로 생성 (동일한 설정)

#### Policy 생성

1. **Policies** 섹션에서 **Add a policy** 클릭
2. Policy 설정:
   - **Policy name**: `Company Email Only - Backend`
   - **Action**: `Allow`
   - **Include** 규칙 추가:
     - **Selector**: `Email Domain`
     - **Value**: `@회사메일.com` (회사 도메인)
3. **Save** 클릭

#### Application에 Policy 연결

1. Application 설정으로 돌아가기
2. **Policies** 탭에서 방금 만든 Policy 선택
3. **Save application** 클릭

---

## CORS 설정

### 중요: "Bypass options requests to origin" 설정

백엔드 API Application (`api.mindfutureai.com`)에서 다음 설정이 **필수**입니다:

1. Cloudflare Zero Trust → Access → Applications
2. `api.mindfutureai.com` Application 선택
3. Settings 탭 → **Cross-Origin Resource Sharing (CORS) settings**
4. **"Bypass options requests to origin"** 옵션을 **On**으로 설정

**설명**:
- 이 설정은 OPTIONS preflight 요청을 Cloudflare Access 인증 없이 백엔드 서버로 직접 전달합니다.
- 백엔드 서버의 CORS 미들웨어가 OPTIONS 요청을 처리하고 적절한 CORS 헤더를 반환합니다.
- 실제 GET/POST 요청은 여전히 Cloudflare Access 인증을 통과해야 합니다.

**주의**: 이 설정을 켜면 Cloudflare의 CORS 설정이 제거되지만, 백엔드 서버에서 CORS 헤더를 반환하므로 문제없습니다.

---

## 보안 상태

### 현재 보안 구조

#### ✅ 보호되는 부분

1. **프론트엔드 접근** (`viewer.mindfutureai.com`)
   - Cloudflare Access 인증 필요
   - 회사 이메일 도메인(`@회사메일.com`)만 허용
   - 인증 없이는 접근 불가

2. **백엔드 API 요청** (`api.mindfutureai.com`)
   - GET/POST 요청: Cloudflare Access 인증 필요
   - 회사 이메일 도메인만 허용
   - 인증 없이는 데이터 접근 불가

#### ⚠️ 예외되는 부분

1. **OPTIONS 요청** (CORS preflight)
   - "Bypass options requests to origin" = ON이므로 인증 없이 통과
   - **하지만**: OPTIONS 요청은 실제 데이터를 반환하지 않음 (CORS 헤더만 반환)
   - 실제 데이터 접근에는 영향 없음

### 보안 검증 방법

다음 테스트로 보안 상태를 확인할 수 있습니다:

```bash
# 1. 인증 없이 GET 요청 시도 (실패해야 함)
curl https://api.mindfutureai.com/api/assemblies
# 예상: 401 Unauthorized 또는 403 Forbidden

# 2. 인증 없이 POST 요청 시도 (실패해야 함)
curl -X POST https://api.mindfutureai.com/api/assembly-geometry \
  -H "Content-Type: application/json" \
  -d '{"tag":"TEST"}'
# 예상: 401 Unauthorized 또는 403 Forbidden

# 3. OPTIONS 요청 (통과해야 함 - CORS preflight용)
curl -X OPTIONS https://api.mindfutureai.com/api/assembly-geometry \
  -H "Origin: https://viewer.mindfutureai.com" \
  -H "Access-Control-Request-Method: POST"
# 예상: 200 OK (CORS 헤더 포함)
```

### 결론

- ✅ **외부 침입자는 `/api`로 실제 데이터를 가져올 수 없습니다**
- ✅ GET/POST 요청은 Cloudflare Access 인증이 필요합니다
- ✅ OPTIONS 요청만 인증 없이 통과하지만, 실제 데이터는 반환하지 않습니다
- ✅ 보안은 Cloudflare Access에 의존하며, Policy가 올바르게 설정되어 있다면 안전합니다

### 추가 보안 강화 (선택사항)

1. **Rate Limiting**
   - Cloudflare에서 Rate Limiting 규칙 추가 가능
   - DDoS 공격 방지

2. **백엔드 서버 추가 인증** (선택)
   - Cloudflare Access JWT 토큰 검증
   - Cloudflare가 전달하는 `CF-Access-JWT-Assertion` 헤더 검증

3. **IP 화이트리스트** (선택)
   - Cloudflare Access Policy에 IP 제한 추가 가능

---

## 백엔드 코드 설정

### Backend-B (API Gateway) - `backend-b/src/server.ts`

```typescript
import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS 설정 (Cloudflare Access용)
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "https://viewer.mindfutureai.com";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// ... 나머지 코드
```

**주요 설정**:
- `Access-Control-Allow-Origin`: 프론트엔드 도메인만 허용
- `Access-Control-Allow-Credentials`: `true` (Cloudflare Access 쿠키 전달용)
- `Access-Control-Allow-Methods`: `GET, POST, OPTIONS`
- OPTIONS 요청은 200 응답으로 즉시 반환

### Backend-A (IFC Processor) - `backend-a/server.ts`

```typescript
import express from "express";
import { loadIFCModel } from "./ifc-processor.js";
// ... 기타 imports

const app = express();

// CORS 설정 (Cloudflare Access용)
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "https://viewer.mindfutureai.com";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// ... 나머지 코드
```

**설정**: Backend-B와 동일한 CORS 설정 적용

---

## 프론트엔드 코드 설정

### API Base URL 설정 - `frontend/ifc-viewer-assembly.ts`

```typescript
// API Base URL (환경변수 또는 기본값)
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
```

**환경변수**: Cloudflare Pages에서 `VITE_API_URL=https://api.mindfutureai.com/api` 설정

### Fetch 요청 설정

```typescript
// Assembly 목록 가져오기
async function fetchAssemblies(): Promise<AssemblyInfo[]> {
  const response = await fetch(`${API_BASE_URL}/assemblies`, {
    credentials: "include",  // Cloudflare Access 쿠키 포함
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch assemblies: ${response.statusText}`);
  }
  return response.json();
}

// Assembly 지오메트리 가져오기
async function fetchAssemblyGeometry(tag: string): Promise<AssemblyGeometryResponse> {
  const response = await fetch(`${API_BASE_URL}/assembly-geometry`, {
    method: "POST",
    credentials: "include",  // Cloudflare Access 쿠키 포함
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tag }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Assembly with tag "${tag}" not found`);
    }
    throw new Error(`Failed to fetch assembly geometry: ${response.statusText}`);
  }
  return response.json();
}
```

**주요 설정**:
- `credentials: "include"`: Cloudflare Access 쿠키를 요청에 포함
- 같은 top-level 도메인(`.mindfutureai.com`) 내에서 쿠키가 자동으로 포함됨

---

## 트러블슈팅

### 문제 1: CORS 에러 발생

**증상**: 
```
Access to fetch at 'https://api.mindfutureai.com/api/...' from origin 'https://viewer.mindfutureai.com' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check
```

**해결 방법**:
1. Cloudflare Zero Trust → Access → Applications
2. `api.mindfutureai.com` Application 선택
3. Settings → CORS settings
4. **"Bypass options requests to origin"** 옵션을 **On**으로 설정
5. 브라우저에서 페이지 새로고침 (Ctrl+F5)

### 문제 2: Cloudflare Access 로그인 화면이 나타나지 않음

**증상**: `https://viewer.mindfutureai.com` 또는 `https://api.mindfutureai.com` 접속 시 Access 화면 대신 에러 표시

**해결 방법**:
1. **Application 설정 확인**:
   - Zero Trust → Access → Applications
   - Application domain이 올바른지 확인
   - Policy가 연결되었는지 확인

2. **Identity Provider 확인**:
   - Google Workspace 설정이 올바른지 확인
   - Email domain이 올바른지 확인

3. **DNS 확인**:
   ```powershell
   nslookup viewer.mindfutureai.com
   nslookup api.mindfutureai.com
   ```
   - Cloudflare DNS로 올바르게 설정되었는지 확인

### 문제 3: Tunnel 연결 실패

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

3. **서비스 재시작**:
   ```powershell
   Restart-Service cloudflared
   ```

### 문제 4: 백엔드 서버가 응답하지 않음

**증상**: API 요청이 503 에러 반환

**해결 방법**:
1. **백엔드 서버 실행 확인**:
   ```powershell
   Get-Service IFC-Backend-A, IFC-Backend-B
   curl http://localhost:3002/health
   ```

2. **환경변수 확인**:
   ```powershell
   [System.Environment]::GetEnvironmentVariable("BACKEND_A_URL", "Machine")
   [System.Environment]::GetEnvironmentVariable("PORT", "Machine")
   ```

3. **방화벽 확인**:
   - Windows 방화벽에서 포트 3001, 3002 허용 확인

### 문제 5: Google 로그인 후 403 에러

**증상**: 회사 계정으로 로그인했지만 접근 거부

**해결 방법**:
1. **Policy 확인**:
   - Zero Trust → Access → Applications → Policies
   - Email domain이 올바른지 확인 (예: `@회사메일.com`)

2. **이메일 도메인 확인**:
   - 로그인한 계정의 이메일 도메인이 Policy와 일치하는지 확인

3. **로그 확인**:
   - Zero Trust → Access → Logs
   - 거부된 요청의 이유 확인

---

## 체크리스트

### 초기 설정

- [ ] Cloudflare 계정 생성
- [ ] Cloudflare Zero Trust 액세스 권한 획득
- [ ] Google Workspace Identity Provider 설정
- [ ] DNS 설정 완료 (viewer.mindfutureai.com, api.mindfutureai.com)

### 프론트엔드 설정

- [ ] Cloudflare Pages 프로젝트 생성
- [ ] GitHub 저장소 연결
- [ ] 빌드 설정 완료
- [ ] 환경변수 설정 (`VITE_API_URL`)
- [ ] Custom Domain 추가 (`viewer.mindfutureai.com`)
- [ ] Cloudflare Access Application 생성 (프론트엔드)
- [ ] Policy 생성 및 연결

### 백엔드 설정

- [ ] Cloudflared 설치
- [ ] `cloudflared tunnel login` 실행
- [ ] Tunnel 생성 (`ifc-backend`)
- [ ] DNS 라우팅 설정 (`api.mindfutureai.com`)
- [ ] Config 파일 생성
- [ ] Tunnel 테스트 실행 성공
- [ ] Windows 서비스로 등록 (선택사항)
- [ ] Cloudflare Access Application 생성 (백엔드)
- [ ] Policy 생성 및 연결
- [ ] **"Bypass options requests to origin" 설정 (중요!)**

### 백엔드 코드 설정

- [ ] Backend-B CORS 설정 완료
- [ ] Backend-A CORS 설정 완료
- [ ] 백엔드 서버 빌드 및 실행

### 프론트엔드 코드 설정

- [ ] `credentials: "include"` 설정 확인
- [ ] API Base URL 설정 확인
- [ ] 프론트엔드 빌드 및 배포

### 테스트

- [ ] 프론트엔드 접근 테스트 (로그인 화면 표시)
- [ ] 백엔드 API 접근 테스트 (로그인 화면 표시)
- [ ] CORS preflight 요청 테스트 (OPTIONS)
- [ ] 실제 API 요청 테스트 (GET/POST)
- [ ] 비회사 계정 접근 차단 확인

---

## 참고 자료

- [Cloudflare Tunnel 공식 문서](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Access 공식 문서](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Cloudflare Pages 공식 문서](https://developers.cloudflare.com/pages/)
- [Google Workspace OAuth 설정](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/google/)
- [CORS 설정 가이드](https://developers.cloudflare.com/cloudflare-one/policies/access/cors/)

---

## 지원

문제가 발생하면:
1. 이 문서의 트러블슈팅 섹션 확인
2. Cloudflare 대시보드의 로그 확인
3. Windows 이벤트 뷰어 확인
4. 백엔드 서버 로그 확인

