import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import type { TriageAction, TriageState } from "./domain";
import { BODY_HEIGHT, bodyRegionAt, markerForRegion } from "./bodyRegions";

type Props = {
  state: TriageState;
  dispatch: Dispatch<TriageAction>;
  speak: (text: string) => void;
};

const SKIN_COLOR = 0xc98e72;
const PAIN_COLOR = 0xe75d54;
const CONTRAST_COLOR = 0xffe600;

function reshapeBody(
  meshes: THREE.Mesh[],
  gender: TriageState["gender"],
  proportions: { minY: number; height: number },
) {
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute("position");
    const geometry = mesh.geometry;
    const basePositions =
      (geometry.userData.basePositions as Float32Array | undefined) ??
      new Float32Array(position.array);
    geometry.userData.basePositions = basePositions;

    for (let index = 0; index < position.count; index += 1) {
      const offset = index * 3;
      const x = basePositions[offset];
      const y = basePositions[offset + 1];
      const z = basePositions[offset + 2];
      const height = (y - proportions.minY) / proportions.height;
      const shoulder = Math.max(0, 1 - Math.abs(height - 0.76) / 0.13);
      const waist = Math.max(0, 1 - Math.abs(height - 0.57) / 0.1);
      const hips = Math.max(0, 1 - Math.abs(height - 0.46) / 0.11);
      const widthFactor =
        gender === "male"
          ? 1 + shoulder * 0.06 - waist * 0.025 - hips * 0.04
          : 1 - shoulder * 0.04 - waist * 0.035 + hips * 0.07;

      position.setXYZ(index, x * widthFactor, y, z);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
}

function createMarkers(labels: string[], mode: TriageState["mode"]) {
  const group = new THREE.Group();
  if (!labels.length) return group;

  const material = new THREE.MeshBasicMaterial({
    color: mode === "hc" ? CONTRAST_COLOR : PAIN_COLOR,
    transparent: true,
    opacity: 0.64,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  for (const label of labels) {
    const point = markerForRegion(label);
    const marker = new THREE.Mesh(new THREE.CircleGeometry(1, 32), material);
    marker.position.set(point.x, point.y, point.z);
    marker.scale.set(point.width, point.height, 1);
    if (point.back) marker.rotation.y = Math.PI;
    marker.renderOrder = 2;
    group.add(marker);
  }

  return group;
}

export default function ThreeBodyCanvas({ state, dispatch, speak }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const speakRef = useRef(speak);
  const rotationRootRef = useRef<THREE.Group | null>(null);
  const bodyRef = useRef<THREE.Group | null>(null);
  const bodyMeshesRef = useRef<THREE.Mesh[]>([]);
  const markerGroupRef = useRef<THREE.Group | null>(null);
  const bodyProportionsRef = useRef({ minY: 0, height: BODY_HEIGHT });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  stateRef.current = state;
  speakRef.current = speak;

  useEffect(() => {
    const activeCanvas = canvasRef.current;
    if (!activeCanvas) return;
    const host = activeCanvas.parentElement;
    if (!host) return;
    const activeHost = host;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: activeCanvas, alpha: true, antialias: true });
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : "";
      setLoadError(`Não foi possível iniciar o modelo 3D neste navegador.${detail}`);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 1.72, 6.6);
    camera.lookAt(0, 1.72, 0);

    scene.add(new THREE.HemisphereLight(0xfff0e2, 0x6a716c, 2));
    const keyLight = new THREE.DirectionalLight(0xffe5d1, 3.1);
    keyLight.position.set(-3.2, 5, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xdce9f2, 1.45);
    fillLight.position.set(4, 2.5, -4);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
    rimLight.position.set(0, 4, -3);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 48),
      new THREE.MeshBasicMaterial({ color: 0x315e4e, transparent: true, opacity: 0.1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    const rotationRoot = new THREE.Group();
    scene.add(rotationRoot);
    rotationRootRef.current = rotationRoot;

    const loader = new OBJLoader();
    let disposed = false;
    let body: THREE.Group | null = null;
    let frameId = 0;

    function resize() {
      const width = activeHost.clientWidth;
      const height = activeHost.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(activeHost);
    resize();

    loader.load(
      `${import.meta.env.BASE_URL}models/makehuman-base.obj`,
      (source) => {
        if (disposed) return;

        const meshes: THREE.Mesh[] = [];
        source.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          if (child.name !== "body") {
            child.visible = false;
            return;
          }

          child.geometry = child.geometry.clone();
          child.geometry.computeVertexNormals();
          child.material = new THREE.MeshPhysicalMaterial({
            color: stateRef.current.mode === "hc" ? 0xffffff : SKIN_COLOR,
            roughness: 0.66,
            metalness: 0,
            clearcoat: 0.08,
            clearcoatRoughness: 0.72,
          });
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.isBodyMesh = true;
          meshes.push(child);
        });

        if (!meshes.length) {
          setLoading(false);
          setLoadError("O arquivo 3D não contém a malha do corpo esperada.");
          return;
        }

        source.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(source);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = BODY_HEIGHT / size.y;
        bodyProportionsRef.current = { minY: bounds.min.y, height: size.y };
        source.scale.setScalar(scale);
        source.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);

        body = new THREE.Group();
        body.add(source);
        rotationRoot.add(body);
        bodyRef.current = body;
        bodyMeshesRef.current = meshes;
        reshapeBody(meshes, stateRef.current.gender, bodyProportionsRef.current);
        setLoading(false);
      },
      (event) => {
        if (event.total > 0) setLoading(true);
      },
      (error) => {
        if (disposed) return;
        console.error("Falha ao carregar o modelo 3D do corpo.", error);
        setLoading(false);
        setLoadError("Não foi possível carregar o modelo 3D. Verifique a conexão e tente novamente.");
      },
    );

    function render() {
      if (disposed) return;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    }
    render();

    let pointerStart: { x: number; y: number; angle: number; moved: boolean } | null = null;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onPointerDown(event: PointerEvent) {
      pointerStart = {
        x: event.clientX,
        y: event.clientY,
        angle: stateRef.current.angle,
        moved: false,
      };
      canvasRef.current?.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (!pointerStart || !rotationRootRef.current) return;
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 5) pointerStart.moved = true;
      if (!pointerStart.moved) return;

      const angle = Math.max(0, Math.min(360, pointerStart.angle + deltaX * 0.75));
      rotationRootRef.current.rotation.y = THREE.MathUtils.degToRad(angle);
    }

    function onPointerUp(event: PointerEvent) {
      if (!pointerStart) return;
      const start = pointerStart;
      pointerStart = null;

      if (start.moved) {
        const angle = Math.max(0, Math.min(360, start.angle + (event.clientX - start.x) * 0.75));
        dispatch({ type: "SET_ANGLE", angle });
        return;
      }

      if (!body) return;
      const targetCanvas = canvasRef.current;
      if (!targetCanvas) return;
      const rect = targetCanvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(body, true).find((intersection) => intersection.object.userData.isBodyMesh);
      if (!hit) return;

      const localPoint = body.worldToLocal(hit.point.clone());
      const label = bodyRegionAt(localPoint, stateRef.current.side);
      const selected = stateRef.current.answers.local.includes(label);
      dispatch({ type: "TOGGLE_LOCAL", label });
      speakRef.current(`${label}${selected ? " desmarcado." : " marcado."}`);
    }

    function onPointerCancel() {
      pointerStart = null;
    }

    activeCanvas.addEventListener("pointerdown", onPointerDown);
    activeCanvas.addEventListener("pointermove", onPointerMove);
    activeCanvas.addEventListener("pointerup", onPointerUp);
    activeCanvas.addEventListener("pointercancel", onPointerCancel);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      activeCanvas.removeEventListener("pointerdown", onPointerDown);
      activeCanvas.removeEventListener("pointermove", onPointerMove);
      activeCanvas.removeEventListener("pointerup", onPointerUp);
      activeCanvas.removeEventListener("pointercancel", onPointerCancel);
      body?.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      });
      markerGroupRef.current?.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      });
      floor.geometry.dispose();
      floor.material.dispose();
      renderer.dispose();
      rotationRootRef.current = null;
      bodyRef.current = null;
      bodyMeshesRef.current = [];
      markerGroupRef.current = null;
    };
  }, [dispatch]);

  useEffect(() => {
    const root = rotationRootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;

    root.rotation.y = THREE.MathUtils.degToRad(state.angle);
    root.scale.setScalar(state.figureZoom);
    reshapeBody(bodyMeshesRef.current, state.gender, bodyProportionsRef.current);

    for (const mesh of bodyMeshesRef.current) {
      const material = mesh.material as THREE.MeshPhysicalMaterial;
      material.color.set(state.mode === "hc" ? 0xffffff : SKIN_COLOR);
    }
  }, [state.angle, state.figureZoom, state.gender, state.mode]);

  useEffect(() => {
    const root = rotationRootRef.current;
    if (!root) return;

    if (markerGroupRef.current) {
      root.remove(markerGroupRef.current);
      markerGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
      markerGroupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh && !Array.isArray(child.material)) child.material.dispose();
      });
    }

    const markers = createMarkers(state.answers.local, state.mode);
    root.add(markers);
    markerGroupRef.current = markers;
  }, [state.answers.local, state.mode]);

  return (
    <div className="body-model-shell">
      <canvas
        ref={canvasRef}
        className="body-model-canvas"
        role="img"
        aria-label={`Modelo corporal 3D ${state.gender === "female" ? "feminino" : "masculino"}, vista ${state.side === "front" ? "frontal" : "posterior"}. Arraste para girar e toque em uma região para marcar a dor.`}
      />
      {loading && <span className="model-status" role="status">Carregando modelo 3D...</span>}
      {loadError && <p className="model-error" role="alert">{loadError}</p>}
    </div>
  );
}
