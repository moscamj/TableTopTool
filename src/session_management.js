// src/session_management.js
import { VTT_API } from './api.js';
// Import specific UI functions that are hard to decouple immediately for handleLoadMemoryStateRequest.
// This is a temporary measure and should be refactored for better separation of concerns.
import { getModalContentElement, hideModal, showModal as uiShowModal } from './ui.js';

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
  VTT_API.showMessage('Table state saved!', 'success'); // Replaced ui.displayMessage
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

// Renamed from applyLoadedMemoryState, made internal, and adapted.
const internalApplyLoadedMemoryState = (stateObject) => {
  if (!stateObject) {
    VTT_API.showMessage('Invalid state object provided.', 'error');
    return;
  }

  VTT_API.clearAllObjects();
  stateObject.objects.forEach(obj => {
    VTT_API.createObject(obj); // Relies on modelChanged in main.js for image loading.
  });

  if (stateObject.background) VTT_API.setTableBackground(stateObject.background);
  if (stateObject.viewState) VTT_API.setPanZoomState(stateObject.viewState);
  if (stateObject.boardProperties) {
    VTT_API.setBoardProperties(stateObject.boardProperties);
    // ui.updateBoardSettingsDisplay removed, should be event-driven if UI needs this
  }
  VTT_API.showMessage(`Board state loaded: ${stateObject.name}`, 'success');
};

export const handleLoadMemoryStateRequest = () => {
  if (inMemoryStates.length === 0) { // Uses inMemoryStates from this module
    VTT_API.showMessage('No states saved in memory.', 'info');
    return;
  }

  let modalContentHtml = '<p>Select a state to load:</p><div class="flex flex-col space-y-2 mt-2">';
  inMemoryStates.forEach((state, index) => { // Uses inMemoryStates from this module
    modalContentHtml += `<button class="w-full text-left p-2 bg-gray-600 hover:bg-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" data-state-index="${index}">
                           ${state.name || `State ${index + 1} - ${new Date(state.timestamp).toLocaleString()}`}
                         </button>`;
  });
  modalContentHtml += '</div>';

  const modalButtonsArray = [{ text: 'Cancel', type: 'secondary' }];

  // Using imported uiShowModal, getModalContentElement, hideModal from ui.js
  // This maintains functionality but is an area of coupling to address later.
  uiShowModal('Load State from Memory', modalContentHtml, modalButtonsArray);

  const modalContentElement = getModalContentElement(); 
  if (modalContentElement) {
    const stateButtons = modalContentElement.querySelectorAll('[data-state-index]');
    stateButtons.forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.getAttribute('data-state-index'));
        if (inMemoryStates[index]) { // Uses inMemoryStates from this module
          internalApplyLoadedMemoryState(inMemoryStates[index]);
          hideModal(); 
        } else {
          VTT_API.showMessage('Selected state not found.', 'error');
        }
      });
    });
  } else {
    console.error('[session_management.js] Modal content element not found for load state.');
    VTT_API.showMessage('Error setting up load state options.', 'error');
  }
};

console.log('session_management.js fully populated with session functions and state variables.');
