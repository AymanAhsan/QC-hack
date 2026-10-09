import { createRoot } from "react-dom/client";
import Missed from "../src/screens/Missed";
import { sampleSummary } from "./fixtures";

const loadPreview = async () => sampleSummary;
createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: 390, margin: "0 auto", minHeight: "100vh" }}>
    <Missed loadMissed={loadPreview} />
  </div>,
);
