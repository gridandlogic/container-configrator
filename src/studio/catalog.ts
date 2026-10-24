import { entryForConfig, type StudioConfig } from "./config";
import { resolvePlacement, type LayoutItem, type ItemKind } from "./layout";

export interface RoomZone { name: string; x: number; z: number; w: number; d: number; floor: 0 | 1; }
export interface CatalogDesign {
  id: string; name: string; use: "Office" | "Home"; width: number; length: number;
  floors: 1 | 2; bedrooms: number; color: string; cladding: "steel" | "cedar" | "panel";
  roof: "flat" | "gable" | "shed"; note: string;
}
export const CATALOG: CatalogDesign[] = [
  { id: "mint", name: "Mint Site Office", use: "Office", width: 8, length: 20, floors: 1, bedrooms: 0, color: "#9aafa0", cladding: "steel", roof: "flat", note: "Mint steel · white frames" },
  { id: "cedar-office", name: "Cedar Executive Office", use: "Office", width: 10, length: 20, floors: 1, bedrooms: 0, color: "#ad8055", cladding: "cedar", roof: "shed", note: "Vertical cedar · graphite shed roof" },
  { id: "glazed", name: "Glazed Team Office", use: "Office", width: 12, length: 20, floors: 1, bedrooms: 0, color: "#edece5", cladding: "panel", roof: "flat", note: "White insulated panels · broad glazing" },
  { id: "olive", name: "Olive Linear Site Hub", use: "Office", width: 8, length: 40, floors: 1, bedrooms: 0, color: "#656d45", cladding: "steel", roof: "flat", note: "Olive steel · ribbon windows · canopy" },
  { id: "office-hub", name: "Two Storey Office Hub", use: "Office", width: 10, length: 40, floors: 2, bedrooms: 0, color: "#28435b", cladding: "panel", roof: "flat", note: "Stacked offices · kitchen and WC on both floors" },
  { id: "charcoal", name: "Charcoal Loft Office", use: "Office", width: 12, length: 40, floors: 2, bedrooms: 0, color: "#353b3d", cladding: "steel", roof: "flat", note: "Charcoal steel · timber accents · upper balcony" },
  { id: "gabled-office", name: "Compact Gabled Office", use: "Office", width: 8, length: 20, floors: 1, bedrooms: 0, color: "#abc3d2", cladding: "panel", roof: "gable", note: "Powder blue panels · white gable roof" },
  { id: "twin", name: "Twin Cabin Office", use: "Office", width: 8, length: 20, floors: 1, bedrooms: 0, color: "#b39a47", cladding: "steel", roof: "flat", note: "Two work zones · mustard steel" },
  { id: "field", name: "Off Grid Field Office", use: "Office", width: 8, length: 20, floors: 1, bedrooms: 0, color: "#354c3e", cladding: "steel", roof: "flat", note: "Solar array · protected high windows" },
  { id: "cedar-home", name: "Cedar One Bedroom Cabin", use: "Home", width: 12, length: 30, floors: 1, bedrooms: 1, color: "#b38b63", cladding: "cedar", roof: "gable", note: "One bedroom · shared living and service core" },
  { id: "terrace", name: "Sage Terrace Studio", use: "Home", width: 12, length: 21, floors: 1, bedrooms: 0, color: "#99ac95", cladding: "steel", roof: "flat", note: "Open studio · additional 5 ft end terrace" },
  { id: "family", name: "Two Bedroom Family Home", use: "Home", width: 12, length: 40, floors: 1, bedrooms: 2, color: "#343b3f", cladding: "steel", roof: "flat", note: "Bedrooms at opposite ends · central kitchen and WC" },
  { id: "duplex-four", name: "Four Bedroom Duplex", use: "Home", width: 12, length: 45, floors: 2, bedrooms: 4, color: "#e0dbcd", cladding: "panel", roof: "flat", note: "Two bedrooms per floor · external stair and balcony" },
  { id: "duplex-three", name: "Three Bedroom Compact Duplex", use: "Home", width: 12, length: 24, floors: 2, bedrooms: 3, color: "#eeeee8", cladding: "panel", roof: "flat", note: "One bedroom downstairs · two upstairs" },
  { id: "gabled-studio", name: "Compact Gabled Studio", use: "Home", width: 12, length: 20, floors: 1, bedrooms: 0, color: "#e5decf", cladding: "steel", roof: "gable", note: "Open living · brick red gabled roof" },
  { id: "garden", name: "Two Bedroom Garden Cottage", use: "Home", width: 16, length: 40, floors: 1, bedrooms: 2, color: "#e3dcc6", cladding: "panel", roof: "gable", note: "Wide cottage · cedar canopy · terracotta roof" },
  { id: "courtyard", name: "Three Bedroom Courtyard Home", use: "Home", width: 24, length: 40, floors: 1, bedrooms: 3, color: "#343b3f", cladding: "steel", roof: "flat", note: "Three wings · open central courtyard" },
];
const m = (v: number) => v * 0.3048;
export function roomZones(design: CatalogDesign, floor: 0 | 1 = 0): RoomZone[] {
  const { length: L, width: W } = design;
  const zone = (name: string, x: number, z: number, w: number, d: number): RoomZone => ({ name, x: m(x - L / 2), z: m(z - W / 2), w: m(w), d: m(d), floor });
  if (design.id === "courtyard") return [zone("Bedroom 1", 5, 18, 10, 12), zone("Bedroom 2", 35, 18, 10, 12), zone("Bedroom 3", 34, 6, 12, 12), zone("Living / dining", 12, 3, 24, 6), zone("Washroom", 3, 9, 6, 6), zone("Kitchen", 10, 9, 8, 6)];
  if (design.use === "Office") return [zone("Washroom", 3, 2, 6, 4), zone("Entry / pantry", 3, (W + 4) / 2, 6, W - 4), zone(design.id === "twin" ? "Office 1 / Office 2" : "Team workspace", 6 + (L - 6) / 2, W / 2, L - 6, W)];
  const beds = design.floors === 2 ? (design.bedrooms === 3 && floor === 0 ? 1 : 2) : design.bedrooms;
  const bedL = beds > 0 ? Math.min(10, (L - 10) / (design.floors === 2 ? 2 : beds)) : 7;
  const start = bedL, end = beds > 1 ? L - bedL : L;
  const zones: RoomZone[] = [];
  zones.push(zone(beds ? "Bedroom 1" : "Sleeping alcove", bedL / 2, W / 2, bedL, W));
  zones.push(zone("Washroom", start + 3, W - 3, 6, 6), zone("Kitchen", start + 8, W - 3, 4, 6), zone("Living / dining", (start + end) / 2, (W - 6) / 2, end - start, W - 6));
  if (beds > 1) zones.push(zone("Bedroom 2", L - bedL / 2, W / 2, bedL, W));
  return zones;
}
export function catalogConfig(design: CatalogDesign): Partial<StudioConfig> {
  const layout: LayoutItem[] = [];
  const L = m(design.length), W = m(design.width);
  const add = (floor: 0 | 1, kind: ItemKind, x: number, z: number, rotation: LayoutItem["rotation"] = 0, extra: Partial<LayoutItem> = {}) => {
    const item: LayoutItem = { id: `${design.id}-${floor}-${kind}-${layout.length}`, kind, x, z, rotation, floor, ...extra };
    // Presets are furnished deliberately. Do not scatter furniture with nearest-free search.
    if (resolvePlacement(item, layout, L, undefined, W)) layout.push(item);
  };
  for (let f = 0; f < design.floors; f++) {
    const floor = f as 0 | 1;
    const zones = roomZones(design, floor);
    for (const zone of zones) {
      if (zone.name === "Washroom") {
        add(floor, "bathroom", zone.x, zone.z, design.use === "Home" && design.id !== "courtyard" ? 180 : 0, { width: +(zone.w - .24).toFixed(2), depth: +(zone.d - .24).toFixed(2), entryWall: "front" });
      } else if (zone.name.includes("Bedroom") || zone.name === "Sleeping alcove") {
        const bedX = zone.x;
        const bedZ = zone.z - zone.d / 2 + 1.16;
        add(floor, "bed", bedX, bedZ);
        add(floor, "storage", zone.x, zone.z + zone.d / 2 - .36, 180);
        if (zone.w >= 2.65) for (const sign of [-1, 1]) add(floor, "nightstand", bedX + sign * .98, bedZ - .72);
      } else if (zone.name.includes("Kitchen") || zone.name.includes("pantry")) {
        add(floor, "kitchenette", zone.x, zone.z + zone.d / 2 - .44, 180, { width: Math.min(1.55, zone.w - .24) });
      } else if (design.use === "Office") {
        const start = zone.x - zone.w / 2 + .85;
        const end = zone.x + zone.w / 2 - .85;
        const count = Math.max(1, Math.floor((zone.w - .25) / 1.75));
        for (let n = 0; n < count; n++) {
          const x = count === 1 ? zone.x : start + n * (end - start) / (count - 1);
          add(floor, "desk", x, -W / 2 + .46, 180);
          add(floor, "chair", x, -W / 2 + 1.13, 0);
        }
        if (W > 3.2 && zone.w > 5) {
          add(floor, "dining-table", zone.x, W / 2 - .8);
          for (const sign of [-1, 1]) add(floor, "chair", zone.x + sign * .88, W / 2 - .8, sign < 0 ? 270 : 90);
        }
      } else {
        const left = zone.x - zone.w / 2;
        const sofaX = left + .95;
        const sofaZ = zone.z - zone.d / 2 + .56;
        add(floor, "sofa", sofaX, sofaZ, 180);
        add(floor, "coffee-table", sofaX, sofaZ + .64, 0, { width: .65, depth: .34 });
        // The TV faces the sofa from the service wall and leaves the front entry clear.
        const tvX = sofaX;
        add(floor, "tv-console", tvX, zone.z + zone.d / 2 - .22);
        if (zone.w > 4.8) {
          const diningX = zone.x + zone.w / 2 - 1.18;
          add(floor, "dining-table", diningX, sofaZ + .12, 90);
          for (const sign of [-1, 1]) add(floor, "chair", diningX + sign * .75, sofaZ + .12, sign < 0 ? 270 : 90);
        }
      }
    }
  }
  const living = roomZones(design, design.floors === 2 ? 1 : 0).find((zone) => zone.name === "Living / dining");
  const doorX = design.id === "courtyard" ? 0 : design.use === "Home" && living ? living.w > 4.8 ? living.x - .15 : living.x + living.w / 2 - .62 : L * .28;
  return {
    catalogId: design.id, size: design.length < 30 ? 20 : 40, lengthFt: design.length, widthFt: design.width, containers: 1,
    buildingType: design.id === "courtyard" ? "courtyard-u" : design.floors === 2 ? "stacked-office" : design.use === "Office" ? "portable-office" : "standard",
    activeFloor: 0, color: design.color, cladding: design.cladding, roofProfile: design.roof,
    roofColor: design.id === "gabled-studio" || design.id === "garden" ? "#8b4637" : design.id === "gabled-office" ? "#eeeee8" : "#30383d",
    frameColor: ["mint", "gabled-office", "terrace"].includes(design.id) ? "#eeeee8" : "#202628",
    windowStyle: design.id === "field" ? "horizontal" : design.use === "Home" ? "picture" : "glass", windowSide: "both", doorStyle: "personnel", doorSide: design.use === "Home" && design.id !== "courtyard" ? "right" : "left",
    canopy: ["olive", "garden", "glazed"].includes(design.id), terraceFt: design.id === "terrace" ? 5 : 0,
    solar: design.id === "field", cutaway: true, layout, highCube: true, walls: "white", floor: "natural-oak", cargoOpen: false, rearRollup: false, sideDoorOpen: false, vents: false, layoutLocked: true,
    washroom: { shower: design.use === "Home", toilet: "western", tile: "#e1ded5", fixtures: "black", door: "sliding" },
    doorPositionFt: doorX / .3048,
    windowPositionFt: undefined,
  };
}

/** Room geometry always follows the currently configured footprint. */
export function configuredDesign(config: StudioConfig) {
  const design = CATALOG.find((design) => design.id === config.catalogId);
  return design ? { ...design, length: config.lengthFt ?? design.length, width: config.widthFt ?? design.width } : undefined;
}
export function resizedCatalogLayout(config: StudioConfig, patch: Partial<StudioConfig>): Partial<StudioConfig> | null {
  const design = configuredDesign({ ...config, ...patch });
  if (!design || (design.id === "courtyard" && (design.length !== 40 || design.width !== 24))) return null;
  const fitted = catalogConfig(design);
  const next = { ...config, ...patch, layout: fitted.layout!, doorPositionFt: fitted.doorPositionFt, windowPositionFt: undefined };
  for (let floor = 0; floor < design.floors; floor++) {
    const items = next.layout.filter((item) => (item.floor ?? 0) === floor);
    const sleeping = roomZones(design, floor as 0 | 1).filter((zone) => zone.name.includes("Bedroom") || zone.name === "Sleeping alcove").length;
    if (items.filter((item) => item.kind === "bed").length !== sleeping || !items.some((item) => item.kind === "bathroom") || !items.some((item) => item.kind === "kitchenette")) return null;
    if (design.use === "Home" && (!["sofa", "coffee-table", "tv-console"].every((kind) => items.some((item) => item.kind === kind)) || items.filter((item) => item.kind === "storage").length !== sleeping)) return null;
  }
  if (next.layout.some((item) => !resolvePlacement(item, next.layout, design.length * .3048, entryForConfig(next), design.width * .3048))) return null;
  return { ...patch, layout: next.layout, doorPositionFt: next.doorPositionFt, windowPositionFt: undefined };
}
