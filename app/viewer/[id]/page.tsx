/**
 * 3D CAD File Viewer — Three.js based.
 * 
 * Features:
 * - Renders STL files with full material and lighting
 * - Orbital controls (rotate, zoom, pan)
 * - Auto-centers and auto-scales the model
 * - Secure: fetches file via signed URL from /api/files/[id]/url
 * 
 * Supported formats:
 * - STL: Full support via Three.js STLLoader
 * - STEP/DXF: Currently shows informational message (no stable browser loaders)
 */
"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";

export default function ViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function loadViewer() {
      try {
        // Fetch signed URL for the file
        const urlRes = await fetch(`/api/files/${id}/url`);
        const urlData = await urlRes.json();

        if (!urlData.success) {
          setError(urlData.error || "Failed to load file");
          setLoading(false);
          return;
        }

        const { signed_url, filename: fname } = urlData.data;
        setFilename(fname);

        const ext = fname.slice(fname.lastIndexOf(".")).toLowerCase();

        // Only STL has reliable browser-side rendering
        if (ext !== ".stl") {
          setError(
            `3D preview is currently supported for STL files. ` +
            `"${ext}" files can be downloaded and viewed in a desktop CAD application.`
          );
          setLoading(false);
          return;
        }

        // Dynamically import Three.js to keep initial bundle small
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");

        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
        camera.position.set(0, 0, 100);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Lighting — professional studio lighting setup
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(0x6366f1, 0.8);
        backLight.position.set(-50, -50, -50);
        scene.add(backLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-50, 50, 0);
        scene.add(fillLight);

        // Grid helper for reference
        const gridHelper = new THREE.GridHelper(200, 50, 0x2a2a4a, 0x1a1a2e);
        gridHelper.position.y = -1;
        scene.add(gridHelper);

        // Load STL
        const loader = new STLLoader();

        const response = await fetch(signed_url);
        const arrayBuffer = await response.arrayBuffer();
        const geometry = loader.parse(arrayBuffer);

        // Material — metallic look fitting for CAD models
        const material = new THREE.MeshPhysicalMaterial({
          color: 0x8888cc,
          metalness: 0.3,
          roughness: 0.4,
          clearcoat: 0.3,
          clearcoatRoughness: 0.25,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Auto-center and scale the model to fit the viewport
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);
        mesh.position.sub(center);

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 50 / maxDim;
        mesh.scale.setScalar(scale);

        scene.add(mesh);

        // Position camera based on model size
        camera.position.set(0, maxDim * scale * 0.5, maxDim * scale * 1.5);
        controls.target.set(0, 0, 0);
        controls.update();

        setLoading(false);

        // Animation loop
        let animationId: number;
        function animate() {
          animationId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        }
        animate();

        // Handle resize
        const handleResize = () => {
          if (!containerRef.current) return;
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", handleResize);

        // Cleanup function
        cleanup = () => {
          cancelAnimationFrame(animationId);
          window.removeEventListener("resize", handleResize);
          renderer.dispose();
          geometry.dispose();
          material.dispose();
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        console.error("Viewer error:", err);
        setError("Failed to load the 3D viewer");
        setLoading(false);
      }
    }

    loadViewer();

    return () => {
      if (cleanup) cleanup();
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-[#030303] text-white flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between p-4 pt-20 bg-[#030303] border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-white/60 hover:text-white transition flex items-center gap-1"
          >
            ← Back to Dashboard
          </Link>
          {filename && (
            <h2 className="text-lg font-semibold truncate max-w-md">{filename}</h2>
          )}
        </div>
        <div className="text-xs text-white/40">
          Scroll to zoom • Drag to rotate • Right-click to pan
        </div>
      </div>

      {/* Viewer container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#030303]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-indigo-400 rounded-full border-t-transparent animate-spin" />
              <p className="text-white/60">Loading 3D model...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#030303]">
            <div className="max-w-md text-center p-8">
              <div className="text-4xl mb-4">📐</div>
              <p className="text-white/60 mb-4">{error}</p>
              <Link
                href="/dashboard"
                className="text-indigo-400 hover:text-indigo-300 transition text-sm"
              >
                ← Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        <div ref={containerRef} className="w-full h-[calc(100vh-80px)]" />
      </div>
    </main>
  );
}
