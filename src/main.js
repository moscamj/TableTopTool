import "./loggingConfig.js"; // Initializes loglevel configuration
import log from "loglevel"; // Now import log for use in this file if needed
import debug from "debug";
// src/main.js
import * as canvasView from "./views/canvasView.js";
import CanvasViewModel from "./viewmodels/canvasViewModel.js";
import UiViewModel from "./viewmodels/uiViewModel.js";
import * as uiView from "./views/uiView.js";
import { VTT_API, VTT_API_INIT } from "./api.js"; // VTT Scripting API
import * as sessionManagement from "./session_management.js";

// --- Main Redraw Function ---
/**
 * Requests a redraw of the canvas by calling the main drawing function in canvasView.
 */
const requestRedraw = () => {
        d("requestRedraw called");
        canvasView.drawVTT();
};

const d = debug("app:main");
d("main.js module loaded");

// --- Application Initialization ---
let canvasViewModel;
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

        canvasViewModel = new CanvasViewModel(
                requestRedraw,
                uiViewModel.displayMessage.bind(uiViewModel),
        );
        d("CanvasViewModel initialized");

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

        // Initialize the canvas view, passing its dedicated ViewModel
        canvasView.initCanvas(document.getElementById("vtt-canvas"), canvasViewModel);
        d("canvasView initialized");

        // Create default objects for testing/demonstration purposes
        d("Creating default objects for testing/demonstration");
        VTT_API.createObject("rectangle", {
                x: 50,
                y: 50,
                width: 100,
                height: 75,
                appearance: { backgroundColor: "#FFC0CB", text: "Rect 1" },
                name: "Test Rectangle 1",
        });

        VTT_API.createObject("circle", {
                x: 200,
                y: 100,
                width: 60, // Diameter
                height: 60, // Diameter
                appearance: { backgroundColor: "#ADD8E6", text: "Circ 1" },
                name: "Test Circle 1",
                rotation: 30,
        });

        // Listen for 'modelChanged' events dispatched from model.js
        // This is the primary way the application reacts to data changes.
        document.addEventListener("modelChanged", (event) => {
                d(
                        "modelChanged event received in main.js: Type - %s, Payload - %o",
                        event.detail.type,
                        event.detail.payload,
                );
                // UiViewModel also listens to 'modelChanged' for its own needs (inspector, board settings).
                // This listener in main.js focuses on updating CanvasViewModel and triggering redraws.
                if (event.detail && canvasViewModel) {
                        const { type, payload } = event.detail;
                        d("Processing modelChanged event for CanvasViewModel: Type - %s", type);
                        switch (type) {
                        // Cases primarily for CanvasViewModel
                        case "allObjectsCleared":
                                canvasViewModel.clearAllViewModelObjects();
                                canvasViewModel.setSelectedObjectInViewModel(null);
                                d("CanvasViewModel: allObjectsCleared and selection reset");
                                break;
                        case "selectionChanged":
                                canvasViewModel.setSelectedObjectInViewModel(payload);
                                d("CanvasViewModel: selectionChanged to %s", payload);
                                break;
                        case "objectAdded":
                                canvasViewModel.addObjectToViewModel(payload);
                                d("CanvasViewModel: objectAdded: %o", payload);
                                break;
                        case "objectUpdated":
                                canvasViewModel.updateObjectInViewModel(payload.id, payload);
                                d("CanvasViewModel: objectUpdated: %s, %o", payload.id, payload);
                                break;
                        case "objectDeleted":
                                canvasViewModel.removeObjectFromViewModel(payload.id);
                                if (payload.id === VTT_API.getSelectedObjectId()) {
                                        canvasViewModel.setSelectedObjectInViewModel(null);
                                        d(
                                                "CanvasViewModel: selected object %s was deleted, selection reset",
                                                payload.id,
                                        );
                                }
                                d("CanvasViewModel: objectDeleted: %s", payload.id);
                                break;
                        case "panZoomChanged":
                                canvasViewModel.setPanZoomInViewModel(payload);
                                d("CanvasViewModel: panZoomChanged: %o", payload);
                                break;
                        case "backgroundChanged":
                                canvasViewModel.setBackgroundInViewModel(payload);
                                d("CanvasViewModel: backgroundChanged: %o", payload);
                                break;
                        case "boardPropertiesChanged":
                                canvasViewModel.setBoardPropertiesInViewModel(payload);
                                d("CanvasViewModel: boardPropertiesChanged: %o", payload);
                                break;
                                // Other UI-specific updates (inspector, board settings display) are handled by UiViewModel's own listener.
                        default:
                                d(
                                        "Unhandled modelChanged event type in main.js for CanvasViewModel: %s",
                                        type,
                                );
                        }
                } else if (!canvasViewModel) {
                        d("modelChanged event received, but canvasViewModel is not available.");
                }
                requestRedraw();
        });
        d("modelChanged event listener added to document");

        // Load initial state from the VTT_API into the CanvasViewModel
        if (canvasViewModel) {
                d("Loading initial state into CanvasViewModel");
                const initialStateForCanvas = {
                        objects: VTT_API.getAllObjects(),
                        panZoomState: VTT_API.getPanZoomState(),
                        tableBackground: VTT_API.getTableBackground(),
                        selectedObjectId: VTT_API.getSelectedObjectId(),
                        boardProperties: VTT_API.getBoardProperties(),
                };
                d("Initial state for CanvasViewModel: %o", initialStateForCanvas);
                canvasViewModel.loadStateIntoViewModel(initialStateForCanvas);
                d("Initial state loaded into CanvasViewModel");
        }

        requestRedraw(); // Perform initial draw of the canvas
        d("Initial redraw requested");
        uiViewModel.displayMessage("Application initialized (Offline Mode).", "info");
        d("Application initialization complete");
};

// Ensures the application initializes after the entire page (including stylesheets and images) is fully loaded.
if (document.readyState === 'complete') {
        // If the page is already loaded by the time this script runs
        d("Window already loaded, calling initializeApplication directly");
        initializeApplication();
} else {
        d("Window not fully loaded, adding load event listener for initializeApplication");
        window.addEventListener('load', initializeApplication);
}
