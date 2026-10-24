import { useRef, useState, type PointerEvent } from "react";
import { ArrowDownToLine, Box, RotateCw, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { facadeWindows } from "./openings";
import { configuredDesign, roomZones } from "./catalog";
import { BUILDING_LABELS, entryForConfig, layoutDimensions, StudioConfig } from "./config";
import { blocksEntry, catalogItem, footprint, LayoutItem, nearestFreePlacement, resolvePlacement, snap } from "./layout";

interface Props {
  config: StudioConfig;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLayoutChange: (layout: LayoutItem[]) => void;
  onView3D: () => void;
  onToggleEditing: () => void;
  onFloorChange: (floor: 0 | 1) => void;
}

const scale = 100;
const insetX = 76;
const insetY = 108;
const labels: Record<string, string> = {
  bathroom: "BATHROOM", kitchenette: "KITCHEN", partition: "WALL",
  sofa: "SOFA", "coffee-table": "TABLE", "dining-table": "DINING",
  "tv-console": "TV", nightstand: "BEDSIDE", chair: "CHAIR", bed: "BED", desk: "DESK", storage: "STORAGE",
};

export default function FloorPlan({ config, selectedId, onSelect, onLayoutChange, onView3D, onFloorChange, onToggleEditing }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; offsetX: number; offsetZ: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; z: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState("Drag an item to reposition it. Select one for more options.");
  const { length: L, width: W } = layoutDimensions(config);
  const entry = entryForConfig(config);
  const blockedEntry = entry && config.layout.some((item) => (item.floor ?? 0) === (config.activeFloor ?? 0) && blocksEntry(item, L, entry));
  const viewWidth = (L + 1.52) * scale;
  const viewHeight = (W + 2.18) * scale;
  const selected = config.layout.find((item) => item.id === selectedId);
  const design = configuredDesign(config);
  const zones = design ? roomZones(design, config.activeFloor ?? 0) : [];
  const planItems = config.layout.filter((item) => (item.floor ?? 0) === (config.activeFloor ?? 0)).map((item) => dragPreview?.id === item.id ? { ...item, x: dragPreview.x, z: dragPreview.z, onTopOf: undefined } : item)
    .sort((a, b) => Number(a.id === dragPreview?.id) - Number(b.id === dragPreview?.id));
  const px = (x: number) => insetX + (x + L / 2) * scale;
  const py = (z: number) => insetY + (z + W / 2) * scale;

  function pointerWorld(event: PointerEvent<SVGGElement>) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: (point.x - insetX) / scale - L / 2, z: (point.y - insetY) / scale - W / 2 };
  }
  function move(item: LayoutItem, x: number, z: number) {
    if (config.layoutLocked) return;
    const next = nearestFreePlacement({ ...item, x: snap(x), z: snap(z), onTopOf: undefined }, config.layout, L, entry, W);
    if (next) {
      onLayoutChange(config.layout.map((entry) => entry.id === item.id ? next : entry));
      const corrected = next.x !== snap(x) || next.z !== snap(z);
      setNotice(`${catalogItem(item.kind).label} ${corrected ? "moved to the nearest clear space" : "placed"} at ${next.x.toFixed(1)} m × ${next.z.toFixed(1)} m.`);
    } else setNotice("No clear floor space is available for this item.");
  }
  function rotateSelected() {
    if (!selected || config.layoutLocked) return;
    const next = nearestFreePlacement({ ...selected, rotation: ((selected.rotation + 90) % 360) as LayoutItem["rotation"], onTopOf: undefined }, config.layout, L, entry, W);
    if (next) {
      onLayoutChange(config.layout.map((item) => item.id === selected.id ? next : item));
      setNotice(`${catalogItem(selected.kind).label} rotated to ${next.rotation}°.`);
    }
    else setNotice("Move this item into clear space before rotating it.");
  }
  function resizeWall(delta: number) {
    if (!selected || selected.kind !== "partition") return;
    const max = selected.rotation % 180 === 0 ? W - 0.2 : L - 0.2;
    const wallLength = Math.min(max, Math.max(0.8, Math.round(((selected.wallLength ?? 2.12) + delta) * 10) / 10));
    const next = resolvePlacement({ ...selected, wallLength }, config.layout, L, entry, W);
    if (next) { onLayoutChange(config.layout.map((item) => item.id === selected.id ? next : item)); setNotice(`Wall length set to ${wallLength.toFixed(1)} m.`); }
    else setNotice("Move the wall into clear space before making it longer.");
  }
  function removeSelected() {
    if (!selected) return;
    onLayoutChange(config.layout.filter((item) => item.id !== selected.id));
    onSelect(null);
    setNotice("Item removed from the plan.");
  }
  function exportPlan(format: "svg" | "png") {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(viewWidth));
    clone.setAttribute("height", String(viewHeight));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const download = (href: string, extension: string) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = `${config.size}ft-container-floor-plan.${extension}`;
      link.click();
    };
    if (format === "svg") {
      download(url, "svg");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewWidth * 3);
      canvas.height = Math.ceil(viewHeight * 3);
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.scale(3, 3);
        context.drawImage(image, 0, 0, viewWidth, viewHeight);
        canvas.toBlob((png) => {
          if (!png) return;
          const pngUrl = URL.createObjectURL(png);
          download(pngUrl, "png");
          setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    image.onerror = () => { URL.revokeObjectURL(url); setNotice("The floor plan image could not be exported."); };
    image.src = url;
  }
  const facadeZ = entry?.z ?? (config.doorSide === "left" ? W / 2 : -W / 2);
  const doorX = config.doorPositionFt === undefined ? L * .27 : config.doorPositionFt * .3048;
  const doorW = config.doorStyle === "personnel" ? 0.914 : Math.min(config.doorStyle === "vinyl" ? 2.438 : 1.83, L * 0.33);

  return <main className="floorplan-view" aria-label="Editable container floor plan">
    <div className="floorplan-toolbar">
      <div><span className="floorplan-eyebrow">YOUR CONTAINER / SPACE PLANNER</span><h2>Floor plan</h2><p>{(L - 0.2).toFixed(2)} × {(W - 0.15).toFixed(2)} m usable floor · {planItems.length} placed {planItems.length === 1 ? "item" : "items"}</p></div>
      <div className="floorplan-toolbar-actions"><button type="button" onClick={onToggleEditing}>{config.layoutLocked ? "Edit layout" : "Lock layout"}</button><button type="button" onClick={() => exportPlan("png")} title="Download high resolution floor plan image"><ArrowDownToLine size={16}/> <span>Export PNG</span></button><button type="button" onClick={() => exportPlan("svg")} title="Download editable vector floor plan">SVG</button><button type="button" className="floorplan-3d-button" onClick={onView3D}><Box size={16}/> View in 3D</button></div>
    </div>
    {config.buildingType === "stacked-office" && <div className="plan-floor-tabs" aria-label="Storey">{([0,1] as const).map((floor) => <button type="button" key={floor} aria-pressed={(config.activeFloor ?? 0) === floor} onClick={() => onFloorChange(floor)}>{floor === 0 ? "Ground floor" : "Upper floor"}</button>)}</div>}
    {blockedEntry && <p className="floorplan-warning" role="alert">An item overlaps the entry clearance. Move it before finalizing the layout.</p>}
    <div className="floorplan-workspace">
      <div className="floorplan-paper" style={{ width: `${zoom * 100}%` }}>
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label={`Editable ${config.size} foot container floor plan`} onPointerDown={() => onSelect(null)}>
          <defs><pattern id="plan-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e4e9e4" strokeWidth="1"/></pattern></defs>
          <rect width={viewWidth} height={viewHeight} fill="#ffffff"/>
          <text x={insetX} y="35" fontFamily="Arial" fontSize="18" fontWeight="700" fill="#151515">{design?.name.toUpperCase() ?? "CONTAINER FLOOR PLAN"}</text>
          <text x={insetX} y="55" fontFamily="Arial" fontSize="10" letterSpacing="1.4" fill="#5a5a5a">{BUILDING_LABELS[config.buildingType].toUpperCase()}  /  {planItems.length} PLACED ITEMS</text>
          <line x1={insetX} x2={viewWidth - insetX} y1="69" y2="69" stroke="#1b1b1b" strokeWidth="1"/>
          <line x1={insetX} x2={insetX + L * scale} y1={insetY - 30} y2={insetY - 30} stroke="#708176" strokeWidth="1"/>
          <path d={`M ${insetX} ${insetY - 38} v 16 M ${insetX + L * scale} ${insetY - 38} v 16`} stroke="#708176"/>
          <text x={insetX + L * scale / 2} y={insetY - 38} textAnchor="middle" fontSize="12" fill="#26382b" fontFamily="Arial">{(L / .3048).toFixed(1)} ft / {L.toFixed(2)} m exterior</text>
          <line x1={insetX - 30} x2={insetX - 30} y1={insetY} y2={insetY + W * scale} stroke="#708176" strokeWidth="1"/>
          <path d={`M ${insetX - 38} ${insetY} h 16 M ${insetX - 38} ${insetY + W * scale} h 16`} stroke="#708176"/>
          <text x={insetX - 40} y={insetY + W * scale / 2} textAnchor="middle" transform={`rotate(-90 ${insetX - 40} ${insetY + W * scale / 2})`} fontSize="12" fill="#26382b" fontFamily="Arial">{(W / .3048).toFixed(1)} ft / {W.toFixed(2)} m</text>
          {config.buildingType === "courtyard-l" || config.buildingType === "courtyard-u" ? <g>
            <rect x={insetX} y={insetY} width={L * scale} height={(config.catalogId === "courtyard" ? 12 * .3048 : 2.438) * scale} fill="url(#plan-grid)" stroke="#1d2921" strokeWidth="6"/>
            <rect x={insetX} y={insetY + (config.catalogId === "courtyard" ? 12 * .3048 : 2.438) * scale - 3} width={(config.catalogId === "courtyard" ? 10 * .3048 : 2.438) * scale} height={(W - (config.catalogId === "courtyard" ? 12 * .3048 : 2.438)) * scale + 3} fill="url(#plan-grid)" stroke="#1d2921" strokeWidth="6"/>
            {config.buildingType === "courtyard-u" && <rect x={insetX + (L - (config.catalogId === "courtyard" ? 10 * .3048 : 2.438)) * scale} y={insetY + (config.catalogId === "courtyard" ? 12 * .3048 : 2.438) * scale - 3} width={(config.catalogId === "courtyard" ? 10 * .3048 : 2.438) * scale} height={(W - (config.catalogId === "courtyard" ? 12 * .3048 : 2.438)) * scale + 3} fill="url(#plan-grid)" stroke="#1d2921" strokeWidth="6"/>}
            <text x={insetX + L * scale / 2} y={insetY + (W + 2.438) * scale / 2} textAnchor="middle" fontFamily="Arial" fontSize="12" fill="#758277" letterSpacing="1.2">OPEN COURTYARD</text>
          </g> : <g>
            <rect x={insetX} y={insetY} width={L * scale} height={W * scale} fill="white" stroke="#1d2921" strokeWidth="6"/>
            <rect x={insetX + 3} y={insetY + 3} width={L * scale - 6} height={W * scale - 6} fill="url(#plan-grid)"/>
            {config.buildingType === "foldout-home" && <>
              <line x1={insetX + 4} x2={insetX + L * scale - 4} y1={py(-1.219)} y2={py(-1.219)} stroke="#b07a32" strokeWidth="2" strokeDasharray="10 6"/>
              <line x1={insetX + 4} x2={insetX + L * scale - 4} y1={py(1.219)} y2={py(1.219)} stroke="#b07a32" strokeWidth="2" strokeDasharray="10 6"/>
              <text x={insetX + 12} y={py(-1.219) - 8} fontFamily="Arial" fontSize="9" fill="#95651f">FOLD-OUT HINGE LINE</text>
              {config.foldoutState === "transport" && <rect x={insetX + 5} y={py(-1.219)} width={L * scale - 10} height={(config.catalogId === "courtyard" ? 12 * .3048 : 2.438) * scale} fill="none" stroke="#b07a32" strokeWidth="4"/>}
            </>}
            {config.buildingType === "stacked-office" && <text x={insetX + 14} y={insetY + 22} fontFamily="Arial" fontSize="10" fill="#5c6d60">{(config.activeFloor ?? 0) === 0 ? "GROUND FLOOR · UPPER MODULE ABOVE" : "UPPER FLOOR · EXTERNAL STAIR ACCESS"}</text>}
          </g>}
          {config.containers === 2 && <g pointerEvents="none"><line x1={insetX + 4} x2={insetX + L * scale - 4} y1={py(0)} y2={py(0)} stroke="#9da99e" strokeWidth="2" strokeDasharray="12 8"/><text x={insetX + 15} y={py(0) - 10} fontFamily="Arial" fontSize="9" fill="#68786a">JOINED CONTAINERS / OPEN CONNECTION</text></g>}
          {entry && <g pointerEvents="none"><rect x={px(doorX - doorW / 2 - 0.05)} y={py(facadeZ + (entry.side === "left" ? -.76 : 0))} width={(doorW + 0.1) * scale} height="76" fill="#eaf3e9" fillOpacity=".75" stroke="#9db99f" strokeDasharray="5 4"/><text x={px(doorX)} y={py(facadeZ + (entry.side === "left" ? -.38 : .38))} textAnchor="middle" fontFamily="Arial" fontSize="9" fill="#67816a">KEEP CLEAR</text></g>}
          {config.catalogId !== "courtyard" && facadeWindows(config, L).map((opening, index) => <g key={index}><line x1={px(opening.x - opening.width / 2)} x2={px(opening.x + opening.width / 2)} y1={py(opening.side === "left" ? config.buildingType.startsWith("courtyard") ? facadeZ : W / 2 : -W / 2)} y2={py(opening.side === "left" ? config.buildingType.startsWith("courtyard") ? facadeZ : W / 2 : -W / 2)} stroke="white" strokeWidth="9"/><line x1={px(opening.x - opening.width / 2)} x2={px(opening.x + opening.width / 2)} y1={py(opening.side === "left" ? config.buildingType.startsWith("courtyard") ? facadeZ : W / 2 : -W / 2)} y2={py(opening.side === "left" ? config.buildingType.startsWith("courtyard") ? facadeZ : W / 2 : -W / 2)} stroke="#8dbac1" strokeWidth="5"/></g>)}
          {config.doorStyle !== "none" && <g><line x1={px(doorX - doorW / 2)} x2={px(doorX + doorW / 2)} y1={py(facadeZ)} y2={py(facadeZ)} stroke="white" strokeWidth="10"/><line x1={px(doorX - doorW / 2)} x2={px(doorX + doorW / 2)} y1={py(facadeZ)} y2={py(facadeZ)} stroke="#708d7d" strokeWidth="3" strokeDasharray={config.doorStyle === "roll-up" ? "5 4" : undefined}/></g>}
          {zones.map((zone, index) => <g key={index} pointerEvents="none"><rect x={px(zone.x - zone.w / 2)} y={py(zone.z - zone.d / 2)} width={zone.w * scale} height={zone.d * scale} fill={zone.name === "Washroom" ? "#d9e8e8" : "#e8e1cf"} fillOpacity=".25" stroke="#799286" strokeWidth="1.3" strokeDasharray="6 4"/><text x={px(zone.x - zone.w / 2) + 9} y={py(zone.z - zone.d / 2) + 16} fontSize="9" fill="#4b6657" fontFamily="Arial">{zone.name.toUpperCase()} · {(zone.w / .3048).toFixed(0)}′ × {(zone.d / .3048).toFixed(0)}′</text></g>)}
          {zones.filter((zone) => zone.name.includes("Bedroom") && (config.catalogId !== "courtyard" || zone.name === "Bedroom 3")).map((zone, index) => {
            const wallX = zone.x < 0 ? zone.x + zone.w / 2 : zone.x - zone.w / 2;
            const doorZ = zone.z + zone.d / 2 - .62;
            return <g key={index} pointerEvents="none"><path d={`M ${px(wallX)} ${py(zone.z-zone.d/2)} V ${py(doorZ-.42)} M ${px(wallX)} ${py(doorZ+.42)} V ${py(zone.z+zone.d/2)}`} fill="none" stroke="#52665b" strokeWidth="7"/><line x1={px(wallX)+5} x2={px(wallX)+5} y1={py(doorZ-.42-.55)} y2={py(doorZ+.42-.55)} stroke="#af8c64" strokeWidth="4"/></g>;
          })}
          {config.buildingType === "foldout-home" && <g pointerEvents="none">{[-1,1].map((sign) => <g key={sign}><path d={`M ${px(sign*(L/2-.12))} ${py(1.26)} H ${px(sign*2.55)} V ${py(1.34)} M ${px(sign*2.55)} ${py(2.2)} V ${py(3.53)}`} fill="none" stroke="#52665b" strokeWidth="7"/><line x1={px(sign*2.55)+5} x2={px(sign*2.55)+5} y1={py(2.08)} y2={py(2.87)} stroke="#af8c64" strokeWidth="4"/></g>)}</g>}
          {config.catalogId === "courtyard" && <g pointerEvents="none">
            {[-W/2,0].map((z) => <line key={z} x1={px(-L*.26-.915)} x2={px(-L*.26+.915)} y1={py(z)} y2={py(z)} stroke="#8dbac1" strokeWidth="5"/>)}
            {[-1,1].map((side) => <g key={side}><line x1={px(side*L/2)} x2={px(side*L/2)} y1={py(2.2)} y2={py(3.36)} stroke="#8dbac1" strokeWidth="5"/><line x1={px(side*10*.3048)} x2={px(side*10*.3048)} y1={py(6*.3048-.457)} y2={py(6*.3048+.457)} stroke="#af8c64" strokeWidth="6"/></g>)}
          </g>}
          {planItems.map((item) => {
            const size = footprint(item);
            const x = px(item.x) - size.width * scale / 2, y = py(item.z) - size.depth * scale / 2;
            const chosen = item.id === selectedId;
            return <g key={item.id} role="button" tabIndex={0} aria-label={`${catalogItem(item.kind).label}, ${size.width.toFixed(2)} by ${size.depth.toFixed(2)} metres`} onFocus={() => { if (!config.layoutLocked) onSelect(item.id); }} onClick={() => { if (!config.layoutLocked) onSelect(item.id); }}
              onPointerDown={(event) => { event.stopPropagation(); if (config.layoutLocked) return; onSelect(item.id); const point = pointerWorld(event); if (!point) return; drag.current = { id: item.id, offsetX: item.x - point.x, offsetZ: item.z - point.z }; setDragPreview({ id: item.id, x: item.x, z: item.z }); event.currentTarget.setPointerCapture(event.pointerId); }}
              onPointerMove={(event) => { const active = drag.current; if (active?.id !== item.id) return; const point = pointerWorld(event); if (point) setDragPreview({ id: item.id, x: snap(point.x + active.offsetX), z: snap(point.z + active.offsetZ) }); }}
              onPointerUp={(event) => { const active = drag.current; if (active?.id === item.id) { const point = pointerWorld(event); const original = config.layout.find((entry) => entry.id === item.id); if (original && point) move(original, point.x + active.offsetX, point.z + active.offsetZ); } drag.current = null; setDragPreview(null); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
              onPointerCancel={() => { drag.current = null; setDragPreview(null); }}
              onKeyDown={(event) => { if (config.layoutLocked) return; if (event.key.startsWith("Arrow")) { event.preventDefault(); const dx = event.key === "ArrowLeft" ? -0.1 : event.key === "ArrowRight" ? 0.1 : 0; const dz = event.key === "ArrowUp" ? -0.1 : event.key === "ArrowDown" ? 0.1 : 0; move(item, item.x + dx, item.z + dz); } else if (event.key === "Delete" || event.key === "Backspace") { onLayoutChange(config.layout.filter((entry) => entry.id !== item.id)); onSelect(null); } else if (event.key.toLowerCase() === "r") rotateSelected(); }}>
              <g transform={`translate(${px(item.x)} ${py(item.z)}) rotate(${-item.rotation})`} pointerEvents="none">
                {(() => {
                  const base = catalogItem(item.kind), w = (item.width ?? base.width) * scale, d = (item.kind === "partition" ? item.wallLength ?? base.depth : item.depth ?? base.depth) * scale;
                  const left = -w / 2, top = -d / 2;
                  return <>
                    <rect x={left} y={top} width={w} height={d} rx={item.kind === "bathroom" || item.kind === "partition" ? 0 : 4} fill={item.kind === "bathroom" ? "#e7eee9" : item.kind === "kitchenette" ? "#e8e3d8" : "#f0efe9"} stroke={chosen ? "#1d5f46" : "#5e6f62"} strokeWidth={chosen ? 3 : 1.5}/>
                    {item.kind === "bathroom" && <>
                      <path d={`M ${left+3} ${top+3} H ${left+w-3} V ${top+d-3} M ${left+3} ${top+3} V ${top+d-3}`} fill="none" stroke="#31493a" strokeWidth="4"/>
                      <line x1={-Math.min(38,w/2-10)} x2={Math.min(38,w/2-10)} y1={top+d-3} y2={top+d-3} stroke="#b5916f" strokeWidth="4"/>
                      {config.washroom?.shower !== false && d > 150 && <rect x={left+9} y={top+9} width={Math.min(75,w-18)} height="70" rx="3" fill="#d5e8e9" stroke="#8aa7a6"/>}
                      <ellipse cx={w > 140 ? w/2-29 : -w/2+32} cy={d > 150 ? d/2-55 : -d/2+40} rx="17" ry="24" fill="white" stroke="#98a8a0"/>
                      <rect x={w/2-48} y={top+14} width="36" height="32" rx="5" fill="white" stroke="#98a8a0"/>
                    </>}
                    {item.kind === "sofa" && <><rect x={left+5} y={d/2-16} width={w-10} height="12" rx="4" fill="#bfc9ba"/><line x1="0" x2="0" y1={top+6} y2={d/2-18} stroke="#abb7a9"/><rect x={left+5} y={top+6} width="12" height={d-12} rx="4" fill="#cdd6c8"/><rect x={w/2-17} y={top+6} width="12" height={d-12} rx="4" fill="#cdd6c8"/></>}
                    {item.kind === "bed" && <><rect x={left+5} y={top+6} width={w-10} height={d-12} rx="5" fill="#fff" stroke="#aab6aa"/>{[-1,1].map((sign) => <rect key={sign} x={sign*w*.23-23} y={top+12} width="46" height="30" rx="5" fill="#eceee8"/>)}<rect x={left+7} y={d/2-50} width={w-14} height="35" fill="#c3d0bf"/></>}
                    {item.kind === "kitchenette" && <><rect x={left+8} y={top+10} width={w*.3} height={d-20} rx="4" fill="#bfcfd0"/>{[.65,.82].map((part) => <circle key={part} cx={left+w*part} cy="0" r="7" fill="#46534c"/>)}</>}
                    {item.kind === "tv-console" && <rect x={left+5} y={top+5} width={w-10} height="9" fill="#25393b"/>}
                    {item.kind === "desk" && <rect x="-22" y="3" width="44" height="7" fill="#25393b"/>}
                    {item.kind === "chair" && <line x1={left+4} x2={w/2-4} y1={d/2-7} y2={d/2-7} stroke="#9aa98f" strokeWidth="7"/>}
                  </>;
                })()}
              </g>
              <text x={x + size.width * scale / 2} y={y + size.depth * scale / 2 + 4} textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize={size.width < .65 ? 8 : 10} letterSpacing=".7" fill="#23362a" pointerEvents="none">{labels[item.kind]}</text>
              {item.kind !== "bathroom" && item.kind !== "partition" && <path d={`M ${x + size.width * scale / 2 - 5} ${y + size.depth * scale - 11} l 5 -6 5 6`} transform={`rotate(${item.rotation} ${x + size.width * scale / 2} ${y + size.depth * scale / 2})`} fill="none" stroke="#30443a" strokeWidth="1.5" pointerEvents="none"/>}
              {chosen && <circle cx={x + size.width * scale} cy={y + size.depth * scale} r="5" fill="#1d5f46"/>}
            </g>;
          })}
          <text x={insetX + L * scale - 7} y={insetY + W * scale + 23} textAnchor="end" fontFamily="Arial" fontSize="10" fill="#69786b">FINISHED END →</text>
          <line x1={insetX + 4} x2={insetX + 104} y1={viewHeight - 25} y2={viewHeight - 25} stroke="#304c38" strokeWidth="2"/>
          <path d={`M ${insetX + 4} ${viewHeight - 31} v 12 M ${insetX + 104} ${viewHeight - 31} v 12`} stroke="#304c38"/>
          <text x={insetX + 54} y={viewHeight - 32} textAnchor="middle" fontFamily="Arial" fontSize="10" fill="#304c38">1 m</text>
          <line x1={insetX} x2={viewWidth - insetX} y1={viewHeight - 84} y2={viewHeight - 84} stroke="#b9bfb9"/>
          <text x={viewWidth - insetX} y={viewHeight - 57} textAnchor="end" fontFamily="Arial" fontSize="10" fontWeight="700" fill="#242a24">{BUILDING_LABELS[config.buildingType].toUpperCase()} · {L.toFixed(2)} × {W.toFixed(2)} m</text>
          <text x={viewWidth - insetX} y={viewHeight - 38} textAnchor="end" fontFamily="Arial" fontSize="9" fill="#737b73">SPACE PLANNER / TOP VIEW</text>
        </svg>
      </div>
    </div>
    {selected && !config.layoutLocked && <div className="floorplan-selection"><div><span>SELECTED ITEM</span><strong>{catalogItem(selected.kind).label}</strong><small>{selected.kind === "partition" ? `${(selected.wallLength ?? 2.12).toFixed(1)} m wall · ` : `${footprint(selected).width.toFixed(2)} × ${footprint(selected).depth.toFixed(2)} m · `}{selected.rotation}°</small></div>{selected.kind === "bathroom" && <div className="bath-size-controls">{(["width", "depth"] as const).map((axis) => <label key={axis}>{axis === "width" ? "Length" : "Width"} (m)<input type="number" min="1.1" max="3" step=".1" value={selected[axis] ?? (axis === "width" ? 1.55 : 2.18)} onChange={(event) => { const value = +event.target.value; if (value < 1.1 || value > 3) return; const next = resolvePlacement({ ...selected, [axis]: value }, config.layout, L, entry, W); if (next) { onLayoutChange(config.layout.map((item) => item.id === next.id ? next : item)); setNotice("Washroom dimensions updated."); } else setNotice("That size overlaps a piece or leaves the shell. Move it into clear space first."); }}/></label>)}</div>}{selected.kind === "partition" && <><button type="button" onClick={() => resizeWall(-0.2)} aria-label="Shorten wall">−</button><button type="button" onClick={() => resizeWall(0.2)} aria-label="Lengthen wall">+</button></>}<button type="button" onClick={rotateSelected}  aria-label="Rotate selected item"><RotateCw size={17}/></button><button type="button" onClick={removeSelected} aria-label="Remove selected item"><Trash2 size={17}/></button></div>}
    <div className="floorplan-bottom"><p role="status">{config.layoutLocked ? "Furnished layout · furniture stays fixed while you explore." : notice}</p><div className="floorplan-zoom"><button type="button" onClick={() => setZoom((value) => Math.max(0.8, +(value - 0.2).toFixed(1)))} aria-label="Zoom out"><ZoomOut size={16}/></button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(2, +(value + 0.2).toFixed(1)))} aria-label="Zoom in"><ZoomIn size={16}/></button></div></div>
  </main>;
}
