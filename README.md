# 3D IFC Viewer

A modern web application for viewing and interacting with 3D models using `@thatopen/components`, `@thatopen/ui`, and Three.js.

## Features

- 🎨 Interactive 3D scene rendering
- 🖼️ Fragment-based 3D model loading
- 📁 IFC file loading and visualization
- 🔍 Assembly Mark filtering by Tag
- 📷 Automatic camera fitting to filtered elements
- 🔎 Entity property inspection via GlobalId
- 🎛️ Real-time UI controls for scene customization
- 📊 Performance monitoring with Stats.js
- 🔧 TypeScript support

## Tech Stack

- **Three.js** - 3D graphics library
- **web-ifc** - IFC file parsing and processing
- **@thatopen/components** - 3D components framework
- **@thatopen/ui** - UI component library
- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe JavaScript

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tsc-ifc-test2
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in the terminal).

## Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
tsc-ifc-test2/
├── public/
│   └── resources/
│       └── worker.mjs          # Web Worker for fragment processing
├── example.ts                  # Tutorial example code (reference)
├── index.html                  # HTML entry point
├── main.ts                     # Main application code
├── package.json                # Dependencies and scripts
├── prd.md                      # Project requirements document
├── tsconfig.json               # TypeScript configuration
├── vite.config.js              # Vite configuration
├── .gitignore                  # Git ignore rules
└── README.md                    # This file
```

## Usage

### Basic Setup

The application initializes a 3D world with:
- A scene with lighting
- A camera with orbit controls
- A renderer for WebGL rendering
- IFC file loading and visualization capabilities

### Loading IFC Files

1. **Start the application** - Run `npm run dev` and open the browser
2. **Load an IFC file** - Use the "IFC 파일 열기" button or drag & drop
3. **Filter by Tag** - Enter a Tag value (e.g., `2TG017`) and click "필터 적용"
4. **View all** - Click "전체 보기" to restore the full model

See the [User Guide](#user-guide) section for detailed instructions.

### UI Controls

The application includes UI controls for:
- IFC file loading (button and drag & drop)
- Tag-based filtering (input field and filter button)
- Full model view restoration (show all button)
- Status messages for user feedback

## Configuration

### Vite Configuration

The `vite.config.js` file contains basic server configuration. You can customize:
- Server port
- Auto-open browser
- Proxy settings

### TypeScript Configuration

The `tsconfig.json` file includes:
- Strict type checking
- ES2020 target
- ESNext modules
- DOM library support

## Troubleshooting

### CORS Issues

If you encounter CORS errors when loading worker files:
- Ensure the worker file is in the `public/resources/` directory
- Use relative paths (`/resources/worker.mjs`) instead of absolute URLs

### Performance Issues

- Check the Stats.js panel in the top-left corner for FPS and memory usage
- Reduce model complexity if performance is poor
- Consider using LOD (Level of Detail) for large models

## IFC File Loading

The application supports loading and viewing IFC (Industry Foundation Classes) files with advanced filtering capabilities.

### Features

- ✅ File upload interface (drag & drop or file picker)
- ✅ IFC file parsing and 3D visualization
- ✅ Assembly Mark filtering by Tag
- ✅ Automatic camera fitting to filtered elements
- ✅ Full model view restoration
- ✅ Entity property inspection via GlobalId

## User Guide

### Loading IFC Files

1. **File Upload Methods:**
   - Click the "IFC 파일 열기" (Open IFC File) button in the top-left corner
   - Or drag and drop an `.ifc` file directly onto the viewer

2. **Filtering by Assembly Tag:**
   - After loading an IFC file, enter the Tag value (e.g., `2TG017`) in the Tag input field
   - Click "필터 적용" (Apply Filter) button or press Enter
   - The viewer will automatically:
     - Hide all elements except those belonging to the specified Assembly
     - Zoom and fit the camera to show only the filtered elements

3. **Viewing All Elements:**
   - Click the "전체 보기" (Show All) button to restore the full model view
   - The camera will automatically adjust to fit all elements

### Browser Console Commands

For advanced users, the following functions are available in the browser console:

- `focusAssemblyMark("2TG017")` - Filter and show only elements with the specified Tag
- `printIFCEntity("GlobalId")` - Print all properties of an IFC entity by its GlobalId

**Example:**
```javascript
// Filter by Tag
focusAssemblyMark("2TG017");

// Inspect entity properties
printIFCEntity("1emYFA003LZp4tDJSrE34n");
```

## Developer Guide

### Key Functions

#### `initIFCViewer(container: HTMLElement)`
Initializes the IFC viewer with the specified container element. Sets up the 3D scene, camera, renderer, and UI controls.

#### `loadIFCModel(file: File)`
Loads and parses an IFC file:
- Initializes the web-ifc API if needed
- Opens the IFC model and creates meshes for each element
- Builds the aggregation graph (parent-child relationships)
- Automatically adjusts the camera to fit the model

#### `isolateAssemblyMark(mark: string)`
Filters the scene to show only elements belonging to assemblies with the specified Tag:
- Searches for `IFCELEMENTASSEMBLY` entities with matching Tag
- Collects all descendant elements using the aggregation graph
- Hides all other meshes
- Automatically fits the camera to visible elements

#### `fitCameraToVisibleMeshes()`
Automatically adjusts the camera position and target to fit all currently visible meshes:
- Calculates the bounding box of visible meshes
- Positions the camera at an optimal distance
- Updates the orbit controls target

#### `showAllMeshes()`
Restores the full model view:
- Makes all meshes visible
- Automatically fits the camera to show the entire model

#### `printIFCEntity(globalId: string)`
Prints all properties of an IFC entity in JSON format:
- Searches for the entity by GlobalId
- Recursively formats all properties including nested entities
- Useful for debugging and understanding IFC structure

#### `buildAggregationGraph(modelID: number)`
Builds a graph of parent-child relationships from `IFCRELAGGREGATES`:
- Maps parent Assembly IDs to their child element IDs
- Used by `isolateAssemblyMark` to find all descendants

#### `collectDescendants(rootID: number, result: Set<number>)`
Recursively collects all descendant element IDs from a root Assembly ID:
- Uses iterative traversal to avoid stack overflow
- Adds all descendants to the result set

### Data Structures

- `elementMeshMap: Map<number, THREE.Mesh[]>` - Maps IFC expressID to its Three.js meshes
- `childrenByParent: Map<number, number[]>` - Maps parent Assembly ID to child element IDs
- `currentModelID: number | null` - Currently loaded IFC model ID

### Architecture

The viewer uses a non-merged geometry approach:
- Each IFC element (expressID) has its own separate meshes
- This allows individual element visibility control
- Meshes are stored in `elementMeshMap` for efficient filtering

## Future Enhancements

- [x] Basic 3D scene setup
- [x] Fragment model loading
- [x] IFC file loading support
- [x] Assembly Mark filtering by Tag
- [x] Automatic camera fitting
- [x] Entity property inspection
- [ ] Model export functionality
- [ ] Multiple model support
- [ ] Advanced camera controls
- [ ] Model annotation tools

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

