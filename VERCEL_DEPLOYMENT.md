# Vercel 프론트엔드 배포 가이드

프론트엔드를 Vercel에 배포하여 `api.mindfutureai.com` 백엔드와 연결하는 방법입니다.

## 📋 사전 준비사항

- ✅ GitHub 저장소에 코드가 푸시되어 있어야 합니다
- ✅ Vercel 계정 (GitHub 계정으로 로그인 가능)
- ✅ Cloudflare Tunnel이 정상 작동 중 (`api.mindfutureai.com` 접근 가능)

## 🚀 배포 단계

### Step 1: 프론트엔드 빌드 테스트 (로컬)

배포 전에 로컬에서 빌드가 정상적으로 되는지 확인합니다:

```powershell
cd frontend

# 의존성 설치
npm install

# 빌드 테스트
npm run build
```

**빌드 성공 확인**:
- `dist` 폴더가 생성되어야 함
- 에러 없이 빌드 완료

### Step 2: GitHub에 푸시

```powershell
# 루트 디렉토리에서
git add frontend/
git commit -m "Add frontend for Vercel deployment"
git push origin master
```

### Step 3: Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. **Add New Project** 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정:
   - **Framework Preset**: `Vite` (자동 감지됨)
   - **Root Directory**: `frontend` ⚠️ **중요**
   - **Build Command**: `npm run build` (기본값)
   - **Output Directory**: `dist` (기본값)
   - **Install Command**: `npm install` (기본값)

### Step 4: 환경변수 설정

**Vercel 대시보드에서 환경변수 추가**:

1. 프로젝트 설정 → **Environment Variables** 클릭
2. 다음 변수 추가:

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://api.mindfutureai.com/api` |

   **⚠️ 중요**: 
   - `/api` 경로를 포함해야 합니다
   - `https://` 프로토콜 사용
   - 값 끝에 슬래시(`/`) 없이 설정

3. **Save** 클릭

### Step 5: 배포

1. **Deploy** 버튼 클릭
2. 빌드 로그 확인:
   - 빌드가 성공적으로 완료되는지 확인
   - 에러가 있으면 로그 확인

### Step 6: 배포 확인

배포가 완료되면:

1. **Vercel이 제공하는 URL**로 접속 (예: `https://your-project.vercel.app`)
2. 브라우저 개발자 도구 콘솔 확인:
   - 에러가 없는지 확인
   - Network 탭에서 API 요청 확인
3. Assembly 드롭다운이 로드되는지 확인
4. Assembly 선택 시 3D 모델이 표시되는지 확인

---

## 🔍 배포 후 확인 사항

### 1. 환경변수 확인

브라우저 콘솔에서 확인:

```javascript
console.log(import.meta.env.VITE_API_URL);
// 예상 출력: "https://api.mindfutureai.com/api"
```

### 2. API 연결 테스트

브라우저 개발자 도구 → Network 탭:
- Assembly 목록 요청: `https://api.mindfutureai.com/api/assemblies`
- 상태 코드: `200 OK`
- 응답: Assembly 목록 JSON

### 3. CORS 확인

만약 CORS 에러가 발생하면:
- Backend-B의 CORS 설정 확인
- Cloudflare Access 설정 확인

---

## 🐛 문제 해결

### 문제 1: 빌드 실패

**증상**: Vercel 빌드 중 에러 발생

**해결 방법**:
1. **빌드 로그 확인**:
   - Vercel Dashboard → Deployments → Build Logs
   - 에러 메시지 확인

2. **로컬 빌드 테스트**:
   ```powershell
   cd frontend
   npm run build
   ```
   - 로컬에서도 같은 에러가 발생하는지 확인

3. **의존성 문제**:
   ```powershell
   # node_modules 삭제 후 재설치
   cd frontend
   Remove-Item -Recurse -Force node_modules
   npm install
   npm run build
   ```

### 문제 2: API 요청 실패 (404 또는 CORS 에러)

**증상**: Assembly 목록이 로드되지 않음

**해결 방법**:
1. **환경변수 확인**:
   - Vercel Dashboard → Settings → Environment Variables
   - `VITE_API_URL`이 올바르게 설정되었는지 확인
   - 값: `https://api.mindfutureai.com/api` (슬래시 없이)

2. **브라우저 콘솔 확인**:
   - Network 탭에서 실제 요청 URL 확인
   - CORS 에러가 있는지 확인

3. **Backend-B CORS 설정 확인**:
   - Backend-B가 모든 origin을 허용하는지 확인
   - `cors()` 미들웨어가 활성화되어 있는지 확인

### 문제 3: Assembly 목록은 로드되지만 3D 모델이 표시되지 않음

**증상**: 드롭다운은 작동하지만 모델이 렌더링되지 않음

**해결 방법**:
1. **브라우저 콘솔 에러 확인**:
   - Three.js 관련 에러 확인
   - WebGL 지원 확인

2. **지오메트리 데이터 확인**:
   - Network 탭에서 `/api/assembly-geometry` 응답 확인
   - 데이터가 올바르게 반환되는지 확인

3. **WASM 파일 경로 확인**:
   - `web-ifc` WASM 파일이 올바르게 로드되는지 확인

### 문제 4: 환경변수가 적용되지 않음

**증상**: `VITE_API_URL`이 빌드 시점에 포함되지 않음

**해결 방법**:
1. **환경변수 재설정**:
   - Vercel Dashboard → Settings → Environment Variables
   - 변수 삭제 후 다시 추가
   - **Production**, **Preview**, **Development** 모두에 설정

2. **재배포**:
   - 환경변수 변경 후 자동 재배포 또는 수동 재배포

3. **빌드 로그 확인**:
   - 빌드 시점에 환경변수가 포함되었는지 확인

---

## 📝 환경변수 설정 상세

### Vercel 환경변수 설정 위치

1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. **Add New** 클릭

### 환경변수 값

| 환경 | 값 |
|------|-----|
| **Production** | `https://api.mindfutureai.com/api` |
| **Preview** | `https://api.mindfutureai.com/api` |
| **Development** | `http://localhost:3002/api` (로컬 개발용) |

### 환경변수 확인 방법

**빌드 로그에서 확인**:
- Vercel Dashboard → Deployments → Build Logs
- 환경변수가 포함되었는지 확인

**브라우저에서 확인**:
```javascript
// 브라우저 콘솔에서 실행
console.log(import.meta.env.VITE_API_URL);
```

---

## 🔄 자동 배포 설정

### GitHub 연동

Vercel은 GitHub 저장소와 연동되어 자동으로 배포됩니다:

- **Push to master**: Production 배포
- **Pull Request**: Preview 배포

### 배포 트리거

자동 배포를 원하지 않으면:
1. Vercel Dashboard → Settings → Git
2. **Ignored Build Step** 설정
3. 특정 브랜치만 배포하도록 설정

---

## 🎯 배포 체크리스트

배포 전:
- [ ] 로컬에서 `npm run build` 성공
- [ ] `dist` 폴더가 생성됨
- [ ] GitHub에 코드 푸시 완료

배포 중:
- [ ] Vercel 프로젝트 생성 완료
- [ ] Root Directory가 `frontend`로 설정됨
- [ ] 환경변수 `VITE_API_URL` 설정 완료
- [ ] 빌드 성공 확인

배포 후:
- [ ] Vercel URL로 접속 가능
- [ ] 브라우저 콘솔에 에러 없음
- [ ] Assembly 드롭다운 로드됨
- [ ] Assembly 선택 시 3D 모델 표시됨
- [ ] API 요청이 `api.mindfutureai.com`으로 전송됨

---

## 💡 추가 팁

### 커스텀 도메인 설정 (선택사항)

Vercel에서 커스텀 도메인을 설정할 수 있습니다:

1. Vercel Dashboard → Settings → Domains
2. 원하는 도메인 추가
3. DNS 설정 안내에 따라 DNS 레코드 추가

### 성능 최적화

- Vercel은 자동으로 CDN을 통해 정적 파일 제공
- 이미지 최적화 자동 적용
- 자동 HTTPS 인증서 발급

### 환경별 설정

개발/프리뷰/프로덕션 환경별로 다른 API URL 사용:

- **Development**: `http://localhost:3002/api`
- **Preview**: `https://api.mindfutureai.com/api`
- **Production**: `https://api.mindfutureai.com/api`

---

## 📚 참고 자료

- [Vercel 공식 문서](https://vercel.com/docs)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html)
- [환경변수 설정](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 지원

문제가 발생하면:
1. 이 가이드의 문제 해결 섹션 확인
2. Vercel 빌드 로그 확인
3. 브라우저 개발자 도구 확인
4. GitHub Issues에 문제 보고

