# IFC 파일 웹 표시 가이드

이 문서는 [web-ifc](https://github.com/ThatOpen/engine_web-ifc) 라이브러리를 사용하여 IFC(Industry Foundation Classes) 파일을 웹 브라우저에서 표시하는 방법을 설명합니다.

## 목차

1. [IFC 파일이란?](#ifc-파일이란)
2. [web-ifc 라이브러리 소개](#web-ifc-라이브러리-소개)
3. [환경 설정](#환경-설정)
4. [기본 사용법](#기본-사용법)
5. [실전 예제](#실전-예제)
6. [고급 기능](#고급-기능)
7. [문제 해결](#문제-해결)

---

## IFC 파일이란?

IFC(Industry Foundation Classes)는 건축, 엔지니어링, 건설(AEC) 산업에서 BIM(Building Information Modeling) 데이터를 교환하기 위한 개방형 표준 파일 형식입니다. IFC 파일은 3D 모델의 기하학적 정보뿐만 아니라 건물 요소의 속성, 재료, 관계 등 풍부한 메타데이터를 포함합니다.

### IFC 파일의 특징

- **개방형 표준**: ISO 16739 표준으로 정의됨
- **플랫폼 독립적**: 다양한 BIM 소프트웨어 간 호환성
- **풍부한 정보**: 기하학뿐만 아니라 속성, 관계, 재료 정보 포함
- **대용량**: 복잡한 건물 모델은 수백 MB 이상일 수 있음

---

## web-ifc 라이브러리 소개

**web-ifc**는 JavaScript로 IFC 파일을 읽고 쓸 수 있는 라이브러리로, WebAssembly를 사용하여 네이티브 수준의 성능을 제공합니다.

### 주요 특징

- ✅ **고성능**: WebAssembly 기반으로 네이티브 속도 제공
- ✅ **브라우저 지원**: 웹 브라우저에서 직접 실행 가능
- ✅ **Node.js 지원**: 서버 사이드에서도 사용 가능
- ✅ **멀티스레딩**: 웹 워커를 통한 병렬 처리 지원
- ✅ **TypeScript 지원**: 완전한 타입 정의 제공

### 라이브러리 구조

```
web-ifc/
├── web-ifc.wasm          # 브라우저용 WASM 바이너리
├── web-ifc-mt.wasm       # 멀티스레딩 지원 WASM
├── web-ifc-node.wasm     # Node.js용 WASM
├── web-ifc-api.js        # 브라우저용 JavaScript API
└── web-ifc-api-node.js   # Node.js용 JavaScript API
```

---

## 환경 설정

### 1. 필수 요구사항

- **Node.js**: v16 이상
- **npm**: v7 이상
- **모던 브라우저**: Chrome, Firefox, Edge, Safari (최신 버전)

### 2. 패키지 설치

#### 방법 1: web-ifc 직접 사용

```bash
npm install web-ifc
```

#### 방법 2: @thatopen/components 사용 (권장)

`@thatopen/components`는 web-ifc를 기반으로 하며, Three.js와 통합된 고수준 API를 제공합니다.

```bash
npm install @thatopen/components @thatopen/ui three
npm install --save-dev typescript vite @types/three
```

### 3. 프로젝트 구조

```
프로젝트/
├── index.html
├── main.ts
├── package.json
├── tsconfig.json
├── vite.config.js
└── public/
    └── resources/
        └── worker.mjs    # Fragment 워커 파일
```

---

## 기본 사용법

### 1. web-ifc 직접 사용하기

#### HTML 설정

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IFC Viewer</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    #container {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="container"></div>
  <input type="file" id="fileInput" accept=".ifc">
  <script type="module" src="/main.js"></script>
</body>
</html>
```

#### JavaScript 코드

```javascript
import * as THREE from "three";
import WebIFC from "web-ifc/web-ifc-api.js";

// Three.js 씬 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("container").appendChild(renderer.domElement);

// web-ifc API 초기화
const ifcApi = new WebIFC.IfcAPI();

async function init() {
  // 라이브러리 초기화
  await ifcApi.Init();
  
  // 파일 입력 이벤트 리스너
  document.getElementById("fileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // 파일을 ArrayBuffer로 읽기
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // IFC 모델 열기
    const modelID = ifcApi.OpenModel(uint8Array);
    
    // 모델의 기하학 정보 가져오기
    const geometries = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCPROJECT);
    
    // Three.js 메시 생성 및 씬에 추가
    // (실제 구현은 더 복잡하며, IFC 데이터를 Three.js 형식으로 변환해야 함)
    
    // 모델 닫기
    ifcApi.CloseModel(modelID);
  });
}

init();

// 렌더 루프
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

### 2. @thatopen/components 사용하기 (권장)

`@thatopen/components`를 사용하면 더 간단하게 IFC 파일을 로드하고 표시할 수 있습니다.

```typescript
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";

const container = document.getElementById("container");
if (!container) throw new Error("Container not found");

async function init() {
  // Components 인스턴스 생성
  const components = new OBC.Components();
  
  // World 생성
  const worlds = components.get(OBC.Worlds);
  const world = worlds.create<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBC.SimpleRenderer
  >();
  
  // 씬, 카메라, 렌더러 설정
  world.scene = new OBC.SimpleScene(components);
  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera = new OBC.SimpleCamera(components);
  
  // 초기화
  components.init();
  world.scene.setup();
  
  // Fragment Manager 초기화
  const fragments = components.get(OBC.FragmentsManager);
  const workerUrl = "/resources/worker.mjs";
  fragments.init(workerUrl);
  
  // IFC 로더 설정
  const ifcLoader = components.get(OBC.IfcLoader);
  ifcLoader.setup(fragments);
  
  // 파일 로드 함수
  const loadIFC = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const modelId = file.name.replace('.ifc', '').replace(/\s+/g, '_');
    
    // IFC 파일 로드 (자동으로 Fragment로 변환됨)
    await ifcLoader.load(buffer, true, modelId);
    
    // 모델이 로드되면 자동으로 씬에 추가됨
    const model = fragments.list.get(modelId);
    if (model) {
      world.scene.three.add(model.object);
      fragments.core.update(true);
    }
  };
  
  // 파일 입력 이벤트
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".ifc";
  fileInput.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) loadIFC(file);
  });
  
  document.body.appendChild(fileInput);
}

init();
```

---

## 실전 예제

### 완전한 IFC 뷰어 구현

다음은 드래그 앤 드롭, 파일 선택, 카메라 자동 조정 등이 포함된 완전한 예제입니다:

```typescript
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";

const container = document.getElementById("container");
if (!container) throw new Error("Container not found");

async function init() {
  try {
    // Components 초기화
    const components = new OBC.Components();
    const worlds = components.get(OBC.Worlds);
    
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBC.SimpleRenderer
    >();
    
    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);
    
    components.init();
    world.scene.setup();
    
    // Fragment Manager 설정
    const fragments = components.get(OBC.FragmentsManager);
    const workerUrl = "/resources/worker.mjs";
    fragments.init(workerUrl);
    
    // 카메라 제어 이벤트
    world.camera.controls.addEventListener("rest", () => {
      fragments.core.update(true);
    });
    
    // Fragment 로드 이벤트
    fragments.list.onItemSet.add(({ value: model }) => {
      model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      fragments.core.update(true);
    });
    
    // IFC 로더 설정
    const ifcLoader = components.get(OBC.IfcLoader);
    ifcLoader.setup(fragments);
    
    // IFC 파일 로드 함수
    const loadIFCFile = async (file: File) => {
      try {
        console.log("Loading IFC file:", file.name);
        
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const modelId = file.name.replace('.ifc', '').replace(/\s+/g, '_');
        
        // IFC 파일 로드
        await ifcLoader.load(buffer, true, modelId);
        
        // 모델이 로드될 때까지 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const loadedModel = fragments.list.get(modelId);
        if (loadedModel) {
          // 카메라를 모델에 맞게 조정
          const box = new THREE.Box3().setFromObject(loadedModel.object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          
          let cameraZ = maxDim * 2;
          if (world.camera.three instanceof THREE.PerspectiveCamera) {
            const fov = world.camera.three.fov * (Math.PI / 180);
            cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
          }
          
          world.camera.three.position.set(
            center.x,
            center.y,
            center.z + cameraZ * 1.5
          );
          
          await world.camera.controls.setLookAt(
            world.camera.three.position.x,
            world.camera.three.position.y,
            world.camera.three.position.z,
            center.x,
            center.y,
            center.z
          );
          
          fragments.core.update(true);
          console.log("IFC file loaded successfully");
        }
      } catch (error) {
        console.error("Error loading IFC file:", error);
        alert(`Failed to load IFC file: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    // 파일 업로드 핸들러
    const handleFileUpload = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        if (file.name.toLowerCase().endsWith('.ifc')) {
          loadIFCFile(file);
        } else {
          alert('Please select an IFC file (.ifc)');
        }
      }
    };
    
    // 드래그 앤 드롭 핸들러
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.toLowerCase().endsWith('.ifc')) {
          loadIFCFile(file);
        } else {
          alert('Please drop an IFC file (.ifc)');
        }
      }
    };
    
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
    
    // UI 패널 생성
    BUI.Manager.init();
    
    const panel = BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`
        <bim-panel label="IFC Viewer" class="options-menu">
          <bim-panel-section label="File Upload">
            <bim-button 
              label="Load IFC File" 
              icon="solar:file-upload-bold"
              @click="${() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.ifc';
                input.addEventListener('change', handleFileUpload);
                input.click();
              }}">
            </bim-button>
            <p style="margin: 10px 0; font-size: 12px; color: #888;">
              Or drag and drop an IFC file onto the viewer
            </p>
          </bim-panel-section>
          
          <bim-panel-section label="Controls">
            <bim-color-input 
              label="Background Color" color="#202932" 
              @input="${({ target }: { target: BUI.ColorInput }) => {
                world.scene.config.backgroundColor = new THREE.Color(target.color);
              }}">
            </bim-color-input>
            
            <bim-number-input 
              slider step="0.1" label="Directional lights intensity" value="1.5" min="0.1" max="10"
              @change="${({ target }: { target: BUI.NumberInput }) => {
                world.scene.config.directionalLight.intensity = target.value;
              }}">
            </bim-number-input>
            
            <bim-number-input 
              slider step="0.1" label="Ambient light intensity" value="1" min="0.1" max="5"
              @change="${({ target }: { target: BUI.NumberInput }) => {
                world.scene.config.ambientLight.intensity = target.value;
              }}">
            </bim-number-input>
          </bim-panel-section>
        </bim-panel>
      `;
    });
    
    document.body.append(panel);
    
    // 성능 모니터링
    const stats = new Stats();
    stats.showPanel(2);
    document.body.append(stats.dom);
    stats.dom.style.left = "0px";
    stats.dom.style.zIndex = "unset";
    world.renderer.onBeforeUpdate.add(() => stats.begin());
    world.renderer.onAfterUpdate.add(() => stats.end());
    
  } catch (error) {
    console.error("Error initializing IFC viewer:", error);
  }
}

init();
```

---

## 고급 기능

### 1. IFC 속성 읽기

IFC 파일에서 요소의 속성을 읽을 수 있습니다:

```typescript
import * as WebIFC from "web-ifc/web-ifc-api.js";

const ifcApi = new WebIFC.IfcAPI();
await ifcApi.Init();

// 모델 열기
const modelID = ifcApi.OpenModel(ifcData);

// 특정 타입의 모든 요소 가져오기
const wallIDs = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCWALLSTANDARDCASE);

// 요소의 속성 읽기
wallIDs.forEach((wallID) => {
  const wall = ifcApi.GetLine(modelID, wallID);
  console.log("Wall properties:", wall);
  
  // 특정 속성 읽기
  const name = ifcApi.GetName(modelID, wallID);
  const type = ifcApi.GetType(modelID, wallID);
  
  console.log(`Wall ${wallID}: ${name} (${type})`);
});

// 모델 닫기
ifcApi.CloseModel(modelID);
```

### 2. 멀티스레딩 사용

대용량 IFC 파일의 경우 멀티스레딩을 사용하여 성능을 향상시킬 수 있습니다:

```typescript
// 멀티스레딩 지원 WASM 사용
// web-ifc-mt.wasm 파일이 필요함

const ifcApi = new WebIFC.IfcAPI();
await ifcApi.Init();

// 멀티스레딩 모드 활성화 (브라우저에서만 지원)
if (ifcApi.wasmPath) {
  // 멀티스레딩 WASM 경로 설정
  ifcApi.SetWasmPath("./path/to/web-ifc-mt.wasm");
}
```

### 3. IFC 파일 쓰기

IFC 파일을 생성하거나 수정할 수 있습니다:

```typescript
// 새 IFC 모델 생성
const modelID = ifcApi.CreateModel();

// 요소 추가
const wallID = ifcApi.CreateIfcWallStandardCase(modelID, {
  // 속성 설정
});

// 모델을 파일로 저장
const ifcData = ifcApi.SaveModel(modelID);
const blob = new Blob([ifcData], { type: "application/octet-stream" });

// 다운로드
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "model.ifc";
a.click();
```

### 4. 성능 최적화

대용량 IFC 파일의 경우 다음 최적화 기법을 사용하세요:

```typescript
// 1. LOD (Level of Detail) 사용
fragments.core.update(true); // 전체 업데이트
fragments.core.update(false); // 증분 업데이트

// 2. 프러스텀 컬링 활성화
world.camera.controls.addEventListener("rest", () => {
  fragments.core.update(true);
});

// 3. 메모리 관리
// 사용하지 않는 모델은 제거
fragments.list.delete(modelId);
fragments.core.dispose([modelId]);

// 4. 웹 워커 사용
// Fragment Manager는 자동으로 웹 워커를 사용합니다
```

---

## 문제 해결

### 일반적인 문제

#### 1. WASM 파일을 찾을 수 없음

**문제**: `Failed to load WASM file` 오류

**해결책**:
```typescript
// WASM 파일 경로 명시적으로 설정
ifcApi.SetWasmPath("/path/to/web-ifc.wasm");
```

#### 2. CORS 오류

**문제**: 워커 파일 로드 시 CORS 오류

**해결책**:
- 워커 파일을 `public/` 디렉토리에 배치
- 상대 경로 사용: `/resources/worker.mjs`
- 개발 서버에서 CORS 헤더 설정

#### 3. 메모리 부족

**문제**: 대용량 IFC 파일 로드 시 메모리 부족

**해결책**:
```typescript
// 모델을 여러 번에 나누어 로드
// 불필요한 모델 제거
fragments.list.delete(oldModelId);
fragments.core.dispose([oldModelId]);

// 가비지 컬렉션 강제 실행 (주의: 성능에 영향)
if (global.gc) {
  global.gc();
}
```

#### 4. 성능 저하

**문제**: 렌더링 성능이 느림

**해결책**:
- Stats.js로 성능 모니터링
- Fragment 업데이트 최적화
- 카메라 이동 시 증분 업데이트만 사용
- 모델 복잡도 감소 (LOD 사용)

#### 5. TypeScript 타입 오류

**문제**: 타입 정의를 찾을 수 없음

**해결책**:
```bash
npm install --save-dev @types/web-ifc
```

또는 `tsconfig.json`에 타입 정의 추가:
```json
{
  "compilerOptions": {
    "types": ["web-ifc"]
  }
}
```

### 디버깅 팁

1. **콘솔 로깅**: IFC 로드 과정을 단계별로 로깅
2. **브라우저 개발자 도구**: Network 탭에서 WASM 파일 로드 확인
3. **성능 프로파일링**: Chrome DevTools Performance 탭 사용
4. **메모리 프로파일링**: Chrome DevTools Memory 탭 사용

---

## 참고 자료

### 공식 문서

- [web-ifc GitHub](https://github.com/ThatOpen/engine_web-ifc)
- [web-ifc 문서](https://thatopen.github.io/engine_web-ifc/)
- [@thatopen/components 문서](https://thatopen.github.io/engine_components/)
- [Three.js 문서](https://threejs.org/docs/)

### 예제 및 데모

- [web-ifc 데모](https://thatopen.github.io/engine_web-ifc/demo)
- [@thatopen/components 예제](https://github.com/ThatOpen/engine_components/tree/main/examples)

### IFC 표준

- [IFC 공식 사이트](https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/)
- [IFC 스키마 문서](https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/)

---

## 결론

이 가이드를 통해 IFC 파일을 웹 브라우저에서 표시하는 방법을 배웠습니다. `web-ifc`와 `@thatopen/components`를 사용하면 고성능의 웹 기반 IFC 뷰어를 구축할 수 있습니다.

### 다음 단계

1. ✅ 기본 IFC 뷰어 구현
2. 🔄 속성 패널 추가
3. 🔄 선택 및 하이라이트 기능
4. 🔄 측정 도구 추가
5. 🔄 클리핑 평면 기능
6. 🔄 섹션 뷰 기능

---

**작성일**: 2025년 1월  
**버전**: 1.0.0  
**라이브러리 버전**: web-ifc 0.0.73, @thatopen/components 3.2.6


