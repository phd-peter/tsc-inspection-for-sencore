import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { IfcAPI, FlatMesh, PlacedGeometry, Color } from "web-ifc";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

// 씬 초기화
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

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

    // 지오메트리 로드 (examples/viewer/web-ifc-three.ts 패턴 사용)
    const geometries: THREE.BufferGeometry[] = [];
    const transparentGeometries: THREE.BufferGeometry[] = [];

    ifcAPI.StreamAllMeshes(modelID, (mesh: FlatMesh) => {
      const placedGeometries = mesh.geometries;

      for (let i = 0; i < placedGeometries.size(); i++) {
        const placedGeometry = placedGeometries.get(i);
        const geometry = getBufferGeometry(modelID, placedGeometry);
        const matrix = getMatrix(placedGeometry.flatTransformation);

        geometry.applyMatrix4(matrix);

        if (placedGeometry.color.w !== 1) {
          transparentGeometries.push(geometry);
        } else {
          geometries.push(geometry);
        }
      }
    });

    console.log(
      `Loaded ${geometries.length} geometries and ${transparentGeometries.length} transparent geometries`
    );

    // 불투명 지오메트리 병합 및 추가
    if (geometries.length > 0) {
      const combinedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
      const material = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        vertexColors: true,
      });
      const mesh = new THREE.Mesh(combinedGeometry, material);
      scene.add(mesh);
    }

    // 투명 지오메트리 병합 및 추가
    if (transparentGeometries.length > 0) {
      const combinedGeometry = BufferGeometryUtils.mergeGeometries(
        transparentGeometries
      );
      const material = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
      });
      const mesh = new THREE.Mesh(combinedGeometry, material);
      scene.add(mesh);
    }

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

    // 모델 닫기
    ifcAPI.CloseModel(modelID);

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

  // 상태 메시지 표시 영역
  statusMessageElement = document.createElement("div");
  statusMessageElement.style.cssText = `
    position: fixed;
    top: 70px;
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

