import { Plus, Trash2 } from "lucide-react";
import { ITEM_CATALOG, LayoutItem, ItemKind, LayoutPreset, catalogItem } from "./layout";

interface Props {
  locked: boolean;
  layout: LayoutItem[];
  selectedId: string | null;
  notice: string;
  onPreset: (preset: LayoutPreset) => void;
  onAdd: (kind: ItemKind) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function LayoutControls({ locked, layout, selectedId, notice, onPreset, onAdd, onSelect, onRemove }: Props) {
  const presets = [
    ["focus-office", "Portable focus office", "20 ft · fitted desks, pantry and powder room"],
    ["team-office", "Team meeting office", "40 ft · workstations, kitchen and powder room"],
    ["coffee-kiosk", "Coffee kiosk", "20 ft · service counter and customer perch"],
    ["courtyard-home", "U-courtyard home", "3 modules · three bedroom family layout"],
    ["l-courtyard-home", "L-courtyard home", "2 modules · sheltered outdoor edge"],
    ["stacked-office", "Stacked office", "2 storeys · client and team zones"],
    ["foldout-home", "Fold-out family home", "8 ft transport · 24 ft deployed width"],
    ["studio", "Open studio", "Seating, kitchen and bathroom"],
    ["stay", "Weekend stay", "Bed, kitchenette and bathroom"],
    ["empty", "Empty shell", "Start from the clear floor"],
  ] as const;
  return <div className="layout-controls">
    <p className="studio-label">Reference-inspired spaces</p>
    <div className="layout-presets">{presets.map(([id, name, description]) => <button key={id} type="button" onClick={() => onPreset(id)}><strong>{name}</strong><small>{description}</small></button>)}</div>
    <p className="studio-label">Add to the floor plan</p>
    <div className="layout-catalog">{ITEM_CATALOG.map(({ kind, label, width, depth, group }) => <button key={kind} type="button" onClick={() => onAdd(kind)}><span><strong>{label}</strong><small>{group} · {width.toFixed(2)} × {depth.toFixed(2)} m</small></span><Plus size={15}/></button>)}</div>
    <p className="layout-control-notice" role="status">{notice}</p>
    <p className="studio-label">Placed items · {layout.length}</p>
    <div className="layout-placed">{layout.length ? layout.map((item) => <div key={item.id} className={item.id === selectedId ? "selected" : ""}><button type="button" onClick={() => onSelect(item.id)}>{catalogItem(item.kind).label}<small>{item.x.toFixed(1)} m · {item.z.toFixed(1)} m</small></button><button type="button" aria-label={`Remove ${catalogItem(item.kind).label}`} disabled={locked} onClick={() => onRemove(item.id)}><Trash2 size={14}/></button></div>) : <p>The floor is clear. Add a piece above.</p>}</div>
    <p className="studio-note">{locked ? "Furniture is fixed while viewing. Use Edit layout in the preview to customize a room." : "Drag furniture to reposition it. Arrow keys move by 10 cm; R rotates."}</p>
  </div>;
}
