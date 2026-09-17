import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@seekwd/ui/styles.css";
import "./lab.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
