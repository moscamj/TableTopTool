// src/main.js
import * as canvasView from './views/canvasView.js';
import CanvasViewModel from './viewmodels/canvasViewModel.js';
import UiViewModel from './viewmodels/uiViewModel.js';
import * as uiView from './views/uiView.js';
import { VTT_API, VTT_API_INIT } from './api.js'; // VTT Scripting API
import * as sessionManagement from './session_management.js';

// --- Main Redraw Function ---
const requestRedraw = () => {
  canvasView.drawVTT();
};

// --- Application Initialization ---
let canvasViewModel;
let uiViewModel;

const initializeApplication = async () => {
  // Create ViewModel instances
  uiViewModel = new UiViewModel();
  uiViewModel.init(VTT_API);
  VTT_API_INIT({ showMessage: uiViewModel.displayMessage.bind(uiViewModel) });
  
  canvasViewModel = new CanvasViewModel(requestRedraw, uiViewModel.displayMessage.bind(uiViewModel)); 

  // Define UI Callbacks
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

  // Initialize uiView and pass UiViewModel to it.
  // uiView now orchestrates its components, which will register their specific callbacks with UiViewModel.
  uiView.init(uiViewModel, VTT_API);
  uiView.initUIEventListeners(uiCallbacks);

  // Pass the CanvasViewModel instance to canvasView.initCanvas
  canvasView.initCanvas(
    document.getElementById('vtt-canvas'),
    canvasViewModel // Pass the created ViewModel instance
  );
  
  // Create default objects for testing
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

  // Add new event listener for model changes
  document.addEventListener('modelChanged', (event) => {
    // Handle UI updates based on model changes
    // UiViewModel now listens to modelChanged events directly for inspector and board settings.
    // So, main.js's modelChanged listener only needs to handle canvasViewModel updates.
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

  // Load initial state from model into ViewModels
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

  // Initial draw
  requestRedraw();
  uiViewModel.displayMessage('Application initialized (Offline Mode).', 'info'); 
}

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  initializeApplication();
}
