"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const PAINT_COLORS = [
  "#e8edf1", // Pearl White Multi-Coat
  "#454e5b", // Stealth Grey
  "#c51c32", // Ultra Red
];

export default function VehicleStudio({
  paint,
  vehicle,
}: {
  paint: number;
  vehicle: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const bodyMat = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const animFrame = useRef<number | null>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let cancelled = false;

    // Clear any leftover canvases from fast refresh
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setError(true);
      return;
    }

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Environment Lighting
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();

    // Camera & Controls
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(5.5, 2.2, 6.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.6, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 3.5;
    controls.maxDistance = 12;
    controls.minPolarAngle = 0.5;
    controls.maxPolarAngle = 1.48; // Don't flip below ground

    // Studio Lights
    const ambient = new THREE.HemisphereLight(0xddeaff, 0x141822, 2.2);
    scene.add(ambient);

    const key = new THREE.SpotLight(0xffffff, 120, 35, 0.7, 0.8, 1);
    key.position.set(3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x7dd3fc, 3.5);
    rim.position.set(-5, 4, -5);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffffff, 2);
    fill.position.set(4, 2, 2);
    scene.add(fill);

    // Floor Shadow Plane
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.45 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Dynamic Sizing
    const resize = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(rect.width || el.clientWidth || 600, 200);
      const h = Math.max(rect.height || el.clientHeight || 340, 200);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 1.3 ? 32 : 26;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(el);
    resize();

    // Car Paint Material
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(PAINT_COLORS[0]),
      metalness: 0.72,
      roughness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    bodyMat.current = material;

    // Load Model 3 GLB
    const loader = new GLTFLoader();
    loader.load(
      "/models/model3.glb",
      (gltf) => {
        if (cancelled) return;
        const model = gltf.scene;

        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const scale = 4.8 / Math.max(size.x, size.y, size.z);
        model.scale.multiplyScalar(scale);

        const b = new THREE.Box3().setFromObject(model);
        const center = b.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -b.min.y, -center.z);

        model.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;

            const materials = Array.isArray(o.material) ? o.material : [o.material];
            o.material =
              materials.length === 1
                ? materials[0].name === "CAR_PAINT"
                  ? material
                  : materials[0]
                : materials.map((m) => (m.name === "CAR_PAINT" ? material : m));

            for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
              if (m.name === "Glass") {
                m.color.set("#0d141e");
                m.metalness = 0.5;
                m.roughness = 0.08;
                m.transparent = true;
                m.opacity = 0.85;
              }
              if (m !== material && m.color && m.color.r > 0.6 && m.color.g > 0.6 && m.color.b > 0.6) {
                m.roughness = 0.35;
              }
            }
          }
        });

        scene.add(model);
        setLoaded(true);
        resize();
      },
      undefined,
      () => {
        if (!cancelled) setError(true);
      },
    );

    // Continuous Animation Loop
    const animate = () => {
      if (cancelled) return;
      controls.update();
      renderer.render(scene, camera);
      animFrame.current = requestAnimationFrame(animate);
    };
    animFrame.current = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      observer.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            m.dispose();
          }
        }
      });
      environment.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.remove();
      }
      bodyMat.current = null;
    };
  }, []);

  // Update Paint Color
  useEffect(() => {
    if (bodyMat.current) {
      bodyMat.current.color.set(PAINT_COLORS[paint] || PAINT_COLORS[0]);
    }
  }, [paint]);

  return (
    <div
      className="real-vehicle-studio"
      ref={host}
      role="img"
      aria-label={`Interactive 3D Tesla Model 3 studio, ${["pearl white", "stealth grey", "ultra red"][paint]}`}
    >
      <span className="studio-hint">
        {error
          ? "3D is unavailable on this browser"
          : loaded
            ? "DRAG TO ROTATE · SCROLL TO ZOOM"
            : "PREPARING 3D STUDIO"}
      </span>
      {vehicle !== "Tesla Model 3" && (
        <span className="studio-model-note">
          Model 3 studio preview · {vehicle.replace("Tesla ", "")} profile
        </span>
      )}
      <a
        className="studio-credit"
        href="/models/CREDITS.txt"
        target="_blank"
        rel="noopener noreferrer"
      >
        3D model credits
      </a>
    </div>
  );
}
