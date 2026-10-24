import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import type { ViewerHandle } from "./Viewport";
import Controls from "./Controls";
const Viewport = lazy(() => import("./Viewport"));
import { CATALOG, catalogConfig, CatalogDesign, resizedCatalogLayout } from "./catalog";
import FloorPlan from "./FloorPlan";
import { addLayoutItem, correctOverlaps, ItemKind, LayoutItem, LayoutPreset, nearestFreePlacement, presetLayout } from "./layout";
import {
  CameraFocus,
  CameraRequest,
  configReducer,
  entryForConfig,
  DEFAULT_CONFIG,
  layoutDimensions,
  StudioConfig,
} from "./config";
const isInteriorFocus = (view: CameraFocus) => ["interior", "floor", "walls", "indoor-ac"].includes(view);
import "./studio.css";
const FURNISHED_DEFAULT = { ...DEFAULT_CONFIG, ...catalogConfig(CATALOG.find((design) => design.id === "family")!) };
const DESIGN_STORAGE_KEY = "grid-logic-studio-design-v4";
export default function Studio() {
  const [config, dispatch] = useReducer(configReducer, FURNISHED_DEFAULT, (initial) => {
    try {
      const saved = JSON.parse(localStorage.getItem(DESIGN_STORAGE_KEY) || "null");
      if (!saved || !Array.isArray(saved.layout)) return initial;
      const hydrated = { ...initial, ...saved } as StudioConfig;
      const bounds = layoutDimensions(hydrated);
      return { ...hydrated, layout: correctOverlaps(saved.layout, bounds.length, entryForConfig(hydrated), bounds.width) };
    } catch { return initial; }
  });
  useEffect(() => {
    const { length, width } = layoutDimensions(config);
    const corrected = correctOverlaps(config.layout, length, entryForConfig(config), width);
    if (corrected.some((item, index) => item.x !== config.layout[index].x || item.z !== config.layout[index].z || item.onTopOf !== config.layout[index].onTopOf)) dispatch({ layout: corrected });
  }, [config.layout, config.size, config.lengthFt, config.widthFt, config.containers, config.buildingType, config.foldoutState, config.doorStyle, config.doorSide, config.doorPositionFt]);
  useEffect(() => {
    performance.mark("studio-plan-ready");
    document.documentElement.dataset.planReadyMs = performance.now().toFixed(0);
  }, []);
  const [mode, setMode] = useState<"plan" | "3d">("plan");
  const viewer = useRef<ViewerHandle>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [layoutNotice, setLayoutNotice] = useState("Fully furnished layouts. Choose a design to explore; unlock editing when needed.");
  const [request, setRequest] = useState<CameraRequest>({
    focus: "exterior",
    sequence: 0,
  });
  const focus = (view: CameraFocus) => {
    setMode("3d");
    if (view === "exterior") dispatch({ cutaway: false });
    if (view === "layout") dispatch({ cutaway: true });
    if (isInteriorFocus(view)) dispatch({ sideDoorOpen: true });
    setRequest((previous) => ({
      focus: view,
      sequence: previous.sequence + 1,
    }));
  };
  const change = (patch: Partial<StudioConfig>, view: CameraFocus) => {
    if (patch.buildingType && patch.buildingType !== config.buildingType && patch.buildingType !== "standard") {
      const types: Partial<Record<StudioConfig["buildingType"], LayoutPreset>> = { "portable-office": "focus-office", "retail-kiosk": "coffee-kiosk", "courtyard-l": "l-courtyard-home", "courtyard-u": "courtyard-home", "stacked-office": "stacked-office", "foldout-home": "foldout-home" };
      preset(types[patch.buildingType]!); focus("exterior"); return;
    }
    if (config.buildingType === "foldout-home" && ((patch.lengthFt !== undefined && patch.lengthFt < 32) || patch.size === 20)) { setLayoutNotice("That size cannot fit the two-bedroom fold-out layout. Use the 40 foot module."); return; }
    if (config.catalogId && patch.catalogId !== undefined && patch.catalogId !== config.catalogId) setSelectedItemId(null);
    if (config.catalogId && (patch.lengthFt !== undefined || patch.widthFt !== undefined) && !("catalogId" in patch)) {
      const fitted = resizedCatalogLayout(config, patch);
      if (!fitted) { setLayoutNotice("That size cannot fit this furnished layout. Choose a larger footprint or a different design."); return; }
      patch = fitted;
    }
    setMode("3d");
    if (patch.roofProfile || patch.roofColor || patch.cladding || patch.solar !== undefined || patch.canopy !== undefined || patch.terraceFt !== undefined) patch = { ...patch, cutaway: false };
    if (
      (patch.lengthFt && patch.lengthFt !== config.lengthFt) ||
      (patch.widthFt && patch.widthFt !== config.widthFt) ||
      (patch.size && patch.size !== config.size) ||
      (patch.containers && patch.containers !== config.containers) ||
      (patch.buildingType && patch.buildingType !== config.buildingType)
    ) {
      const nextConfig = { ...config, ...patch };
      const { length, width } = layoutDimensions(nextConfig);
      const shifted = patch.layout ?? config.layout;
      const kept: LayoutItem[] = [];
      const entry = entryForConfig(nextConfig);
      for (const item of shifted) {
        const placed = patch.layout ? item : nearestFreePlacement(item, kept, length, entry, width);
        if (placed) kept.push(placed);
      }
      patch = { ...patch, layout: kept };
      setLayoutNotice(kept.length < config.layout.length ? "Some pieces could not fit the new shell." : "Layout adapted to the new container footprint.");
    }
    dispatch({
      ...patch,
      ...(isInteriorFocus(view) ? { sideDoorOpen: true } : {}),
    });
    setRequest((previous) => ({
      focus: view,
      sequence: previous.sequence + 1,
    }));
  };
  const updateLayout = (layout: LayoutItem[]) => {
    const { length, width } = layoutDimensions(config);
    dispatch({ layout: correctOverlaps(layout, length, entryForConfig(config), width) });
  };
  const preset = (name: LayoutPreset) => {
    const readyDesigns: Partial<Record<LayoutPreset, string>> = { studio: "gabled-studio", stay: "cedar-home", work: "mint", "focus-office": "mint", "team-office": "olive", "stacked-office": "office-hub", "courtyard-home": "courtyard" };
    const ready = CATALOG.find((design) => design.id === readyDesigns[name]);
    if (ready) {
      dispatch(catalogConfig(ready)); setSelectedItemId(null); setMode("plan");
      setLayoutNotice(ready.name + " · fully furnished and ready to explore."); return;
    }
    const shellPatch: Partial<StudioConfig> =
      name === "focus-office"
        ? { size: 20, containers: 1, buildingType: "portable-office", windowStyle: "glass", windowSide: "both", doorStyle: "personnel", cutaway: true }
        : name === "team-office"
          ? { size: 40, containers: 1, buildingType: "portable-office", windowStyle: "glass", windowSide: "both", doorStyle: "sliding", cutaway: true }
          : name === "coffee-kiosk"
            ? { size: 20, containers: 1, buildingType: "retail-kiosk", windowStyle: "glass", windowSide: "left", doorStyle: "personnel", cutaway: false }
            : name === "courtyard-home"
              ? { size: 40, containers: 1, buildingType: "courtyard-u", windowStyle: "glass", windowSide: "both", doorStyle: "sliding", cutaway: true }
              : name === "l-courtyard-home"
                ? { size: 40, containers: 1, buildingType: "courtyard-l", windowStyle: "picture", windowSide: "both", doorStyle: "sliding", cutaway: true }
                : name === "stacked-office"
                  ? { size: 40, containers: 1, buildingType: "stacked-office", windowStyle: "glass", windowSide: "both", doorStyle: "sliding", cutaway: false }
                  : name === "foldout-home"
                    ? { size: 40, containers: 1, buildingType: "foldout-home", foldoutState: "expanded", windowStyle: "glass", windowSide: "both", doorStyle: "sliding", cutaway: true }
                    : name === "empty"
                      ? {}
                      : { buildingType: "standard" };
    shellPatch.catalogId = undefined;
    shellPatch.doorPositionFt = name === "l-courtyard-home" ? -2.5 / .3048 : name === "foldout-home" ? 0 : undefined;
    shellPatch.windowPositionFt = undefined;
    shellPatch.activeFloor = 0;
    shellPatch.doorSide = "left";
    shellPatch.canopy = false; shellPatch.terraceFt = 0; shellPatch.solar = false;
    shellPatch.lengthFt = undefined;
    shellPatch.widthFt = undefined;
    const nextConfig = { ...config, ...shellPatch };
    const bounds = layoutDimensions(nextConfig);
    const layout = correctOverlaps(
      presetLayout(name, bounds.length, bounds.width),
      bounds.length,
      entryForConfig(nextConfig),
      bounds.width,
    );
    dispatch({ ...shellPatch, layout, layoutLocked: true });
    setSelectedItemId(null);
    setMode("plan");
    const labels: Record<LayoutPreset, string> = {
      studio: "Open studio", work: "Work office", stay: "Weekend stay", empty: "Empty shell",
      "focus-office": "Portable focus office", "team-office": "Team meeting office", "coffee-kiosk": "Coffee kiosk",
      "courtyard-home": "U-courtyard family home", "l-courtyard-home": "L-courtyard home",
      "stacked-office": "Stacked portable office", "foldout-home": "Expandable fold-out family home",
    };
    setLayoutNotice(`${labels[name]} layout loaded.`);
  };
  const add = (kind: ItemKind) => {
    dispatch({ layoutLocked: false });
    const { length, width } = layoutDimensions(config);
    const currentFloor = config.layout.filter((item) => (item.floor ?? 0) === (config.activeFloor ?? 0));
    const added = addLayoutItem(currentFloor, kind, length, entryForConfig(config), width);
    setMode("plan");
    if (added === currentFloor) setLayoutNotice("No clear space for that item. Move or remove another piece first.");
    else {
      const next = [...config.layout.filter((item) => (item.floor ?? 0) !== (config.activeFloor ?? 0)), ...added.map((item) => ({ ...item, floor: config.activeFloor ?? 0 }))];
      updateLayout(next); setSelectedItemId(next[next.length - 1].id); setLayoutNotice("Item added. Drag it to the position you want.");
    }
  };
  const viewLayout3D = () => {
    dispatch({ cutaway: true });
    setMode("3d");
    setRequest((previous) => ({ focus: "layout", sequence: previous.sequence + 1 }));
  };
  const toggleDoor = (door: "cargo" | "side" | "rear") => {
    const key = door === "cargo" ? "cargoOpen" : door === "side" ? "sideDoorOpen" : "rearRollupOpen";
    dispatch({ [key]: !config[key] });
  };
  return (
    <div className="container-studio">
      <Controls
        config={config}
        onChange={change}
        onCatalog={(design: CatalogDesign) => {
          const next = { ...config, ...catalogConfig(design) };
          const bounds = layoutDimensions(next);
          dispatch({ ...next, layout: correctOverlaps(next.layout, bounds.length, entryForConfig(next), bounds.width) });
          setSelectedItemId(null); setMode("plan"); setLayoutNotice(`${design.name} loaded with fitted rooms and furniture. Unlock the layout to customize.`);
        }}
        onReset={() => { dispatch({ ...DEFAULT_CONFIG, ...catalogConfig(CATALOG.find((design) => design.id === "family")!) }); setSelectedItemId(null); setMode("plan"); setLayoutNotice("Furnished family home restored."); }}
        onFocus={focus}
        onOpenPlan={() => setMode("plan")}
        selectedItemId={selectedItemId}
        layoutNotice={layoutNotice}
        onLayoutPreset={preset}
        onAddLayoutItem={add}
        onSelectLayoutItem={(id) => { setSelectedItemId(id); setMode("plan"); }}
        onRemoveLayoutItem={(id) => { updateLayout(config.layout.filter((item) => item.id !== id)); if (selectedItemId === id) setSelectedItemId(null); }}
        onSave={() => {
          localStorage.setItem(
            DESIGN_STORAGE_KEY,
            JSON.stringify(config),
          );
          const blob = new Blob(
            [JSON.stringify({ version: 3, config }, null, 2)],
            { type: "application/json" },
          );
          const url = URL.createObjectURL(blob),
            link = document.createElement("a");
          link.href = url;
          link.download = "container-studio-design.json";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      />
      {mode === "plan" ? <FloorPlan config={config} selectedId={selectedItemId} onSelect={setSelectedItemId} onLayoutChange={updateLayout} onView3D={viewLayout3D} onToggleEditing={() => dispatch({ layoutLocked: !config.layoutLocked })} onFloorChange={(activeFloor) => { dispatch({ activeFloor }); setSelectedItemId(null); }}/> : <Suspense fallback={<div className="studio-preview-loading" role="status">Opening 3D preview…<button onClick={() => setMode("plan")}>Back to floor plan</button></div>}><Viewport ref={viewer} config={config} request={request} selectedId={selectedItemId} onSelect={setSelectedItemId} onLayoutChange={updateLayout} onFocus={focus} onOpenPlan={() => setMode("plan")} onToggleDoor={toggleDoor} onFloorChange={(activeFloor) => { dispatch({ activeFloor }); setSelectedItemId(null); setRequest((previous) => ({ ...previous, sequence: previous.sequence + 1 })); }} onToggleEditing={() => { dispatch({ layoutLocked: !config.layoutLocked }); setSelectedItemId(null); }}/></Suspense>}
    </div>
  );
}
