# 3D IFC Viewer

A modern web application for viewing and interacting with 3D models using `@thatopen/components`, `@thatopen/ui`, and Three.js.

## Features

- 🎨 Interactive 3D scene rendering
- 🖼️ Fragment-based 3D model loading
- 🎛️ Real-time UI controls for scene customization
- 📊 Performance monitoring with Stats.js
- 🔧 TypeScript support

## Tech Stack

- **Three.js** - 3D graphics library
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
- Fragment manager for loading 3D models

### Loading Models

Currently, the application loads a sample fragment model from a remote URL. To load your own models:

1. Place your `.frag` files in the `public/` directory
2. Update the `fragPaths` array in `main.ts` with your file paths

### UI Controls

The application includes UI controls for:
- Background color adjustment
- Directional light intensity
- Ambient light intensity

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

## IFC File Loading (Planned)

The application will support loading IFC (Industry Foundation Classes) files. This feature is currently in development and will include:

- File upload interface (drag & drop or file picker)
- IFC file parsing and conversion to Fragment format
- 3D visualization of IFC models
- Model properties and metadata display

### Planned Implementation

1. **File Upload UI** - Add UI components for file selection
2. **IFC Parser** - Integrate IFC file parsing using @thatopen/components
3. **Fragment Conversion** - Convert parsed IFC data to Fragment format for rendering

## Future Enhancements

- [x] Basic 3D scene setup
- [x] Fragment model loading
- [ ] IFC file loading support (in progress)
- [ ] Model export functionality
- [ ] Multiple model support
- [ ] Advanced camera controls
- [ ] Model annotation tools

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

