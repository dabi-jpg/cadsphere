/**
 * CADViewer — Multi-format 3D CAD file viewer.
 *
 * Renders CAD files inside a React Three Fiber canvas with orbit controls,
 * a grid floor, studio lighting, and an auto-fit camera.
 *
 * Supported formats:
 *   .stl          → THREE.STLLoader
 *   .step / .stp  → occt-import-js (WASM)
 *   .igs / .iges  → occt-import-js (WASM)
 *   .dxf          → dxf-viewer in a standalone <canvas>
 *
 * This component must be dynamically imported with { ssr: false } because
 * Three.js and occt-import-js cannot run server-side.
 */
"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Box,
  Download,
  Loader2,
} from "lucide-react";


// ─── Types ─────────────────────────────────────────────────────────────
interface CADViewerProps {
  fileUrl: string;
  filetype: string;
  filename: string;
  onDownload?: () => void;
}

// ─── Auto-fit camera helper component ──────────────────────────────────
function AutoFitCamera({ group }: { group: THREE.Group | null }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!group) return;

    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov =
      camera instanceof THREE.PerspectiveCamera ? camera.fov : 45;
    const distance = maxDim / (2 * Math.tan((fov * Math.PI) / 360));

    camera.position.set(
      center.x + distance * 0.8,
      center.y + distance * 0.6,
      center.z + distance * 0.8
    );
    camera.lookAt(center);

    if (controls && "target" in controls) {
      (controls as any).target.copy(center);
      (controls as any).update();
    }

    camera.updateProjectionMatrix();
  }, [group, camera, controls]);

  return null;
}

// ─── Three.js Scene Content ────────────────────────────────────────────
function SceneContent({
  group,
  wireframe,
}: {
  group: THREE.Group;
  wireframe: boolean;
}) {
  useEffect(() => {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshPhysicalMaterial;
        mat.wireframe = wireframe;
      }
    });
  }, [wireframe, group]);

  return (
    <>
      <color attach="background" args={["#1a1a2e"]} />
      <ambientLight intensity={1.2} />
      <directionalLight
        castShadow
        position={[50, 50, 50]}
        intensity={2}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-50, -50, -50]} intensity={0.8} color={0x6366f1} />
      <directionalLight position={[-50, 50, 0]} intensity={0.5} />

      <Grid
        infiniteGrid
        fadeDistance={500}
        fadeStrength={5}
        sectionColor="#2a2a4a"
        cellColor="#1a1a2e"
        position={[0, -0.01, 0]}
      />

      <primitive object={group} />

      <AutoFitCamera group={group} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <Environment preset="studio" />
    </>
  );
}

// ─── DXF Viewer (standalone canvas, not R3F) ───────────────────────────
function DXFViewer({ fileUrl }: { fileUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        // Dynamically import dxf-viewer
        const { DxfViewer: DxfViewerClass } = await import("dxf-viewer");

        if (cancelled || !containerRef.current) return;

        const container = containerRef.current;
        container.innerHTML = "";

        const viewer = new DxfViewerClass(container, {
          canvasWidth: container.clientWidth,
          canvasHeight: container.clientHeight,
          autoResize: true,
          clearColor: new THREE.Color("#1a1a2e"),
        });

        // dxf-viewer fetches the file itself given a URL
        await viewer.Load({ url: fileUrl });

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("DXF Viewer error:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load DXF file"
          );
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#030303]">
        <div className="text-center p-8 max-w-sm border border-red-500/20 bg-red-500/10 rounded-xl">
          <p className="text-red-400 mb-2 font-medium">DXF Preview Error</p>
          <p className="text-white/60 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#1a1a2e]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#030303]/80">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-white/60 font-medium">Loading DXF file...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// ─── Toolbar ───────────────────────────────────────────────────────────
function ViewerToolbar({
  wireframe,
  onToggleWireframe,
  onResetView,
  onZoomIn,
  onZoomOut,
  onDownload,
  isDxf,
}: {
  wireframe: boolean;
  onToggleWireframe: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDownload?: () => void;
  isDxf: boolean;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-2 py-1.5 shadow-2xl">
      {!isDxf && (
        <>
          <ToolbarButton
            icon={<RotateCcw className="w-4 h-4" />}
            label="Reset view"
            onClick={onResetView}
          />
          <ToolbarButton
            icon={<Box className="w-4 h-4" />}
            label="Toggle wireframe"
            onClick={onToggleWireframe}
            active={wireframe}
          />
          <div className="w-px h-6 bg-white/10 mx-1" />
        </>
      )}
      <ToolbarButton
        icon={<ZoomIn className="w-4 h-4" />}
        label="Zoom in"
        onClick={onZoomIn}
      />
      <ToolbarButton
        icon={<ZoomOut className="w-4 h-4" />}
        label="Zoom out"
        onClick={onZoomOut}
      />
      {onDownload && (
        <>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <ToolbarButton
            icon={<Download className="w-4 h-4" />}
            label="Download file"
            onClick={onDownload}
          />
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? "bg-indigo-500/30 text-indigo-300"
          : "text-white/60 hover:text-white hover:bg-white/10"
      }`}
    >
      {icon}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────
export default function CADViewer({
  fileUrl,
  filetype,
  filename,
  onDownload,
}: CADViewerProps) {
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("Initializing...");
  const [wireframe, setWireframe] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Normalize extension
  const ext = useMemo(() => {
    return filetype.startsWith(".") ? filetype.toLowerCase() : `.${filetype.toLowerCase()}`;
  }, [filetype]);

  const isDxf = ext === ".dxf";

  // ─── Load 3D model (STL / STEP / IGES) ─────────────────────────────
  useEffect(() => {
    if (isDxf) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadModel() {
      try {
        setLoading(true);
        setError("");
        setProgress("Downloading file...");

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Download failed (HTTP ${response.status})`);
        const arrayBuffer = await response.arrayBuffer();

        if (!isMounted) return;
        setProgress("Parsing CAD geometry...");

        const group = new THREE.Group();

        if (ext === ".stl") {
          const { STLLoader } = await import(
            "three/examples/jsm/loaders/STLLoader.js"
          );
          const loader = new STLLoader();
          const geometry = loader.parse(arrayBuffer);
          geometry.computeVertexNormals();

          const material = new THREE.MeshPhysicalMaterial({
            color: 0x8888cc,
            metalness: 0.3,
            roughness: 0.4,
            clearcoat: 0.3,
            clearcoatRoughness: 0.25,
            side: THREE.DoubleSide,
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        } else if (
          ext === ".step" ||
          ext === ".stp" ||
          ext === ".igs" ||
          ext === ".iges"
        ) {
          try {
            setProgress("Parsing CAD geometry (this may take a moment for large files)...");

            const meshData = await new Promise<any>((resolve, reject) => {
              const worker = new Worker("/workers/occt-worker.js");
              const id = Math.random().toString(36);

              const timeout = setTimeout(() => {
                worker.terminate();
                reject(new Error("Parsing timed out after 2 minutes"));
              }, 120000);

              worker.onmessage = (e) => {
                if (e.data.id !== id) return;
                clearTimeout(timeout);
                worker.terminate();
                if (e.data.success) {
                  resolve(e.data.meshes);
                } else {
                  reject(new Error(e.data.error));
                }
              };

              worker.onerror = (err) => {
                clearTimeout(timeout);
                worker.terminate();
                reject(new Error("Worker error: " + err.message));
              };

              worker.postMessage({
                fileBuffer: new Uint8Array(arrayBuffer),
                ext,
                id,
              });
            });

            setProgress("Building 3D scene...");

            for (const meshInfo of meshData) {
              const geometry = new THREE.BufferGeometry();
              geometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(meshInfo.positions, 3)
              );
              if (meshInfo.normals) {
                geometry.setAttribute(
                  "normal",
                  new THREE.Float32BufferAttribute(meshInfo.normals, 3)
                );
              } else {
                geometry.computeVertexNormals();
              }
              geometry.setIndex(
                new THREE.BufferAttribute(new Uint32Array(meshInfo.indices), 1)
              );

              const color = meshInfo.color
                ? new THREE.Color(
                    meshInfo.color[0],
                    meshInfo.color[1],
                    meshInfo.color[2]
                  )
                : new THREE.Color(0x8888cc);

              const material = new THREE.MeshPhysicalMaterial({
                color,
                metalness: 0.3,
                roughness: 0.4,
                side: THREE.DoubleSide,
              });

              const mesh = new THREE.Mesh(geometry, material);
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              group.add(mesh);
            }
          } catch (err) {
            console.error("Worker error:", err);
            throw new Error(err instanceof Error ? err.message : "Failed to load 3D engine.");
          }
        } else {
          throw new Error(`Unsupported file format: ${ext}`);
        }

        if (isMounted) {
          setModelGroup(group);
          setLoading(false);
        }
      } catch (err) {
        console.error("CAD Parse Error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load model");
          setLoading(false);
        }
      }
    }

    loadModel();

    return () => {
      isMounted = false;
    };
  }, [fileUrl, ext, isDxf]);

  // ─── Toolbar callbacks ──────────────────────────────────────────────
  const handleToggleWireframe = useCallback(() => {
    setWireframe((prev) => !prev);
  }, []);

  const handleResetView = useCallback(() => {
    // Force re-render by cycling the group
    if (modelGroup) {
      setModelGroup(null);
      requestAnimationFrame(() => setModelGroup(modelGroup));
    }
  }, [modelGroup]);

  const handleZoomIn = useCallback(() => {
    // Dispatch a synthetic wheel event on the canvas
    canvasRef.current?.dispatchEvent(
      new WheelEvent("wheel", { deltaY: -300, bubbles: true })
    );
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.dispatchEvent(
      new WheelEvent("wheel", { deltaY: 300, bubbles: true })
    );
  }, []);

  // ─── Error state ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#030303]">
        <div className="text-center p-8 max-w-sm border border-red-500/20 bg-red-500/10 rounded-xl">
          <p className="text-red-400 mb-2 font-medium">Preview Error</p>
          <p className="text-white/60 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────────
  if (loading && !isDxf) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#030303]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="text-white/60 font-medium">{progress}</p>
          <p className="text-white/30 text-xs">
            Large files may take a moment to parse
          </p>
        </div>
      </div>
    );
  }

  // ─── DXF rendering ─────────────────────────────────────────────────
  if (isDxf) {
    return (
      <div className="w-full h-full relative">
        <DXFViewer fileUrl={fileUrl} />
        <ViewerToolbar
          wireframe={false}
          onToggleWireframe={() => {}}
          onResetView={() => {}}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onDownload={onDownload}
          isDxf
        />
      </div>
    );
  }

  // ─── 3D rendering (STL / STEP / IGES) ──────────────────────────────
  return (
    <div className="w-full h-full relative bg-[#030303] cursor-move">
      <Canvas
        ref={(el) => {
          // Get the underlying canvas element for zoom dispatch
          if (el) {
            const c = (el as any)?.querySelector?.("canvas");
            canvasRef.current = c || null;
          }
        }}
        shadows
        camera={{ position: [0, 0, 100], fov: 45, near: 0.01, far: 100000 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
        }}
      >
        {modelGroup && (
          <SceneContent group={modelGroup} wireframe={wireframe} />
        )}
      </Canvas>

      <ViewerToolbar
        wireframe={wireframe}
        onToggleWireframe={handleToggleWireframe}
        onResetView={handleResetView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onDownload={onDownload}
        isDxf={false}
      />
    </div>
  );
}
