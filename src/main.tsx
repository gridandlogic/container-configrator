import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./studio/base.css";
import Studio from "./studio/Studio";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Studio />
  </StrictMode>,
);
