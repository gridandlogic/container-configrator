import {
  Check,
  ChevronDown,
  Box,
  Paintbrush,
  PanelsTopLeft,
  DoorOpen,
  Layers,
  Snowflake,
  SlidersHorizontal,
  Home,
  Wallpaper,
  LayoutGrid,
} from "lucide-react";
import {
  CameraFocus,
  Category,
  BUILDING_LABELS,
  DEFAULT_CONFIG,
  DoorStyle,
  FINISHES,
  FLOORS,
  FloorFinish,
  Side,
  StudioConfig,
  WallFinish,
  WINDOWS,
  dimensions,
} from "./config";
import { useState } from "react";
import LayoutControls from "./LayoutControls";
import CatalogControls from "./CatalogControls";
import { CatalogDesign, CATALOG } from "./catalog";
import { ExteriorOptions, WashroomOptions } from "./DesignOptions";
import { ItemKind, LayoutPreset } from "./layout";

const CATEGORIES: {
  id: Category;
  label: string;
  icon: typeof Box;
  focus: CameraFocus;
}[] = [
  { id: "container", label: "Container", icon: Box, focus: "exterior" },
  { id: "layout", label: "Floor plan & furniture", icon: LayoutGrid, focus: "layout" },
  {
    id: "exterior",
    label: "Exterior finish",
    icon: Paintbrush,
    focus: "exterior",
  },
  { id: "windows", label: "Windows", icon: PanelsTopLeft, focus: "left" },
  { id: "doors", label: "Doors", icon: DoorOpen, focus: "left" },
  { id: "washroom", label: "Washroom", icon: Home, focus: "layout" },
  { id: "interior", label: "Interior", icon: Home, focus: "interior" },
  { id: "flooring", label: "Flooring", icon: Layers, focus: "floor" },
  { id: "walls", label: "Wall finish", icon: Wallpaper, focus: "walls" },
  { id: "climate", label: "Climate / AC", icon: Snowflake, focus: "indoor-ac" },
  {
    id: "accessories",
    label: "Accessories",
    icon: SlidersHorizontal,
    focus: "exterior",
  },
];
interface Props {
  config: StudioConfig;
  onChange: (patch: Partial<StudioConfig>, focus: CameraFocus) => void;
  onFocus: (focus: CameraFocus) => void;
  onSave: () => void;
  onReset: () => void;
  onCatalog: (design: CatalogDesign) => void;
  onOpenPlan: () => void;
  selectedItemId: string | null;
  layoutNotice: string;
  onLayoutPreset: (preset: LayoutPreset) => void;
  onAddLayoutItem: (kind: ItemKind) => void;
  onSelectLayoutItem: (id: string) => void;
  onRemoveLayoutItem: (id: string) => void;
}
export default function Controls({ onCatalog, config, onChange, onFocus, onSave, onReset, onOpenPlan, selectedItemId, layoutNotice, onLayoutPreset, onAddLayoutItem, onSelectLayoutItem, onRemoveLayoutItem }: Props) {
  const [open, setOpen] = useState<Category | null>("layout");
  const [saved, setSaved] = useState(false);
  const dim = dimensions(config);
  const choice = (
    label: string,
    selected: boolean,
    action: () => void,
    note?: string,
  ) => (
    <button
      key={label}
      type="button"
      className={`studio-choice ${selected ? "selected" : ""}`}
      aria-pressed={selected}
      onClick={action}
    >
      <span>
        {label}
        {note && <small>{note}</small>}
      </span>
      {selected && <Check size={14} />}
    </button>
  );
  const toggle = (
    label: string,
    key:
      | "cargoOpen"
      | "sideDoorOpen"
      | "rearRollupOpen"
      | "cutaway"
      | "rearRollup"
      | "ac"
      | "vents"
      | "steps"
      | "lights",
    focus: CameraFocus,
    note?: string,
  ) => (
    <label className="studio-toggle">
      <span>
        {label}
        {note && <small>{note}</small>}
      </span>
      <input
        type="checkbox"
        checked={config[key]}
        onChange={(e) => onChange({ [key]: e.target.checked }, focus)}
      />
    </label>
  );
  const openingFocus = (
    kind: "window" | "door",
    side: Side | "both",
  ): CameraFocus => `${kind}-${side === "right" ? "right" : "left"}`;
  const sides = (key: "windowSide" | "doorSide") => (
    <div className="studio-segment" aria-label="Opening position">
      {(
        ["left", "right", ...(key === "windowSide" ? ["both"] : [])] as const
      ).map((side) =>
        choice(
          side === "both"
            ? "Both sides"
            : `${side[0].toUpperCase()}${side.slice(1)} side`,
          config[key] === side,
          () =>
            onChange(
              { [key]: side },
              openingFocus(
                key === "windowSide" ? "window" : "door",
                side as Side | "both",
              ),
            ),
        ),
      )}
    </div>
  );
  return (
    <aside className="studio-control-panel" aria-label="Studio configuration">
      {layoutNotice.startsWith("That size") && <p className="studio-size-warning" role="alert">{layoutNotice}</p>}
      <div className="studio-intro">
        <div className="studio-identity">
          <img
            className="studio-brand-logo"
            src="/logos/Grid & Logic (LOGO).svg"
            alt="Grid & Logic"
          />
          <span className="studio-kicker">CONTAINER STUDIO</span>
        </div>
        <h1>
          Container
          <br />
          <em>Studio.</em>
        </h1>
        <p>A steel shell. Your possibilities.</p>
      </div>
      <div className="studio-options">
        {CATEGORIES.map((category, index) => (
          <section key={category.id} className="studio-section">
            <button
              type="button"
              className="studio-section-heading"
              aria-expanded={open === category.id}
              onClick={() => {
                setOpen((previous) =>
                  previous === category.id ? null : category.id,
                );
                if (category.id === "layout") onOpenPlan();
                else onFocus(
                  category.id === "windows"
                    ? openingFocus("window", config.windowSide)
                    : category.id === "doors"
                      ? openingFocus("door", config.doorSide)
                      : category.focus,
                );
              }}
            >
              <span className="studio-number">{String(index + 1).padStart(2, "0")}</span>
              <category.icon size={17} />
              <strong>{category.label}</strong>
              <ChevronDown
                size={16}
                className={open === category.id ? "expanded" : ""}
              />
            </button>
            {open === category.id && (
              <div className="studio-section-body">
                {category.id === "layout" && <CatalogControls activeId={config.catalogId} onChoose={onCatalog}/>}
                {category.id === "washroom" && <WashroomOptions config={config} onChange={(patch) => onChange(patch, "layout")}/>}
                {category.id === "layout" && <LayoutControls locked={Boolean(config.layoutLocked)} layout={config.layout.filter((item) => (item.floor ?? 0) === (config.activeFloor ?? 0))} selectedId={selectedItemId} notice={layoutNotice} onPreset={onLayoutPreset} onAdd={onAddLayoutItem} onSelect={onSelectLayoutItem} onRemove={onRemoveLayoutItem}/>}
                {category.id === "container" && (
                  <>
                    <div className="design-options studio-two">
                      <label>Length (ft)<input type="number" min="16" max="45" step="1" value={config.lengthFt ?? config.size} onChange={(e) => { const value = +e.target.value; if (value >= 16 && value <= 45) onChange({ lengthFt: value }, "exterior"); }}/></label>
                      <label>Module width (ft)<select value={config.widthFt ?? 8} onChange={(e) => onChange({ widthFt: +e.target.value }, "exterior")}>{[8,10,12,16,24].map((width) => <option key={width} value={width}>{width} ft</option>)}</select></label>
                    </div>
                    <p className="studio-label">Structure system</p>
                    <div className="studio-two">
                      {choice("Classic module", config.buildingType === "standard", () => onChange({ buildingType: "standard" }, "exterior"), "Single or joined ISO shells")}
                      {choice("Portable office", config.buildingType === "portable-office", () => onChange({ buildingType: "portable-office", containers: 1 }, "exterior"), "Focus or team workspace")}
                      {choice("Service kiosk", config.buildingType === "retail-kiosk", () => onChange({ buildingType: "retail-kiosk", size: 20, containers: 1 }, "exterior"), "Coffee, retail or reception")}
                      {choice("L courtyard", config.buildingType === "courtyard-l", () => onChange({ buildingType: "courtyard-l", size: 40, containers: 1 }, "exterior"), "Two modules with sheltered patio")}
                      {choice("U courtyard", config.buildingType === "courtyard-u", () => onChange({ buildingType: "courtyard-u", size: 40, containers: 1 }, "exterior"), "Three-module family house")}
                      {choice("Stacked office", config.buildingType === "stacked-office", () => onChange({ buildingType: "stacked-office", size: 40, containers: 1 }, "exterior"), "Two-storey portable workplace")}
                      {choice("Fold-out house", config.buildingType === "foldout-home", () => onChange({ buildingType: "foldout-home", size: 40, containers: 1, foldoutState: "expanded" }, "exterior"), "8 ft transport · 24 ft deployed")}
                    </div>
                    {config.buildingType === "foldout-home" && <>
                      <p className="studio-label">Deployment</p>
                      <div className="studio-two">
                        {choice("Expanded home", config.foldoutState === "expanded", () => onChange({ foldoutState: "expanded" }, "exterior"), "Full 7.31 m living width")}
                        {choice("Transport mode", config.foldoutState === "transport", () => onChange({ foldoutState: "transport" }, "exterior"), "Locked 2.44 m road width")}
                      </div>
                    </>}
                    <p className="studio-label">Choose your foundation</p>
                    <div className="studio-two">
                      {choice(
                        "20 foot",
                        config.size === 20,
                        () => onChange({ size: 20, lengthFt: 20, catalogId: undefined }, "exterior"),
                        "6.06 m · versatile footprint",
                      )}
                      {choice(
                        "40 foot",
                        config.size === 40,
                        () => onChange({ size: 40, lengthFt: 40, catalogId: undefined }, "exterior"),
                        "12.19 m · generous space",
                      )}
                    </div>
                    <p className="studio-label">Number of containers</p>
                    <div className="studio-two">
                      {choice("Single container", config.containers === 1 && config.buildingType === "standard", () => onChange({ containers: 1, buildingType: "standard" }, "exterior"), "One 2.44 m wide shell")}
                      {choice("Double container", config.containers === 2 && config.buildingType === "standard", () => onChange({ containers: 2, buildingType: "standard" }, "exterior"), "Two joined shells · 4.88 m wide")}
                    </div>
                    <p className="studio-label">Height</p>
                    <div className="studio-two">
                      {choice(
                        "Standard",
                        !config.highCube,
                        () => onChange({ highCube: false }, "exterior"),
                        "2.59 m exterior",
                      )}
                      {choice(
                        "High cube",
                        config.highCube,
                        () => onChange({ highCube: true }, "exterior"),
                        "2.90 m exterior",
                      )}
                    </div>
                    <div className="studio-specs">
                      <div>
                        <span>Length</span>
                        <b>{dim.length.toFixed(3)} m</b>
                      </div>
                      <div>
                        <span>Width</span>
                        <b>{dim.width.toFixed(3)} m</b>
                      </div>
                      <div>
                        <span>Height</span>
                        <b>{dim.height.toFixed(3)} m</b>
                      </div>
                    </div>
                    <p className="studio-note">
                      ISO container proportions. Modifications shown are a
                      design visualization, subject to structural review.
                    </p>
                  </>
                )}
                {category.id === "exterior" && (
                  <>
                    <ExteriorOptions config={config} onChange={(patch) => onChange(patch, "exterior")}/>
                    <p className="studio-label">Exterior colour</p>
                    <div className="studio-swatches">
                      {FINISHES.map(([name, color]) => (
                        <button
                          type="button"
                          className={config.color === color ? "selected" : ""}
                          aria-label={name}
                          aria-pressed={config.color === color}
                          key={color}
                          onClick={() => onChange({ color }, "exterior")}
                        >
                          <span style={{ background: color }}>
                            {config.color === color && (
                              <Check
                                size={18}
                                color={
                                  ["#eceeea", "#dad7cc", "#b5b8b4"].includes(
                                    color,
                                  )
                                    ? "#111"
                                    : "#fff"
                                }
                              />
                            )}
                          </span>
                          <small>{name}</small>
                        </button>
                      ))}
                    </div>
                    <p className="studio-note">
                      Subtle paint texture, steel reflections and corrugation
                      remain visible in every finish.
                    </p>
                  </>
                )}
                {category.id === "windows" && (
                  <>
                    <label className="opening-position">Window position from centre · {(config.windowPositionFt ?? -dim.length * .26 / .3048).toFixed(1)} ft<input aria-label="Window position from centre" type="range" min={-(dim.length / .3048 / 2 - 4)} max={dim.length / .3048 / 2 - 4} step=".5" value={config.windowPositionFt ?? -dim.length * .26 / .3048} onChange={(e) => onChange({ windowPositionFt: +e.target.value }, openingFocus("window", config.windowSide))}/></label>
                    <p className="studio-label">Position</p>
                    {sides("windowSide")}
                    <div className="studio-window-grid">
                      {WINDOWS.map((window) => (
                        <button
                          type="button"
                          className={`studio-window-option ${config.windowStyle === window.id ? "selected" : ""}`}
                          key={window.id}
                          aria-pressed={config.windowStyle === window.id}
                          onClick={() =>
                            onChange(
                              { windowStyle: window.id },
                              openingFocus("window", config.windowSide),
                            )
                          }
                        >
                          <div className={`window-drawing ${window.id}`}>
                            <span />
                          </div>
                          <strong>{window.name}</strong>
                          <small>{window.dimensions}</small>
                        </button>
                      ))}
                    </div>
                    <p className="studio-note">
                      Welded opening frames, insulated glass and recessed
                      interior reveals. Oversized options fit within the
                      selected shell.
                    </p>
                  </>
                )}
                {category.id === "doors" && (
                  <>
                    <label className="opening-position">Entry position from centre · {(config.doorPositionFt ?? dim.length * .27 / .3048).toFixed(1)} ft<input aria-label="Entry position from centre" type="range" min={-(dim.length / .3048 / 2 - 4)} max={dim.length / .3048 / 2 - 4} step=".5" value={config.doorPositionFt ?? dim.length * .27 / .3048} onChange={(e) => onChange({ doorPositionFt: +e.target.value }, openingFocus("door", config.doorSide))}/></label>
                    <p className="studio-label">Long-wall position</p>
                    {sides("doorSide")}
                    <div className="studio-door-list">
                      {(
                        [
                          ["none", "Original steel", "No added door"],
                          [
                            "personnel",
                            "Steel personnel door",
                            "36 in × 80 in",
                          ],
                          [
                            "sliding",
                            "Aluminium sliding glass",
                            "6 ft × 7 ft · black frame",
                          ],
                          [
                            "vinyl",
                            "Vinyl sliding glass",
                            "White frame · two panels",
                          ],
                          [
                            "roll-up",
                            "Roll-up shutter",
                            "Steel curtain, tracks & hood",
                          ],
                        ] as [DoorStyle, string, string][]
                      ).map(([id, name, note]) =>
                        choice(
                          name,
                          config.doorStyle === id,
                          () =>
                            onChange(
                              { doorStyle: id },
                              openingFocus("door", config.doorSide),
                            ),
                          note,
                        ),
                      )}
                    </div>
                    {toggle(
                      "Rear roll-up door",
                      "rearRollup",
                      "rear",
                      "An additional shutter in the end wall",
                    )}
                    {toggle(
                      "Open original cargo doors",
                      "cargoOpen",
                      "front",
                      "Twin doors with locking bars & hinges",
                    )}
                    {config.doorStyle !== "none" && toggle("Open added door", "sideDoorOpen", openingFocus("door", config.doorSide), "Click the door in 3D to open or close it")}
                    {config.rearRollup && toggle("Open rear shutter", "rearRollupOpen", "rear", "Raise the rear roll-up door")}
                  </>
                )}
                {category.id === "interior" && (
                  <>
                    <label className="studio-toggle"><span>Detailed furniture models<small>Load higher detail on demand</small></span><input type="checkbox" checked={!!config.detailedModels} onChange={(e) => onChange({ detailedModels: e.target.checked }, "layout")}/></label>
                    <p className="studio-label">Inspect the space</p>
                    <div className="studio-two">
                      {choice(
                        "Enter container",
                        false,
                        () => onFocus("interior"),
                        "Camera passes through open cargo doors",
                      )}
                      {choice(
                        "Return outside",
                        false,
                        () => onFocus("exterior"),
                        "Three-quarter exterior view",
                      )}
                    </div>
                    {toggle(
                      "Roof cutaway",
                      "cutaway",
                      "exterior",
                      "Remove the roof for an overview",
                    )}
                    {toggle("Open cargo doors", "cargoOpen", "front")}
                    {toggle("Interior downlights", "lights", "interior")}
                  </>
                )}
                {category.id === "flooring" && (
                  <>
                    <p className="studio-label">Real wood / PBR materials</p>
                    <div className="studio-texture-grid">
                      {FLOORS.map((floor) => (
                        <button
                          type="button"
                          className={
                            config.floor === floor.id ? "selected" : ""
                          }
                          aria-pressed={config.floor === floor.id}
                          key={floor.id}
                          onClick={() =>
                            onChange(
                              { floor: floor.id as FloorFinish },
                              "floor",
                            )
                          }
                        >
                          <img
                            src={`/container-configurator/textures/wood/${floor.id}/preview.webp`}
                            alt=""
                            loading="lazy"
                          />
                          <strong>{floor.name}</strong>
                          <small>{floor.note}</small>
                        </button>
                      ))}
                    </div>
                    <p className="studio-note">
                      Four separate CC0 scanned surfaces. The grain is mapped to
                      physical floor dimensions.
                    </p>
                  </>
                )}
                {category.id === "walls" && (
                  <>
                    <p className="studio-label">Interior lining</p>
                    <div className="studio-door-list">
                      {(
                        [
                          [
                            "steel",
                            "Original corrugated steel",
                            "Bare container structure",
                          ],
                          [
                            "white-steel",
                            "White painted steel",
                            "Original corrugation, lighter finish",
                          ],
                          [
                            "white",
                            "Smooth white lining",
                            "Insulated plasterboard",
                          ],
                          [
                            "concrete",
                            "Architectural concrete",
                            "Fine mineral surface",
                          ],
                          ["wood", "Natural timber lining", "Vertical panels"],
                          [
                            "dark",
                            "Dark interior panels",
                            "Deep charcoal, matte finish",
                          ],
                        ] as [WallFinish, string, string][]
                      ).map(([id, name, note]) =>
                        choice(
                          name,
                          config.walls === id,
                          () => onChange({ walls: id }, "walls"),
                          note,
                        ),
                      )}
                    </div>
                  </>
                )}
                {category.id === "climate" && (
                  <>
                    {toggle(
                      "Split air conditioning",
                      "ac",
                      "indoor-ac",
                      "Indoor head + matching outdoor condenser",
                    )}
                    <div className="studio-two">
                      {choice(
                        "Indoor unit",
                        false,
                        () => onFocus("indoor-ac"),
                        "High wall mounting",
                      )}
                      {choice(
                        "Outdoor condenser",
                        false,
                        () => onFocus("outdoor-ac"),
                        "Brackets & service connection",
                      )}
                    </div>
                    <p className="studio-note">
                      Both units align on the right wall, with the service line
                      between them. Equipment loads only when installed.
                    </p>
                  </>
                )}
                {category.id === "accessories" && (
                  <>
                    {toggle(
                      "Wall ventilation",
                      "vents",
                      "rear",
                      "Two louvered vents in the rear wall",
                    )}
                    {toggle(
                      "Entry steps",
                      "steps",
                      config.doorSide,
                      "Galvanized steel landing and tread",
                    )}
                    {toggle(
                      "Interior lighting",
                      "lights",
                      "interior",
                      "Warm recessed fixtures",
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
      <div className="studio-panel-footer">
        <div>
          <span>
            {(CATALOG.find((design) => design.id === config.catalogId)?.name ?? BUILDING_LABELS[config.buildingType]).toUpperCase()}
          </span>
          <small>
            {config.buildingType === "foldout-home" ? `${config.foldoutState === "expanded" ? "Expanded" : "Transport"} / ` : `${config.size}′ ${config.highCube ? "high cube" : "standard"} / `}{config.windowStyle === "none"
              ? "Original shell"
              : "Custom openings"}{" "}
            / {config.ac ? "Climate ready" : "Steel architecture"}
          </small>
        </div>
        <button
          type="button"
          onClick={() => {
            onSave();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          {saved ? "Saved" : "Save design"} <Check size={14} />
        </button>
        <button
          type="button"
          className="studio-reset"
          aria-label="Reset design"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </aside>
  );
}
