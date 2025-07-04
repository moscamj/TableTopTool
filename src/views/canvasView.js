// src/views/canvasView.js
/**
 * @file Manages the rendering and user interactions on the HTML5 canvas.
 * It works closely with the CanvasViewModel to get data for rendering and
 * to delegate actions based on user input.
 */
import log from "loglevel";
import debug from "debug";
import CanvasViewModel from "../viewmodels/canvasViewModel.js"; // Added import
// VTT_API import removed as it's now passed in
// import * as model from "../model/model.js"; // Removed direct model import

const dCanvasView = debug("app:view:canvas");

/** @type {HTMLCanvasElement} The main canvas element. */
let canvas;
/** @type {CanvasRenderingContext2D} The 2D rendering context of the canvas. */
let ctx;
/** @type {CanvasViewModel} The ViewModel associated with this canvas view. */
let viewModel; // This will hold the CanvasViewModel instance
/** @type {object | null} Module-level storage for the VTT API interface. */
let moduleVttApi = null;

// Variables for canvas interaction states internal to the view
/** @type {boolean} True if an object is currently being dragged. */
let isDragging = false;
/** @type {boolean} True if the canvas is currently being panned. */
let isPanning = false;
/** @type {number} Offset between mouse X and object X during drag. */
let dragOffsetX = 0;
/** @type {number} Offset between mouse Y and object Y during drag. */
let dragOffsetY = 0;
/** @type {number} Last known mouse X client coordinate during panning. */
let lastPanX = 0;
/** @type {number} Last known mouse Y client coordinate during panning. */
let lastPanY = 0;

/**
 * Debounces a function, ensuring it's only called after a certain period of inactivity.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {Function} The debounced function.
 */
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

/**
 * Initializes the canvas view with the canvas DOM element, display message function, and VTT API.
 * Sets up the rendering context, initial canvas size, instantiates CanvasViewModel, and registers event listeners.
 * @param {HTMLCanvasElement} canvasElement - The HTML canvas element to draw on.
 * @param {function(text: string, type: string, duration?: number): void} displayMessageFn - Function to display messages.
 * @param {object} vttApi - The VTT API interface.
 */
export const initCanvas = (canvasElement, displayMessageFn, vttApi) => {
  moduleVttApi = vttApi; // Store vttApi in module-level variable
  dCanvasView(
    "initCanvas called with canvasElement: %o, displayMessageFn: %o, vttApi: %o",
    canvasElement,
    displayMessageFn,
    vttApi,
  );
  if (!canvasElement) {
    log.error("[canvasView.js] Canvas element not provided!");
    dCanvasView("initCanvas error: Canvas element not provided.");
    return;
  }
  if (typeof displayMessageFn !== "function") {
    log.error(
      "[canvasView.js] displayMessageFn not provided or not a function!",
    );
    // Fallback or throw error, for now, log and continue carefully
    // Or assign a dummy function: displayMessageFn = () => {};
    dCanvasView(
      "initCanvas error: displayMessageFn not provided or not a function.",
    );
    // Depending on strictness, might want to return here
  }
  if (!vttApi) {
    log.error("[canvasView.js] VTT API not provided!");
    dCanvasView("initCanvas error: VTT API not provided.");
    return;
  }
  canvas = canvasElement;
  ctx = canvas.getContext("2d");

  // Instantiate CanvasViewModel
  viewModel = new CanvasViewModel(drawVTT, displayMessageFn, moduleVttApi);
  dCanvasView(
    "CanvasViewModel instantiated in initCanvas with moduleVttApi: %o",
    moduleVttApi,
  );

  // Model Changed Listener (moved from uiView.js)
  document.addEventListener("modelChanged", (event) => {
    dCanvasView(
      "modelChanged event received in canvasView.js: Type - %s, Payload - %o",
      event.detail.type,
      event.detail.payload,
    );
    if (event.detail && viewModel) {
      // Use local viewModel
      const { type, payload } = event.detail;
      dCanvasView(
        "Processing modelChanged event for viewModel in canvasView: Type - %s",
        type,
      );
      switch (type) {
        case "allObjectsCleared":
          viewModel.clearAllViewModelObjects();
          viewModel.setSelectedObjectInViewModel(null);
          dCanvasView(
            "ViewModel: allObjectsCleared and selection reset in canvasView",
          );
          break;
        case "selectionChanged":
          viewModel.setSelectedObjectInViewModel(payload);
          dCanvasView(
            "ViewModel: selectionChanged to %s in canvasView",
            payload,
          );
          break;
        case "objectAdded":
          viewModel.addObjectToViewModel(payload);
          dCanvasView("ViewModel: objectAdded in canvasView: %o", payload);
          break;
        case "objectUpdated":
          viewModel.updateObjectInViewModel(payload.id, payload);
          dCanvasView(
            "ViewModel: objectUpdated in canvasView: %s, %o",
            payload.id,
            payload,
          );
          break;
        case "objectDeleted":
          viewModel.removeObjectFromViewModel(payload.id);
          if (payload.id === moduleVttApi.getSelectedObjectId()) {
            // Use moduleVttApi
            viewModel.setSelectedObjectInViewModel(null);
            dCanvasView(
              "ViewModel: selected object %s was deleted, selection reset in canvasView",
              payload.id,
            );
          }
          dCanvasView("ViewModel: objectDeleted in canvasView: %s", payload.id);
          break;
        case "panZoomChanged":
          viewModel.setPanZoomInViewModel(payload);
          dCanvasView("ViewModel: panZoomChanged in canvasView: %o", payload);
          break;
        case "backgroundChanged":
          viewModel.setBackgroundInViewModel(payload);
          dCanvasView(
            "ViewModel: backgroundChanged in canvasView: %o",
            payload,
          );
          break;
        case "boardPropertiesChanged":
          viewModel.setBoardPropertiesInViewModel(payload);
          dCanvasView(
            "ViewModel: boardPropertiesChanged in canvasView: %o",
            payload,
          );
          break;
        default:
          dCanvasView(
            "Unhandled modelChanged event type in canvasView.js for viewModel: %s",
            type,
          );
      }
    } else if (!viewModel) {
      dCanvasView(
        "modelChanged event received in canvasView, but viewModel is not available.",
      );
    }
    drawVTT(); // Directly call drawVTT
  });
  dCanvasView(
    "modelChanged event listener for canvas added to document in canvasView",
  );

  // Deferred initialization for objects and initial state (moved from uiView.js)
  setTimeout(() => {
    if (!canvas) {
      // Check the module-level canvas variable
      log.error(
        "[canvasView.js] Canvas element not found for deferred initialization.",
      );
      dCanvasView("Canvas element not found in setTimeout.");
      // displayMessageFn is available from initCanvas parameters
      displayMessageFn(
        "Critical Error: Canvas element not found. Try reloading.",
        "error",
      );
      return;
    }
    dCanvasView(
      "Deferred: Creating default objects and loading initial state in canvasView.",
    );

    moduleVttApi.createObject("rectangle", {
      x: 50,
      y: 50,
      width: 100,
      height: 75,
      appearance: { backgroundColor: "#FFC0CB", text: "Rect 1" },
      name: "Test Rectangle 1",
    });

    moduleVttApi.createObject("circle", {
      x: 200,
      y: 100,
      width: 60,
      height: 60,
      appearance: { backgroundColor: "#ADD8E6", text: "Circ 1" },
      name: "Test Circle 1",
      rotation: 30,
    });

    if (viewModel) {
      dCanvasView(
        "Loading initial state into ViewModel (deferred in canvasView)",
      );
      const initialStateForCanvas = {
        objects: moduleVttApi.getAllObjects(),
        panZoomState: moduleVttApi.getPanZoomState(),
        tableBackground: moduleVttApi.getTableBackground(),
        selectedObjectId: moduleVttApi.getSelectedObjectId(),
        boardProperties: moduleVttApi.getBoardProperties(),
      };
      dCanvasView(
        "Initial state for ViewModel (deferred in canvasView): %o",
        initialStateForCanvas,
      );
      viewModel.loadStateIntoViewModel(initialStateForCanvas);
      dCanvasView(
        "Initial state loaded into ViewModel (deferred in canvasView)",
      );
    }

    drawVTT(); // Directly call drawVTT
    dCanvasView("Initial redraw requested (deferred in canvasView)");
  }, 0);
  dCanvasView(
    "Deferred object creation and initial state loading setup in canvasView.",
  );

  requestAnimationFrame(() => {
    // Further defer to allow more time for CSS application, especially with Tailwind JIT
    setTimeout(() => setCanvasSize(), 0);
  });
  window.addEventListener("resize", debounce(setCanvasSize, 250));

  // Register event listeners
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseLeave);
  canvas.addEventListener("wheel", handleWheel);

  log.info("canvasView.js initialized with CanvasViewModel");
  dCanvasView("Canvas event listeners registered. Initialization complete.");
};

/**
 * Sets the canvas dimensions based on its parent container's size and device pixel ratio.
 * Adjusts canvas style for proper display and scales the context for DPR.
 * Triggers a redraw via the ViewModel's onDrawNeededCallback.
 */
export const setCanvasSize = () => {
  dCanvasView("setCanvasSize called");
  if (!canvas || !canvas.parentElement) {
    dCanvasView(
      "setCanvasSize: Canvas or parentElement not available. Canvas: %o, Parent: %o",
      canvas,
      canvas?.parentElement,
    );
    return;
  }
  const { clientWidth, clientHeight } = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  dCanvasView(
    "Parent dimensions: %dx%d, DPR: %f",
    clientWidth,
    clientHeight,
    dpr,
  );

  if (
    canvas.width !== clientWidth * dpr ||
    canvas.height !== clientHeight * dpr
  ) {
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
    canvas.style.width = `${clientWidth}px`;
    canvas.style.height = `${clientHeight}px`;
    ctx.scale(dpr, dpr);
    log.info(
      // Keep this as log.info for general info
      `Canvas resized to ${clientWidth}x${clientHeight} (physical: ${canvas.width}x${canvas.height})`,
    );
    dCanvasView(
      "Canvas element resized and context scaled. New physical size: %dx%d",
      canvas.width,
      canvas.height,
    );
    if (viewModel && viewModel.setCanvasElementDimensions) {
      viewModel.setCanvasElementDimensions(canvas.width, canvas.height, dpr);
    }
  }
  if (viewModel && viewModel.onDrawNeededCallback) {
    dCanvasView("Requesting redraw via onDrawNeededCallback after resize.");
    viewModel.onDrawNeededCallback();
  } else {
    log.warn(
      "[canvasView.js] ViewModel or onDrawNeededCallback not available for setCanvasSize redraw.",
    );
    dCanvasView(
      "setCanvasSize warning: ViewModel or onDrawNeededCallback not available for redraw.",
    );
  }
};

// --- Drawing Logic ---
/**
 * Main rendering function for the VTT canvas.
 * Clears the canvas and redraws everything based on the current state from the ViewModel.
 * This includes the background, board boundary, all objects, and selection highlights.
 * Data is sourced entirely from the associated CanvasViewModel.
 */
export const drawVTT = () => {
  if (!ctx || !canvas || !viewModel) {
    // dCanvasView('drawVTT aborted: context, canvas, or viewModel not available. Ctx: %o, Canvas: %o, VM: %o', ctx, canvas, viewModel);
    return;
  }

  // Get current Device Pixel Ratio for scaling
  const dpr = window.devicePixelRatio || 1;
  // dCanvasView('DPR: %f', dpr);
  const { panX, panY, zoom } = viewModel.getPanZoom();
  // dCanvasView('Pan/Zoom state: panX=%f, panY=%f, zoom=%f', panX, panY, zoom);
  const { type: bgType, value: bgValue } = viewModel.getBackground() || {};
  // dCanvasView('Background state: type=%s, value=%s', bgType, bgValue);
  const { widthPx: currentBoardWidthPx, heightPx: currentBoardHeightPx } =
    viewModel.getBoardProperties() || { widthPx: 0, heightPx: 0 };
  // dCanvasView('Board properties: widthPx=%f, heightPx=%f', currentBoardWidthPx, currentBoardHeightPx);
  const viewModelObjects = viewModel.getObjects(); // Map of objects from ViewModel
  const viewModelSelectedObjectId = viewModel.getSelectedObjectId();
  // dCanvasView('Number of objects to draw: %d, Selected ObjectId: %s', viewModelObjects.size, viewModelSelectedObjectId);

  // 1. Clear canvas (everything outside the transformed area)
  ctx.save();
  ctx.fillStyle = "#333740"; // Background color for areas outside the board
  ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr); // Clear with canvas physical pixels

  // 2. Apply pan and zoom transformations
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // 3. Draw Board Background (color or image)
  if (bgType === "color" && bgValue) {
    ctx.fillStyle = bgValue;
    ctx.fillRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);
  } else if (bgType === "image" && bgValue) {
    const bgImageEntry = viewModel.getLoadedImage(bgValue);
    if (bgImageEntry && bgImageEntry.status === "loaded" && bgImageEntry.img) {
      ctx.drawImage(
        bgImageEntry.img,
        0,
        0,
        currentBoardWidthPx,
        currentBoardHeightPx,
      );
    } else {
      // Draw placeholder and attempt to load image if not already loading/errored
      ctx.fillStyle =
        bgImageEntry && bgImageEntry.status === "error" ? "#A08080" : "#C0C0C0"; // Dark red for error, grey for loading
      ctx.fillRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);
      if (!bgImageEntry || bgImageEntry.status !== "loading") {
        viewModel.loadImage(bgValue, bgValue); // ViewModel handles redraw on load
      }
    }
  } else {
    // Default fallback background if no specific one is set
    ctx.fillStyle = "#888888";
    ctx.fillRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);
  }

  // 4. Draw Board Boundary
  ctx.strokeStyle = "#111111"; // Dark border for the board
  ctx.lineWidth = Math.max(0.5, 1 / zoom); // Ensure border is visible even when zoomed out
  ctx.strokeRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);

  // 5. Draw Objects
  // Sort objects by zIndex to ensure correct stacking order
  const sortedObjects = Array.from(viewModelObjects.values()).sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
  );

  sortedObjects.forEach((obj) => {
    const {
      x,
      y,
      width,
      height,
      rotation = 0,
      shape,
      id,
      appearance,
      name,
    } = obj;
    const {
      backgroundColor,
      borderColor,
      borderWidth = 0,
      imageUrl,
      text,
      textColor = "#000000",
      fontSize = 14,
      fontFamily = "Arial",
      showLabel = false,
    } = appearance || {};

    ctx.save();
    // Apply object-specific transformations (translation for position, rotation)
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180); // Convert degrees to radians for rotation
    ctx.translate(-width / 2, -height / 2); // Translate origin to object's top-left for drawing

    let baseFill = backgroundColor || "#DDDDDD"; // Default fill if none specified

    // Draw shape (rectangle or circle)
    if (shape === "rectangle") {
      ctx.fillStyle = baseFill;
      ctx.fillRect(0, 0, width, height);
      if (borderColor && borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth; // Use borderWidth from object's appearance
        ctx.strokeRect(0, 0, width, height);
      }
    } else if (shape === "circle") {
      // Will now be an ellipse
      const radiusX = width / 2;
      const radiusY = height / 2;
      ctx.fillStyle = baseFill;
      ctx.beginPath();
      // Ellipse is drawn from its center (width/2, height/2) in the object's local, rotated coordinate system
      ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.fill();
      if (borderColor && borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    // Draw object image if URL is provided
    if (imageUrl) {
      const imgEntry = viewModel.getLoadedImage(imageUrl);
      if (imgEntry && imgEntry.status === "loaded" && imgEntry.img) {
        ctx.drawImage(imgEntry.img, 0, 0, width, height);
      } else if (!imgEntry || imgEntry.status !== "loading") {
        viewModel.loadImage(imageUrl, imageUrl); // ViewModel handles redraw on load
      }
      // Optionally, draw an error indicator if image failed to load
      if (imgEntry && imgEntry.status === "error") {
        ctx.strokeStyle = "red";
        ctx.lineWidth = Math.max(1, Math.min(4, 2 / zoom)); // Make error line visible
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);
        ctx.stroke();
      }
    }

    // Draw text label if showLabel is true and text exists
    if (showLabel === true && typeof text === "string" && text.trim() !== "") {
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, width / 2, height / 2); // Center text in the object
    }

    // Draw object name above the object
    if (name && typeof name === "string" && name.trim() !== "") {
      const nameFontSize = 12 / zoom; // Adjust font size based on zoom for better readability
      ctx.font = `${Math.max(6, nameFontSize)}px Arial`; // Minimum font size 6px
      ctx.fillStyle = "#000000"; // Default name color
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const nameTopMargin = 5 / zoom; // Adjust margin based on zoom
      ctx.fillText(name, width / 2, -nameTopMargin);
    }

    // Draw selection highlight if object is selected
    if (id === viewModelSelectedObjectId) {
      ctx.strokeStyle = "rgba(0, 150, 255, 0.9)";
      ctx.lineWidth = Math.max(0.5, Math.min(4, 2 / zoom));
      const offset =
        ((appearance && appearance.borderWidth) || 0) / 2 + ctx.lineWidth / 2;

      // No special handling for 'circle' shape's highlight dimensions needed here anymore,
      // as the highlight should just use the object's actual width and height.
      // The `highlightWidth` and `highlightHeight` variables can be removed if only used for this.
      ctx.strokeRect(-offset, -offset, width + 2 * offset, height + 2 * offset);
    }
    ctx.restore(); // Restore context state for next object
  });
  ctx.restore(); // Restore context state from initial save (pan/zoom, clearRect)
};

// --- Canvas Event Handlers ---
// These use the viewModel for coordinate conversion and object picking.
// State changes are communicated via VTT_API.
// Local updates to viewModel can happen for responsiveness if desired.

/**
 * Handles the mousedown event on the canvas.
 * Determines if an object is clicked for dragging/selection, or if panning should start.
 * Delegates state changes to VTT_API and local interaction state to module variables.
 * @param {MouseEvent} e - The mousedown event.
 */
function handleMouseDown(e) {
  dCanvasView("handleMouseDown event: %o", e);
  if (!viewModel) {
    dCanvasView("handleMouseDown aborted: viewModel not available.");
    return;
  }
  // Get mouse coordinates in world space from ViewModel
  const { x: mouseX, y: mouseY } = viewModel.convertScreenToWorldCoordinates(
    e.offsetX,
    e.offsetY,
  );
  dCanvasView("Mouse down at world coordinates: x=%f, y=%f", mouseX, mouseY);
  const clickedObjectId = viewModel.getObjectAtPosition(mouseX, mouseY);
  dCanvasView("Object at position: %s", clickedObjectId);
  const currentSelectedId = viewModel.getSelectedObjectId(); // Get from VM
  dCanvasView("Current selected ID: %s", currentSelectedId);

  if (clickedObjectId) {
    const objectDetails = viewModel.getObjects().get(clickedObjectId); // Get from VM's objects
    dCanvasView("Clicked object details: %o", objectDetails);
    if (objectDetails && objectDetails.isMovable) {
      isDragging = true;
      dragOffsetX = mouseX - objectDetails.x;
      dragOffsetY = mouseY - objectDetails.y;
      dCanvasView(
        "Dragging started for object %s. OffsetX: %f, OffsetY: %f",
        clickedObjectId,
        dragOffsetX,
        dragOffsetY,
      );
    }
    if (currentSelectedId !== clickedObjectId) {
      dCanvasView(
        "Selection changed from %s to %s. Calling VTT_API.setSelectedObjectId.",
        currentSelectedId,
        clickedObjectId,
      );
      // viewModel.setSelectedObjectInViewModel(clickedObjectId); // VM updated by modelChanged event
      moduleVttApi.setSelectedObjectId(clickedObjectId);
    }
  } else {
    isPanning = true;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    dCanvasView(
      "Panning started. LastPanX: %f, LastPanY: %f",
      lastPanX,
      lastPanY,
    );
    if (currentSelectedId !== null) {
      dCanvasView(
        "Deselecting object %s due to pan start. Calling VTT_API.setSelectedObjectId(null).",
        currentSelectedId,
      );
      // viewModel.setSelectedObjectInViewModel(null); // VM updated by modelChanged event
      moduleVttApi.setSelectedObjectId(null);
    }
  }
  // Redraw might be triggered by modelChanged event from VTT_API calls
  // If immediate visual feedback for selection/deselection before model events is needed, call:
  // viewModel.onDrawNeededCallback(); // Though VTT_API.setSelectedObjectId should trigger a quick redraw.
}

/**
 * Handles the mousemove event on the canvas.
 * Updates object position during drag or updates pan state during pan.
 * Uses CanvasViewModel for local/optimistic updates and triggers redraws.
 * @param {MouseEvent} e - The mousemove event.
 */
function handleMouseMove(e) {
  // dCanvasView('handleMouseMove event: %o', e); // Can be very noisy
  if (!viewModel) {
    // dCanvasView('handleMouseMove aborted: viewModel not available.');
    return;
  }
  const { x: mouseX, y: mouseY } = viewModel.convertScreenToWorldCoordinates(
    e.offsetX,
    e.offsetY,
  ); // World coordinates
  const selectedObjectId = viewModel.getSelectedObjectId();

  if (isDragging && selectedObjectId) {
    const newX = mouseX - dragOffsetX;
    const newY = mouseY - dragOffsetY;
    dCanvasView(
      "Dragging object %s to worldX: %f, worldY: %f",
      selectedObjectId,
      newX,
      newY,
    );
    // Optimistically update object position in ViewModel for smooth dragging
    viewModel.locallyUpdateObjectPosition(selectedObjectId, newX, newY);
    // viewModel.onDrawNeededCallback(); // locallyUpdateObjectPosition now calls this
  } else if (isPanning) {
    const dx = e.clientX - lastPanX; // Pan based on screen coordinate delta
    const dy = e.clientY - lastPanY;
    // dCanvasView('Panning. DeltaX: %f, DeltaY: %f', dx, dy);

    const currentPanZoom = viewModel.getPanZoom();
    // Optimistically update pan state in ViewModel
    viewModel.locallyUpdatePanZoom(
      currentPanZoom.panX + dx,
      currentPanZoom.panY + dy,
    );

    lastPanX = e.clientX;
    lastPanY = e.clientY;
  }
}

/**
 * Handles the mouseup event on the canvas.
 * Finalizes dragging or panning operations by sending updated state to VTT_API.
 * Executes onClick scripts if an object was clicked without dragging.
 * @param {MouseEvent} e - The mouseup event.
 */
function handleMouseUp(e) {
  dCanvasView("handleMouseUp event: %o", e);
  if (!viewModel) {
    dCanvasView("handleMouseUp aborted: viewModel not available.");
    return;
  }
  const wasDragging = isDragging;
  const wasPanning = isPanning;
  dCanvasView(
    "Mouse up. Was dragging: %s, Was panning: %s",
    wasDragging,
    wasPanning,
  );
  const selectedObjectId = viewModel.getSelectedObjectId();

  if (isDragging && selectedObjectId) {
    const draggedObject = viewModel.getObjects().get(selectedObjectId);
    if (draggedObject) {
      dCanvasView(
        "Dragging finished for object %s. Final position x:%f, y:%f. Persisting to API.",
        selectedObjectId,
        draggedObject.x,
        draggedObject.y,
      );
      // Persist final dragged position to the model via API
      moduleVttApi.updateObject(selectedObjectId, {
        x: draggedObject.x,
        y: draggedObject.y,
      });
    }
  }

  if (isPanning) {
    dCanvasView(
      "Panning finished. Persisting pan/zoom state to API: %o",
      viewModel.getPanZoom(),
    );
    // Persist final pan state to the model via API
    moduleVttApi.setPanZoomState(viewModel.getPanZoom());
  }

  isDragging = false;
  isPanning = false;
  dCanvasView("isDragging and isPanning flags reset.");

  // Handle click for script execution if not dragging or panning
  if (!wasDragging && !wasPanning) {
    const { x: mouseX, y: mouseY } = viewModel.convertScreenToWorldCoordinates(
      e.offsetX,
      e.offsetY,
    );
    const clickedObjectId = viewModel.getObjectAtPosition(mouseX, mouseY);
    dCanvasView(
      "Click detected (not drag/pan). Object at click: %s",
      clickedObjectId,
    );

    if (clickedObjectId) {
      const objectDetailsFromModel = moduleVttApi.getObject(clickedObjectId);
      if (
        objectDetailsFromModel &&
        objectDetailsFromModel.scripts &&
        objectDetailsFromModel.scripts.onClick
      ) {
        log.info(
          `Executing onClick for ${objectDetailsFromModel.id}:`,
          objectDetailsFromModel.scripts.onClick,
        ); // Keep as log.info
        dCanvasView(
          "Found onClick script for object %s: %s",
          clickedObjectId,
          objectDetailsFromModel.scripts.onClick,
        );
        try {
          // const objectRefForScript = model.currentObjects.get(...); // This line should be removed or commented out.
          dCanvasView(
            "Executing script with VTT_API and API-provided object snapshot: %o",
            objectDetailsFromModel, // Log the object being passed
          );
          // Note: The 'object' passed to the script is a snapshot from the VTT API.
          // To persist changes, scripts should use VTT.updateObject(object.id, changedProps).
          // Direct modifications to the 'object' variable within the script will not be saved.
          new Function("VTT", "object", objectDetailsFromModel.scripts.onClick)(
            moduleVttApi,
            objectDetailsFromModel, // Pass the API-provided object copy
          );
          dCanvasView("onClick script executed for %s.", clickedObjectId);
        } catch (scriptError) {
          log.error("Script execution error:", scriptError); // Keep as log.error
          dCanvasView(
            "onClick script execution error for %s: %o",
            clickedObjectId,
            scriptError,
          );
          moduleVttApi.showMessage(
            `Script Error in onClick for object ${objectDetailsFromModel.id}: ${scriptError.message}`,
            "error",
          );
        }
      }
    }
  }
  // Model changes via VTT_API will trigger 'modelChanged' events, leading to redraws.
}

/**
 * Handles the mouseleave event on the canvas.
 * Finalizes any ongoing drag or pan operations by persisting state to VTT_API.
 * @param {MouseEvent} e - The mouseleave event.
 */
function handleMouseLeave(e) {
  dCanvasView("handleMouseLeave event: %o", e);
  if (!viewModel) {
    dCanvasView("handleMouseLeave aborted: viewModel not available.");
    return;
  }
  const selectedObjectId = viewModel.getSelectedObjectId();

  if (isDragging && selectedObjectId) {
    const object = viewModel.getObjects().get(selectedObjectId);
    if (object) {
      dCanvasView(
        "Mouse left canvas while dragging object %s. Persisting position x:%f, y:%f to API.",
        selectedObjectId,
        object.x,
        object.y,
      );
      // Persist final dragged position if mouse leaves canvas while dragging
      moduleVttApi.updateObject(selectedObjectId, {
        x: object.x,
        y: object.y,
      });
    }
  }
  if (isPanning) {
    dCanvasView(
      "Mouse left canvas while panning. Persisting pan/zoom state to API: %o",
      viewModel.getPanZoom(),
    );
    // Persist final pan state if mouse leaves canvas while panning
    moduleVttApi.setPanZoomState(viewModel.getPanZoom());
  }

  isDragging = false;
  isPanning = false;
  dCanvasView("isDragging and isPanning flags reset on mouse leave.");
  // Model changes will trigger redraws.
}

/**
 * Handles the wheel event (mouse scroll) on the canvas for zooming.
 * Calculates new zoom level and pan position to zoom towards the mouse cursor.
 * Updates ViewModel locally for responsiveness and then sends final state to VTT_API.
 * @param {WheelEvent} e - The wheel event.
 */
function handleWheel(e) {
  dCanvasView("handleWheel event: DeltaY - %f", e.deltaY);
  if (!viewModel || !canvas) {
    dCanvasView("handleWheel aborted: viewModel or canvas not available.");
    return;
  }
  e.preventDefault(); // Prevent page scrolling

  // Get mouse position relative to the canvas element (screen coordinates)
  const { left, top } = canvas.getBoundingClientRect();
  const mouseXCanvas = e.clientX - left; // Mouse X relative to canvas top-left
  const mouseYCanvas = e.clientY - top; // Mouse Y relative to canvas top-left
  dCanvasView(
    "Mouse position relative to canvas: x=%f, y=%f",
    mouseXCanvas,
    mouseYCanvas,
  );

  const currentPanZoom = viewModel.getPanZoom();
  const oldZoom = currentPanZoom.zoom;
  const newZoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1; // Zoom in or out
  const newZoom = Math.max(0.1, Math.min(oldZoom * newZoomFactor, 10)); // Clamp zoom
  dCanvasView(
    "Zoom calculation: oldZoom=%f, newZoomFactor=%f, newZoom=%f (clamped)",
    oldZoom,
    newZoomFactor,
    newZoom,
  );

  // Calculate new pan position to zoom towards the mouse cursor
  // (mouseXCanvas - currentPanZoom.panX) / oldZoom = worldX
  // newPanX = mouseXCanvas - worldX * newZoom
  const newPanX =
    mouseXCanvas - (mouseXCanvas - currentPanZoom.panX) * (newZoom / oldZoom);
  const newPanY =
    mouseYCanvas - (mouseYCanvas - currentPanZoom.panY) * (newZoom / oldZoom);
  dCanvasView("New pan calculation: newPanX=%f, newPanY=%f", newPanX, newPanY);

  // Local update for responsiveness
  dCanvasView("Locally updating pan/zoom and requesting redraw.");
  viewModel.locallyUpdatePanZoom(newPanX, newPanY, newZoom);

  // Then, synchronize with the main model
  dCanvasView(
    "Persisting new pan/zoom state to API: %o",
    viewModel.getPanZoom(),
  );
  moduleVttApi.setPanZoomState(viewModel.getPanZoom()); // Send the locally updated panZoom
}

// Functions that were moved to CanvasViewModel:
// - loadStateIntoViewModel
// - addObjectToViewModel
// - updateObjectInViewModel
// - removeObjectFromViewModel
// - setPanZoomInViewModel
// - setBackgroundInViewModel
// - setSelectedObjectInViewModel
// - setBoardPropertiesInViewModel
// - clearAllViewModelObjects
// - loadImage (now part of CanvasViewModel)
// - getMousePositionOnCanvas (now part of CanvasViewModel)
// - getObjectAtPosition (now part of CanvasViewModel)

// Make sure all exports are still valid or updated as needed.
// initCanvas and drawVTT are the primary exports for this view module.
// No longer exporting ViewModel update functions from here.
// export { drawVTT, setCanvasSize }; // All functions are exported inline
