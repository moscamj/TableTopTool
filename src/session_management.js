// src/session_management.js
import log from "loglevel";
import debug from "debug";
import { VTT_API } from "./api.js";

const dSession = debug("app:session");
dSession("session_management.js module loaded");

// Note: The UI for selecting a memory state to load has been removed from this module.
// It should be handled by the View layer. The typical flow would be:
// 1. View calls `getAvailableMemoryStates()` to get a list of saved state metadata.
// 2. View displays these states to the user (e.g., in a modal).
// 3. Upon user selection, View calls `getMemoryStateByIndex(selectedIndex)` to retrieve the full state object.
// 4. View then calls `applyMemoryState(selectedStateObject)` to apply the chosen state.

// --- State Variables ---
/** @type {string} Stores the current session identifier. */
let currentSessionId = "local-session"; // Can be updated on load by handleLoadTableState

/** @type {Array<object>} Stores recent board states in memory. */
let inMemoryStates = [];

/** @const {number} Maximum number of states to keep in memory. */
const MAX_IN_MEMORY_STATES = 5;

// --- Helper Functions ---
/**
 * Triggers a file download in the browser.
 * @param {string} filename - The desired name for the downloaded file.
 * @param {string} data - The string content to be downloaded (e.g., JSON string).
 */
const triggerDownload = (filename, data) => {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  dSession(
    "Triggering download for filename: %s, data length: %d",
    filename,
    data.length,
  );
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  dSession("Download triggered and resources cleaned up for: %s", filename);
  VTT_API.showMessage("Table state saved!", "success");
};

// --- File-Based Save/Load ---
/**
 * Handles saving the current table state (objects, background, view, board properties) to a JSON file.
 * The file is then triggered for download by the user.
 */
export const handleSaveTableState = () => {
  dSession(
    "handleSaveTableState called. Current session ID: %s",
    currentSessionId,
  );
  const state = {
    sessionId: currentSessionId, // Uses currentSessionId from this module
    savedAt: new Date().toISOString(),
    objects: VTT_API.getAllObjects(),
    background: VTT_API.getTableBackground(),
    viewState: VTT_API.getPanZoomState(),
    boardProperties: VTT_API.getBoardProperties(),
    appVersion: "TableTopTool-MVP-Offline-v1",
  };
  dSession("Current table state for saving: %o", state);
  const filename = `session_${currentSessionId}_${new Date().toISOString().slice(0, 10)}.ttt.json`;
  triggerDownload(filename, JSON.stringify(state, null, 2));
  dSession("Table state save process completed for filename: %s", filename);
};

/**
 * Handles loading a table state from a JSON file content.
 * It clears existing objects and applies the loaded state.
 * @param {string} fileContent - The JSON string content from the loaded file.
 */
export const handleLoadTableState = (fileContent) => {
  dSession(
    "handleLoadTableState called with fileContent length: %d",
    fileContent.length,
  );
  try {
    const loadedState = JSON.parse(fileContent);
    dSession("Parsed loaded state: %o", loadedState);
    if (!loadedState || typeof loadedState !== "object") {
      dSession("Load error: Invalid file format or missing critical data.");
      throw new Error("Invalid file format or missing critical data.");
    }
    const {
      objects: loadedObjectsArray,
      background: loadedBackground,
      viewState: loadedViewState,
      sessionId: loadedSessionId,
      boardProperties: loadedBoardProperties, // Ensure this is destructured
    } = loadedState;

    if (!Array.isArray(loadedObjectsArray)) {
      dSession("Load error: Invalid file format - objects is not an array.");
      throw new Error("Invalid file format: objects is not an array.");
    }

    dSession("Clearing all existing objects.");
    VTT_API.clearAllObjects();
    dSession("Loading %d objects from file.", loadedObjectsArray.length);
    loadedObjectsArray.forEach((obj) => {
      VTT_API.createObject(obj); // Assumes obj includes 'id'. Relies on modelChanged for image loading.
    });

    if (loadedBackground) {
      dSession(
        "Setting table background from loaded state: %o",
        loadedBackground,
      );
      VTT_API.setTableBackground(loadedBackground);
    }
    if (loadedViewState) {
      dSession("Setting pan/zoom state from loaded state: %o", loadedViewState);
      VTT_API.setPanZoomState(loadedViewState);
    }
    if (loadedBoardProperties) {
      dSession(
        "Setting board properties from loaded state: %o",
        loadedBoardProperties,
      );
      VTT_API.setBoardProperties(loadedBoardProperties);
    }

    if (loadedSessionId) {
      dSession(
        "Updating currentSessionId from %s to %s",
        currentSessionId,
        loadedSessionId,
      );
      currentSessionId = loadedSessionId; // Update module's currentSessionId
    }

    VTT_API.showMessage(
      `Session '${currentSessionId}' loaded successfully.`,
      "success",
    );
    dSession(
      "Table state loaded successfully. Session ID: %s",
      currentSessionId,
    );
  } catch (error) {
    log.error("Error loading table state:", error);
    dSession("Error loading table state: %o", error);
    VTT_API.showMessage(
      `Load Error: Could not load file: ${error.message}`,
      "error",
    );
  }
};

// --- In-Memory Save/Load ---
/**
 * Saves the current board state (objects, background, view, board properties) to an in-memory array.
 * Keeps a maximum of MAX_IN_MEMORY_STATES recent states.
 */
export const handleSaveMemoryState = () => {
  dSession("handleSaveMemoryState called.");
  const state = {
    timestamp: new Date().toISOString(),
    name: `State saved at ${new Date().toLocaleTimeString()}`,
    objects: VTT_API.getAllObjects(),
    background: VTT_API.getTableBackground(),
    viewState: VTT_API.getPanZoomState(),
    boardProperties: VTT_API.getBoardProperties(),
  };

  dSession("Current board state for in-memory save: %o", state);

  inMemoryStates.unshift(state); // Uses inMemoryStates from this module
  dSession(
    "State pushed to inMemoryStates. Current count: %d",
    inMemoryStates.length,
  );
  if (inMemoryStates.length > MAX_IN_MEMORY_STATES) {
    // Uses MAX_IN_MEMORY_STATES
    inMemoryStates.length = MAX_IN_MEMORY_STATES;
    dSession(
      "Exceeded MAX_IN_MEMORY_STATES. Trimmed to %d states.",
      MAX_IN_MEMORY_STATES,
    );
  }
  VTT_API.showMessage("Board state saved to memory.", "success");
  dSession("Board state saved to memory.");
};

/**
 * Applies a given memory state object to the current board.
 * Clears existing objects and sets the board according to the state object.
 * @param {object} stateObject - The memory state object to apply. Must include 'objects', and optionally 'background', 'viewState', 'boardProperties'.
 * @returns {boolean} True if the state was applied, false if stateObject was invalid.
 */
export const applyMemoryState = (stateObject) => {
  dSession("applyMemoryState called with stateObject: %o", stateObject);
  if (!stateObject || typeof stateObject.objects === "undefined") {
    // Added more robust check
    dSession("applyMemoryState error: Invalid memory state object provided.");
    VTT_API.showMessage("Invalid memory state object provided.", "error");
    return false;
  }

  dSession("Clearing all existing objects before applying memory state.");
  VTT_API.clearAllObjects();
  dSession("Loading %d objects from memory state.", stateObject.objects.length);
  stateObject.objects.forEach((obj) => {
    VTT_API.createObject(obj); // Relies on modelChanged for image loading.
  });

  if (stateObject.background) {
    dSession(
      "Setting table background from memory state: %o",
      stateObject.background,
    );
    VTT_API.setTableBackground(stateObject.background);
  }
  if (stateObject.viewState) {
    dSession(
      "Setting pan/zoom state from memory state: %o",
      stateObject.viewState,
    );
    VTT_API.setPanZoomState(stateObject.viewState);
  }
  if (stateObject.boardProperties) {
    dSession(
      "Setting board properties from memory state: %o",
      stateObject.boardProperties,
    );
    VTT_API.setBoardProperties(stateObject.boardProperties);
  }
  VTT_API.showMessage(
    `Board state loaded: ${stateObject.name || "Unnamed State"}`,
    "success",
  );
  dSession(
    "Memory state applied successfully: %s",
    stateObject.name || "Unnamed State",
  );
  return true;
};

/**
 * Retrieves a list of available in-memory states, formatted for display.
 * Does not return the full state objects themselves to prevent direct manipulation.
 * @returns {Array<{name: string, timestamp: string}>} An array of objects with 'name' and 'timestamp' for each saved state.
 */
export const getAvailableMemoryStates = () => {
  dSession(
    "getAvailableMemoryStates called. Number of states: %d",
    inMemoryStates.length,
  );
  if (inMemoryStates.length === 0) {
    VTT_API.showMessage("No states saved in memory.", "info");
    dSession("No memory states available.");
    return [];
  }
  // Return a simplified list for UI display
  const simplifiedStates = inMemoryStates.map((state, index) => ({
    name:
      state.name ||
      `State ${index + 1} - ${new Date(state.timestamp).toLocaleString()}`,
    timestamp: state.timestamp, // Keep timestamp for potential sorting or more info
    // Do NOT return the full state.objects here. The caller will use an index or name
    // to call a function like applyMemoryStateByNameOrTimestamp if needed.
    // For simplicity now, the view layer would get this list, then call applyMemoryState
    // with the *actual* state object obtained by index if user selects one.
    // A slightly better way would be to pass back an identifier, and have applyMemoryState accept that identifier.
    // For now, the view layer will need to get inMemoryStates[index] to pass to applyMemoryState.
  }));
  dSession("Returning simplified memory states: %o", simplifiedStates);
  return simplifiedStates;
};

/**
 * Retrieves a specific memory state object by its index in the inMemoryStates array.
 * This is intended to be used by the View layer after the user selects a state from the list provided by getAvailableMemoryStates.
 * @param {number} index - The index of the desired state in the inMemoryStates array.
 * @returns {object | null} The full state object if found, otherwise null.
 */
export const getMemoryStateByIndex = (index) => {
  dSession("getMemoryStateByIndex called with index: %d", index);
  if (index >= 0 && index < inMemoryStates.length) {
    const state = inMemoryStates[index];
    dSession("Returning memory state at index %d: %o", index, state);
    return state;
  }
  VTT_API.showMessage("Invalid memory state index.", "error"); // Added feedback for invalid index
  dSession(
    "getMemoryStateByIndex error: Invalid index %d. Max index: %d",
    index,
    inMemoryStates.length - 1,
  );
  return null;
};

// log.debug('session_management.js refactored for better MVVM alignment.');
dSession("session_management.js setup complete.");
