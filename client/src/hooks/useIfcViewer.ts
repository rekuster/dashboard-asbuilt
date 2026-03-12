import { useState, useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useIfcViewer() {
    const componentsRef = useRef<OBC.Components | null>(null);
    const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
    const loaderRef = useRef<OBC.FragmentIfcLoader | null>(null);
    const highlighterRef = useRef<OBCF.Highlighter | null>(null);
    const worldRef = useRef<OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer> | null>(null);
    const clipperRef = useRef<OBC.Clipper | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isLoaded, setIsLoaded] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [floors, setFloors] = useState<{ name: string, elevation: number }[]>([]);
    const [xRay, setXRay] = useState(false);
    const [mappingMode, setMappingMode] = useState(false);
    
    const utils = trpc.useUtils();
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
        if (!fragments.initialized) fragments.init(); 
        fragmentsRef.current = fragments;

        const loader = components.get(OBC.IfcLoader);
        loader.setup();
        loaderRef.current = loader;

        // Setup WASM for Vercel
        loader.settings.wasm = {
            path: "https://unpkg.com/web-ifc@0.0.75/", 
            absolute: true
        };

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
        highlighter.events.select.onHighlight.add((selection) => {
            const fragmentID = Object.keys(selection)[0];
            const expressIDs = Array.from(selection[fragmentID]);
            const expressID = expressIDs[0];
            
            if (expressID) {
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
        });

        setIsLoaded(true);

        return () => {
            try {
                components.dispose();
            } catch (e) {
                console.warn("Error during components disposal", e);
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
        if (!loaderRef.current || !worldRef.current || !highlighterRef.current) return;

        try {
            setIsModelLoaded(false);
            const file = await fetch(url);
            const data = await file.arrayBuffer();
            const buffer = new Uint8Array(data);
            
            const model = await loaderRef.current.load(buffer, true, "model");
            worldRef.current.scene.three.add(model);
            
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

        // Clear existing status highlights
        const styles = (highlighterRef.current as any).styles;
        if (styles) {
            for (const s in styles) {
                if (s.startsWith("status-")) highlighterRef.current.clear(s);
            }
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
                highlighterRef.current.add(styleName, material as any);
            }

            // Map IDs to FragmentIdMap
            const fragmentMap: OBC.FragmentIdMap = {};
            const fragmentList = fragmentsRef.current.list;
            
            // In v3, list is a DataMap, iterate or check keys
            fragmentList.forEach((fragment) => {
                if (!fragment || !fragment.ids) return;
                const fragmentIds = Array.from(fragment.ids);
                const matchingIds = ids.filter(id => fragmentIds.includes(id));
                if (matchingIds.length > 0) {
                    fragmentMap[fragment.uniqueID] = new Set(matchingIds);
                }
            });

            if (Object.keys(fragmentMap).length > 0) {
                highlighterRef.current.highlightByID(styleName, fragmentMap, true, false);
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
        const fragmentList = fragmentsRef.current.list;
        
        fragmentList.forEach((fragment) => {
            if (!fragment || !fragment.mesh) return;
            const materials = Array.isArray(fragment.mesh.material) ? fragment.mesh.material : [fragment.mesh.material];
            materials.forEach(material => {
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
        if (plane) {
            plane.three.position.y = elevation + 1.1;
            plane.three.rotation.x = -Math.PI / 2;
            plane.enabled = true;
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
