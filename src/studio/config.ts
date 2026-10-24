import { LayoutItem, presetLayout } from "./layout";

export type Side = "left" | "right";
export type BuildingType =
  | "standard"
  | "portable-office"
  | "retail-kiosk"
  | "courtyard-l"
  | "courtyard-u"
  | "stacked-office"
  | "foldout-home";
export const BUILDING_LABELS: Record<BuildingType, string> = {
  standard: "Classic container",
  "portable-office": "Portable office",
  "retail-kiosk": "Portable service kiosk",
  "courtyard-l": "L-courtyard home",
  "courtyard-u": "U-courtyard home",
  "stacked-office": "Stacked portable office",
  "foldout-home": "Fold-out container home",
};
export type WindowStyle =
  | "none"
  | "small"
  | "medium"
  | "picture"
  | "horizontal"
  | "full-height"
  | "glass";
export type DoorStyle = "none" | "personnel" | "sliding" | "vinyl" | "roll-up";
export type WallFinish =
  | "steel"
  | "white-steel"
  | "white"
  | "concrete"
  | "wood"
  | "dark";
export type FloorFinish =
  | "light-oak"
  | "natural-oak"
  | "dark-walnut"
  | "warm-wood";
export type Category =
  | "washroom"
  | "container"
  | "layout"
  | "exterior"
  | "windows"
  | "doors"
  | "interior"
  | "flooring"
  | "walls"
  | "climate"
  | "accessories";
export type CameraFocus =
  | "exterior"
  | "layout"
  | "front"
  | "left"
  | "right"
  | "interior"
  | "floor"
  | "walls"
  | "indoor-ac"
  | "outdoor-ac"
  | "rear"
  | "window-left"
  | "window-right"
  | "door-left"
  | "door-right";
export interface StudioConfig {
  size: 20 | 40;
  lengthFt?: number;
  widthFt?: number;
  catalogId?: string;
  activeFloor?: 0 | 1;
  cladding?: "steel" | "cedar" | "panel";
  roofProfile?: "flat" | "gable" | "shed";
  roofColor?: string;
  frameColor?: string;
  canopy?: boolean;
  terraceFt?: number;
  solar?: boolean;
  detailedModels?: boolean;
  doorPositionFt?: number;
  windowPositionFt?: number;
  washroom?: { shower: boolean; toilet: "western" | "squat"; tile: string; fixtures: "chrome" | "black"; door: "sliding" | "hinged" };
  containers: 1 | 2;
  buildingType: BuildingType;
  foldoutState: "expanded" | "transport";
  highCube: boolean;
  color: string;
  windowStyle: WindowStyle;
  windowSide: Side | "both";
  doorStyle: DoorStyle;
  doorSide: Side;
  rearRollup: boolean;
  cargoOpen: boolean;
  sideDoorOpen: boolean;
  rearRollupOpen: boolean;
  cutaway: boolean;
  floor: FloorFinish;
  walls: WallFinish;
  ac: boolean;
  vents: boolean;
  steps: boolean;
  lights: boolean;
  layout: LayoutItem[];
}
export const DEFAULT_CONFIG: StudioConfig = {
  cladding: "steel",
  roofProfile: "flat",
  roofColor: "#30383d",
  frameColor: "#202628",
  detailedModels: false,
  washroom: { shower: true, toilet: "western", tile: "#d5d6d1", fixtures: "chrome", door: "sliding" },
  size: 40,
  containers: 1,
  buildingType: "standard",
  foldoutState: "expanded",
  highCube: true,
  color: "#373d42",
  windowStyle: "medium",
  windowSide: "left",
  doorStyle: "sliding",
  doorSide: "left",
  rearRollup: false,
  cargoOpen: false,
  sideDoorOpen: false,
  rearRollupOpen: false,
  cutaway: false,
  floor: "natural-oak",
  walls: "white",
  ac: false,
  vents: false,
  steps: true,
  lights: true,
  layout: presetLayout("studio", 12.192),
};
export const FINISHES = [
  ["Carbon black", "#1c2021"],
  ["Charcoal", "#373d42"],
  ["Anthracite", "#485158"],
  ["Pure white", "#eceeea"],
  ["Warm white", "#dad7cc"],
  ["Light grey", "#b5b8b4"],
  ["Slate grey", "#687276"],
  ["Marine blue", "#1a4155"],
  ["Forest green", "#354c3e"],
  ["Oxide red", "#8c4438"],
] as const;
export const WINDOWS: {
  id: WindowStyle;
  name: string;
  dimensions: string;
  w: number;
  h: number;
}[] = [
  {
    id: "none",
    name: "Unmodified wall",
    dimensions: "Original steel",
    w: 0,
    h: 0,
  },
  {
    id: "small",
    name: "Small window",
    dimensions: "2 × 2 ft",
    w: 0.61,
    h: 0.61,
  },
  {
    id: "medium",
    name: "Classic window",
    dimensions: "4 × 3 ft",
    w: 1.22,
    h: 0.914,
  },
  {
    id: "picture",
    name: "Picture window",
    dimensions: "6 × 4 ft",
    w: 1.83,
    h: 1.22,
  },
  {
    id: "horizontal",
    name: "Ribbon window",
    dimensions: "6 × 2 ft",
    w: 1.83,
    h: 0.61,
  },
  {
    id: "full-height",
    name: "Full-height window",
    dimensions: "3 × 7 ft",
    w: 0.914,
    h: 2.134,
  },
  {
    id: "glass",
    name: "Panoramic glazing",
    dimensions: "8 × 7 ft",
    w: 2.438,
    h: 2.134,
  },
];
export const FLOORS: { id: FloorFinish; name: string; note: string }[] = [
  { id: "light-oak", name: "Light oak", note: "Pale, matte timber" },
  { id: "natural-oak", name: "Natural oak", note: "Balanced grain & warmth" },
  { id: "dark-walnut", name: "Dark walnut", note: "Deep, warm boards" },
  {
    id: "warm-wood",
    name: "Warm reclaimed wood",
    note: "Subtle patina & character",
  },
];
export function containerDimensions(config: StudioConfig) {
  return {
    length: config.lengthFt ? config.lengthFt * 0.3048 : config.size === 20 ? 6.058 : 12.192,
    width: (config.widthFt ? config.widthFt * 0.3048 : 2.438) * config.containers,
    height: config.highCube ? 2.896 : 2.591,
    base: 0.18,
    floor: 0.32,
  };
}
export function dimensions(config: StudioConfig) {
  const base = containerDimensions(config);
  if (config.buildingType === "foldout-home") {
    return {
      ...base,
      width: config.foldoutState === "transport" ? 2.438 : 7.314,
    };
  }
  if (config.catalogId === "courtyard") return base;
  if (config.buildingType === "courtyard-l" || config.buildingType === "courtyard-u") {
    return {
      ...base,
      width: 2.438 + Math.min(base.length, 6.058),
    };
  }
  if (config.buildingType === "stacked-office") {
    return { ...base, height: base.height * 2 + 0.08 };
  }
  return base;
}
export function layoutDimensions(config: StudioConfig) {
  return config.buildingType === "foldout-home"
    ? dimensions({ ...config, foldoutState: "expanded" })
    : dimensions(config);
}
export function configReducer(
  config: StudioConfig,
  patch: Partial<StudioConfig>,
) {
  const next = { ...config, ...patch };
  // Fold-out mechanisms and the original courtyard kit use eight-foot modules.
  if (next.buildingType === "foldout-home" || ((next.buildingType === "courtyard-l" || next.buildingType === "courtyard-u") && next.catalogId !== "courtyard")) {
    next.widthFt = 8;
    next.containers = 1;
  }
  return next;
}
export interface CameraRequest {
  focus: CameraFocus;
  sequence: number;
}
