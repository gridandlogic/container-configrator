import { DEFAULT_CONFIG, StudioConfig } from "./config";

export function ExteriorOptions({ config, onChange }: { config: StudioConfig; onChange: (patch: Partial<StudioConfig>) => void }) {
  return <div className="design-options">
    <label>Wall construction<select value={config.cladding ?? "steel"} onChange={(e) => onChange({ cladding: e.target.value as StudioConfig["cladding"] })}><option value="steel">Corrugated steel</option><option value="cedar">Vertical cedar cladding</option><option value="panel">Smooth insulated panels</option></select></label>
    <label>Roof profile<select value={config.roofProfile ?? "flat"} onChange={(e) => onChange({ roofProfile: e.target.value as StudioConfig["roofProfile"] })}><option value="flat">Flat roof</option><option value="shed">Asymmetric shed roof</option><option value="gable">Pitched gable roof</option></select></label>
    <div className="studio-two"><label>Roof colour<input type="color" value={config.roofColor ?? "#30383d"} onChange={(e) => onChange({ roofColor: e.target.value })}/></label><label>Window frames<input type="color" value={config.frameColor ?? "#202628"} onChange={(e) => onChange({ frameColor: e.target.value })}/></label></div>
    <label className="studio-toggle"><span>Entrance canopy</span><input type="checkbox" checked={!!config.canopy} onChange={(e) => onChange({ canopy: e.target.checked })}/></label>
    <label>End terrace · {config.terraceFt ?? 0} ft<input type="range" min="0" max="10" step="1" value={config.terraceFt ?? 0} onChange={(e) => onChange({ terraceFt: +e.target.value })}/></label>
    <label className="studio-toggle"><span>Rooftop solar array</span><input type="checkbox" checked={!!config.solar} onChange={(e) => onChange({ solar: e.target.checked })}/></label>
  </div>;
}
export function WashroomOptions({ config, onChange }: { config: StudioConfig; onChange: (patch: Partial<StudioConfig>) => void }) {
  const options = config.washroom ?? DEFAULT_CONFIG.washroom!;
  const change = (patch: Partial<typeof options>) => onChange({ washroom: { ...options, ...patch } });
  return <div className="design-options">
    <p className="studio-note">Select a washroom in the floor plan to resize, rotate or move it. Fixture settings apply to every washroom.</p>
    <label>Toilet type<select value={options.toilet} onChange={(e) => change({ toilet: e.target.value as typeof options.toilet })}><option value="western">Western WC</option><option value="squat">Squat pan</option></select></label>
    <label className="studio-toggle"><span>Walk-in shower</span><input type="checkbox" checked={options.shower} onChange={(e) => change({ shower: e.target.checked })}/></label>
    <label>Door<select value={options.door} onChange={(e) => change({ door: e.target.value as typeof options.door })}><option value="sliding">Sliding pocket door</option><option value="hinged">Hinged door</option></select></label>
    <label>Wall and floor tile<input type="color" value={options.tile} onChange={(e) => change({ tile: e.target.value })}/></label>
    <label>Tap and shower finish<select value={options.fixtures} onChange={(e) => change({ fixtures: e.target.value as typeof options.fixtures })}><option value="chrome">Brushed chrome</option><option value="black">Matte black</option></select></label>
  </div>;
}
