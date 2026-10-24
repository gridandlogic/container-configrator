import { useState } from "react";
import { CATALOG, type CatalogDesign } from "./catalog";

export default function CatalogControls({ activeId, onChoose }: { activeId?: string; onChoose: (design: CatalogDesign) => void }) {
  const [filter, setFilter] = useState("All");
  return <div className="catalog-controls">
    <p className="studio-label">Design collection · 17 layouts</p>
    <div className="studio-segment">{["All", "Office", "Home"].map((value) => <button type="button" key={value} aria-pressed={filter === value} className={`studio-choice ${filter === value ? "selected" : ""}`} onClick={() => setFilter(value)}>{value === "Home" ? "Living" : value === "Office" ? "Offices" : value}</button>)}</div>
    <div className="catalog-designs">{CATALOG.filter((design) => filter === "All" || design.use === filter).map((design) => <button className={`catalog-design ${activeId === design.id ? "selected" : ""}`} aria-pressed={activeId === design.id} type="button" key={design.id} onClick={() => onChoose(design)}>
      <svg viewBox="0 0 130 70" aria-hidden="true"><rect x="7" y="22" width="116" height="40" fill={design.color}/>{design.floors === 2 && <rect x="7" y="2" width="116" height="22" fill="#dadbd5"/>}{design.roof === "gable" ? <path d="M3 23 L65 5 L127 23Z" fill="#394449"/> : design.roof === "shed" ? <path d="M4 12 L126 23 L126 28 L4 18Z" fill="#394449"/> : <rect x="4" y="19" width="122" height="4" fill="#394449"/>}{[20,52,84].map((x) => <rect key={x} x={x} y="32" width="20" height="23" fill="#d6e5e6" stroke="#293536" strokeWidth="2"/>)}</svg>
      <span><strong>{design.name}</strong><small>{design.width}′ × {design.length}′ · {design.floors === 2 ? "2 floors" : "1 floor"}{design.bedrooms ? ` · ${design.bedrooms} bed` : ""}</small><small>{design.note}</small></span>
    </button>)}</div>
  </div>;
}
