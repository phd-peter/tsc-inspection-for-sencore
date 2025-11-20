# 🚀 Vercel 빠른 배포 가이드

프론트엔드를 Vercel에 배포하는 빠른 가이드입니다.

## 1단계: 로컬 빌드 테스트

```powershell
cd frontend
npm install
npm run build
```

✅ `dist` 폴더가 생성되면 성공!

## 2단계: GitHub에 푸시

```powershell
# 루트 디렉토리에서
git add frontend/
git add frontend/vercel.json
git commit -m "Add frontend for Vercel deployment"
git push origin master
```

## 3단계: Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. **Add New Project** 클릭
3. GitHub 저장소 선택
4. **중요 설정**:
   - **Root Directory**: `frontend` ⚠️ 필수!
   - Framework는 자동 감지됨 (Vite)

## 4단계: 환경변수 설정

**Vercel Dashboard → Settings → Environment Variables**:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://api.mindfutureai.com/api` |

⚠️ **주의**: 
- `/api` 포함 필수
- 끝에 슬래시(`/`) 없음
- `https://` 사용

## 5단계: 배포

**Deploy** 버튼 클릭 → 완료! 🎉

## 확인

배포 후 Vercel URL로 접속하여:
- ✅ Assembly 드롭다운이 로드되는지 확인
- ✅ Assembly 선택 시 3D 모델이 표시되는지 확인

---

자세한 내용은 `VERCEL_DEPLOYMENT.md` 참조

