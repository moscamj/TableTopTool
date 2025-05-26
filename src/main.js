// src/main.js
import * as objects from './objects.js';
import * as canvas from './canvas.js';
import * as ui from './ui.js';
import * as api from './api.js'; // VTT Scripting API
// Firebase is imported for its stubbed functions in offline mode
import * as firebase from './firebase.js';

let currentSessionId = 'local-session'; // Can be updated on load
let localUserId = 'offline-user';

// --- Main Redraw Function ---
function requestRedraw() {
    canvas.drawVTT(
        objects.getAllLocalObjects(), // Expects an array
        canvas.getPanZoomState(),
        canvas.getTableBackground(),
        canvas.getSelectedObjectId()
    );
}

// --- Local Save/Load ---
function triggerDownload(filename, data) {
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
}

function handleSaveTableState() {
    const state = {
        sessionId: currentSessionId,
        savedAt: new Date().toISOString(),
        objects: objects.getAllLocalObjects(), // Already returns array of copies
        background: canvas.getTableBackground(),
        viewState: canvas.getPanZoomState(),
        appVersion: 'TableTopTool-MVP-Offline-v1' // Optional versioning
    };
    const filename = `session_${currentSessionId}_${new Date().toISOString().slice(0,10)}.ttt.json`;
    triggerDownload(filename, JSON.stringify(state, null, 2));
}

function handleLoadTableState(fileContent) {
    try {
        const loadedState = JSON.parse(fileContent);
        if (!loadedState || typeof loadedState !== 'object' || !Array.isArray(loadedState.objects)) {
            throw new Error("Invalid file format.");
        }

        objects.clearLocalObjects();
        // Important: Re-populate the objects.currentObjects map directly or use a dedicated function
        // Forcing objects back into the Map structure of objects.js
        loadedState.objects.forEach(obj => {
            // We assume objects in the file have valid IDs.
            // A more robust solution might involve objects.createGenericObject(obj.shape, obj)
            // if we want to re-validate or re-apply defaults, but this is direct restoration.
            objects.currentObjects.set(obj.id, obj); // Directly set into the map

            // --- BEGIN ADDITION ---
            // Trigger image loading for this object
            if (obj.appearance && obj.appearance.imageUrl) {
                // Ensure 'canvas' module is imported and 'requestRedraw' function is accessible in this scope
                canvas.loadImage(obj.appearance.imageUrl, obj.appearance.imageUrl, requestRedraw);
            }
            // --- END ADDITION ---
        });


        if (loadedState.background) canvas.setTableBackground(loadedState.background);
        if (loadedState.viewState) canvas.setPanZoomState(loadedState.viewState);
        if (loadedState.sessionId) currentSessionId = loadedState.sessionId;

        // ui.updateSessionIdDisplay(currentSessionId); // Already hidden, but if re-enabled
        ui.displayMessage(`Session '${currentSessionId}' loaded successfully.`, 'success');
        requestRedraw();

    } catch (error) {
        console.error("Error loading table state:", error);
        ui.showModal('Load Error', `Could not load file: ${error.message}`);
        ui.displayMessage("Failed to load table state.", "error");
    }
}


// --- Application Initialization ---
async function initializeApplication() {
    // Attempt to initialize Firebase (it will run in offline mode)
    // const { auth, db, appIdString } = firebase.initializeAppFirebase();
    // localUserId = await firebase.signInUserAnonymously(auth); // Stubbed
    // ui.updateUserIdDisplay(localUserId); // Element is hidden

    // Define UI Callbacks
    const uiCallbacks = {
        onCreateRectangle: () => {
            const newRect = objects.createGenericObject('rectangle', {x: 10, y: 10}); // Adjust default pos later
            canvas.setSelectedObjectId(newRect.id);
            ui.populateObjectInspector(objects.getLocalObject(newRect.id));
            requestRedraw();
        },
        onCreateCircle: () => {
            const newCircle = objects.createGenericObject('circle', {x: 10, y: 10});
            canvas.setSelectedObjectId(newCircle.id);
            ui.populateObjectInspector(objects.getLocalObject(newCircle.id));
            requestRedraw();
        },
        onSetBackground: () => {
            const bgValues = ui.getToolbarValues(); // { backgroundUrl, backgroundColor }
            if (bgValues.backgroundUrl) {
                canvas.setTableBackground({ type: 'image', value: bgValues.backgroundUrl });
            } else {
                canvas.setTableBackground({ type: 'color', value: bgValues.backgroundColor });
            }
            // requestRedraw is called by setTableBackground if needed
        },
        onApplyObjectChanges: () => {
            const selectedId = canvas.getSelectedObjectId();
            if (selectedId) {
                const updatedProps = ui.readObjectInspector();
                if (updatedProps) {
                    objects.updateLocalObject(selectedId, updatedProps);
                    requestRedraw(); // Redraw with changes
                    // Re-populate inspector to show sanitized/final data and reflect any model changes
                    ui.populateObjectInspector(objects.getLocalObject(selectedId));
                }
            }
        },
        onDeleteObject: () => {
            const selectedId = canvas.getSelectedObjectId();
            if (selectedId) {
                ui.showModal('Confirm Delete', `Are you sure you want to delete object ${selectedId}?`, [
                    { text: 'Cancel', type: 'secondary' },
                    { text: 'Delete', type: 'danger', onClickCallback: () => {
                        objects.deleteLocalObject(selectedId);
                        canvas.setSelectedObjectId(null);
                        ui.populateObjectInspector(null);
                        requestRedraw();
                        ui.displayMessage('Object deleted.', 'info');
                    }}
                ]);
            }
        },
        onSaveToFile: handleSaveTableState,
        onLoadFromFileInputChange: (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => handleLoadTableState(e.target.result);
                reader.onerror = (e) => ui.showModal('File Read Error', 'Could not read file.');
                reader.readAsText(file);
            }
        },
        // onInspectorPropertyChange: (props) => { console.log("Inspector props changed (live):", props); } // For live updates
    };

    ui.initUIEventListeners(uiCallbacks);
    // Pass requestRedraw to canvas module so it can trigger redraws internally (e.g., after image load)
    canvas.initCanvas(document.getElementById('vtt-canvas'), requestRedraw);


    // --- Canvas Event Listeners ---
    const canvasEl = document.getElementById('vtt-canvas'); // Or get from canvas.getCanvasElement()
    let isDragging = false;
    let isPanning = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let lastPanX = 0;
    let lastPanY = 0;

    canvasEl.addEventListener('mousedown', (e) => {
        const mousePos = canvas.getMousePositionOnCanvas(e, canvas.getPanZoomState());
        const clickedObjectId = canvas.getObjectAtPosition(mousePos.x, mousePos.y, objects.currentObjects); // objects.currentObjects is the Map

        if (clickedObjectId) {
            const obj = objects.getLocalObject(clickedObjectId); // Get a copy for inspection
            if (obj.isMovable) {
                isDragging = true;
                dragOffsetX = mousePos.x - obj.x;
                dragOffsetY = mousePos.y - obj.y;
            }
            if (canvas.getSelectedObjectId() !== clickedObjectId) {
                 canvas.setSelectedObjectId(clickedObjectId);
                 ui.populateObjectInspector(obj); // Populate with the copy
                 // No redraw here, will be handled by mouseup/click or drag
            }
        } else { // Clicked on empty space
            isPanning = true;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            if (canvas.getSelectedObjectId() !== null) { // Deselect if clicking empty space
                canvas.setSelectedObjectId(null);
                ui.populateObjectInspector(null);
                requestRedraw(); // Redraw to remove selection highlight immediately
            }
        }
    });

    canvasEl.addEventListener('mousemove', (e) => {
        const currentPZS = canvas.getPanZoomState();
        const mousePos = canvas.getMousePositionOnCanvas(e, currentPZS);

        if (isDragging && canvas.getSelectedObjectId()) {
            const selectedObjId = canvas.getSelectedObjectId(); // Get ID first
            // For dragging, we directly update the object in the store
            // and expect updateLocalObject to handle it correctly.
            objects.updateLocalObject(selectedObjId, {
                x: mousePos.x - dragOffsetX,
                y: mousePos.y - dragOffsetY,
            });
            requestRedraw();
            
        } else if (isPanning) {
            const dx = e.clientX - lastPanX;
            const dy = e.clientY - lastPanY;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            canvas.setPanZoomState({
                panX: currentPZS.panX + dx,
                panY: currentPZS.panY + dy,
                zoom: currentPZS.zoom // zoom doesn't change here
            });
            // requestRedraw is called by setPanZoomState
        }
    });

    canvasEl.addEventListener('mouseup', (e) => {
        const currentPZS = canvas.getPanZoomState(); // Get current PZS for accurate mouse position
        const mousePos = canvas.getMousePositionOnCanvas(e, currentPZS);
        const clickedObjectId = canvas.getObjectAtPosition(mousePos.x, mousePos.y, objects.currentObjects); // Use the Map

        let objectWasActuallyClicked = false;
        if (clickedObjectId && !isDragging && !isPanning) { // Condition for actual click (not drag release, not pan release)
             objectWasActuallyClicked = true;
        }


        if (objectWasActuallyClicked) {
             const obj = objects.getLocalObject(clickedObjectId); // Get a fresh copy
             if (obj && obj.scripts && obj.scripts.onClick) {
                console.log(`Executing onClick for ${obj.id}:`, obj.scripts.onClick);
                try {
                    // Pass a reference to the actual object from the store for modification by API
                    const objectRefForScript = objects.currentObjects.get(obj.id);
                    new Function('VTT', 'object', obj.scripts.onClick)(api.VTT_API, objectRefForScript);
                    
                    // After script, object might have changed, so refresh inspector & redraw
                    // Ensure getLocalObject is called again to get the modified state if script changed it
                    ui.populateObjectInspector(objects.getLocalObject(obj.id));
                } catch (scriptError) {
                    console.error('Script execution error:', scriptError);
                    ui.showModal('Script Error', `Error in onClick script for object ${obj.id}:<br><pre>${scriptError.message}</pre>`);
                }
            }
        }
        
        // Always redraw on mouseup to finalize selection highlights or deselection.
        // This also covers cases where a drag finished or a pan finished.
        requestRedraw();

        isDragging = false;
        isPanning = false;
    });

    canvasEl.addEventListener('mouseleave', () => { // Stop dragging/panning if mouse leaves canvas
        if (isDragging || isPanning) {
            requestRedraw(); // Finalize any visual state
        }
        isDragging = false;
        isPanning = false;
    });

    canvasEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        const currentPZS = canvas.getPanZoomState();
        const rect = canvasEl.getBoundingClientRect();
        // Mouse position relative to canvas element (CSS pixels)
        const mouseXCanvas = e.clientX - rect.left;
        const mouseYCanvas = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newZoom = Math.max(0.1, Math.min(currentPZS.zoom * zoomFactor, 10)); // Apply limits

        // Calculate new pan position to keep mouse position fixed relative to world
        // (mouseX_world) = (mouseX_screen - panX_old) / zoom_old
        // (mouseX_screen - panX_new) / zoom_new = (mouseX_screen - panX_old) / zoom_old
        // panX_new = mouseX_screen - (zoom_new / zoom_old) * (mouseX_screen - panX_old)
        const newPanX = mouseXCanvas - (newZoom / currentPZS.zoom) * (mouseXCanvas - currentPZS.panX);
        const newPanY = mouseYCanvas - (newZoom / currentPZS.zoom) * (mouseYCanvas - currentPZS.panY);

        canvas.setPanZoomState({ panX: newPanX, panY: newPanY, zoom: newZoom });
        // requestRedraw is called by setPanZoomState
    });

    // Custom event listener for API-triggered state changes
    document.addEventListener('stateChangedForRedraw', requestRedraw);

    // Initial draw
    requestRedraw();
    ui.displayMessage("Application initialized (Offline Mode).", "info");
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
    initializeApplication();
}
