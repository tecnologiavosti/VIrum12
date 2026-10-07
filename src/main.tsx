import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Recover automatically when a deployed HTML document is stale and points to
// an old Vite dynamic chunk that no longer exists after a new deployment.
// Without this guard the browser can remain on a blank screen forever.
const CHUNK_RELOAD_KEY = "virum_chunk_reload";
const isChunkLoadError = (value: unknown): boolean => {
  const message = value instanceof Error ? value.message : String(value ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(message);
};

const reloadForStaleChunk = (event: ErrorEvent | PromiseRejectionEvent) => {
  if (!isChunkLoadError(event instanceof ErrorEvent ? event.error || event.message : event.reason)) return;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {
    // Continue even if sessionStorage is unavailable.
  }
  window.location.reload();
};

window.addEventListener("error", reloadForStaleChunk);
window.addEventListener("unhandledrejection", reloadForStaleChunk);

try {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
} catch {
  // Ignore storage errors.
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider><App /></HelmetProvider>,
);
