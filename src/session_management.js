// src/session_management.js
import { VTT_API } from './api.js';

// Note: The UI for selecting a memory state to load has been removed from this module.
// It should be handled by the View layer, which can call getAvailableMemoryStates()
// and then applyMemoryState(stateNameToLoad).

// --- State Variables (Moved from main.js) ---
let currentSessionId = 'local-session'; // Can be updated on load by handleLoadTableState
let inMemoryStates = [];
const MAX_IN_MEMORY_STATES = 5;

// --- Helper Functions (Moved from main.js) ---
const triggerDownload = (filename, data) => {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  VTT_API.showMessage('Table state saved!', 'success');
};

// --- File-Based Save/Load (Moved from main.js) ---
export const handleSaveTableState = () => {
  const state = {
    sessionId: currentSessionId, // Uses currentSessionId from this module
    savedAt: new Date().toISOString(),
    objects: VTT_API.getAllObjects(),
    background: VTT_API.getTableBackground(),
    viewState: VTT_API.getPanZoomState(),
    boardProperties: VTT_API.getBoardProperties(),
    appVersion: 'TableTopTool-MVP-Offline-v1',
  };
  const filename = `session_${currentSessionId}_${new Date().toISOString().slice(0, 10)}.ttt.json`;
  triggerDownload(filename, JSON.stringify(state, null, 2));
};

export const handleLoadTableState = (fileContent) => {
  try {
    const loadedState = JSON.parse(fileContent);
    if (!loadedState || typeof loadedState !== 'object') {
      throw new Error('Invalid file format or missing critical data.');
    }
    const {
      objects: loadedObjectsArray,
      background: loadedBackground,
      viewState: loadedViewState,
      sessionId: loadedSessionId,
      boardProperties: loadedBoardProperties, // Ensure this is destructured
    } = loadedState;

    if (!Array.isArray(loadedObjectsArray)) {
      throw new Error('Invalid file format: objects is not an array.');
    }

    VTT_API.clearAllObjects();
    loadedObjectsArray.forEach((obj) => {
      VTT_API.createObject(obj); // Assumes obj includes 'id'. Relies on modelChanged for image loading.
    });

    if (loadedBackground) VTT_API.setTableBackground(loadedBackground);
    if (loadedViewState) VTT_API.setPanZoomState(loadedViewState);
    if (loadedBoardProperties) VTT_API.setBoardProperties(loadedBoardProperties);

    if (loadedSessionId) currentSessionId = loadedSessionId; // Update module's currentSessionId

    VTT_API.showMessage(`Session '${currentSessionId}' loaded successfully.`, 'success');
  } catch (error) {
    console.error('Error loading table state:', error);
    VTT_API.showMessage(`Load Error: Could not load file: ${error.message}`, 'error');
  }
};

// --- In-Memory Save/Load (Moved from main.js) ---
export const handleSaveMemoryState = () => {
  const state = {
    timestamp: new Date().toISOString(),
    name: `State saved at ${new Date().toLocaleTimeString()}`,
    objects: VTT_API.getAllObjects(),
    background: VTT_API.getTableBackground(),
    viewState: VTT_API.getPanZoomState(),
    boardProperties: VTT_API.getBoardProperties(),
  };

  inMemoryStates.unshift(state); // Uses inMemoryStates from this module
  if (inMemoryStates.length > MAX_IN_MEMORY_STATES) { // Uses MAX_IN_MEMORY_STATES
    inMemoryStates.length = MAX_IN_MEMORY_STATES;
  }
  VTT_API.showMessage('Board state saved to memory.', 'success');
};

export const applyMemoryState = (stateObject) => {
  if (!stateObject) {
    VTT_API.showMessage('Invalid state object provided.', 'error');
    return false;
  }

  VTT_API.clearAllObjects();
  stateObject.objects.forEach(obj => {
    VTT_API.createObject(obj); // Relies on modelChanged for image loading.
  });

  if (stateObject.background) VTT_API.setTableBackground(stateObject.background);
  if (stateObject.viewState) VTT_API.setPanZoomState(stateObject.viewState);
  if (stateObject.boardProperties) {
    VTT_API.setBoardProperties(stateObject.boardProperties);
  }
  VTT_API.showMessage(`Board state loaded: ${stateObject.name}`, 'success');
  return true;
};

export const getAvailableMemoryStates = () => {
  if (inMemoryStates.length === 0) {
    VTT_API.showMessage('No states saved in memory.', 'info');
    return [];
  }
  // Return a simplified list for UI display, preventing direct manipulation of internal states
  return inMemoryStates.map((state, index) => ({
    name: state.name || `State ${index + 1} - ${new Date(state.timestamp).toLocaleString()}`,
    timestamp: state.timestamp, // Keep timestamp for potential sorting or more info
    // Do NOT return the full state.objects here. The caller will use an index or name
    // to call a function like applyMemoryStateByNameOrTimestamp if needed.
    // For simplicity now, the view layer would get this list, then call applyMemoryState
    // with the *actual* state object obtained by index if user selects one.
    // A slightly better way would be to pass back an identifier, and have applyMemoryState accept that identifier.
    // For now, the view layer will need to get inMemoryStates[index] to pass to applyMemoryState.
  }));
};

// Example of how the view layer might get a specific state to apply:
export const getMemoryStateByIndex = (index) => {
    if (index >= 0 && index < inMemoryStates.length) {
        return inMemoryStates[index];
    }
    return null;
};


console.log('session_management.js refactored for better MVVM alignment.');
