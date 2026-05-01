import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OmniOrgDashboard from "./components/OmniOrgDashboard";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OmniOrgDashboard />
  </StrictMode>
);
