// IFC Viewer - examples/viewer 패턴 기반 구현
import { initIFCViewer } from "./ifc-viewer-assembly";

const container = document.getElementById("container");
if (!container) {
  throw new Error("Container element not found!");
}

// IFC 뷰어 초기화
initIFCViewer(container);
