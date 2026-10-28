"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
export default function VehicleStudio({
  paint,
  vehicle,
}: {
  paint: number;
  vehicle: string;
}) {
  const host = useRef<HTMLDivElement>(null),
    body = useRef<THREE.MeshPhysicalMaterial | null>(null),
    render = useRef<() => void>(() => {});
  const [error, setError] = useState(false),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(5.8, 2.5, 6.7);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.65, 0);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.65;
    controls.maxPolarAngle = 1.45;
    controls.update();
    const ambient = new THREE.HemisphereLight(0xddeaff, 0x1a1d24, 2);
    scene.add(ambient);
    const key = new THREE.SpotLight(0xffffff, 100, 30, 0.65, 0.8, 1);
    key.position.set(2, 7, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa6bfff, 4);
    rim.position.set(-4, 3, -4);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 2);
    fill.position.set(4, 2, 1);
    scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.ShadowMaterial({ opacity: 0.4 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.015;
    floor.receiveShadow = true;
    scene.add(floor);
    const draw = () => {
      if (!cancelled) renderer.render(scene, camera);
    };
    render.current = draw;
    controls.addEventListener("change", draw);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.fov = w / h < 1.3 ? 28 : 23;
      camera.updateProjectionMatrix();
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xe8edf1,
      metalness: 0.65,
      roughness: 0.24,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });
    body.current = material;
    new GLTFLoader().load(
      "/models/model3.glb",
      (gltf) => {
        if (cancelled) return;
        const model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model),
          size = bounds.getSize(new THREE.Vector3());
        const scale = 4.8 / Math.max(size.x, size.y, size.z);
        model.scale.multiplyScalar(scale);
        const b = new THREE.Box3().setFromObject(model),
          center = b.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -b.min.y, -center.z);
        model.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            const materials = Array.isArray(o.material)
              ? o.material
              : [o.material];
            o.material =
              materials.length === 1
                ? materials[0].name === "CAR_PAINT"
                  ? material
                  : materials[0]
                : materials.map((m) => (m.name === "CAR_PAINT" ? material : m));
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material]) {
              if (m.name === "Glass") {
                m.color.set("#101923");
                m.metalness = 0.45;
                m.roughness = 0.12;
              }
              if (
                m !== material &&
                m.color &&
                m.color.r > 0.6 &&
                m.color.g > 0.6 &&
                m.color.b > 0.6
              )
                m.roughness = 0.3;
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
    resize();
    return () => {
      cancelled = true;
      observer.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
        }
      });
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      body.current = null;
    };
  }, []);
  useEffect(() => {
    body.current?.color.set(
      ["#e8edf1", "#454e5b", "#c51c32"][paint] || "#e8edf1",
    );
    render.current();
  }, [paint, loaded]);
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
            ? "DRAG TO EXPLORE"
            : "PREPARING YOUR STUDIO"}
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
