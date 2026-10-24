import type { StudioConfig } from "./config";
import type { LayoutItem } from "./layout";

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
  const bedL = beds > 0 ? Math.min(10, (L - 10) / beds) : 0;
  const start = beds ? bedL : 0, end = beds > 1 ? L - bedL : L;
  const zones: RoomZone[] = [];
  if (beds) zones.push(zone("Bedroom 1", bedL / 2, W / 2, bedL, W));
  zones.push(zone("Washroom", start + 2, W - 3, 4, 6), zone("Kitchen", start + 7, W - 3, 6, 6), zone("Living / dining", (start + end) / 2, (W - 6) / 2, end - start, W - 6));
  if (beds > 1) zones.push(zone("Bedroom 2", L - bedL / 2, W / 2, bedL, W));
  return zones;
}
export function catalogConfig(design: CatalogDesign): Partial<StudioConfig> {
  const layout: LayoutItem[] = [];
  for (let f = 0; f < design.floors; f++) {
    const floor = f as 0 | 1;
    for (const [i, zone] of roomZones(design, floor).entries()) {
      const kind = zone.name === "Washroom" ? "bathroom" : zone.name.includes("Bedroom") ? "bed" : zone.name.includes("Kitchen") || zone.name.includes("pantry") ? "kitchenette" : design.use === "Office" ? "desk" : "sofa";
      layout.push({ id: `${design.id}-${f}-${i}`, kind, x: zone.x, z: zone.z, rotation: 0, floor, ...(kind === "bathroom" ? { width: Math.max(1.1, Math.round(Math.min(zone.w - .12, 1.83) * 100) / 100), depth: Math.max(1.1, Math.round(Math.min(zone.d - .12, 1.83) * 100) / 100) } : {}) });
      if (kind === "desk" && zone.w > 3.2) layout.push({ id: `${design.id}-${f}-${i}-desk2`, kind: "desk", x: zone.x + 1.6, z: zone.z, rotation: 0, floor });
    }
  }
  return {
    catalogId: design.id, size: design.length < 30 ? 20 : 40, lengthFt: design.length, widthFt: design.width, containers: 1,
    buildingType: design.id === "courtyard" ? "courtyard-u" : design.floors === 2 ? "stacked-office" : design.use === "Office" ? "portable-office" : "standard",
    activeFloor: 0, color: design.color, cladding: design.cladding, roofProfile: design.roof,
    roofColor: design.id === "gabled-studio" || design.id === "garden" ? "#8b4637" : design.id === "gabled-office" ? "#eeeee8" : "#30383d",
    frameColor: ["mint", "gabled-office", "terrace"].includes(design.id) ? "#eeeee8" : "#202628",
    windowStyle: design.id === "field" ? "horizontal" : "glass", windowSide: "both", doorStyle: "sliding",
    canopy: ["olive", "garden", "glazed"].includes(design.id), terraceFt: design.id === "terrace" ? 5 : 0,
    solar: design.id === "field", cutaway: true, layout,
    doorPositionFt: design.use === "Home" ? 0 : design.length * .22,
    windowPositionFt: undefined,
  };
}
