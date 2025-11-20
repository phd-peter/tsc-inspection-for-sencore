# Cloudflare Tunnel 연결 확인 가이드

`api.mindfutureai.com`으로 설정한 Cloudflare Tunnel이 제대로 작동하는지 확인하는 방법입니다.

## 🚀 빠른 체크 (5분)

### 1단계: 로컬 서버 실행 확인

**PowerShell에서 확인**:

```powershell
# Backend-B가 실행 중인지 확인 (포트 3002)
curl http://localhost:3002/health

# Backend-A가 실행 중인지 확인 (포트 3001)
curl http://localhost:3001/health
```

**예상 응답**:
```json
{"status":"ok","service":"backend-b-api-gateway"}
{"status":"ok","service":"backend-a-ifc-processor"}
```

**서버가 실행되지 않은 경우**:
```powershell
# Backend-A 실행
cd backend-a
npm run build
npm start

# 새 터미널에서 Backend-B 실행
cd backend-b
npm run build
npm start
```

### 2단계: Tunnel 실행 확인

**방법 1: Cloudflare 대시보드에서 확인 (권장, CLI 불필요)**

웹 대시보드에서 Tunnel을 설정한 경우:

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 접속
2. **Zero Trust** → **Networks** → **Tunnels** 클릭
3. Tunnel 목록에서 `api.mindfutureai.com` 관련 Tunnel 찾기
4. **Status** 확인:
   - ✅ **Healthy**: 정상 작동
   - ⚠️ **Degraded**: 일부 문제 있음
   - ❌ **Down**: 연결 실패
### 3단계: 외부 접속 테스트

**브라우저에서 접속**:

1. **헬스 체크**: `https://api.mindfutureai.com/health`
   - 예상 응답: `{"status":"ok","service":"backend-b-api-gateway"}`

2. **Backend-A 헬스 체크**: `https://api.mindfutureai.com/api/health-backend-a`
   - 예상 응답: `{"status":"ok","service":"backend-a-ifc-processor"}`

3. **Assembly 목록**: `https://api.mindfutureai.com/api/assemblies`
   - 예상 응답: Assembly 목록 JSON 배열


---

## 🎯 최종 확인 체크리스트

- [ ] Backend-A가 포트 3001에서 실행 중
- [ ] Backend-B가 포트 3002에서 실행 중
- [ ] `https://api.mindfutureai.com/health` 접속 시 정상 응답
- [ ] `https://api.mindfutureai.com/api/health-backend-a` 접속 시 정상 응답
- [ ] `https://api.mindfutureai.com/api/assemblies` 접속 시 Assembly 목록 반환
- [ ] Cloudflare 대시보드에서 Tunnel 상태가 "Healthy"
- [ ] DNS가 올바르게 해석됨

---
