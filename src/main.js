// src/main.js
// import * as model from './model.js'; // Removed unused direct model import
import * as canvas from './canvas.js';
import * as ui from './ui.js';
import { setBackgroundUrlInputText, setObjectImageUrlText, getModalContentElement } from './ui.js'; // Import the new functions
import * as api from './api.js'; // VTT Scripting API
import Controller from './controller.js'; // Import Controller
// Firebase is imported for its stubbed functions in offline mode
import * as firebase from './firebase.js';
import * as sessionManagement from './session_management.js';

// All session-related state variables (inMemoryStates, MAX_IN_MEMORY_STATES, currentSessionId)
// have been moved to src/session_management.js
let localUserId = 'offline-user'; // This remains as it's not strictly session management

// --- Main Redraw Function ---
const requestRedraw = () => {
  const allObjects = api.VTT_API.getAllObjects(); // This is fine, uses API -> model
  const panZoomState = api.VTT_API.getPanZoomState();
  const tableBackground = api.VTT_API.getTableBackground();
  const selectedObjectId = api.VTT_API.getSelectedObjectId();
  const boardProperties = api.VTT_API.getBoardProperties(); // Fetch board properties

  canvas.drawVTT(
    allObjects,
    panZoomState,
    tableBackground,
    selectedObjectId,
    boardProperties // Pass board properties as the new 5th argument
  );
};

// All session save/load and canvas event listener logic has been moved to respective modules.
// main.js primarily initializes modules and orchestrates UI updates based on model changes.

// --- Application Initialization ---
const initializeApplication = async () => {
  // Attempt to initialize Firebase (it will run in offline mode)
  // const { auth, db, appIdString } = firebase.initializeAppFirebase();
  // localUserId = await firebase.signInUserAnonymously(auth); // Stubbed
  // ui.updateUserIdDisplay(localUserId); // Element is hidden

  // Define UI Callbacks
  const uiCallbacks = {
    // onCreateObjectRequested: handleCreateObjectRequested, // Removed: ui.js handles directly
    // onSetBackground: () => { ... }, // Removed: ui.js handles directly
    // onApplyObjectChanges: () => { ... }, // Removed: ui.js handles directly
    // onDeleteObject: () => { ... }, // Removed: ui.js handles directly
    onSaveToFile: sessionManagement.handleSaveTableState, 
    onSaveMemoryState: sessionManagement.handleSaveMemoryState, 
    onLoadMemoryStateRequest: sessionManagement.handleLoadMemoryStateRequest, 
    onLoadFromFileInputChange: (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => sessionManagement.handleLoadTableState(e.target.result); 
        reader.onerror = (e) =>
          api.VTT_API.showMessage('File Read Error: Could not read file.', 'error'); 
        reader.readAsText(file);
      }
    },
    // onBackgroundImageFileSelected: handleBackgroundImageFileSelected, // Removed: ui.js handles directly
    // onObjectImageFileSelected: handleObjectImageFileSelected, // Removed: ui.js handles directly
    // onInspectorPropertyChange: (props) => { console.log("Inspector props changed (live):", props); } // For live updates
  };

  Controller.init(api.VTT_API); // Initialize Controller

  ui.initUIEventListeners(uiCallbacks);
  // Pass requestRedraw and ui.displayMessage to canvas module
  canvas.initCanvas(
    document.getElementById('vtt-canvas'),
    requestRedraw,
    ui.displayMessage // Pass the actual ui.displayMessage function
  );

  // Create default objects for testing
  api.VTT_API.createObject('rectangle', {
    x: 50,
    y: 50,
    width: 100,
    height: 75,
    appearance: { backgroundColor: '#FFC0CB', text: 'Rect 1' },
    name: 'Test Rectangle 1',
  });

  api.VTT_API.createObject('circle', {
    x: 200,
    y: 100,
    width: 60, // Diameter
    height: 60, // Diameter
    appearance: { backgroundColor: '#ADD8E6', text: 'Circ 1' },
    name: 'Test Circle 1',
    rotation: 30,
  });

  // --- Canvas Event Listeners ---
  // All canvas event listeners (mousedown, mousemove, mouseup, mouseleave, wheel)
  // have been moved to src/canvas.js.
  // src/canvas.js now directly uses VTT_API for state changes,
  // which trigger 'modelChanged' events.

  // The 'stateChangedForRedraw' event listener has been removed.
  // It is assumed that all necessary redraws are triggered by 'modelChanged' events,
  // which should be dispatched by model.js whenever the application state changes.

  // Add new event listener for model changes
  document.addEventListener('modelChanged', (event) => {
    // console.log('modelChanged event received in main.js:', event.detail); // Optional: for debugging

    // Handle UI updates based on model changes
    if (event.detail) {
      switch (event.detail.type) {
        case 'selectionChanged':
          // Update object inspector when selection changes
          const selectedObject = event.detail.payload ? api.VTT_API.getObject(event.detail.payload) : null;
          ui.populateObjectInspector(selectedObject);
          break;
        case 'objectAdded': // Handles objects added by VTT_API.createObject during load
        case 'objectUpdated':
          const objectPayload = event.detail.payload;
          // If the updated/added object is the currently selected one, refresh inspector
          if (objectPayload && objectPayload.id === api.VTT_API.getSelectedObjectId()) {
            ui.populateObjectInspector(api.VTT_API.getObject(objectPayload.id));
          }
          // If an image URL was part of the added/updated object, load the image
          if (objectPayload && objectPayload.appearance && objectPayload.appearance.imageUrl) {
            canvas.loadImage(objectPayload.appearance.imageUrl, objectPayload.appearance.imageUrl, requestRedraw);
          }
          break;
        case 'boardPropertiesChanged': 
          // This event type should be emitted by model.js when VTT_API.setBoardProperties is called.
          // This ensures UI elements showing board properties are updated when a session is loaded.
          const boardProperties = api.VTT_API.getBoardProperties();
          ui.updateBoardSettingsDisplay(boardProperties);
          break;
        case 'backgroundChanged':
          // Special handling for background image loading
          const newBackground = event.detail.payload;
          if (newBackground.type === 'image' && newBackground.value) {
            canvas.loadImage(newBackground.value, newBackground.value, requestRedraw);
          }
          break;
        // Add other cases as needed for UI updates tied to specific model changes
      }
    }
    requestRedraw(); // Redraw for any model change
  });

  // Initial draw
  requestRedraw();
  ui.displayMessage('Application initialized (Offline Mode).', 'info');
}

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  initializeApplication();
}
