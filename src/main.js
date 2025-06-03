// src/main.js
// import * as model from './model.js'; // Removed unused direct model import
// import * as canvas from './canvas.js'; // Replaced by canvasView
import * as canvasView from './views/canvasView.js'; // Import the new canvasView
import CanvasViewModel from './viewmodels/canvasViewModel.js'; // Import CanvasViewModel
import UiViewModel from './viewmodels/uiViewModel.js'; // Import UiViewModel
// ViewModel update functions are no longer imported directly from canvas.js/canvasView.js
// They will be methods on the canvasViewModel instance.
import * as uiView from './views/uiView.js'; // Renamed from ui.js
// The following specific imports from ui.js are likely unused in main.js now.
// Their functionality should be handled within ui.js/uiView.js, driven by UiViewModel.
// import { setBackgroundUrlInputText, setObjectImageUrlText, getModalContentElement } from './views/uiView.js'; 
import * as api from './api.js'; // VTT Scripting API
import Controller from './controller.js'; // Import Controller
// Firebase import is currently unused in main.js
// import * as firebase from './firebase.js'; 
import * as sessionManagement from './session_management.js';

// All session-related state variables (inMemoryStates, MAX_IN_MEMORY_STATES, currentSessionId)
// have been moved to src/session_management.js
let localUserId = 'offline-user'; // This remains as it's not strictly session management

// --- Main Redraw Function ---
const requestRedraw = () => {
  // canvasView.drawVTT() will be called. It uses its configured ViewModel.
  canvasView.drawVTT();
};

// All session save/load and canvas event listener logic has been moved to respective modules.
// main.js primarily initializes modules and orchestrates UI updates based on model changes.

// --- Application Initialization ---
let canvasViewModel; // To hold the CanvasViewModel instance
let uiViewModel; // To hold the UiViewModel instance

const initializeApplication = async () => {
  // Attempt to initialize Firebase (it will run in offline mode)
  // const { auth, db, appIdString } = firebase.initializeAppFirebase();
  // localUserId = await firebase.signInUserAnonymously(auth); // Stubbed
  // ui.updateUserIdDisplay(localUserId); // Element is hidden

  // Create ViewModel instances
  uiViewModel = new UiViewModel(); // Create UiViewModel first
  uiViewModel.init(api.VTT_API); // Initialize UiViewModel with VTT_API
  
  // Pass UiViewModel's public displayMessage method to CanvasViewModel
  canvasViewModel = new CanvasViewModel(requestRedraw, uiViewModel.displayMessage.bind(uiViewModel)); 

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

  // Initialize uiView and pass UiViewModel to it.
  // uiView now orchestrates its components, which will register their specific callbacks with UiViewModel.
  uiView.init(uiViewModel, api.VTT_API); 
  uiView.initUIEventListeners(uiCallbacks); // Existing UI event listeners in uiView

  // Pass the CanvasViewModel instance to canvasView.initCanvas
  canvasView.initCanvas(
    document.getElementById('vtt-canvas'),
    canvasViewModel // Pass the created ViewModel instance
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
    // UiViewModel now listens to modelChanged events directly for inspector and board settings.
    // So, main.js's modelChanged listener only needs to handle canvasViewModel updates.
    if (event.detail && canvasViewModel) { // Ensure canvasViewModel is initialized
      const { type, payload } = event.detail;
      switch (type) {
        // Cases primarily for CanvasViewModel
        case 'allObjectsCleared':
          canvasViewModel.clearAllViewModelObjects();
          canvasViewModel.setSelectedObjectInViewModel(null); 
          break;
        case 'selectionChanged':
          canvasViewModel.setSelectedObjectInViewModel(payload);
          break;
        case 'objectAdded':
          canvasViewModel.addObjectToViewModel(payload);
          break;
        case 'objectUpdated':
          canvasViewModel.updateObjectInViewModel(payload.id, payload);
          break;
        case 'objectDeleted':
          canvasViewModel.removeObjectFromViewModel(payload.id);
          if (payload.id === api.VTT_API.getSelectedObjectId()) { 
             canvasViewModel.setSelectedObjectInViewModel(null);
          }
          break;
        case 'panZoomChanged':
          canvasViewModel.setPanZoomInViewModel(payload);
          break;
        case 'backgroundChanged':
          canvasViewModel.setBackgroundInViewModel(payload);
          break;
        case 'boardPropertiesChanged': 
          canvasViewModel.setBoardPropertiesInViewModel(payload);
          break;
        // Other UI-specific updates (inspector, board settings display) are handled by UiViewModel's own listener.
      }
    }
    requestRedraw(); // Redraw canvas using its updated internal view-model
  });

  // Load initial state from model into ViewModels
  if (canvasViewModel) {
    const initialStateForCanvas = {
        objects: api.VTT_API.getAllObjects(),
        panZoomState: api.VTT_API.getPanZoomState(),
        tableBackground: api.VTT_API.getTableBackground(),
        selectedObjectId: api.VTT_API.getSelectedObjectId(),
        boardProperties: api.VTT_API.getBoardProperties()
    };
    canvasViewModel.loadStateIntoViewModel(initialStateForCanvas);
  }
  // UiViewModel's init already fetches initial boardProperties and selectedObject.
  // If uiView was already refactored, it would register its callbacks here, and UiViewModel would call them.
  // For now, we might need to manually trigger initial UI updates if ui.js isn't yet using UiViewModel.
  // This depends on how ui.js is structured. If ui.js still pulls data on its own, this might be fine.
  // However, the goal is for UiViewModel to push data to uiView.
  // The temporary manual calls to ui.populateObjectInspector and ui.updateBoardSettingsDisplay have been removed.
  // Expectation: uiView.js's init method (and its components' init methods) 
  // handle initial data population by calling uiViewModel getters and registering callbacks.

  // Initial draw
  requestRedraw();
  // Use UiViewModel to display the initial message, now that messageAreaView is set up by uiView.init
  uiViewModel.displayMessage('Application initialized (Offline Mode).', 'info'); 
}

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  initializeApplication();
}
