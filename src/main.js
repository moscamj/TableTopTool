// src/main.js
import * as canvasView from './views/canvasView.js';
import CanvasViewModel from './viewmodels/canvasViewModel.js';
import UiViewModel from './viewmodels/uiViewModel.js';
import * as uiView from './views/uiView.js';
import { VTT_API, VTT_API_INIT } from './api.js'; // VTT Scripting API
import * as sessionManagement from './session_management.js';

// --- Main Redraw Function ---
/**
 * Requests a redraw of the canvas by calling the main drawing function in canvasView.
 */
const requestRedraw = () => {
  canvasView.drawVTT();
};

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
  uiViewModel = new UiViewModel();
  uiViewModel.init(VTT_API);
  VTT_API_INIT({ showMessage: uiViewModel.displayMessage.bind(uiViewModel) }); // Provide API with UI message function
  
  canvasViewModel = new CanvasViewModel(requestRedraw, uiViewModel.displayMessage.bind(uiViewModel)); 

  // Callbacks for UI elements in uiView, primarily for session management actions
  const uiCallbacks = {
    onSaveToFile: sessionManagement.handleSaveTableState, 
    onSaveMemoryState: sessionManagement.handleSaveMemoryState, 
    // onLoadMemoryStateRequest is no longer needed here, uiView calls uiViewModel.requestLoadMemoryState()
    onLoadFromFileInputChange: (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => sessionManagement.handleLoadTableState(e.target.result); 
        reader.onerror = (e) =>
          VTT_API.showMessage('File Read Error: Could not read file.', 'error');
        reader.readAsText(file);
      }
    },
  };

  // Initialize the main UI view (uiView) and its event listeners
  // uiView orchestrates its sub-components (inspector, toolbar, etc.)
  uiView.init(uiViewModel, VTT_API);
  uiView.initUIEventListeners(uiCallbacks);

  // Initialize the canvas view, passing its dedicated ViewModel
  canvasView.initCanvas(
    document.getElementById('vtt-canvas'),
    canvasViewModel
  );
  
  // Create default objects for testing/demonstration purposes
  VTT_API.createObject('rectangle', {
    x: 50,
    y: 50,
    width: 100,
    height: 75,
    appearance: { backgroundColor: '#FFC0CB', text: 'Rect 1' },
    name: 'Test Rectangle 1',
  });

  VTT_API.createObject('circle', {
    x: 200,
    y: 100,
    width: 60, // Diameter
    height: 60, // Diameter
    appearance: { backgroundColor: '#ADD8E6', text: 'Circ 1' },
    name: 'Test Circle 1',
    rotation: 30,
  });

  // Listen for 'modelChanged' events dispatched from model.js
  // This is the primary way the application reacts to data changes.
  document.addEventListener('modelChanged', (event) => {
    // UiViewModel also listens to 'modelChanged' for its own needs (inspector, board settings).
    // This listener in main.js focuses on updating CanvasViewModel and triggering redraws.
    if (event.detail && canvasViewModel) {
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
          if (payload.id === VTT_API.getSelectedObjectId()) {
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
    requestRedraw();
  });

  // Load initial state from the VTT_API into the CanvasViewModel
  if (canvasViewModel) {
    const initialStateForCanvas = {
        objects: VTT_API.getAllObjects(),
        panZoomState: VTT_API.getPanZoomState(),
        tableBackground: VTT_API.getTableBackground(),
        selectedObjectId: VTT_API.getSelectedObjectId(),
        boardProperties: VTT_API.getBoardProperties()
    };
    canvasViewModel.loadStateIntoViewModel(initialStateForCanvas);
  }

  requestRedraw(); // Perform initial draw of the canvas
  uiViewModel.displayMessage('Application initialized (Offline Mode).', 'info'); 
}

// Ensures the application initializes after the DOM is fully loaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  initializeApplication();
}
