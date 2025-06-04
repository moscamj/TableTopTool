// src/views/uiView.js
/**
 * @file Manages the main UI structure and orchestrates UI sub-components.
 * It initializes components like the inspector, toolbar, modals, etc.,
 * and sets up event listeners for UI elements not handled by individual components (e.g., header buttons).
 * It primarily delegates actions to the UiViewModel.
 */
import log from "loglevel";
import debug from "debug";
import * as inspectorView from "./components/inspectorView.js";
import * as boardSettingsView from "./components/boardSettingsView.js";
import * as toolbarView from "./components/toolbarView.js";
import * as modalView from "./components/modalView.js";
import * as messageAreaView from "./components/messageAreaView.js";
import CanvasViewModel from '../viewmodels/canvasViewModel.js';
import * as canvasView from './canvasView.js';

const dUiView = debug("app:view:ui");

/** @type {UiViewModel | null} Instance of the UiViewModel. */
let uiViewModelInstance = null;
/** @type {object | null} Instance of the VTT_API. */
let vttApiInstance = null; // Used for some direct API calls like clearAllObjects

/** @type {boolean} Flag to ensure DOM elements are only cached once. */
let domElementsCached = false;

/**
 * @type {Object<string, HTMLElement|null>}
 * Stores references to DOM elements managed directly by uiView.js, primarily header elements.
 */
const domElements = {
        // Header elements
        headerTitle: null,
        userIdDisplay: null,
        sessionIdDisplay: null,
        sessionLoadInput: null,
        sessionLoadButton: null,
        sessionSaveButton: null,
        clearBoardButton: null,
        saveMemoryStateButton: null,
        loadMemoryStateButton: null,

        // Tools Sidebar - Most elements moved to toolbarView
        toolsSidebar: null,

        // Canvas
        canvasContainer: null,
        vttCanvas: null,

        // Modal - Elements moved to modalView

        // Message Area - Moved to messageAreaView.js

        // File input (hidden, triggered by button) - General file input for loading sessions
        fileInput: null,
        // backgroundImageFileInput is now in toolbarView
};

const cacheDOMElements = () => {
        dUiView("cacheDOMElements called. domElementsCached: %s", domElementsCached);
        if (domElementsCached) return;
        domElementsCached = true;

        domElements.headerTitle = document.getElementById("header-title");
        domElements.userIdDisplay = document.getElementById("user-id-display");
        domElements.sessionIdDisplay = document.getElementById("session-id-display");
        domElements.sessionLoadInput = document.getElementById("session-load-input");
        domElements.sessionLoadButton = document.getElementById(
                "session-load-button",
        );
        domElements.sessionSaveButton = document.getElementById(
                "session-save-button",
        );
        domElements.clearBoardButton = document.getElementById("clear-board-button");
        domElements.saveMemoryStateButton = document.getElementById(
                "save-memory-state-button",
        );
        domElements.loadMemoryStateButton = document.getElementById(
                "load-memory-state-button",
        );

        domElements.toolsSidebar = document.getElementById("tools-sidebar");
        // Toolbar elements (createObjectButton, backgroundUrlInput, etc.) are cached in toolbarView.js

        domElements.canvasContainer = document.getElementById("canvas-container");
        domElements.vttCanvas = document.getElementById("vtt-canvas");

        // Modal elements are cached in modalView.js

        // Message area is cached in messageAreaView.js

        domElements.fileInput = document.createElement("input");
        domElements.fileInput.type = "file";
        domElements.fileInput.accept = ".json,.ttt.json";
        domElements.fileInput.style.display = "none";
        document.body.appendChild(domElements.fileInput);

        // backgroundImageFileInput is created and managed by toolbarView.js now

        // Update button texts and visibility for offline mode (remains the same for these elements)
        if (domElements.sessionSaveButton)
                domElements.sessionSaveButton.textContent = "Save to File";
        if (domElements.sessionLoadButton)
                domElements.sessionLoadButton.textContent = "Load from File";
        if (domElements.sessionIdDisplay)
                domElements.sessionIdDisplay.style.display = "none";
        if (domElements.sessionLoadInput)
                domElements.sessionLoadInput.style.display = "none";
        if (domElements.userIdDisplay && domElements.userIdDisplay.parentElement) {
                domElements.userIdDisplay.parentElement.style.display = "none";
        }
        log.debug("[uiView.js] Main DOM elements cached."); // log.debug is fine here, not overly verbose
        dUiView("Main DOM elements cached: %o", domElements);
};

// document.addEventListener('DOMContentLoaded', cacheDOMElements); // Ensured below that it's called.
// Let's ensure cacheDOMElements is called if not already.
if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", cacheDOMElements);
} else {
        cacheDOMElements();
}

/**
 * Initializes the main UI view.
 * Stores references to UiViewModel and VTT_API, and initializes all UI sub-components.
 * @param {UiViewModel} uiViewModel - The UiViewModel instance.
 * @param {object} vttApi - The VTT_API instance.
 */
export const init = (uiViewModel, vttApi) => {
        dUiView("init called with uiViewModel: %o, vttApi: %o", uiViewModel, vttApi);
        uiViewModelInstance = uiViewModel;
        vttApiInstance = vttApi; // vttApiInstance is used by some direct actions like clearBoardButton

        if (!uiViewModelInstance) {
                log.error("[uiView.js] UiViewModel not provided during init!");
                dUiView("init error: UiViewModel not provided.");
                return;
        }
        // vttApiInstance might be null if not passed, handle gracefully if some methods rely on it.
        dUiView("UiViewModel and VTT_API instances stored.");

        // Initialize all UI sub-components, passing them the UiViewModel and VTT_API as needed
        dUiView("Initializing sub-components...");
        inspectorView.init(uiViewModelInstance, vttApiInstance);
        dUiView("inspectorView initialized.");
        boardSettingsView.init(uiViewModelInstance);
        dUiView("boardSettingsView initialized.");
        toolbarView.init(uiViewModelInstance);
        dUiView("toolbarView initialized.");
        modalView.init(uiViewModelInstance);
        dUiView("modalView initialized.");
        messageAreaView.init(uiViewModelInstance); // Initialize MessageAreaView for displaying messages
        dUiView("messageAreaView initialized.");

        // Callbacks for inspector, board settings, and messages are registered by their respective components with UiViewModel.

        // showModal and hideModal are exported by modalView.js; uiView uses modalView.showModal for its own modal needs (e.g., clear board confirmation).

        initializeCanvasSystem(uiViewModelInstance, vttApiInstance); // NEW CALL

        log.debug(
                "[uiView.js] Initialized with UiViewModel, VTT_API, canvas system, and all sub-components.",
        );
        dUiView("uiView initialization complete.");
};


// --- Canvas System Initialization (Moved from main.js) ---
/**
 * Initializes the canvas system including CanvasViewModel, canvasView,
 * model change listeners for canvas, and deferred object/state loading.
 * @param {UiViewModel} uiViewModel - The UiViewModel instance, for message display.
 * @param {object} vttApi - The VTT_API instance, for API calls.
 */
const initializeCanvasSystem = (uiViewModel, vttApi) => {
        dUiView("initializeCanvasSystem called with uiViewModel: %o, vttApi: %o", uiViewModel, vttApi);

        const requestRedraw = () => {
                dUiView("requestRedraw called from uiView");
                canvasView.drawVTT();
        };

        const canvasViewModel = new CanvasViewModel(
                requestRedraw,
                uiViewModel.displayMessage.bind(uiViewModel),
        );
        dUiView("CanvasViewModel initialized in uiView");

        document.addEventListener('modelChanged', (event) => {
                dUiView(
                        "modelChanged event received in uiView.js for canvas: Type - %s, Payload - %o",
                        event.detail.type,
                        event.detail.payload,
                );
                if (event.detail && canvasViewModel) {
                        const { type, payload } = event.detail;
                        dUiView("Processing modelChanged event for CanvasViewModel in uiView: Type - %s", type);
                        switch (type) {
                        case "allObjectsCleared":
                                canvasViewModel.clearAllViewModelObjects();
                                canvasViewModel.setSelectedObjectInViewModel(null);
                                dUiView("CanvasViewModel: allObjectsCleared and selection reset in uiView");
                                break;
                        case "selectionChanged":
                                canvasViewModel.setSelectedObjectInViewModel(payload);
                                dUiView("CanvasViewModel: selectionChanged to %s in uiView", payload);
                                break;
                        case "objectAdded":
                                canvasViewModel.addObjectToViewModel(payload);
                                dUiView("CanvasViewModel: objectAdded in uiView: %o", payload);
                                break;
                        case "objectUpdated":
                                canvasViewModel.updateObjectInViewModel(payload.id, payload);
                                dUiView("CanvasViewModel: objectUpdated in uiView: %s, %o", payload.id, payload);
                                break;
                        case "objectDeleted":
                                canvasViewModel.removeObjectFromViewModel(payload.id);
                                if (payload.id === vttApi.getSelectedObjectId()) {
                                        canvasViewModel.setSelectedObjectInViewModel(null);
                                        dUiView(
                                                "CanvasViewModel: selected object %s was deleted, selection reset in uiView",
                                                payload.id,
                                        );
                                }
                                dUiView("CanvasViewModel: objectDeleted in uiView: %s", payload.id);
                                break;
                        case "panZoomChanged":
                                canvasViewModel.setPanZoomInViewModel(payload);
                                dUiView("CanvasViewModel: panZoomChanged in uiView: %o", payload);
                                break;
                        case "backgroundChanged":
                                canvasViewModel.setBackgroundInViewModel(payload);
                                dUiView("CanvasViewModel: backgroundChanged in uiView: %o", payload);
                                break;
                        case "boardPropertiesChanged":
                                canvasViewModel.setBoardPropertiesInViewModel(payload);
                                dUiView("CanvasViewModel: boardPropertiesChanged in uiView: %o", payload);
                                break;
                        default:
                                dUiView(
                                        "Unhandled modelChanged event type in uiView.js for CanvasViewModel: %s",
                                        type,
                                );
                        }
                } else if (!canvasViewModel) {
                        dUiView("modelChanged event received in uiView, but canvasViewModel is not available.");
                }
                requestRedraw(); // Call the local requestRedraw
        });
        dUiView("modelChanged event listener for canvas added to document in uiView");

        setTimeout(() => {
                if (!domElements.vttCanvas) {
                        log.error("[uiView.js] VTT Canvas element not found for deferred initialization.");
                        dUiView("VTT Canvas element not found in setTimeout. DOM elements: %o", domElements);
                        cacheDOMElements();
                        if(!domElements.vttCanvas) {
                                log.error("[uiView.js] VTT Canvas still not found after re-cache attempt.");
                                uiViewModel.displayMessage("Critical Error: Canvas element not found. Try reloading.", "error");
                                return;
                        }
                }
                dUiView("Deferred: Initializing canvasView now in uiView.");
                canvasView.initCanvas(
                        domElements.vttCanvas,
                        canvasViewModel,
                );

                dUiView("Creating default objects for testing/demonstration (deferred in uiView)");
                vttApi.createObject("rectangle", {
                        x: 50,
                        y: 50,
                        width: 100,
                        height: 75,
                        appearance: { backgroundColor: "#FFC0CB", text: "Rect 1" },
                        name: "Test Rectangle 1",
                });

                vttApi.createObject("circle", {
                        x: 200,
                        y: 100,
                        width: 60,
                        height: 60,
                        appearance: { backgroundColor: "#ADD8E6", text: "Circ 1" },
                        name: "Test Circle 1",
                        rotation: 30,
                });

                if (canvasViewModel) {
                        dUiView("Loading initial state into CanvasViewModel (deferred in uiView)");
                        const initialStateForCanvas = {
                                objects: vttApi.getAllObjects(),
                                panZoomState: vttApi.getPanZoomState(),
                                tableBackground: vttApi.getTableBackground(),
                                selectedObjectId: vttApi.getSelectedObjectId(),
                                boardProperties: vttApi.getBoardProperties(),
                        };
                        dUiView(
                                "Initial state for CanvasViewModel (deferred in uiView): %o",
                                initialStateForCanvas,
                        );
                        canvasViewModel.loadStateIntoViewModel(initialStateForCanvas);
                        dUiView("Initial state loaded into CanvasViewModel (deferred in uiView)");
                }

                requestRedraw();
                dUiView("Initial redraw requested (deferred in uiView)");
        }, 0);
        dUiView("initializeCanvasSystem completed.");
};


// --- Functions moved to components ---
// updateBoardSettingsDisplay -> boardSettingsView.js
// handleApplyBoardProperties -> boardSettingsView.js
// populateObjectInspector -> inspectorView.js
// readObjectInspector -> inspectorView.js
// handleApplyObjectChangesFromInspector -> inspectorView.js
// handleDeleteObjectFromInspector -> inspectorView.js
// handleObjectImageFileChange -> inspectorView.js
// setObjectImageUrlText -> inspectorView.js
// getToolbarValues -> toolbarView.js
// setBackgroundUrlInputText -> toolbarView.js
// handleSetBackgroundFromToolbar -> toolbarView.js
// handleBackgroundImageFileChange -> toolbarView.js
// displayCreateObjectModal -> modalView.js
// showModal -> modalView.js
// hideModal -> modalView.js
// getModalContentElement -> modalView.js

// --- Main UI Event Listener Setup (for elements uiView.js still manages) ---
/**
 * Sets up global UI event listeners for elements managed directly by uiView.js (primarily header buttons).
 * These listeners typically delegate actions to UiViewModel or use callbacks provided by main.js
 * for session management tasks.
 * @param {object} callbacks - An object containing callback functions for certain UI actions.
 * @param {function(): void} callbacks.onSaveToFile - Callback to handle saving the current table state to a file.
 * @param {function(event: Event): void} callbacks.onLoadFromFileInputChange - Callback to handle file selection for loading table state.
 * @param {function(): void} callbacks.onSaveMemoryState - Callback to handle saving the current state to in-memory storage.
 *                                                        (Note: onLoadMemoryStateRequest is now handled via UiViewModel)
 */
export const initUIEventListeners = (callbacks) => {
        const {
                onSaveToFile,
                onLoadFromFileInputChange,
                onSaveMemoryState,
                // onLoadMemoryStateRequest, // This will now be handled by uiViewModelInstance.requestLoadMemoryState()
        } = callbacks;
        dUiView("initUIEventListeners called with callbacks: %o", callbacks);

        if (!domElementsCached) {
                dUiView("DOM elements not cached, calling cacheDOMElements.");
                cacheDOMElements();
        }

        // Toolbar buttons (createObjectButton, setBackgroundButton, chooseBackgroundImageButton)
        // are now handled within toolbarView.js

        if (onSaveToFile && domElements.sessionSaveButton) {
                domElements.sessionSaveButton.addEventListener("click", () => {
                        dUiView("Save to File button clicked.");
                        onSaveToFile();
                });
        }

        if (domElements.sessionLoadButton) {
                domElements.sessionLoadButton.addEventListener("click", () => {
                        dUiView("Load from File button clicked.");
                        if (domElements.fileInput) {
                                domElements.fileInput.value = null; // Reset file input
                                domElements.fileInput.click();
                                dUiView("Hidden file input clicked for session load.");
                        } else {
                                log.error("[uiView.js] fileInput element not found.");
                                dUiView(
                                        "initUIEventListeners error: fileInput element not found for session load.",
                                );
                        }
                });
        }

        if (onLoadFromFileInputChange && domElements.fileInput) {
                domElements.fileInput.addEventListener("change", (event) => {
                        dUiView(
                                "File input changed, triggering onLoadFromFileInputChange callback.",
                        );
                        onLoadFromFileInputChange(event);
                });
        }

        // chooseBackgroundImageButton and its backgroundImageFileInput are managed by toolbarView.js now.

        if (domElements.clearBoardButton) {
                domElements.clearBoardButton.addEventListener("click", () => {
                        dUiView("Clear Board button clicked. Showing confirmation modal.");
                        // Use modalView.showModal for consistency if uiView itself needs to show a modal
                        modalView.showModal(
                                "Confirm Clear Board",
                                "<p>Are you sure you want to clear all objects and reset the background?</p>",
                                [
                                        {
                                                text: "Cancel",
                                                type: "secondary",
                                                onClickCallback: () => dUiView("Clear board cancelled by user."),
                                        },
                                        {
                                                text: "Clear Board",
                                                type: "danger",
                                                onClickCallback: () => {
                                                        dUiView("Clear Board confirmed by user.");
                                                        if (vttApiInstance) {
                                                                dUiView("Calling vttApiInstance.clearAllObjects()");
                                                                vttApiInstance.clearAllObjects();
                                                        }
                                                        if (uiViewModelInstance) {
                                                                dUiView(
                                                                        "Calling uiViewModelInstance.setTableBackground() to default.",
                                                                );
                                                                uiViewModelInstance.setTableBackground({
                                                                        type: "color",
                                                                        value: "#cccccc",
                                                                });
                                                        } else if (vttApiInstance) {
                                                                // Fallback if uiViewModelInstance somehow not set
                                                                dUiView(
                                                                        "UiViewModel not available, calling vttApiInstance.setTableBackground() to default.",
                                                                );
                                                                vttApiInstance.setTableBackground({
                                                                        type: "color",
                                                                        value: "#cccccc",
                                                                });
                                                        }
                                                        // Toolbar's backgroundUrlInput and backgroundColorInput are not directly accessible here.
                                                        // This part of the clear board functionality might need rethinking.
                                                        // For now, we rely on UiViewModel to clear background which redraws canvas.
                                                        // Toolbar inputs might not reflect this reset unless UiViewModel also notifies toolbarView.
                                                        // Or, uiView can call a method on toolbarView if one is exposed.
                                                        // For now, just call displayMessage.
                                                        if (uiViewModelInstance) {
                                                                // Check uiViewModelInstance itself
                                                                uiViewModelInstance.displayMessage("Board cleared.", "info");
                                                                dUiView("Board cleared message displayed.");
                                                        }
                                                },
                                        },
                                ],
                        );
                });
        }

        if (onSaveMemoryState && domElements.saveMemoryStateButton) {
                // Changed from callbacks.onSaveMemoryState
                domElements.saveMemoryStateButton.addEventListener("click", () => {
                        dUiView("Save Memory State button clicked.");
                        onSaveMemoryState();
                });
        }

        // Updated: Load Memory State button now calls uiViewModelInstance.requestLoadMemoryState()
        if (domElements.loadMemoryStateButton) {
                domElements.loadMemoryStateButton.addEventListener("click", () => {
                        dUiView("Load Memory State button clicked.");
                        if (uiViewModelInstance) {
                                dUiView("Calling uiViewModelInstance.requestLoadMemoryState()");
                                uiViewModelInstance.requestLoadMemoryState();
                        } else {
                                log.error(
                                        "[uiView.js] UiViewModel not available for loading memory state.",
                                );
                                dUiView(
                                        "initUIEventListeners error: UiViewModel not available for loading memory state.",
                                );
                                // Optionally, show an alert or a more user-facing error
                        }
                });
        }
        dUiView("Main UI event listeners initialized.");
};

// displayMessage is now in messageAreaView.js
// export const displayMessage = (text, type = 'info', duration = 3000) => { ... }

// Modal related functions (showModal, hideModal, displayCreateObjectModal, getModalContentElement)
// are now primarily managed by modalView.js.
// uiView.js can still use modalView.showModal/hideModal (imported from modalView)
// if it needs to display its own modals (e.g., the clear board confirmation, as done above).

// Functions like getToolbarValues, setBackgroundUrlInputText,
// handleSetBackgroundFromToolbar, handleBackgroundImageFileChange are now in toolbarView.js.

// For any functions that were previously exported from uiView but are now in components,
// other modules should import them from their new component locations if direct access is still needed
// (though ideally, interaction happens via UiViewModel or events).
