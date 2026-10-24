import type { Side, StudioConfig } from "./config";
import { configuredDesign, roomZones } from "./catalog";
import { windowPosition } from "./layout";

export interface FacadeWindow { x: number; width: number; side: Side; privacy?: boolean; }
/** Shared by the floor plan and model, in world X coordinates. */
export function facadeWindows(config: StudioConfig, length: number): FacadeWindow[] {
  if (config.windowStyle === "none") return [];
  const sides: Side[] = config.windowSide === "both" ? ["left", "right"] : [config.windowSide];
  const design = configuredDesign(config);
  const result: FacadeWindow[] = [];
  const doorX = config.doorPositionFt === undefined ? length * .27 : config.doorPositionFt * .3048;
  const doorWidth = config.doorStyle === "personnel" ? .914 : config.doorStyle === "vinyl" ? 2.438 : 1.83;
  const add = (x: number, width: number, side: Side, privacy = false) => {
    width = Math.min(width, length - .6);
    x = Math.max(-length / 2 + width / 2 + .2, Math.min(length / 2 - width / 2 - .2, x));
    if (config.doorStyle !== "none" && config.doorSide === side && Math.abs(x - doorX) < (width + doorWidth) / 2 + .16) return;
    if (!result.some((window) => window.side === side && Math.abs(window.x - x) < (window.width + width) / 2 + .12)) result.push({ x, width, side, privacy });
  };
  if (design && design.id !== "courtyard" && config.windowPositionFt === undefined) {
    for (const zone of roomZones(design, config.activeFloor ?? 0)) {
      if (zone.name.includes("Bedroom") || zone.name === "Sleeping alcove") {
        if (sides.includes("right")) add(zone.x, Math.min(1.22, zone.w - .5), "right");
        if (sides.includes("left") && zone.w > 2.6) add(zone.x + zone.w / 2 - .48, .65, "left");
      } else if (zone.name === "Living / dining") {
        if (sides.includes("right")) add(zone.x - zone.w * .22, Math.min(1.5, zone.w * .4), "right");
      } else if (zone.name === "Washroom") {
        const side = design.use === "Home" ? "left" : "right";
        if (sides.includes(side)) add(zone.x, .55, side, true);
      } else if (zone.name.includes("workspace") || zone.name.includes("Office")) {
        const count = Math.max(1, Math.floor(zone.w / 2.7));
        for (const side of sides) for (let i = 0; i < count; i++) add(zone.x - zone.w / 2 + zone.w * (i + .5) / count, Math.min(1.5, zone.w / count - .5), side);
      }
    }
  } else {
    const widths: Record<string, number> = { small: .61, medium: 1.22, picture: 1.83, horizontal: 1.83, "full-height": .914, glass: 2.438 };
    for (const side of sides) add(windowPosition(length, config.layout, config.windowPositionFt), Math.min(widths[config.windowStyle] ?? 1.22, length * .32), side);
  }
  return result;
}
