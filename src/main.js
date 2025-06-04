import "./loggingConfig.js"; // Initializes loglevel configuration
import log from "loglevel"; // Now import log for use in this file if needed
import debug from "debug";
// src/main.js
// import * as canvasView from "./views/canvasView.js"; // Remove
// import CanvasViewModel from "./viewmodels/canvasViewModel.js"; // Remove
import UiViewModel from "./viewmodels/uiViewModel.js";
import * as uiView from "./views/uiView.js";
import { VTT_API, VTT_API_INIT } from "./api.js"; // VTT Scripting API
import * as sessionManagement from "./session_management.js";

const d = debug("app:main");
d("main.js module loaded");

// --- Application Initialization ---
// let canvasViewModel; // Remove
let uiViewModel;

/**
 * Initializes the main application components including ViewModels, Views,
 * event listeners, and loads initial state.
 * @async
 */
const initializeApplication = async () => {
        // Initialize core ViewModels for UI and Canvas interactions
        d("initializeApplication started");
        // Initialize core ViewModels for UI and Canvas interactions
        uiViewModel = new UiViewModel();
        uiViewModel.init(VTT_API);
        d("UiViewModel initialized");
        VTT_API_INIT({
                showMessage: uiViewModel.displayMessage.bind(uiViewModel),
        }); // Provide API with UI message function
        d("VTT_API_INIT called");

        // canvasViewModel = new CanvasViewModel( // Remove
        // requestRedraw, // Remove
        // uiViewModel.displayMessage.bind(uiViewModel), // Remove
        // ); // Remove
        // d("CanvasViewModel initialized"); // Remove

        // Callbacks for UI elements in uiView, primarily for session management actions
        const uiCallbacks = {
                onSaveToFile: sessionManagement.handleSaveTableState,
                onSaveMemoryState: sessionManagement.handleSaveMemoryState,
                // onLoadMemoryStateRequest is no longer needed here, uiView calls uiViewModel.requestLoadMemoryState()
                onLoadFromFileInputChange: (event) => {
                        const file = event.target.files[0];
                        if (file) {
                                d("File selected for loading: %s", file.name);
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                        d(
                                                "File content loaded, calling sessionManagement.handleLoadTableState",
                                        );
                                        sessionManagement.handleLoadTableState(e.target.result);
                                };
                                reader.onerror = (e) => {
                                        log.error("File Read Error:", e);
                                        VTT_API.showMessage("File Read Error: Could not read file.", "error");
                                };
                                reader.readAsText(file);
                        }
                },
        };
        d("uiCallbacks defined: %o", uiCallbacks);

        // Initialize the main UI view (uiView) and its event listeners
        // uiView orchestrates its sub-components (inspector, toolbar, etc.)
        uiView.init(uiViewModel, VTT_API);
        d("uiView initialized");
        uiView.initUIEventListeners(uiCallbacks);
        d("uiView event listeners initialized");

        // Listen for 'modelChanged' events dispatched from model.js
        // This is the primary way the application reacts to data changes.
        document.addEventListener("modelChanged", (event) => {
                d(
                        "modelChanged event received in main.js: Type - %s, Payload - %o",
                        event.detail.type,
                        event.detail.payload,
                );
                // UiViewModel also listens to 'modelChanged' for its own needs (inspector, board settings).
                // UiViewModel has its own 'modelChanged' listener.
                // CanvasViewModel-related updates and redraws will be handled in uiView.js.
                // This listener in main.js is now minimal.
        });
        d("Simplified modelChanged event listener added to document in main.js");

        // setTimeout(() => { ... }, 0); // Remove this entire block

        uiViewModel.displayMessage("Application initialized (Offline Mode).", "info");
        d("Application initialization complete");
};

// Ensures the application initializes after the entire page (including stylesheets and images) is fully loaded.
if (document.readyState === "complete") {
        // If the page is already loaded by the time this script runs
        d("Window already loaded, calling initializeApplication directly");
        initializeApplication();
} else {
        d(
                "Window not fully loaded, adding load event listener for initializeApplication",
        );
        window.addEventListener("load", initializeApplication);
}
