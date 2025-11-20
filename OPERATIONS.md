# 운영 유지관리 가이드

이 문서는 프로젝트의 일상적인 운영 및 유지관리를 위한 가이드입니다.

## 📋 목차

1. [Backend 서비스 구동](#backend-서비스-구동)
2. [Windows 서비스 등록](#windows-서비스-등록)
3. [Frontend 배포](#frontend-배포)
4. [일상 점검](#일상-점검)

---

## Backend 서비스 구동

### 사전 준비사항

- Node.js 18+ 설치 확인
- `backend-a`와 `backend-b` 폴더가 로컬에 존재해야 함 (GitHub에는 없음)

### 수동 실행 방법

#### Backend-A 실행

```powershell
cd backend-a

# 의존성 설치 (최초 1회)
npm install

# 빌드
npm run build

# 실행
npm start
```

**포트**: 3001  
**헬스 체크**: http://localhost:3001/health

#### Backend-B 실행

```powershell
cd backend-b

# 의존성 설치 (최초 1회)
npm install

# 빌드
npm run build

# 실행
npm start
```

**포트**: 3002  
**헬스 체크**: http://localhost:3002/health

### 개발 모드 실행 (자동 재시작)

```powershell
# Backend-A
cd backend-a
npm run dev

# Backend-B (새 터미널)
cd backend-b
npm run dev
```

---

## Windows 서비스 등록

Backend-A와 Backend-B를 Windows 서비스로 등록하여 컴퓨터 부팅 시 자동으로 실행되도록 설정합니다.

### 1단계: 빌드 확인

서비스를 등록하기 전에 두 백엔드가 빌드되어 있어야 합니다:

```powershell
# Backend-A 빌드
cd backend-a
npm run build

# Backend-B 빌드
cd backend-b
npm run build
```

### 2단계: 서비스 설치

**관리자 권한으로 PowerShell 실행** 후:

```powershell
# 프로젝트 루트 디렉토리에서
.\install-services.ps1
```

**중요**: 
- 반드시 **관리자 권한**으로 실행해야 합니다
- 경로가 기본값(`C:\Users\Alpha\Projects\tsc-ifc-test2`)이 아닌 경우 스크립트 내 경로를 수정하거나 파라미터로 전달하세요

### 3단계: 서비스 시작

```powershell
# 서비스 시작
.\manage-services.ps1 start

# 또는 PowerShell 명령어로
Start-Service IFC-Backend-A, IFC-Backend-B
```

### 서비스 관리 명령어

```powershell
# 상태 확인
.\manage-services.ps1 status

# 시작
.\manage-services.ps1 start

# 중지
.\manage-services.ps1 stop

# 재시작
.\manage-services.ps1 restart
```

또는 PowerShell 명령어:

```powershell
# 상태 확인
Get-Service IFC-Backend-A, IFC-Backend-B

# 시작
Start-Service IFC-Backend-A, IFC-Backend-B

# 중지
Stop-Service IFC-Backend-A, IFC-Backend-B

# 재시작
Restart-Service IFC-Backend-A, IFC-Backend-B
```

### 서비스 제거

서비스를 제거하려면:

```powershell
# 관리자 권한으로 실행
Stop-Service IFC-Backend-A, IFC-Backend-B -Force
sc.exe delete IFC-Backend-A
sc.exe delete IFC-Backend-B
```

---

## Frontend 배포

Frontend는 GitHub에 푸시하면 Vercel에서 자동으로 배포됩니다.

### 배포 프로세스

1. **코드 수정 후 커밋**
   ```powershell
   git add frontend/
   git commit -m "Update frontend"
   git push origin main
   ```

2. **Vercel 자동 배포**
   - GitHub에 푸시하면 Vercel이 자동으로 감지
   - 빌드 및 배포 자동 실행
   - 배포 완료 후 Vercel URL로 접근 가능

### 로컬 빌드 테스트

배포 전 로컬에서 빌드 테스트:

```powershell
cd frontend
npm install
npm run build
```

### 환경변수 확인

Vercel 대시보드에서 환경변수 확인:
- `VITE_API_URL`: `https://api.mindfutureai.com/api`

자세한 내용은 `docs/archive/VERCEL_DEPLOYMENT.md` 참조

---

## 일상 점검

### 서비스 상태 확인

```powershell
# Windows 서비스 상태 확인
.\manage-services.ps1 status

# 또는
Get-Service IFC-Backend-A, IFC-Backend-B
```

### 헬스 체크

브라우저 또는 PowerShell에서:

```powershell
# Backend-B 헬스 체크
curl http://localhost:3002/health

# Backend-A 헬스 체크 (Backend-B를 통해)
curl http://localhost:3002/api/health-backend-a

# Assembly 목록 확인
curl http://localhost:3002/api/assemblies
```

### 로그 확인

Windows 서비스 로그는 Event Viewer에서 확인:
1. `Win + R` → `eventvwr.msc`
2. **Windows Logs** → **Application**
3. 서비스 이름으로 필터링

### 문제 발생 시

1. **서비스가 시작되지 않는 경우**
   - 빌드 파일 확인: `backend-a/dist/server.js`, `backend-b/dist/server.js`
   - Node.js 경로 확인
   - Event Viewer에서 에러 로그 확인

2. **포트 충돌**
   - 3001, 3002 포트가 사용 중인지 확인:
     ```powershell
     netstat -ano | findstr :3001
     netstat -ano | findstr :3002
     ```

3. **서비스 재시작**
   ```powershell
   .\manage-services.ps1 restart
   ```

---

## 빠른 참조

### 주요 경로

- **Backend-A**: `backend-a/`
- **Backend-B**: `backend-b/`
- **Frontend**: `frontend/`
- **서비스 스크립트**: `install-services.ps1`, `manage-services.ps1`

### 주요 포트

- **Backend-A**: 3001
- **Backend-B**: 3002

### 서비스 이름

- **IFC-Backend-A**: Backend-A Windows 서비스
- **IFC-Backend-B**: Backend-B Windows 서비스

---

## 추가 자료

자세한 배포 및 설정 가이드는 `docs/archive/` 폴더를 참조하세요:
- `VERCEL_DEPLOYMENT.md`: Frontend Vercel 배포 상세 가이드
- `CLOUDFLARE_SETUP.md`: Cloudflare Tunnel 설정 가이드
- `DEPLOYMENT.md`: 전체 배포 가이드

