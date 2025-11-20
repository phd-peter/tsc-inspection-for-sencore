# 배포 가이드 (Deployment Guide)

마이크로서비스 아키텍처를 사용하는 IFC Viewer 애플리케이션의 배포 가이드입니다.

## 배포 옵션 선택

이 애플리케이션은 두 가지 배포 방식을 지원합니다:

### 옵션 1: Render 배포 (클라우드)
- **비용**: 약 $136/월
- **장점**: 완전 관리형, 자동 스케일링, 별도 서버 불필요
- **단점**: 비용 발생
- **가이드**: 아래 [Render 배포](#render-배포) 섹션 참조

### 옵션 2: Cloudflare + 회사 서버 (비용 절감)
- **비용**: $0/월 (회사 서버 활용)
- **장점**: 무료, 회사 내부 서버 활용, Google Workspace 인증 지원
- **단점**: 회사 서버 필요, 직접 관리 필요
- **가이드**: [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) 참조

---

## 아키텍처 개요

이 애플리케이션은 세 가지 주요 컴포넌트로 구성됩니다:

1. **Backend-A (IFC Processing Service)**: IFC 파일을 파싱하고 메모리에 유지하며, Assembly별 필터링 API 제공
2. **Backend-B (API Gateway)**: 프론트엔드의 API 요청을 백엔드A로 프록시
3. **Frontend**: Vite 기반 웹 애플리케이션 (Vercel에 별도 배포)

---

## Render 배포

### 사전 준비사항

- GitHub 저장소에 코드가 푸시되어 있어야 합니다
- Render 계정 (백엔드A, 백엔드B 배포용)
- Vercel 계정 (프론트엔드 배포용, 선택사항)
- IFC 파일 준비 (백엔드A에 업로드할 파일)

### 배포 순서

### 1. 백엔드A 배포 (Render)

백엔드A는 IFC 파일을 처리하는 핵심 서비스입니다.

#### 1.1 Render 대시보드 설정

1. Render 대시보드에서 **New Web Service** 클릭
2. GitHub 저장소 연결
3. 다음 설정 입력:
   - **Name**: `backend-a-ifc-processor` (또는 원하는 이름)
   - **Root Directory**: `backend-a`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Starter** (최소 2GB RAM 권장, 대용량 IFC 파일의 경우 더 높은 사양 필요)

#### 1.2 환경변수 설정

Render 대시보드의 **Environment** 섹션에서 다음 변수 추가:

```
IFC_FILE_PATH=./models/model.ifc
PORT=3001
NODE_ENV=production
```

**중요**: `IFC_FILE_PATH`는 실제 IFC 파일의 경로로 설정해야 합니다.

#### 1.3 IFC 파일 업로드

IFC 파일을 업로드하는 방법:

**방법 1: Render Persistent Disk 사용 (권장)**
1. Render 대시보드에서 **Disks** 탭으로 이동
2. Persistent Disk 생성 (예: `ifc-storage`)
3. Disk를 서비스에 마운트
4. 환경변수 `IFC_FILE_PATH`를 마운트된 경로로 설정 (예: `/mnt/ifc-storage/model.ifc`)
5. SSH를 통해 파일 업로드:
   ```bash
   # Render SSH 접속 후
   mkdir -p /mnt/ifc-storage
   # 로컬에서 파일 업로드 (scp 사용)
   scp model.ifc user@your-service.onrender.com:/mnt/ifc-storage/
   ```

#### 1.4 배포 확인

배포가 완료되면 다음 URL로 확인:

```
https://your-backend-a.onrender.com/health
```

예상 응답:
```json
{"status":"ok","service":"backend-a-ifc-processor"}
```

Assembly 목록 확인:
```
https://your-backend-a.onrender.com/api/assemblies
```

### 2. 백엔드B 배포 (Render)

백엔드B는 API Gateway 역할을 하며, 프론트엔드의 API 요청을 백엔드A로 프록시합니다.

**참고**: 프론트엔드는 Vercel에 별도로 배포하므로, 백엔드B는 API 프록시 역할만 수행합니다.

#### 2.1 Render 대시보드 설정

1. Render 대시보드에서 **New Web Service** 클릭
2. GitHub 저장소 연결
3. 다음 설정 입력:
   - **Name**: `backend-b-api-gateway` (또는 원하는 이름)
   - **Root Directory**: `backend-b`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Starter** (512MB RAM 충분)

#### 2.2 환경변수 설정

```
BACKEND_A_URL=https://your-backend-a.onrender.com
PORT=3002
NODE_ENV=production
```

**중요**: `BACKEND_A_URL`은 백엔드A의 실제 URL로 설정해야 합니다.

#### 2.3 배포 확인

배포가 완료되면 다음 URL로 확인:

```
https://your-backend-b.onrender.com/health
```

백엔드A 연결 확인:
```
https://your-backend-b.onrender.com/api/health-backend-a
```

Assembly 목록 프록시 확인:
```
https://your-backend-b.onrender.com/api/assemblies
```

### 3. 프론트엔드 배포 (Vercel)

프론트엔드는 Vercel에 별도로 배포합니다.

#### 3.1 Vercel 대시보드 설정

1. Vercel 대시보드에서 **New Project** 클릭
2. GitHub 저장소 연결
3. 프로젝트 설정:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### 3.2 환경변수 설정

Vercel 대시보드의 **Environment Variables** 섹션에서 다음 변수 추가:

```
VITE_API_URL=https://your-backend-b.onrender.com/api
```

**중요**: `VITE_API_URL`은 백엔드B의 실제 URL로 설정해야 합니다. `/api` 경로를 포함해야 합니다.

#### 3.3 배포 확인

배포가 완료되면:

1. Vercel이 제공하는 URL로 접속 (예: `https://your-project.vercel.app`)
2. 브라우저 개발자 도구 콘솔에서 에러 확인
3. 드롭다운에서 Assembly 목록이 로드되는지 확인
4. Assembly를 선택하여 3D 모델이 표시되는지 확인

## 로컬 개발 환경 설정

### 백엔드A 실행

```bash
cd backend-a
npm install

# .env 파일 생성 (선택사항)
# IFC_FILE_PATH=./models/model.ifc
# PORT=3001

npm run build
npm start
```

서버는 `http://localhost:3001`에서 실행됩니다.

### 백엔드B 실행

```bash
cd backend-b
npm install

# .env 파일 생성
# BACKEND_A_URL=http://localhost:3001
# PORT=3002

npm run build
npm start
```

서버는 `http://localhost:3002`에서 실행됩니다.

### 프론트엔드 실행

```bash
cd frontend
npm install

# .env 파일 생성
# VITE_API_URL=http://localhost:3002/api

npm run dev
```

개발 서버는 `http://localhost:5173` (또는 다른 포트)에서 실행됩니다.

## 트러블슈팅

### 백엔드A가 시작되지 않음

**증상**: 서버가 시작되지 않거나 "IFC API not initialized" 에러 발생

**해결 방법**:
1. **IFC 파일 경로 확인**
   - `IFC_FILE_PATH` 환경변수가 올바른지 확인
   - 파일이 실제로 존재하는지 확인

2. **메모리 부족**
   - Render 대시보드에서 인스턴스 타입 업그레이드 (2GB 이상 권장)
   - 로그에서 메모리 관련 에러 확인

3. **WASM 파일 경로 문제**
   - `SetWasmPath` 호출이 올바른지 확인
   - Node.js 환경에서는 경로 설정이 필요할 수 있음

4. **로그 확인**
   - Render 대시보드 > Logs에서 상세 에러 메시지 확인
   - 백엔드A 콘솔에 출력되는 로그 확인

### 백엔드B가 백엔드A에 연결되지 않음

**증상**: `/api/health-backend-a` 엔드포인트가 503 에러 반환

**해결 방법**:
1. **환경변수 확인**
   - `BACKEND_A_URL`이 올바른지 확인 (프로토콜 포함: `https://`)
   - 백엔드A가 실제로 실행 중인지 확인

2. **네트워크 연결 확인**
   - Render 대시보드에서 백엔드A의 상태 확인
   - 백엔드A의 `/health` 엔드포인트 직접 접속 테스트

3. **CORS 설정**
   - 백엔드A에서 `cors` 미들웨어가 활성화되어 있는지 확인
   - 백엔드B의 도메인이 CORS 허용 목록에 있는지 확인

### 프론트엔드에서 Assembly 목록이 로드되지 않음

**증상**: 드롭다운이 비어있거나 "Failed to fetch assemblies" 에러

**해결 방법**:
1. **브라우저 콘솔 확인**
   - 네트워크 탭에서 API 요청 상태 확인
   - CORS 에러가 있는지 확인

2. **환경변수 확인**
   - `VITE_API_URL`이 올바르게 설정되었는지 확인
   - 빌드 시점에 환경변수가 포함되었는지 확인 (Vercel의 경우)

3. **백엔드B 확인**
   - 백엔드B가 정상 작동하는지 확인 (`/health` 엔드포인트)
   - 백엔드B가 백엔드A에 연결되는지 확인 (`/api/health-backend-a`)

4. **API URL 확인**
   - 프론트엔드가 올바른 API URL을 사용하는지 확인
   - 개발 환경과 프로덕션 환경의 URL이 다른지 확인

### 프론트엔드가 Vercel에서 제대로 빌드되지 않음

**증상**: Vercel 빌드 실패 또는 빌드는 성공했지만 페이지가 표시되지 않음

**해결 방법**:
1. **빌드 로그 확인**
   - Vercel 대시보드 > Deployments > Build Logs 확인
   - TypeScript 컴파일 에러나 의존성 문제 확인

2. **환경변수 확인**
   - `VITE_API_URL`이 올바르게 설정되었는지 확인
   - 빌드 시점에 환경변수가 포함되었는지 확인

3. **Root Directory 확인**
   - Vercel 설정에서 Root Directory가 `frontend`로 설정되었는지 확인

4. **의존성 문제**
   - `frontend/package.json`의 의존성이 올바른지 확인
   - `npm install`이 성공적으로 완료되는지 확인

## 성능 최적화

### 백엔드A 최적화

1. **메모리 관리**
   - IFC 모델을 메모리에 유지하여 빠른 응답 제공
   - 대용량 모델의 경우 충분한 메모리 할당

2. **응답 압축**
   - Express `compression` 미들웨어 추가 고려
   - 지오메트리 데이터는 이미 배열로 직렬화되어 있음

3. **캐싱**
   - Assembly 목록은 변경되지 않으므로 캐싱 가능
   - 지오메트리 데이터도 캐싱 고려

### 백엔드B 최적화

1. **HTTP 연결 풀링**
   - axios는 기본적으로 연결 풀링 사용
   - 타임아웃 설정으로 무한 대기 방지

2. **정적 파일 캐싱**
   - Express `static` 미들웨어에 캐싱 헤더 추가
   - CDN 사용 고려 (Cloudflare 등)

### 프론트엔드 최적화

1. **지오메트리 데이터 캐싱**
   - IndexedDB를 사용하여 지오메트리 데이터 캐싱
   - 동일한 Assembly를 다시 로드할 때 빠른 응답

2. **청크 단위 로딩**
   - 대용량 지오메트리 데이터를 청크로 나누어 로딩
   - Progressive loading 구현

3. **Three.js 최적화**
   - 불필요한 렌더링 최소화
   - Frustum culling 활성화

## 모니터링 및 로깅

### Render 로깅

- Render 대시보드의 **Logs** 탭에서 실시간 로그 확인
- 에러 발생 시 자동으로 알림 설정 가능

### 애플리케이션 로깅

백엔드A와 백엔드B는 콘솔에 상세한 로그를 출력합니다:
- 요청 로그
- 에러 로그
- 성능 메트릭

### 헬스 체크

모든 서비스는 `/health` 엔드포인트를 제공합니다:
- 백엔드A: `/health`
- 백엔드B: `/health`, `/api/health-backend-a`

## 보안 고려사항

1. **환경변수 보호**
   - 민감한 정보는 환경변수로 관리
   - Git에 커밋하지 않도록 주의

2. **CORS 설정**
   - 프로덕션 환경에서는 특정 도메인만 허용
   - 개발 환경에서만 `*` 사용

3. **Rate Limiting**
   - API 엔드포인트에 Rate Limiting 추가 고려
   - DDoS 공격 방지

## 비용 최적화

### Render 비용

- **백엔드A**: Starter 플랜 ($7/월) 또는 더 높은 사양
- **백엔드B**: Starter 플랜 ($7/월) 충분
- **총 비용**: 약 $14-20/월 (IFC 파일 크기에 따라 다름)

### Vercel 비용

- **프론트엔드**: Hobby 플랜 (무료) 또는 Pro 플랜 ($20/월)
- 정적 파일 호스팅은 무료

### 비용 절감 팁

1. **백엔드A 최적화**
   - IFC 파일 크기 최소화
   - 불필요한 지오메트리 제거

2. **캐싱 활용**
   - CDN 사용으로 트래픽 감소
   - 브라우저 캐싱 활용

## 다음 단계

배포가 완료되면:

1. ✅ 모든 서비스가 정상 작동하는지 확인
2. ✅ 프론트엔드에서 Assembly 목록이 로드되는지 확인
3. ✅ Assembly 선택 시 3D 모델이 표시되는지 확인
4. ✅ 성능 모니터링 설정
5. ✅ 사용자 피드백 수집 및 개선

## 추가 리소스

- [Render 문서](https://render.com/docs)
- [Vercel 문서](https://vercel.com/docs)
- [web-ifc 문서](https://github.com/IFCjs/web-ifc)
- [Three.js 문서](https://threejs.org/docs/)

## 지원

문제가 발생하면:
1. 이 가이드의 트러블슈팅 섹션 확인
2. 서비스 로그 확인
3. GitHub Issues에 문제 보고
