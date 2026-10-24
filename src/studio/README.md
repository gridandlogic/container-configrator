# Container Studio

Open `/` through the development server (`npm run dev`). The current entry point
loads Container Studio.

## Structure

- `config.ts`: typed configuration, dimensions and option catalogs.
- `Controls.tsx` / `studio.css`: white accordion controls, desktop 40/60 layout and
  mobile 50/50 viewer/control split. Only the options list scrolls.
- `geometry.ts`: corrugated wall segments with cells removed at real openings.
- `model.ts`: ISO shell, castings, rails, stamped cargo doors, opening frames,
  glazing, shutters, lining, floors, lighting and equipment mounting positions.
- `assets.ts`: lazy texture/model cache and ownership/disposal.
- `camera.ts`: feature views, animated entry/exit paths through the cargo doors,
  interior constraints and responsive framing.
- `Viewport.tsx`: demand rendering, bounded DPR, cached shadows, resized viewport,
  screenshot export and asynchronous AC attachment with stale-request guards.
- `FloorPlan.tsx` / `LayoutControls.tsx`: dimensioned 2D plan, templates, object
  catalog, drag and keyboard placement, grid snapping, collision and entry
  clearance checks, zoom, selection tools and SVG export.
- `layout.ts` / `interior.ts`: one metre-based layout shared by the 2D plan and
  lightweight 3D furniture, kitchenette, divider and bathroom geometry.

## Floor planning

The studio opens in the floor plan with an open-studio example. Users can switch
between 20 ft and 40 ft containers, choose an open studio, office or short-stay
template, or start with an empty shell. The catalog covers a bathroom pod with
shower, toilet and vanity; kitchenette; divider; sofa; tables; chairs; bed;
desk; and storage. Select and drag items to move them in 10 cm steps. Arrow keys
move a focused item; R rotates furniture; Delete removes it. The plan displays
real container dimensions, side openings, a one-metre scale and an entry
clearance zone. Export downloads an SVG plan, and Save design stores the layout
locally and downloads a JSON copy. View in 3D opens a roof-cutaway view of the
same layout.

The catalog is intentionally compact. Planner 5D's public editor emphasizes
switching between 2D plans and 3D views, furniture placement, dimensions and
drag-and-drop editing: https://planner5d.com/use/room-planner-tool . Real
container builders offer bathrooms, kitchenettes, partitions, furniture,
storage and office fit-outs: https://backcountrycontainers.com/portfolio/ezra/
and https://www.conexwest.com/blog/40ft-shipping-container-office-floor-plans-layouts-costs .

The drawings are spatial concepts. They do not verify plumbing, electrical,
structure, accessibility, ventilation or local building rules. Those details
need professional review before fabrication.

## Assets and performance

Assets live in `/public/container-configurator`; see `LICENSES.md` and `assets.json`
there for source credits. Run `python scripts/download-studio-assets.py` to rebuild
the downloaded CC0 assets (Python and Pillow required). The outdoor condenser uses
512 px textures in a GLB. The indoor split head is an original compact model;
regenerate it with `node scripts/create-studio-ac.mjs`.

Materials use 1K source maps converted to WebP. AO and roughness share a packed
texture. Grass, the selected wood floor and the 1K HDR load initially; other floors,
concrete and AC models load when selected. Static shell/fittings are batched by
material; roller slats are instanced. Paint changes reuse the existing model.
The renderer draws during interactions, transitions, resize and asset completion,
then stops when idle. Development-only `data-*` counters on `.studio-canvas` expose
frames, calls, triangles, geometries and textures for inspection.

Outer shell proportions follow 20/40 ft ISO standard/high-cube dimensions. Hardware
and modification details are visualization geometry; this is not a fabrication or
engineering drawing. Oversized glazing is fitted within the selected shell.

## Verification

- TypeScript and production build checked.
- Floor plan visually inspected at 1440 × 900 and 390 × 844, including 20 ft
  and 40 ft shells. The roof-cutaway 3D view was checked in the browser.
- All three templates for both shell lengths passed footprint, overlap and
  default entry-clearance checks. Adding a bathroom to an empty plan and moving
  it with the keyboard were checked in the browser.
- No browser console errors were observed in those flows.

## Catalog configuration and fast startup

The active planner now includes 17 office and living presets based on the supplied
design collection. Nominal lengths and widths are editable in feet. Each preset
sets its own facade colour, cladding, roof profile, room zones and floor layouts.
Two-storey designs provide separate ground and upper floor plans. Existing Grid &
Logic branding and product details are preserved.

Washrooms can be moved, rotated and resized in the plan. Toilet type, shower,
door type, tile colour and fixture finish update the procedural model. Entrance
and window positions are adjustable, with entry clearance checked during placement.

The floor planner starts without importing Three.js or preloading furniture and
textures. The 3D viewer is a separate lazy chunk. Procedural furniture is available
immediately; detailed external models load only when enabled. Textures and lighting
refine the preview in the background instead of blocking editing. Glazing uses a
lightweight transparent material to avoid a transmission render pass.

Run `node scripts/check-catalog.mjs` to check all preset dimensions, both floors,
washroom bounds, entry clearances, and 45 model assemblies and door actions. The production
planner reached its ready marker at 852 ms in one local browser check. This is not
a guarantee for other devices or networks. The marker is exposed as the
`data-plan-ready-ms` attribute on the HTML element.

## Furnished model presets

Catalog designs now include complete furniture arrangements, bedroom pocket doors, wardrobes, fitted kitchen cabinets, enclosed washrooms and desks with chairs. Home entries are placed in clear circulation space; room windows avoid entry doors. Finished residential end walls replace cargo doors in converted buildings.

The default view loads the furnished two-bedroom family home. Furniture stays fixed while exploring; use **Edit layout** to customize. Fold-out homes have open module connections and two private bedrooms, a study and four dining seats. Duplexes have fitted interiors on both storeys and an exterior stair with landing and guards. The layout camera fits the room bounds and leaves space for the controls.

`node scripts/check-catalog.mjs` checks unadjusted preset placements, beds, wardrobes, kitchens, seating, doors, window bounds, actual model footprints, both floors and 45 model assemblies including fold-out transport and deployed states.

## Model performance and interaction

Opaque fittings are batched inside their original furniture or door groups. Repeated primitive geometry and identical materials are shared; corner castings use GPU instances. Glass stays separate for correct transparency. Cutaway duplexes construct only the selected shell. Door actions update transforms and preserve all existing model geometry. Model/HDR loaders are imported only when needed, in separate chunks.

Finish maps use 512 px preview textures: 15 color/normal/ARM maps were reduced from 8,953,038 to 312,602 bytes. The original maps are backed up under the ignored `node_modules/.cache/original-preview-textures` folder. `scripts/optimize-textures.py` documents the Pillow compression settings and skips already resized files.

Run `node scripts/profile-models.mjs node_modules/.cache/models-after.json` to measure visible mesh submissions, triangles, unique geometry bytes and build time across 36 roof/cutaway views. These are local scene measurements, not a network or FPS guarantee. The production canvas exposes draw-call, triangle, geometry, texture, build-time and render-count attributes for inspection. Rendering stops when the scene is idle.

Room geometry follows edited catalog dimensions. Resizing regenerates complete furnishings and rejects footprints that cannot fit them. Building-type controls load the corresponding furnished template. Item lists follow the selected floor, and removing pieces requires unlocking the layout.
