// src/main.js
import * as model from './model.js';
import * as canvas from './canvas.js';
import * as ui from './ui.js';
import { setBackgroundUrlInputText, setObjectImageUrlText, getModalContentElement } from './ui.js'; // Import the new functions
import * as api from './api.js'; // VTT Scripting API
import Controller from './controller.js'; // Import Controller
// Firebase is imported for its stubbed functions in offline mode
import * as firebase from './firebase.js';

// In-memory state storage
let inMemoryStates = [];
const MAX_IN_MEMORY_STATES = 5;

let currentSessionId = 'local-session'; // Can be updated on load
let localUserId = 'offline-user';

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

// --- Local Save/Load ---
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
  ui.displayMessage('Table state saved!', 'success');
};

const handleSaveTableState = () => {
  const state = {
    sessionId: currentSessionId,
    savedAt: new Date().toISOString(),
    objects: api.VTT_API.getAllObjects(), // Already returns array of copies
    background: api.VTT_API.getTableBackground(), // Use VTT_API
    viewState: api.VTT_API.getPanZoomState(), // Use VTT_API
    boardProperties: api.VTT_API.getBoardProperties(), // Also save board properties from VTT_API
    appVersion: 'TableTopTool-MVP-Offline-v1', // Optional versioning
  };
  const filename = `session_${currentSessionId}_${new Date().toISOString().slice(0, 10)}.ttt.json`;
  triggerDownload(filename, JSON.stringify(state, null, 2));
};

const handleLoadTableState = (fileContent) => {
  try {
    const loadedState = JSON.parse(fileContent);
    if (
      !loadedState ||
      typeof loadedState !== 'object'
      // !Array.isArray(loadedState.objects) // objects property checked below
    ) {
      throw new Error('Invalid file format or missing critical data.');
    }
    // Destructure loadedState.
    // 'objects' is renamed to 'loadedObjectsArray' to avoid conflict with the imported 'objects' module.
    const {
      objects: loadedObjectsArray,
      background: loadedBackground,
      viewState: loadedViewState,
      sessionId: loadedSessionId,
    } = loadedState;

    if (!Array.isArray(loadedObjectsArray)) {
      throw new Error('Invalid file format: objects is not an array.');
    }

    api.VTT_API.clearAllObjects();
    // After loading objects from file, iterate and explicitly trigger image loading
    // for any objects that have an image URL. This ensures images are displayed.
    loadedObjectsArray.forEach((obj) => {
      model.currentObjects.set(obj.id, obj); // This is for object data, separate from canvas state
      if (obj.appearance && obj.appearance.imageUrl) {
        canvas.loadImage(
          obj.appearance.imageUrl,
          obj.appearance.imageUrl,
          requestRedraw // Request a redraw once the image is loaded/failed
        );
      }
    });

    // Use VTT_API setters for canvas states
    if (loadedBackground) api.VTT_API.setTableBackground(loadedBackground); // Use VTT_API
    if (loadedViewState) api.VTT_API.setPanZoomState(loadedViewState); // Use VTT_API
    // Handle board properties loading
    if (loadedState.boardProperties) api.VTT_API.setBoardProperties(loadedState.boardProperties); // Use VTT_API

    if (loadedSessionId) currentSessionId = loadedSessionId;

    // ui.updateSessionIdDisplay(currentSessionId); // Already hidden, but if re-enabled
    ui.displayMessage(
      `Session '${currentSessionId}' loaded successfully.`,
      'success'
    );
    requestRedraw();
  } catch (error) {
    console.error('Error loading table state:', error);
    ui.showModal('Load Error', `Could not load file: ${error.message}`); // This line should already be correct
    ui.displayMessage('Failed to load table state.', 'error');
  }
};

// --- In-Memory Save/Load ---
export const handleSaveMemoryState = () => {
  const state = {
    timestamp: new Date().toISOString(), // For identification
    name: `State saved at ${new Date().toLocaleTimeString()}`, // Default name
    objects: api.VTT_API.getAllObjects(),
    background: api.VTT_API.getTableBackground(), // Use VTT_API
    viewState: api.VTT_API.getPanZoomState(), // Use VTT_API
    boardProperties: api.VTT_API.getBoardProperties() // Also save board properties from VTT_API
  };

  inMemoryStates.unshift(state); // Add to the beginning

  if (inMemoryStates.length > MAX_IN_MEMORY_STATES) {
    inMemoryStates.length = MAX_IN_MEMORY_STATES; // Trim oldest states
  }

  api.VTT_API.showMessage('Board state saved to memory.', 'success');
  // TODO: Update UI for Load State button (e.g., enable it, show number of states)
};

const applyLoadedMemoryState = (stateObject) => {
  if (!stateObject) {
    api.VTT_API.showMessage('Invalid state object provided.', 'error');
    return;
  }

  api.VTT_API.clearAllObjects();

  stateObject.objects.forEach(obj => {
    model.currentObjects.set(obj.id, obj); // Direct manipulation, ensure this is desired or use API if exists
    if (obj.appearance && obj.appearance.imageUrl) {
      canvas.loadImage(obj.appearance.imageUrl, obj.appearance.imageUrl, requestRedraw);
    }
  });

  // Use VTT_API setters for canvas states
  if (stateObject.background) api.VTT_API.setTableBackground(stateObject.background); // Use VTT_API
  if (stateObject.viewState) api.VTT_API.setPanZoomState(stateObject.viewState); // Use VTT_API
  if (stateObject.boardProperties) {
    api.VTT_API.setBoardProperties(stateObject.boardProperties); // Use VTT_API
    // Also update the UI display for board settings if they are visible
    ui.updateBoardSettingsDisplay(stateObject.boardProperties);
  }

  requestRedraw();
  api.VTT_API.showMessage(`Board state loaded: ${stateObject.name}`, 'success');
};

export const handleLoadMemoryStateRequest = () => {
  if (inMemoryStates.length === 0) {
    api.VTT_API.showMessage('No states saved in memory.', 'info');
    return;
  }

  let modalContentHtml = '<p>Select a state to load:</p><div class="flex flex-col space-y-2 mt-2">';
  inMemoryStates.forEach((state, index) => {
    // Using more Tailwind-like classes for buttons within the modal
    modalContentHtml += `<button class="w-full text-left p-2 bg-gray-600 hover:bg-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" data-state-index="${index}">
                           ${state.name || `State ${index + 1} - ${new Date(state.timestamp).toLocaleString()}`}
                         </button>`;
  });
  modalContentHtml += '</div>';

  const modalButtonsArray = [
    { text: 'Cancel', type: 'secondary' }
  ];

  ui.showModal('Load State from Memory', modalContentHtml, modalButtonsArray);

  // Add event listeners to the dynamically created buttons
  const modalContentElement = getModalContentElement(); // Get modal content div from ui.js
  if (modalContentElement) {
    const stateButtons = modalContentElement.querySelectorAll('[data-state-index]');
    stateButtons.forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.getAttribute('data-state-index'));
        if (inMemoryStates[index]) {
          applyLoadedMemoryState(inMemoryStates[index]);
          ui.hideModal(); // Explicitly hide modal
        } else {
          api.VTT_API.showMessage('Selected state not found.', 'error');
        }
      });
    });
  } else {
    console.error('[main.js] Modal content element not found. Cannot attach listeners for load state.');
    api.VTT_API.showMessage('Error setting up load state options.', 'error');
  }
};


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
    onSaveToFile: handleSaveTableState,
    onSaveMemoryState: handleSaveMemoryState, // Added for in-memory save
    onLoadMemoryStateRequest: handleLoadMemoryStateRequest, // Added for in-memory load
    onLoadFromFileInputChange: (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => handleLoadTableState(e.target.result);
        reader.onerror = (e) =>
          ui.showModal('File Read Error', 'Could not read file.');
        reader.readAsText(file);
      }
    },
    // onBackgroundImageFileSelected: handleBackgroundImageFileSelected, // Removed: ui.js handles directly
    // onObjectImageFileSelected: handleObjectImageFileSelected, // Removed: ui.js handles directly
    // onInspectorPropertyChange: (props) => { console.log("Inspector props changed (live):", props); } // For live updates
  };

  // ADD THIS LOG:
  // console.log('[main.js] uiCallbacks object before calling ui.initUIEventListeners:', uiCallbacks);

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
  const canvasEl = document.getElementById('vtt-canvas'); // Or get from canvas.getCanvasElement()
  let isDragging = false;
  let isPanning = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let lastPanX = 0;
  let lastPanY = 0;

  canvasEl.addEventListener('mousedown', (e) => {
    const currentPZSState = api.VTT_API.getPanZoomState(); // Use VTT_API
    const { x: mouseX, y: mouseY } = canvas.getMousePositionOnCanvas(
      e,
      currentPZSState
    );
    const clickedObjectId = canvas.getObjectAtPosition(
      mouseX,
      mouseY,
      model.currentObjects // This is for object data, not canvas state
    );

    if (clickedObjectId) {
      const { isMovable: objIsMovable, x: objX, y: objY, ...objDetails } = api.VTT_API.getObject(clickedObjectId);
      if (objIsMovable) {
        isDragging = true;
        dragOffsetX = mouseX - objX;
        dragOffsetY = mouseY - objY;
      }
      if (api.VTT_API.getSelectedObjectId() !== clickedObjectId) { // Use VTT_API
        api.VTT_API.setSelectedObjectId(clickedObjectId); // Use VTT_API
        ui.populateObjectInspector({ isMovable: objIsMovable, x: objX, y: objY, ...objDetails });
        // requestRedraw(); // modelChanged event will trigger this
      }
    } else {
      isPanning = true;
      lastPanX = e.clientX;
      lastPanY = e.clientY;
      if (api.VTT_API.getSelectedObjectId() !== null) { // Use VTT_API
        api.VTT_API.setSelectedObjectId(null); // Use VTT_API
        ui.populateObjectInspector(null);
        // requestRedraw(); // modelChanged event will trigger this
      }
    }
  });

  canvasEl.addEventListener('mousemove', (e) => {
    const currentPZS = api.VTT_API.getPanZoomState(); // Use VTT_API
    const { x: mouseX, y: mouseY } = canvas.getMousePositionOnCanvas(e, currentPZS);

    if (isDragging && api.VTT_API.getSelectedObjectId()) { // Use VTT_API
      const selectedObjId = api.VTT_API.getSelectedObjectId(); // Use VTT_API
      api.VTT_API.updateObject(selectedObjId, {
        x: mouseX - dragOffsetX,
        y: mouseY - dragOffsetY,
      });
      ui.populateObjectInspector(api.VTT_API.getObject(selectedObjId));
    } else if (isPanning) {
      const { panX, panY, zoom } = currentPZS;
      const dx = e.clientX - lastPanX;
      const dy = e.clientY - lastPanY;
      lastPanX = e.clientX;
      lastPanY = e.clientY;
      api.VTT_API.setPanZoomState({ // Use VTT_API
        panX: panX + dx,
        panY: panY + dy,
        zoom: zoom,
      });
      // requestRedraw(); // modelChanged event will trigger this
    }
  });

  canvasEl.addEventListener('mouseup', (e) => {
    const currentPZS = api.VTT_API.getPanZoomState(); // Use VTT_API
    const { x: mouseX, y: mouseY } = canvas.getMousePositionOnCanvas(e, currentPZS);
    const clickedObjectId = canvas.getObjectAtPosition(
      mouseX,
      mouseY,
      model.currentObjects
    );

    let objectWasActuallyClicked = false;
    if (clickedObjectId && !isDragging && !isPanning) {
      objectWasActuallyClicked = true;
    }

    if (objectWasActuallyClicked) {
      // Destructure object for script execution.
      // 'objId' (renamed from 'id') and 'scripts' are key.
      // '...objProps' gathers remaining properties, though not directly used in this script block.
      const { scripts, id: objId, ...objProps } = api.VTT_API.getObject(clickedObjectId);
      if (scripts && scripts.onClick) {
        console.log(`Executing onClick for ${objId}:`, scripts.onClick);
        try {
          // Execute the script string using 'new Function'.
          // This allows dynamic code execution but should be used with caution
          // due to potential security risks if scripts come from untrusted sources.
          // The script has access to 'VTT' (the VTT_API) and 'object' (a direct reference to the object in the store).
          const objectRefForScript = model.currentObjects.get(objId);
          new Function('VTT', 'object', scripts.onClick)(
            api.VTT_API,
            objectRefForScript
          );
          // After script execution, re-fetch and populate the inspector as the script might have changed the object.
          ui.populateObjectInspector(api.VTT_API.getObject(objId));
        } catch (scriptError) {
          console.error('Script execution error:', scriptError);
          ui.showModal(
            'Script Error',
            `Error in onClick script for object ${objId}:<br><pre>${scriptError.message}</pre>`
          );
        }
      }
    }

    // Always redraw on mouseup to finalize selection highlights or deselection.
    // This also covers cases where a drag finished or a pan finished.
    requestRedraw();

    isDragging = false;
    isPanning = false;
  });

  canvasEl.addEventListener('mouseleave', () => {
    // Stop dragging/panning if mouse leaves canvas
    if (isDragging || isPanning) {
      requestRedraw(); // Finalize any visual state
    }
    isDragging = false;
    isPanning = false;
  });

  canvasEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const { zoom, panX, panY } = api.VTT_API.getPanZoomState(); // Use VTT_API
    const { left, top } = canvasEl.getBoundingClientRect();

    const mouseXCanvas = e.clientX - left;
    const mouseYCanvas = e.clientY - top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.max(0.1, Math.min(zoom * zoomFactor, 10));

    // Calculate new pan position to keep the point under the mouse cursor fixed during zoom.
    // This is achieved by:
    // 1. Calculating the mouse position in world coordinates before zoom: (mouseXCanvas - panX) / zoom
    // 2. The new panX must satisfy: (mouseXCanvas - newPanX) / newZoom = (mouseXCanvas - panX) / zoom
    //    Solving for newPanX: newPanX = mouseXCanvas - (newZoom / zoom) * (mouseXCanvas - panX)
    //    Similarly for newPanY.
    const newPanX =
      mouseXCanvas - (newZoom / zoom) * (mouseXCanvas - panX);
    const newPanY =
      mouseYCanvas - (newZoom / zoom) * (mouseYCanvas - panY);

    api.VTT_API.setPanZoomState({ panX: newPanX, panY: newPanY, zoom: newZoom }); // Use VTT_API
    // requestRedraw is called by modelChanged event
  });

  // Custom event listener for API-triggered state changes (can remain for now)
  document.addEventListener('stateChangedForRedraw', requestRedraw);

  // Add new event listener for model changes
  document.addEventListener('modelChanged', (event) => {
    // console.log('modelChanged event received in main.js:', event.detail); // Optional: for debugging
    // Special handling for background image loading
    if (event.detail && event.detail.type === 'backgroundChanged') {
      const newBackground = event.detail.payload;
      if (newBackground.type === 'image' && newBackground.value) {
        canvas.loadImage(newBackground.value, newBackground.value, requestRedraw);
      }
    }
    requestRedraw();
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
