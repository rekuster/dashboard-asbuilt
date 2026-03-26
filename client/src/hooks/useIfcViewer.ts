import { useState, useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import JSZip from "jszip"; 

export function useIfcViewer() {
    const componentsRef = useRef<OBC.Components | null>(null);
    const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
    const loaderRef = useRef<OBC.IfcLoader | null>(null);
    const highlighterRef = useRef<OBCF.Highlighter | null>(null);
    const worldRef = useRef<OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer> | null>(null);
    const clipperRef = useRef<OBC.Clipper | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fragmentsInitialized = useRef(false);
    
    const [isLoaded, setIsLoaded] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [floors, setFloors] = useState<{ name: string, elevation: number }[]>([]);
    const [properties, setProperties] = useState<any>(null);
    const [xRay, setXRay] = useState(false);
    const [mappingMode, setMappingMode] = useState(false);
    
    
    const { data: roomColors } = trpc.ifc.getRoomsWithColors.useQuery();

    const init = useCallback((container: HTMLDivElement) => {
        if (!container) return () => { };

        console.log("🚀 [useIfcViewer] Initializing @thatopen Components...");

        const components = new OBC.Components();
        componentsRef.current = components;

        const worlds = components.get(OBC.Worlds);
        const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
        worldRef.current = world;

        const scene = new OBC.SimpleScene(components);
        world.scene = scene; // Assign to world first
        scene.setup(); // Then call setup
        scene.three.background = new THREE.Color(0xf1f5f9);

        world.renderer = new OBC.SimpleRenderer(components, container);
        world.camera = new OBC.SimpleCamera(components);

        components.init();

        // Fragments & IFC Loader
        const fragments = components.get(OBC.FragmentsManager);

        // Initializing fragments with official local worker
        const setupAll = async () => {
            try {
                // Usar o worker local que copiamos do node_modules para garantir compatibilidade 100%
                const workerUrl = window.location.origin + "/worker.mjs";
                await fragments.init(workerUrl);
                fragmentsInitialized.current = true;
                
                const loader = components.get(OBC.IfcLoader);
                
                // Usar a versão 0.0.75 em pasta dedicada com cache-busting
                loader.settings.wasm = {
                    path: window.location.origin + "/wasm-75/", 
                    absolute: true
                };
                
                loader.setup();
                loaderRef.current = loader;

                // Highlighter for selection
                const highlighter = components.get(OBCF.Highlighter);
                highlighter.setup({ world });
                highlighterRef.current = highlighter;

                // Clipper
                try {
                    const clipper = components.get(OBC.Clipper);
                    if (clipper) {
                        clipper.enabled = true;
                        clipperRef.current = clipper;
                    }
                } catch (e) {
                    console.warn("Clipper not found or failed to initialize", e);
                }

                // Selection Logic
                highlighter.events.select.onHighlight.add(async (selection) => {
                    if (!fragmentsInitialized.current) return;

                    const fragmentID = Object.keys(selection)[0];
                    const expressIDs = Array.from(selection[fragmentID]);
                    const expressID = expressIDs[0];
                    
                    if (expressID) {
                        try {
                            const dataMap = await fragments.getData(selection);
                            const modelData = dataMap[Object.keys(dataMap)[0]];
                            if (modelData && modelData[0]) {
                                setProperties(modelData[0]);
                            }
                        } catch (e) {
                            console.warn("Failed to fetch properties", e);
                        }

                        const room = (roomColors as any[])?.find(r => 
                            String(r.ifcExpressId || '').split(',').map(s => s.trim()).includes(String(expressID))
                        );
                        
                        if (room) {
                            setSelectedRoom(room);
                        } else {
                            setSelectedRoom({ ifcExpressId: expressID, nome: `Objeto ${expressID}` } as any);
                        }
                    }
                });

                highlighter.events.select.onClear.add(() => {
                    setSelectedRoom(null);
                    setProperties(null);
                });

                setIsLoaded(true);
                console.log("✅ [useIfcViewer] FragmentsManager initialized & System Ready.");
            } catch (e) {
                console.error("❌ Failed to initialize 3D system", e);
            }
        };
        
        setupAll();
        fragmentsRef.current = fragments;

        fragmentsRef.current = fragments;

        return () => {
            try {
                if (fragmentsInitialized.current) {
                    components.dispose();
                } else {
                    // If not initialized, we might still want to clean up other things
                    // but calling components.dispose() will likely fail on FragmentsManager
                    console.log("⚠️ [useIfcViewer] Skipping components.dispose() as FragmentsManager was not ready.");
                }
            } catch (e) {
                console.warn("Soft handling: Error during components disposal", e);
            }
            worldRef.current = null;
            componentsRef.current = null;
            fragmentsRef.current = null;
            loaderRef.current = null;
            highlighterRef.current = null;
            setIsLoaded(false);
        };
    }, [roomColors]); 

    const loadIfcModel = useCallback(async (url: string) => {
        // Check if fragments are initialized before proceeding
        if (!loaderRef.current || !fragmentsInitialized.current || !worldRef.current || !highlighterRef.current) {
            console.log("⏳ [useIfcViewer] Waiting for fragments to be ready before loading...");
            return;
        }

        try {
            setIsModelLoaded(false);
            const file = await fetch(url);
            const data = await file.arrayBuffer();
            let buffer = new Uint8Array(data);

            // Se for um arquivo ZIP (.ifczip), precisamos extrair o IFC de dentro dele
            if (url.toLowerCase().endsWith(".ifczip")) {
                console.log("📦 [useIfcViewer] Unzipping .ifczip file...");
                const zip = new JSZip();
                const zipContent = await zip.loadAsync(buffer);
                const ifcFile = Object.values(zipContent.files).find(f => f.name.toLowerCase().endsWith(".ifc"));
                
                if (ifcFile) {
                    const ifcData = await ifcFile.async("uint8array");
                    buffer = ifcData;
                    console.log("🔓 [useIfcViewer] IFC extracted successfully.");
                } else {
                    throw new Error("No .ifc file found inside the .ifczip package.");
                }
            }
            
            const model = await loaderRef.current.load(buffer, true, "model");
            
            // @ts-ignore - OBC v3 returns FragmentsModel which has an .object property representing the THREE.Group
            const modelObject = (model as any).object || model;
            worldRef.current.scene.three.add(modelObject);
            
            // Focar a câmera no modelo carregado
            if (worldRef.current.camera.controls) {
                // @ts-ignore
                worldRef.current.camera.controls.fitToSphere(modelObject, true);
            }
            
            // Extract Floors using Classifier
            const components = componentsRef.current;
            if (components) {
                const classifier = components.get(OBC.Classifier);
                await classifier.byIfcBuildingStorey();
                
                const storeys = classifier.list.get("storeys");
                if (storeys) {
                    const floorsData: any[] = [];
                    storeys.forEach((_, name: string) => {
                        floorsData.push({
                            name,
                            elevation: 0 // Classifier doesn't give elevation directly v3
                        });
                    });
                    setFloors(floorsData);
                    console.log("🏢 Storeys classified:", floorsData);
                }
            }

            toast.success("Modelo IFC carregado com sucesso!");
            setIsModelLoaded(true);

            // Initial apply colors
            setTimeout(() => applyColors(), 500);
        } catch (error) {
            console.error("IFC Loading failed:", error);
            toast.error("Erro ao carregar modelo IFC.");
        }
    }, [roomColors]);

    const applyColors = useCallback(async () => {
        if (!highlighterRef.current || !roomColors || !fragmentsRef.current) return;

        console.log("🎨 Applying status colors to model...");

        try {
            // Clear existing status highlights
            const styles = (highlighterRef.current as any).styles;
            if (styles) {
                for (const s in styles) {
                    if (s.startsWith("status-")) highlighterRef.current.clear(s);
                }
            }
        } catch (e) {
            console.warn("Could not clear highlighter styles, FragmentsManager might not be initialized:", e);
            return; // Abort applying colors if we can't clear
        }

        // Group rooms by color
        const colorGroups = new Map<string, number[]>();
        (roomColors as any[] || []).forEach((room: any) => {
            if (room.ifcExpressId && room.color) {
                const ids = String(room.ifcExpressId)
                    .split(',')
                    .map(s => Number(s.trim()))
                    .filter(id => !isNaN(id) && id > 0);
                
                if (!colorGroups.has(room.color)) colorGroups.set(room.color, []);
                ids.forEach(id => colorGroups.get(room.color)!.push(id));
            }
        });

        // Apply styles
        for (const [color, ids] of colorGroups.entries()) {
            const styleName = `status-${color}`;
            if (!highlighterRef.current.styles.get(styleName)) {
                const material = new THREE.MeshPhongMaterial({ 
                    color: new THREE.Color(color),
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide,
                    depthTest: true
                });
                (highlighterRef.current as any).add(styleName, material as any);
            }

            // Map IDs to FragmentIdMap
            const fragmentMap: any = {};
            const fragmentList = (fragmentsRef.current as any).list;
            
            // In v3, list is a DataMap, iterate or check keys
            fragmentList.forEach((fragment: any) => {
                if (!fragment) return;
                const fragmentIds = Array.from((fragment as any).ids || []);
                const matchingIds = ids.filter(id => fragmentIds.includes(id));
                if (matchingIds.length > 0) {
                    fragmentMap[(fragment as any).uniqueID] = new Set(matchingIds);
                }
            });

            if (Object.keys(fragmentMap).length > 0) {
                (highlighterRef.current as any).highlightByID(styleName, fragmentMap, true, false);
            }
        }
    }, [roomColors]);

    useEffect(() => {
        if (isModelLoaded) {
            applyColors();
        }
    }, [roomColors, isModelLoaded, applyColors]);

    useEffect(() => {
        if (!isModelLoaded || !fragmentsRef.current) return;
        const fragmentList = (fragmentsRef.current as any).list;
        
        fragmentList.forEach((fragment: any) => {
            if (!fragment) return;
            const mesh = (fragment as any).mesh;
            if (!mesh) return;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((material: any) => {
                if (material) {
                    material.transparent = xRay || mappingMode;
                    material.opacity = (xRay || mappingMode) ? 0.2 : 1.0;
                    material.depthWrite = !(xRay || mappingMode);
                }
            });
        });
    }, [xRay, mappingMode, isModelLoaded]);

    const clipAtElevation = useCallback((elevation: number) => {
        if (!clipperRef.current || !worldRef.current) return;
        
        clipperRef.current.deleteAll();
        
        const plane = clipperRef.current.create(worldRef.current);
        if (plane && (plane as any).three) {
            (plane as any).three.position.y = elevation + 1.1;
            (plane as any).three.rotation.x = -Math.PI / 2;
            (plane as any).enabled = true;
        }
    }, []);

    const resetClip = useCallback(() => {
        if (clipperRef.current) {
            clipperRef.current.deleteAll();
        }
    }, []);


    return {
        containerRef,
        init,
        loadIfcModel,
        isLoaded,
        isModelLoaded,
        selectedRoom,
        setSelectedRoom,
        properties,
        applyColors,
        floors,
        clipAtElevation,
        resetClip,
        xRay,
        setXRay,
        mappingMode,
        setMappingMode
    };
}
