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

import UiViewModel from '../viewmodels/uiViewModel.js';
import { VTT_API_INIT } from '../api.js';
import * as sessionManagement from '../session_management.js';

// CanvasViewModel import removed
import * as canvasView from './canvasView.js';

const dUiView = debug("app:view:ui");

let uiViewModelInstance = null;
// vttApiInstance module variable removed, will be passed as parameter where needed.

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
 * This function is now responsible for creating UiViewModel, initializing VTT_API,
 * setting up session management callbacks, and initializing all UI sub-components and the canvas system.
 * @param {object} vttApi - The VTT_API instance (passed from main.js).
 */
export const init = (vttApi) => {
        dUiView("uiView init started, received vttApi: %o", vttApi);
        // vttApiInstance = vttApi; // No longer storing as module variable

        // Initialize UiViewModel
        uiViewModelInstance = new UiViewModel();
        dUiView("UiViewModel instance created in uiView");
        if (uiViewModelInstance.init) {
                uiViewModelInstance.init(vttApi); // Pass vttApi to UiViewModel's init
                dUiView("UiViewModel initialized with vttApi");
        }

        // Call VTT_API_INIT
        VTT_API_INIT({
                showMessage: uiViewModelInstance.displayMessage.bind(uiViewModelInstance)
        });
        dUiView("VTT_API_INIT called from uiView with UiViewModel's displayMessage");

        // Define uiCallbacks (previously in main.js)
        const uiCallbacks = {
                onSaveToFile: sessionManagement.handleSaveTableState,
                onSaveMemoryState: sessionManagement.handleSaveMemoryState,
                onLoadFromFileInputChange: (event) => {
                        const file = event.target.files[0];
                        if (file) {
                                dUiView("File selected for loading in uiView: %s", file.name);
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                        dUiView("File content loaded in uiView, calling sessionManagement.handleLoadTableState");
                                        sessionManagement.handleLoadTableState(e.target.result);
                                };
                                reader.onerror = (e) => {
                                        log.error("[uiView.js] File Read Error:", e);
                                        vttApi.showMessage("File Read Error: Could not read file.", "error");
                                };
                                reader.readAsText(file);
                        }
                },
        };
        dUiView("uiCallbacks defined in uiView: %o", uiCallbacks);

        // Initialize UI Event Listeners
        initUIEventListeners(uiCallbacks, vttApi); // Pass vttApi here
        dUiView("initUIEventListeners called from uiView init with vttApi");

        // Initialize all UI sub-components
        dUiView("Initializing UI sub-components...");
        inspectorView.init(uiViewModelInstance, vttApi); // Pass the vttApi received by init
        dUiView("inspectorView initialized.");
        boardSettingsView.init(uiViewModelInstance); // Assumes it gets vttApi via uiViewModelInstance if needed
        dUiView("boardSettingsView initialized.");
        toolbarView.init(uiViewModelInstance); // Assumes it gets vttApi via uiViewModelInstance if needed
        dUiView("toolbarView initialized.");
        modalView.init(uiViewModelInstance);
        dUiView("modalView initialized.");
        messageAreaView.init(uiViewModelInstance);
        dUiView("messageAreaView initialized.");
        dUiView("UI sub-components initialized in uiView");

        // Initialize Canvas System directly via canvasView.initCanvas
        if (domElements.vttCanvas) {
                canvasView.initCanvas(
                        domElements.vttCanvas,
                        uiViewModelInstance.displayMessage.bind(uiViewModelInstance),
                        vttApi
                );
                dUiView("canvasView.initCanvas called from uiView init");
        } else {
                log.error("[uiView.js] VTT Canvas element not found, cannot initialize canvasView.");
                uiViewModelInstance.displayMessage("Critical Error: Canvas element not found. VTT will not function.", "error");
        }

        // Display "Application initialized" message
        uiViewModelInstance.displayMessage("Application initialized.", "info");
        dUiView("'Application initialized.' message displayed from uiView.");

        log.debug(
                "[uiView.js] Initialized with VTT_API, created UiViewModel, set up callbacks, sub-components, and canvas.",
        );
        dUiView("uiView initialization complete.");
};

// initializeCanvasSystem function removed as its logic has been moved to canvasView.js

// --- Main UI Event Listener Setup (for elements uiView.js still manages) ---
/**
 * Sets up global UI event listeners for elements managed directly by uiView.js (primarily header buttons).
 * These listeners typically delegate actions to UiViewModel or use callbacks provided by main.js
 * for session management tasks.
 * @param {object} callbacks - An object containing callback functions for certain UI actions.
 * @param {function(): void} callbacks.onSaveToFile - Callback to handle saving the current table state to a file.
 * @param {function(event: Event): void} callbacks.onLoadFromFileInputChange - Callback to handle file selection for loading table state.
 * @param {function(): void} callbacks.onSaveMemoryState - Callback to handle saving the current state to in-memory storage.
 * @param {object} vttApi - The VTT API instance.
 */
export const initUIEventListeners = (callbacks, vttApi) => {
        const {
                onSaveToFile,
                onLoadFromFileInputChange,
                onSaveMemoryState,
        } = callbacks;
        dUiView("initUIEventListeners called with callbacks: %o and vttApi: %o", callbacks, vttApi);

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
                                                        if (vttApi) { // Use passed-in vttApi
                                                                dUiView("Calling vttApi.clearAllObjects()");
                                                                vttApi.clearAllObjects();
                                                        }
                                                        if (uiViewModelInstance) {
                                                                dUiView(
                                                                        "Calling uiViewModelInstance.setTableBackground() to default.",
                                                                );
                                                                uiViewModelInstance.setTableBackground({
                                                                        type: "color",
                                                                        value: "#cccccc",
                                                                });
                                                        } else if (vttApi) { // Use passed-in vttApi
                                                                // Fallback if uiViewModelInstance somehow not set
                                                                dUiView(
                                                                        "UiViewModel not available, calling vttApi.setTableBackground() to default.",
                                                                );
                                                                vttApi.setTableBackground({ // Use passed-in vttApi
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
                domElements.saveMemoryStateButton.addEventListener("click", () => {
                        dUiView("Save Memory State button clicked.");
                        onSaveMemoryState();
                });
        }

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
