// src/main.js
// import * as model from './model.js'; // Removed unused direct model import
import * as canvas from './canvas.js'; // Still need for initCanvas, and drawVTT (though drawVTT takes no args now)
import { 
    loadStateIntoViewModel,
    addObjectToViewModel,
    updateObjectInViewModel,
    removeObjectFromViewModel,
    setPanZoomInViewModel,
    setBackgroundInViewModel,
    setSelectedObjectInViewModel,
    setBoardPropertiesInViewModel,
    clearAllViewModelObjects // Import the new clear function
} from './canvas.js'; // Import the new ViewModel update functions
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
  // canvas.drawVTT() now uses its internal viewModel, so no arguments are needed here.
  // The viewModel in canvas.js is updated by functions called from the modelChanged event listener.
  canvas.drawVTT();
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
      const { type, payload } = event.detail;
      switch (type) {
        case 'allObjectsCleared':
          clearAllViewModelObjects();
          // Explicitly update selection in canvas view model and UI after all objects are cleared
          setSelectedObjectInViewModel(null); 
          ui.populateObjectInspector(null);
          break;
        case 'selectionChanged':
          setSelectedObjectInViewModel(payload); // payload is expected to be selectedId (or null)
          // Update UI inspector based on the new selection from the main model
          const selectedObjectForUI = payload ? api.VTT_API.getObject(payload) : null;
          ui.populateObjectInspector(selectedObjectForUI);
          break;
        case 'objectAdded':
          addObjectToViewModel(payload); // payload is the new object
          // If the new object becomes selected, model should dispatch 'selectionChanged'
          // which will then populate the inspector.
          break;
        case 'objectUpdated':
          // Assuming payload is the full updated object or {id, changes}
          // If model sends full object: updateObjectInViewModel(payload.id, payload);
          // If model sends {id, changes}: updateObjectInViewModel(payload.id, payload.changes);
          // For now, let's assume payload is the full updated object as per typical model events.
          updateObjectInViewModel(payload.id, payload); 
          
          // Update UI inspector if the updated object is the currently selected one
          if (payload && payload.id === api.VTT_API.getSelectedObjectId()) {
            // Fetch again from API to ensure UI gets the absolute source of truth,
            // though canvas view model is also updated.
            ui.populateObjectInspector(api.VTT_API.getObject(payload.id));
          }
          break;
        case 'objectDeleted':
          removeObjectFromViewModel(payload.id); // payload is expected to be {id, ...otherProps}
          if (payload.id === api.VTT_API.getSelectedObjectId()) { // Check if selected object was deleted
             setSelectedObjectInViewModel(null); // Update canvas view model
             ui.populateObjectInspector(null); // Clear inspector
          }
          break;
        case 'panZoomChanged':
          setPanZoomInViewModel(payload); // payload is the new panZoomState
          break;
        case 'backgroundChanged':
          setBackgroundInViewModel(payload); // payload is the new background state
          break;
        case 'boardPropertiesChanged': 
          setBoardPropertiesInViewModel(payload); // payload is the new boardProperties
          // Update UI display for board settings
          ui.updateBoardSettingsDisplay(payload); // Pass the new properties directly
          break;
        // Add other cases as needed
      }
    }
    requestRedraw(); // Redraw canvas using its updated internal view-model
  });

  // Load initial state from model into canvas ViewModel
  const initialStateForCanvas = {
      objects: api.VTT_API.getAllObjects(), // Returns an array of copies
      panZoomState: api.VTT_API.getPanZoomState(),
      tableBackground: api.VTT_API.getTableBackground(),
      selectedObjectId: api.VTT_API.getSelectedObjectId(),
      boardProperties: api.VTT_API.getBoardProperties()
  };
  loadStateIntoViewModel(initialStateForCanvas); // Call the imported function

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
