import { useState, useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { IFCLoader } from "web-ifc-three";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useIfcViewer() {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const ifcLoaderRef = useRef<IFCLoader | null>(null);
    const modelRef = useRef<any>(null);
    const utils = trpc.useUtils();

    const [isLoaded, setIsLoaded] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [xRay, setXRay] = useState(false);
    const xRayRef = useRef(xRay);

    useEffect(() => {
        xRayRef.current = xRay;
    }, [xRay]);

    const [mappingMode, setMappingMode] = useState(false);
    const mappingModeRef = useRef(mappingMode);
    const currentModelID = useRef<number | null>(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        mappingModeRef.current = mappingMode;
    }, [mappingMode]);

    const { data: roomColors } = trpc.ifc.getRoomsWithColors.useQuery();

    useEffect(() => {
        utils.ifc.getRoomsWithColors.invalidate();
    }, [utils]);

    const init = useCallback((container: HTMLDivElement) => {
        let animationId: number;

        try {
            console.log("🚀 [useIfcViewer] Starting initialization...");

            const width = container.clientWidth || 800;
            const height = container.clientHeight || 600;

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0f172a);
            sceneRef.current = scene;

            const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
            camera.position.set(50, 50, 50);
            cameraRef.current = camera;

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controlsRef.current = controls;

            scene.add(new THREE.AmbientLight(0xffffff, 0.7));
            const dl = new THREE.DirectionalLight(0xffffff, 0.8);
            dl.position.set(50, 100, 50);
            scene.add(dl);
            scene.add(new THREE.HemisphereLight(0xffffff, 0x080820, 0.8));

            const loader = new IFCLoader();
            loader.ifcManager.setWasmPath("/wasm/");
            loader.ifcManager.applyWebIfcConfig({
                COORDINATE_TO_ORIGIN: true,
                USE_FAST_BOOLS: false
            });
            ifcLoaderRef.current = loader;

            const animate = () => {
                animationId = requestAnimationFrame(animate);
                if (controlsRef.current) controlsRef.current.update();
                if (rendererRef.current && sceneRef.current && cameraRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                }
            };
            animate();

            setIsLoaded(true);
            console.log("✨ [useIfcViewer] Initialization success");

            return () => {
                console.log("🧹 [useIfcViewer] Cleaning up...");
                if (animationId) cancelAnimationFrame(animationId);

                if (ifcLoaderRef.current) {
                    try { ifcLoaderRef.current.ifcManager.dispose(); } catch (e) { }
                    ifcLoaderRef.current = null;
                }

                if (rendererRef.current) {
                    const dom = rendererRef.current.domElement;
                    if (container && dom && container.contains(dom)) {
                        container.removeChild(dom);
                    }
                    try { rendererRef.current.dispose(); } catch (e) { }
                    rendererRef.current = null;
                }

                setIsLoaded(false);
                setIsModelLoaded(false);
            };
        } catch (error) {
            console.error("❌ [useIfcViewer] Fatal init error:", error);
            return () => { };
        }
    }, []);

    const applyColors = useCallback(async (model: any, force: boolean = false) => {
        if (isProcessingRef.current && !force) return;
        if (!roomColors || !ifcLoaderRef.current || !sceneRef.current) return;

        const wasProcessing = isProcessingRef.current;
        isProcessingRef.current = true;
        const manager = ifcLoaderRef.current.ifcManager;
        const modelID = model.modelID;

        try {
            const colorGroups = new Map<string, number[]>();
            (roomColors as any[] || []).forEach((room: any) => {
                if (room.ifcExpressId) {
                    const ids = String(room.ifcExpressId)
                        .split(',')
                        .map(s => Number(s.trim()))
                        .filter(id => !isNaN(id) && id > 0);

                    const colorStr = room.color || '#9CA3AF';
                    if (!colorGroups.has(colorStr)) colorGroups.set(colorStr, []);
                    ids.forEach(id => colorGroups.get(colorStr)!.push(id));
                }
            });

            const toRemove: THREE.Object3D[] = [];
            sceneRef.current.traverse((child: any) => {
                if (child.userData?.isStatusSubset) toRemove.push(child);
            });
            toRemove.forEach(obj => {
                sceneRef.current?.remove(obj);
                if ((obj as any).geometry) (obj as any).geometry.dispose();
                if ((obj as any).material) {
                    if (Array.isArray((obj as any).material)) {
                        (obj as any).material.forEach((m: any) => m.dispose());
                    } else {
                        (obj as any).material.dispose();
                    }
                }
            });

            for (const [colorStr, ids] of colorGroups.entries()) {
                try {
                    const color = new THREE.Color(colorStr);
                    const isPending = colorStr.toLowerCase() === '#9ca3af';
                    const subset = manager.createSubset({
                        modelID,
                        ids,
                        material: new THREE.MeshPhongMaterial({
                            color,
                            transparent: true,
                            opacity: isPending ? 0.3 : 0.7,
                            side: THREE.DoubleSide,
                            depthTest: true,
                            depthWrite: true,
                            polygonOffset: true,
                            polygonOffsetFactor: -1,
                            polygonOffsetUnits: -1
                        }),
                        scene: sceneRef.current,
                        removePrevious: false
                    });
                    if (subset) subset.userData.isStatusSubset = true;
                } catch (e) {
                    console.warn(`Error applying color ${colorStr}:`, e);
                }
            }
        } finally {
            if (!wasProcessing) isProcessingRef.current = false;
        }
    }, [roomColors]);

    useEffect(() => {
        if (modelRef.current && isModelLoaded && !isProcessingRef.current) {
            applyColors(modelRef.current);
        }
    }, [roomColors, isModelLoaded, applyColors]);

    useEffect(() => {
        if (!sceneRef.current) return;
        sceneRef.current.traverse((child: any) => {
            if (!child.isMesh) return;
            const isStructural = child.userData?.customID === 'structural_subset';
            const isColor = child.userData?.isStatusSubset;
            const isMainModel = !isStructural && !isColor && child.modelID !== undefined;

            if (isStructural || isMainModel) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m: any) => {
                    m.transparent = xRay || mappingMode;
                    m.opacity = (xRay || mappingMode) ? 0.3 : 1.0;
                    m.depthWrite = !(xRay || mappingMode);
                });
            } else if (isColor) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m: any) => {
                    m.opacity = (xRay || mappingMode) ? 0.9 : 0.7;
                });
            }
        });
    }, [xRay, mappingMode]);

    const clearSelectionHighlight = useCallback(() => {
        if (!sceneRef.current) return;
        const toRemove: THREE.Object3D[] = [];
        sceneRef.current.traverse((child: any) => {
            if (child.isMesh && (child.name === 'selection-highlight' || child.userData?.customID === 'selection-highlight')) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(obj => {
            sceneRef.current?.remove(obj);
            if ((obj as any).geometry) (obj as any).geometry.dispose();
            if ((obj as any).material) {
                if (Array.isArray((obj as any).material)) {
                    (obj as any).material.forEach((m: any) => m.dispose());
                } else {
                    (obj as any).material.dispose();
                }
            }
        });
        setSelectedRoom(null);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") clearSelectionHighlight();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [clearSelectionHighlight]);

    const handleSelection = useCallback(async (event: MouseEvent) => {
        if (!rendererRef.current || !cameraRef.current || !sceneRef.current || !ifcLoaderRef.current || isProcessingRef.current) return;

        const rect = rendererRef.current.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

        const pickableObjects: THREE.Object3D[] = [];
        sceneRef.current.traverse((child: any) => {
            if (child.isMesh && child.name !== 'selection-highlight' && child.userData?.customID !== 'selection-highlight') {
                pickableObjects.push(child);
            }
        });

        const intersects = raycaster.intersectObjects(pickableObjects, true);
        if (intersects.length > 0) {
            const object = intersects[0].object as any;
            const index = intersects[0].faceIndex;

            if (index !== undefined && index !== null) {
                try {
                    const manager = ifcLoaderRef.current.ifcManager;
                    const id = await manager.getExpressId(object.geometry, index);
                    if (id === undefined || id === null || id < 0) return;

                    clearSelectionHighlight();
                    const modelID = object.modelID !== undefined ? object.modelID : (currentModelID.current || 0);

                    const subset = manager.createSubset({
                        modelID,
                        ids: [id],
                        material: new THREE.MeshPhongMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthTest: false }),
                        scene: sceneRef.current,
                        removePrevious: true,
                        customID: 'selection-highlight'
                    });
                    if (subset) {
                        subset.name = 'selection-highlight';
                        subset.userData.customID = 'selection-highlight';
                        subset.renderOrder = 999;
                    }

                    if (mappingModeRef.current) {
                        setSelectedRoom({ ifcExpressId: id, nome: `Objeto ${id}` } as any);
                    } else {
                        const room = (roomColors as any[])?.find(r => String(r.ifcExpressId || '').split(',').map(s => s.trim()).includes(String(id)));
                        if (room) {
                            setSelectedRoom(room);
                        } else {
                            const props = await manager.getItemProperties(modelID, id);
                            setSelectedRoom({ ifcExpressId: id, nome: props?.Name?.value || `Objeto ${id}` } as any);
                        }
                    }
                } catch (e) {
                    console.error("Error in selection:", e);
                }
            }
        } else {
            clearSelectionHighlight();
        }
    }, [roomColors, clearSelectionHighlight]);

    const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = rendererRef.current?.domElement;
        if (!canvas || !isLoaded) return;

        const onMouseDown = (e: MouseEvent) => { mouseDownPos.current = { x: e.clientX, y: e.clientY }; };
        const onMouseUp = (e: MouseEvent) => {
            if (!mouseDownPos.current) return;
            const dx = e.clientX - mouseDownPos.current.x;
            const dy = e.clientY - mouseDownPos.current.y;
            if (Math.sqrt(dx * dx + dy * dy) < 5) handleSelection(e);
            mouseDownPos.current = null;
        };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseup', onMouseUp);
        };
    }, [handleSelection, isLoaded]);

    const loadIfcModel = useCallback(async (url: string) => {
        if (!ifcLoaderRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current || isProcessingRef.current) return;

        isProcessingRef.current = true;
        const manager = ifcLoaderRef.current.ifcManager;

        try {
            if (currentModelID.current !== null) {
                try { manager.ifcAPI.CloseModel(currentModelID.current); } catch (e) { }
                currentModelID.current = null;
            }

            sceneRef.current.children = sceneRef.current.children.filter(c => c instanceof THREE.Light);
            setIsModelLoaded(false);

            const model = (await ifcLoaderRef.current.loadAsync(url)) as any;
            const modelID = model.modelID;
            currentModelID.current = modelID;
            modelRef.current = model;

            sceneRef.current.add(model);

            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const cameraZ = Math.abs(maxDim / 2 / Math.tan((cameraRef.current!.fov * Math.PI) / 180 / 2)) * 1.5;

            cameraRef.current!.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
            cameraRef.current!.lookAt(center);
            controlsRef.current!.target.copy(center);
            controlsRef.current!.update();

            await applyColors(model, true);
            setIsModelLoaded(true);
            toast.success("Modelo IFC carregado com sucesso!");
        } catch (error: any) {
            console.error("IFC Loading failed:", error);
            toast.error("Erro ao carregar modelo 3D.");
        } finally {
            isProcessingRef.current = false;
        }
    }, [applyColors]);

    return {
        containerRef,
        init,
        loadIfcModel,
        isLoaded,
        isModelLoaded,
        selectedRoom,
        setSelectedRoom,
        applyColors,
        xRay,
        setXRay,
        mappingMode,
        setMappingMode
    };
}
