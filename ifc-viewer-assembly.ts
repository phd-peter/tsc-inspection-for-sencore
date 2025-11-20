import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { IfcAPI, FlatMesh, PlacedGeometry, Color, IFCRELAGGREGATES, IFCELEMENTASSEMBLY } from "web-ifc";

// 씬 초기화
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

// === IFC / Mesh 관리용 전역 ===
let currentModelID: number | null = null;

// 각 Ifc 요소(expressID)별로 Mesh들을 저장
const elementMeshMap = new Map<number, THREE.Mesh[]>();

// IfcRelAggregates: 부모(Assembly 등) → 자식 요소들
const childrenByParent = new Map<number, number[]>();

function initScene(container: HTMLElement) {
  // 씬 생성
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8cc7de);

  // 카메라 생성
  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.position.set(10, 10, 10);

  // 렌더러 생성
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // 컨트롤 설정
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);

  // 조명 추가 (examples/viewer 패턴 사용)
  initBasicScene();

  // 윈도우 리사이즈 핸들러
  window.addEventListener("resize", () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  // 애니메이션 루프
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

// 기본 씬 초기화 (examples/viewer/web-ifc-scene.ts 패턴)
function initBasicScene() {
  const directionalLight1 = new THREE.DirectionalLight(0xffeeff, 0.8);
  directionalLight1.position.set(1, 1, 1);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight2.position.set(-1, 0.5, -1);
  scene.add(directionalLight2);

  const ambientLight = new THREE.AmbientLight(0xffffee, 0.25);
  scene.add(ambientLight);
}

// 씬 클리어
function clearScene() {
  while (scene.children.length > 0) {
    const child = scene.children[0];
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat.dispose());
      } else {
        child.material.dispose();
      }
    }
    scene.remove(child);
  }
  // 조명 다시 추가
  initBasicScene();

  // 🔥 IFC 관련 상태 초기화
  elementMeshMap.clear();
  childrenByParent.clear();
  currentModelID = null;
}

// IFC API 초기화
const ifcAPI = new IfcAPI();
let ifcAPIInitialized = false;

// WASM 경로 설정 - Vite에서는 node_modules에서 직접 로드
ifcAPI.SetWasmPath("/node_modules/web-ifc/");

// 로딩 인디케이터 표시/숨김
function showLoadingIndicator(show: boolean) {
  const indicator = document.getElementById("loadingIndicator");
  if (indicator) {
    if (show) {
      indicator.classList.add("active");
    } else {
      indicator.classList.remove("active");
    }
  }
}

// IFC 모델 로드 (examples/viewer/web-ifc-viewer.ts 패턴 사용)
async function loadIFCModel(file: File) {
  try {
    console.log("Loading IFC file:", file.name);
    showLoadingIndicator(true);

    // IFC API 초기화 (한 번만)
    if (!ifcAPIInitialized) {
      await ifcAPI.Init();
      ifcAPIInitialized = true;
    }

    // 이전 모델이 열려있으면 닫기
    if (currentModelID !== null) {
      ifcAPI.CloseModel(currentModelID);
      currentModelID = null;
    }

    // 파일 읽기
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 모델 열기 (examples/viewer의 설정 사용)
    const modelID = ifcAPI.OpenModel(buffer, {
      COORDINATE_TO_ORIGIN: true,
      CIRCLE_SEGMENTS: 6,
      TOLERANCE_PLANE_INTERSECTION: 1.0e-4,
      TOLERANCE_PLANE_DEVIATION: 1.0e-4,
      TOLERANCE_BACK_DEVIATION_DISTANCE: 1.0e-4,
      TOLERANCE_INSIDE_OUTSIDE_PERIMETER: 1.0e-10,
      TOLERANCE_SCALAR_EQUALITY: 1.0e-4,
      PLANE_REFIT_ITERATIONS: 3,
      BOOLEAN_UNION_THRESHOLD: 100,
    });

    console.log("Model opened, ID:", modelID);

    // 기존 씬 클리어
    clearScene();

    // 🔥 현재 모델 ID 저장
    currentModelID = modelID;

    // 지오메트리 로드 (FlatMesh → expressID별 Mesh 생성)
    ifcAPI.StreamAllMeshes(modelID, (mesh: FlatMesh) => {
      const placedGeometries = mesh.geometries;

      // 🔥 이 Mesh(FlatMesh)가 속한 IfcProduct의 expressID
      const elementID = mesh.expressID; // web-ifc에서 제공

      for (let i = 0; i < placedGeometries.size(); i++) {
        const placedGeometry = placedGeometries.get(i);
        const geometry = getBufferGeometry(modelID, placedGeometry);
        const matrix = getMatrix(placedGeometry.flatTransformation);

        geometry.applyMatrix4(matrix);

        // 불투명 / 투명 구분해서 material 설정
        const isTransparent = placedGeometry.color.w !== 1;

        const material = new THREE.MeshPhongMaterial({
          side: THREE.DoubleSide,
          vertexColors: true,
          transparent: isTransparent,
          opacity: isTransparent ? 0.5 : 1.0,
        });

        const threeMesh = new THREE.Mesh(geometry, material);

        // 🔥 Ifc 정보 메쉬에 태깅
        (threeMesh as any).ifcId = elementID;
        (threeMesh as any).modelID = modelID;

        // 🔥 elementMeshMap에 등록
        if (!elementMeshMap.has(elementID)) {
          elementMeshMap.set(elementID, []);
        }
        elementMeshMap.get(elementID)!.push(threeMesh);

        scene.add(threeMesh);
      }
    });

    console.log(
      `Loaded ${elementMeshMap.size} IFC elements with meshes`
    );

    // 카메라를 모델에 맞게 조정
    const box = new THREE.Box3();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        box.expandByObject(object);
      }
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const fov = camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

    camera.position.set(center.x, center.y, center.z + cameraZ);
    controls.target.copy(center);
    controls.update();

    // 🔥 Assembly 트리(조립 관계) 그래프 생성
    buildAggregationGraph(modelID);

    console.log("IFC model loaded successfully");
    showLoadingIndicator(false);
    
    // 로딩 완료 메시지 업데이트
    updateStatusMessage(`IFC 모델 로드 완료: ${file.name}`, "success");
  } catch (error) {
    console.error("Error loading IFC model:", error);
    showLoadingIndicator(false);
    updateStatusMessage(
      `IFC 파일 로드 실패: ${error instanceof Error ? error.message : String(error)}`,
      "error"
    );
  }
}

// 버퍼 지오메트리 가져오기 (examples/viewer/web-ifc-three.ts 패턴)
function getBufferGeometry(
  modelID: number,
  placedGeometry: PlacedGeometry
): THREE.BufferGeometry {
  const geometry = ifcAPI.GetGeometry(modelID, placedGeometry.geometryExpressID);
  const verts = ifcAPI.GetVertexArray(
    geometry.GetVertexData(),
    geometry.GetVertexDataSize()
  );
  const indices = ifcAPI.GetIndexArray(
    geometry.GetIndexData(),
    geometry.GetIndexDataSize()
  );

  const bufferGeometry = ifcGeometryToBuffer(
    placedGeometry.color,
    verts,
    indices
  );

  // 메모리 해제
  geometry.delete();

  return bufferGeometry;
}

// 지오메트리를 버퍼로 변환 (examples/viewer/web-ifc-three.ts 패턴)
function ifcGeometryToBuffer(
  color: Color,
  vertexData: Float32Array,
  indexData: Uint32Array
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const posFloats = new Float32Array(vertexData.length / 2);
  const normFloats = new Float32Array(vertexData.length / 2);
  const colorFloats = new Float32Array(vertexData.length / 2);

  for (let i = 0; i < vertexData.length; i += 6) {
    posFloats[i / 2 + 0] = vertexData[i + 0];
    posFloats[i / 2 + 1] = vertexData[i + 1];
    posFloats[i / 2 + 2] = vertexData[i + 2];

    normFloats[i / 2 + 0] = vertexData[i + 3];
    normFloats[i / 2 + 1] = vertexData[i + 4];
    normFloats[i / 2 + 2] = vertexData[i + 5];

    colorFloats[i / 2 + 0] = color.x;
    colorFloats[i / 2 + 1] = color.y;
    colorFloats[i / 2 + 2] = color.z;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(posFloats, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normFloats, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colorFloats, 3));
  geometry.setIndex(new THREE.BufferAttribute(indexData, 1));

  return geometry;
}

// 매트릭스 가져오기
function getMatrix(matrix: number[]): THREE.Matrix4 {
  const mat = new THREE.Matrix4();
  mat.fromArray(matrix);
  return mat;
}

// visible된 Mesh들의 bounding box에 카메라 자동 확대
function fitCameraToVisibleMeshes() {
  const box = new THREE.Box3();
  let hasVisibleMesh = false;

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.visible) {
      box.expandByObject(object);
      hasVisibleMesh = true;
    }
  });

  if (!hasVisibleMesh) {
    console.warn("No visible meshes to fit camera to");
    return;
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // 빈 bounding box인 경우 처리
  if (maxDim === 0) {
    console.warn("Bounding box is empty");
    return;
  }

  const fov = camera.fov * (Math.PI / 180);
  const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

  camera.position.set(center.x, center.y, center.z + cameraZ);
  controls.target.copy(center);
  controls.update();
}

// 모든 Mesh를 보이게 하고 전체 모델에 카메라 fit
function showAllMeshes() {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.visible = true;
    }
  });

  fitCameraToVisibleMeshes();
  updateStatusMessage("전체 모델 표시", "success");
}

// IfcRelAggregates(조립 관계) 그래프 만들기
function buildAggregationGraph(modelID: number) {
  try {
    childrenByParent.clear();

    // IFCRELAGGREGATES 엔티티 타입의 모든 라인 ID 가져오기
    const relIDs = ifcAPI.GetLineIDsWithType(modelID, IFCRELAGGREGATES);

    for (let i = 0; i < relIDs.size(); i++) {
      const relID = relIDs.get(i);
      const rel = ifcAPI.GetLine(modelID, relID);

      // web-ifc 구조: RelatingObject.value, RelatedObjects: [{ value }, ...]
      const parent = rel.RelatingObject?.value;
      const children = (rel.RelatedObjects || []).map((c: any) => c.value);

      if (typeof parent !== "number") continue;

      if (!childrenByParent.has(parent)) {
        childrenByParent.set(parent, []);
      }
      const arr = childrenByParent.get(parent)!;
      for (const child of children) {
        arr.push(child);
      }
    }

    console.log("Aggregation graph built:", childrenByParent.size, "parents");
  } catch (error) {
    console.error("Error building aggregation graph:", error);
    console.warn("Assembly filtering may not work correctly");
  }
}

// 특정 Assembly(ExpressID)의 모든 하위 부재 찾기
function collectDescendants(rootID: number, result: Set<number>) {
  const stack = [rootID];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);

    const children = childrenByParent.get(current);
    if (!children) continue;

    for (const child of children) {
      if (!result.has(child)) {
        stack.push(child);
      }
    }
  }
}

// Assembly Mark로 필터링
async function isolateAssemblyMark(mark: string) {
  if (currentModelID == null) {
    console.warn("No IFC model loaded");
    updateStatusMessage("IFC 모델이 로드되지 않았습니다.", "error");
    return;
  }

  const modelID = currentModelID;

  try {
    // 1) 모든 IFCELEMENTASSEMBLY 찾아서 ObjectType == mark 인 것들 찾기
    const asmIDs = ifcAPI.GetLineIDsWithType(modelID, IFCELEMENTASSEMBLY);

    const targetAssemblyIDs: number[] = [];

    for (let i = 0; i < asmIDs.size(); i++) {
      const id = asmIDs.get(i);
      const line = ifcAPI.GetLine(modelID, id);

      // Tekla에서는 ObjectType = Assembly Mark (예: '2TG017')

    //   const objectType = line.ObjectType?.value as string | undefined;

    //   if (objectType === mark) {
    //     targetAssemblyIDs.push(id);
    //   }
      const tag = line.Tag?.value as string | undefined;

      if (tag === mark) {
        targetAssemblyIDs.push(id);
      }

    }

    if (targetAssemblyIDs.length === 0) {
      console.warn(`Assembly mark "${mark}" not found.`);
      updateStatusMessage(`Assembly mark "${mark}"를 가진 조립을 찾지 못했습니다.`, "error");
      return;
    }

    // 2) 해당 Assembly들의 하위 부재 ExpressID 집합 수집
    const visibleIDs = new Set<number>();

    for (const asmID of targetAssemblyIDs) {
      collectDescendants(asmID, visibleIDs);
    }

    // 3) 씬의 모든 Mesh를 일단 숨기고,
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.visible = false;
      }
    });

    // 4) visibleIDs에 포함된 expressID에 해당하는 Mesh만 다시 보여주기
    for (const id of visibleIDs) {
      const meshes = elementMeshMap.get(id);
      if (!meshes) continue;
      for (const m of meshes) {
        m.visible = true;
      }
    }

    // 5) 카메라를 visible된 Mesh들에 맞게 자동 확대
    fitCameraToVisibleMeshes();

    updateStatusMessage(`Assembly mark "${mark}" 조립만 표시 중`, "success");
    console.log(`Isolated assembly mark "${mark}" with ${visibleIDs.size} IFC elements.`);
  } catch (error) {
    console.error("Error isolating assembly mark:", error);
    updateStatusMessage(`Assembly 필터링 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

// 상태 메시지 업데이트
let statusMessageElement: HTMLElement | null = null;

function updateStatusMessage(message: string, type: "info" | "success" | "error" = "info") {
  if (!statusMessageElement) return;
  
  statusMessageElement.textContent = message;
  statusMessageElement.style.background = 
    type === "success" ? "rgba(76, 175, 80, 0.9)" :
    type === "error" ? "rgba(244, 67, 54, 0.9)" :
    "rgba(0, 0, 0, 0.7)";
  
  statusMessageElement.style.opacity = "1";
  
  if (type === "success" || type === "error") {
    setTimeout(() => {
      if (statusMessageElement) {
        statusMessageElement.style.opacity = "0";
        statusMessageElement.style.transition = "opacity 0.5s";
      }
    }, 3000);
  }
}

// 초기화 함수
export function initIFCViewer(container: HTMLElement) {
  initScene(container);

  // 파일 입력 생성
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".ifc";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  // 파일 선택 핸들러
  fileInput.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      updateStatusMessage(`IFC 파일 로딩 중: ${target.files[0].name}...`, "info");
      loadIFCModel(target.files[0]);
    }
  });

  // 드래그 앤 드롭 핸들러
  let dragCounter = 0;
  
  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.style.border = "3px dashed #4CAF50";
    container.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
  });

  container.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
      container.style.border = "";
      container.style.backgroundColor = "";
    }
  });

  container.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    container.style.border = "";
    container.style.backgroundColor = "";

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith(".ifc")) {
        updateStatusMessage(`IFC 파일 로딩 중: ${file.name}...`, "info");
        loadIFCModel(file);
      } else {
        updateStatusMessage("IFC 파일(.ifc)만 지원됩니다.", "error");
      }
    }
  });

  // 파일 선택 버튼 추가
  const button = document.createElement("button");
  button.textContent = "IFC 파일 열기";
  button.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1000;
    padding: 12px 24px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
  `;
  button.addEventListener("mouseenter", () => {
    button.style.background = "#45a049";
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = "#4CAF50";
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  });
  button.addEventListener("click", () => fileInput.click());
  document.body.appendChild(button);

  // Tag 입력 필드 및 필터 UI 추가
  const filterContainer = document.createElement("div");
  filterContainer.style.cssText = `
    position: fixed;
    top: 80px;
    left: 20px;
    z-index: 1000;
    display: flex;
    gap: 8px;
    align-items: center;
  `;

  const tagInput = document.createElement("input");
  tagInput.type = "text";
  tagInput.placeholder = "Tag 입력 (예: 2TG017)";
  tagInput.style.cssText = `
    padding: 10px 16px;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    width: 200px;
    outline: none;
    transition: border-color 0.3s ease;
  `;
  tagInput.addEventListener("focus", () => {
    tagInput.style.borderColor = "#4CAF50";
  });
  tagInput.addEventListener("blur", () => {
    tagInput.style.borderColor = "#ddd";
  });
  tagInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const tag = tagInput.value.trim();
      if (tag) {
        isolateAssemblyMark(tag);
      }
    }
  });

  const filterButton = document.createElement("button");
  filterButton.textContent = "필터 적용";
  filterButton.style.cssText = `
    padding: 10px 20px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;
  filterButton.addEventListener("mouseenter", () => {
    filterButton.style.background = "#1976D2";
    filterButton.style.transform = "translateY(-1px)";
    filterButton.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  });
  filterButton.addEventListener("mouseleave", () => {
    filterButton.style.background = "#2196F3";
    filterButton.style.transform = "translateY(0)";
    filterButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  });
  filterButton.addEventListener("click", () => {
    const tag = tagInput.value.trim();
    if (tag) {
      isolateAssemblyMark(tag);
    } else {
      updateStatusMessage("Tag를 입력해주세요.", "error");
    }
  });

  const showAllButton = document.createElement("button");
  showAllButton.textContent = "전체 보기";
  showAllButton.style.cssText = `
    padding: 10px 20px;
    background: #FF9800;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;
  showAllButton.addEventListener("mouseenter", () => {
    showAllButton.style.background = "#F57C00";
    showAllButton.style.transform = "translateY(-1px)";
    showAllButton.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  });
  showAllButton.addEventListener("mouseleave", () => {
    showAllButton.style.background = "#FF9800";
    showAllButton.style.transform = "translateY(0)";
    showAllButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  });
  showAllButton.addEventListener("click", () => {
    showAllMeshes();
  });

  filterContainer.appendChild(tagInput);
  filterContainer.appendChild(filterButton);
  filterContainer.appendChild(showAllButton);
  document.body.appendChild(filterContainer);

  // 상태 메시지 표시 영역
  statusMessageElement = document.createElement("div");
  statusMessageElement.style.cssText = `
    position: fixed;
    top: 140px;
    left: 20px;
    z-index: 1000;
    padding: 12px 20px;
    background: rgba(0,0,0,0.7);
    color: white;
    border-radius: 6px;
    font-size: 14px;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    pointer-events: none;
  `;
  statusMessageElement.textContent = "IFC 파일을 선택하거나 드래그 앤 드롭하세요";
  document.body.appendChild(statusMessageElement);

  // 초기 안내 메시지 (5초 후 페이드아웃)
  setTimeout(() => {
    if (statusMessageElement) {
      statusMessageElement.style.opacity = "0.5";
      statusMessageElement.style.transition = "opacity 0.5s";
    }
  }, 5000);
}

// 디버그 / 외부 호출용: 특정 어셈블리 마크만 화면에 표시
export function focusAssemblyMark(mark: string) {
  isolateAssemblyMark(mark);
}

/**
 * IFC 데이터(숫자/라벨/리스트/객체)를 재귀적으로 JSON으로 변환
 */
function formatIFCValue(value: any, modelID: number): any {
  if (value === null || value === undefined) return null;

  // primitive
  if (typeof value !== "object") return value;

  // IFC label wrapper
  if ("value" in value && typeof value.value !== "object") {
    return value.value;
  }

  // 리스트 타입
  if (Array.isArray(value)) {
    return value.map((v) => formatIFCValue(v, modelID));
  }

  // IFC 엔티티 참조 (#1234 형태)
  if ("type" in value && "value" in value && typeof value.value === "number") {
    try {
      const refLine = ifcAPI.GetLine(modelID, value.value);
      return { ref: value.value, entity: formatIFCValue(refLine, modelID) };
    } catch {
      return { ref: value.value, entity: null };
    }
  }

  // 일반 객체(모든 필드 재귀 처리)
  const result: any = {};
  for (const key of Object.keys(value)) {
    try {
      result[key] = formatIFCValue(value[key], modelID);
    } catch {
      result[key] = null;
    }
  }
  return result;
}

/**
 * GlobalId로 해당 IFC 엔티티의 모든 속성을 출력하는 함수
 */
async function printIFCEntity(globalId: string) {
  if (!ifcAPI || currentModelID == null) {
    console.error("IFC model not loaded.");
    return;
  }

  const modelID = currentModelID;

  // 1) 전체 IFC를 스캔해서 해당 GlobalId를 가진 ID 찾기
  // IFC 파일은 보통 수만 개의 엔티티를 가지므로 합리적인 범위로 스캔
  let targetID: number | null = null;
  const maxScanID = 500000; // 최대 스캔 범위

  console.log(`Searching for GlobalId: ${globalId}...`);

  for (let id = 1; id <= maxScanID; id++) {
    try {
      const line = ifcAPI.GetLine(modelID, id);
      if (line && line.GlobalId?.value === globalId) {
        targetID = id;
        break;
      }
    } catch (e) {
      // skip missing lines
    }
  }

  if (targetID == null) {
    console.warn(`GlobalId ${globalId} not found. (Scanned up to line ${maxScanID})`);
    return;
  }

  // 2) 해당 ID의 내용을 가져오기
  const entity = ifcAPI.GetLine(modelID, targetID);

  // 3) 재귀적으로 객체를 JSON 형태로 정리
  const formatted = formatIFCValue(entity, modelID);

  console.log("======= IFC Entity Full Structure =======");
  console.log(`GlobalId: ${globalId}`);
  console.log(`Line ID: ${targetID}`);
  console.log(JSON.stringify(formatted, null, 2));
  console.log("=========================================");

  return formatted;
}

// 브라우저 콘솔에서 접근 가능하도록 window 객체에 노출
if (typeof window !== "undefined") {
  (window as any).focusAssemblyMark = focusAssemblyMark;
  (window as any).printIFCEntity = printIFCEntity;
}

