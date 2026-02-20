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
        if (!container) return () => { };

        console.log("🚀 [useIfcViewer] Initializing 3D Viewer...");

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf1f5f9); // Slate-100
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 10, 10);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controlsRef.current = controls;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 20, 20);
        scene.add(directionalLight);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-20, 20, -20);
        scene.add(directionalLight2);

        // IFC Loader
        try {
            const ifcLoader = new IFCLoader();
            ifcLoader.ifcManager.setWasmPath("wasm/"); // Servido via public/wasm/

            // Opcional: Configurar setup p/ multithreading se web-ifc-mt.wasm existir
            ifcLoader.ifcManager.setupThreeMeshBVH(
                // @ts-ignore
                THREE.computeBoundsTree,
                THREE.disposeBoundsTree,
                THREE.acceleratedRaycast
            );

            ifcLoaderRef.current = ifcLoader;
        } catch (e) {
            console.error("Error initializing IFC Loader:", e);
            toast.error("Erro ao inicializar visualizador 3D");
        }

        // Animation Loop
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Resize Handler
        const handleResize = () => {
            if (container && camera && renderer) {
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(container.clientWidth, container.clientHeight);
            }
        };
        window.addEventListener("resize", handleResize);

        setIsLoaded(true);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener("resize", handleResize);
            if (renderer) {
                renderer.dispose();
                container.removeChild(renderer.domElement);
            }
            if (scene) {
                scene.clear();
            }
            setIsLoaded(false);
        };
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
                    // console.warn(`Error applying color ${colorStr}:`, e);
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

            console.log(`[IFC] Loading from: ${url}`);
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
