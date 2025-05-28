// src/main.js
import * as objects from './objects.js';
import * as canvas from './canvas.js';
import * as ui from './ui.js';
import { setBackgroundUrlInputText, setObjectImageUrlText } from './ui.js'; // Import the new functions
import * as api from './api.js'; // VTT Scripting API
// Firebase is imported for its stubbed functions in offline mode
import * as firebase from './firebase.js';

let currentSessionId = 'local-session'; // Can be updated on load
let localUserId = 'offline-user';

// --- Main Redraw Function ---
const requestRedraw = () => {
  canvas.drawVTT(
    api.VTT_API.getAllObjects(), // Expects an array
    canvas.getPanZoomState(),
    canvas.getTableBackground(),
    canvas.getSelectedObjectId()
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
    background: canvas.getTableBackground(),
    viewState: canvas.getPanZoomState(),
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
      objects.currentObjects.set(obj.id, obj);
      if (obj.appearance && obj.appearance.imageUrl) {
        canvas.loadImage(
          obj.appearance.imageUrl,
          obj.appearance.imageUrl,
          requestRedraw // Request a redraw once the image is loaded/failed
        );
      }
    });

    if (loadedBackground) canvas.setTableBackground(loadedBackground);
    if (loadedViewState) canvas.setPanZoomState(loadedViewState);
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
    const currentPZSState = canvas.getPanZoomState(); // Get PZS once for this event
    const { x: mouseX, y: mouseY } = canvas.getMousePositionOnCanvas(
      e,
      currentPZSState
    );
    const clickedObjectId = canvas.getObjectAtPosition(
      mouseX,
      mouseY,
      objects.currentObjects
    );

    if (clickedObjectId) {
      // Destructure object properties.
      // 'objIsMovable', 'objX', 'objY' are used for drag logic.
      // '...objDetails' captures all other properties to pass to the inspector.
      const { isMovable: objIsMovable, x: objX, y: objY, ...objDetails } = api.VTT_API.getObject(clickedObjectId);
      if (objIsMovable) {
        isDragging = true;
        dragOffsetX = mouseX - objX; // Calculate offset from mouse to object's top-left
        dragOffsetY = mouseY - objY;
      }
      if (canvas.getSelectedObjectId() !== clickedObjectId) {
        canvas.setSelectedObjectId(clickedObjectId);
        // Populate inspector with all object details, including those captured by '...objDetails'.
        ui.populateObjectInspector({ isMovable: objIsMovable, x: objX, y: objY, ...objDetails });
        // No redraw here; selection change will be visually updated on mouseup or drag.
      }
    } else {
      // Clicked on empty space
      isPanning = true;
      lastPanX = e.clientX;
      lastPanY = e.clientY;
      if (canvas.getSelectedObjectId() !== null) {
        // Deselect if clicking empty space
        canvas.setSelectedObjectId(null);
        ui.populateObjectInspector(null);
        requestRedraw(); // Redraw to remove selection highlight immediately
      }
    }
  });

  canvasEl.addEventListener('mousemove', (e) => {
    const currentPZS = canvas.getPanZoomState(); // Get PZS for this event
    const { x: mouseX, y: mouseY } = canvas.getMousePositionOnCanvas(e, currentPZS);

    if (isDragging && canvas.getSelectedObjectId()) {
      const selectedObjId = canvas.getSelectedObjectId();
      api.VTT_API.updateObject(selectedObjId, {
        x: mouseX - dragOffsetX,
        y: mouseY - dragOffsetY,
      });
      // requestRedraw(); // Redundant: updateObject triggers stateChangedForRedraw
      // Add this line:
      ui.populateObjectInspector(api.VTT_API.getObject(selectedObjId));
    } else if (isPanning) {
      const { panX, panY, zoom } = currentPZS; // Destructure PZS for panning
      const dx = e.clientX - lastPanX;
      const dy = e.clientY - lastPanY;
      lastPanX = e.clientX;
      lastPanY = e.clientY;
      canvas.setPanZoomState({
        panX: panX + dx,
        panY: panY + dy,
        zoom: zoom, // zoom doesn't change here
      });
      // requestRedraw is called by setPanZoomState
    }
  });

  canvasEl.addEventListener('mouseup', (e) => {
    const currentPZS = canvas.getPanZoomState();
    const { x: mouseX, y: mouseY } = canvas.getMousePositionOnCanvas(e, currentPZS);
    const clickedObjectId = canvas.getObjectAtPosition(
      mouseX,
      mouseY,
      objects.currentObjects
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
          const objectRefForScript = objects.currentObjects.get(objId);
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
    const { zoom, panX, panY } = canvas.getPanZoomState(); // Destructure PZS
    const { left, top } = canvasEl.getBoundingClientRect(); // Destructure rect

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

    canvas.setPanZoomState({ panX: newPanX, panY: newPanY, zoom: newZoom });
    // requestRedraw is called by setPanZoomState if changes occur
  });

  // Custom event listener for API-triggered state changes
  document.addEventListener('stateChangedForRedraw', requestRedraw);

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
