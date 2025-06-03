// src/canvas.js
import { VTT_API } from './api.js';
import * as model from './model.js'; // For getObjectAtPosition

// MM_PER_UNIT, panZoomState, tableBackground, selectedObjectId, boardPhysical, mapInterpretationScale moved to model.js

let canvas;
let ctx;

// --- Canvas ViewModel ---
// These variables will store the canvas's local copy of the state needed for rendering.
// They will be populated by data received from main.js (originating from model.js via VTT_API).
let viewModelObjects = new Map();
let viewModelPanZoom = { panX: 0, panY: 0, zoom: 1.0 };
let viewModelTableBackground = { type: 'color', value: '#cccccc' }; // Default background
let viewModelSelectedObjectId = null;
let viewModelBoardProperties = { 
    widthUser: 36, heightUser: 24, unitForDimensions: 'in', // User-facing dimensions
    widthPx: 1000, heightPx: 800, // Pixel dimensions for rendering (example defaults)
    scaleRatio: 1, unitForRatio: 'mm' // Scale interpretation
};

// Variables for canvas interaction states
let isDragging = false;
let isPanning = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastPanX = 0;
let lastPanY = 0;

// Cache for loaded images (for object appearances and table background)
const loadedImages = new Map(); // url -> { img: Image, status: 'loading' | 'loaded' | 'error' }

let onDrawNeededCallback = () => {}; // Callback to request a redraw from main.js
let displayMessageFn = () => {}; // Callback for displaying messages via UI

// Debounce function
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    // Note: 'this' context might behave differently with arrow functions here
    // depending on how debounce is called. If it's always method-style,
    // it might be okay, or might need explicit binding if func expects a specific 'this'.
    // For now, assuming current usage doesn't rely on 'this' from the caller of the debounced function.
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay); // Simplified apply
  };
};

export const initCanvas = (canvasElement, drawNeededCallback, displayMessageCallback) => {
  if (!canvasElement) {
    console.error('Canvas element not provided!');
    return;
  }
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  onDrawNeededCallback =
    drawNeededCallback || (() => console.warn('onDrawNeededCallback not set'));
  displayMessageFn = displayMessageCallback || ((msg, type) => console.warn('displayMessage not set:', msg, type));

  setCanvasSize(); // Set initial size
  window.addEventListener('resize', debounce(setCanvasSize, 250));

  // Register event listeners
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('wheel', handleWheel);

  console.log('Canvas initialized');
};

// --- ViewModel Population ---
export const loadStateIntoViewModel = (initialState) => {
  if (!initialState) {
    console.error('[canvas.js] loadStateIntoViewModel: initialState is undefined. Cannot populate ViewModel.');
    // Initialize ViewModel with default values or handle error appropriately
    viewModelObjects.clear();
    viewModelPanZoom = { panX: 0, panY: 0, zoom: 1.0 };
    viewModelTableBackground = { type: 'color', value: '#cccccc' };
    viewModelSelectedObjectId = null;
    viewModelBoardProperties = { 
        widthUser: 36, heightUser: 24, unitForDimensions: 'in',
        widthPx: 1000, heightPx: 800, 
        scaleRatio: 1, unitForRatio: 'mm' 
    };
    return;
  }

  viewModelObjects.clear();
  if (initialState.objects && Array.isArray(initialState.objects)) {
    initialState.objects.forEach(obj => viewModelObjects.set(obj.id, { ...obj }));
  } else if (initialState.objects && initialState.objects instanceof Map) { // Fallback if API changes
      initialState.objects.forEach((obj, id) => viewModelObjects.set(id, { ...obj }));
  }


  if (initialState.panZoomState) {
    viewModelPanZoom = { ...initialState.panZoomState };
  } else {
    viewModelPanZoom = { panX: 0, panY: 0, zoom: 1.0 }; // Default
  }

  if (initialState.tableBackground) {
    viewModelTableBackground = { ...initialState.tableBackground };
  } else {
    viewModelTableBackground = { type: 'color', value: '#cccccc' }; // Default
  }

  viewModelSelectedObjectId = initialState.selectedObjectId !== undefined ? initialState.selectedObjectId : null;

  if (initialState.boardProperties) {
    viewModelBoardProperties = { ...initialState.boardProperties };
  } else {
    viewModelBoardProperties = { // Default
        widthUser: 36, heightUser: 24, unitForDimensions: 'in',
        widthPx: 1000, heightPx: 800, 
        scaleRatio: 1, unitForRatio: 'mm' 
    };
  }
  
  // console.log('[canvas.js] ViewModel populated:', {
  //   objectsCount: viewModelObjects.size,
  //   panZoom: viewModelPanZoom,
  //   background: viewModelTableBackground,
  //   selectedId: viewModelSelectedObjectId,
  //   boardProps: viewModelBoardProperties
  // });
};

// --- ViewModel Update Functions ---
// These functions are called by main.js when modelChanged events occur.

export const addObjectToViewModel = (objectData) => {
  if (!objectData || !objectData.id) {
    console.error('[canvas.js] addObjectToViewModel: Invalid objectData provided.', objectData);
    return;
  }
  viewModelObjects.set(objectData.id, { ...objectData });
  if (objectData.appearance && objectData.appearance.imageUrl) {
    loadImage(objectData.appearance.imageUrl, objectData.appearance.imageUrl, onDrawNeededCallback);
  }
};

export const updateObjectInViewModel = (objectId, updatedProps) => {
  if (!viewModelObjects.has(objectId)) {
    console.warn(`[canvas.js] updateObjectInViewModel: Object ID ${objectId} not found in ViewModel.`);
    // Optionally, add it if it's a new object not caught by addObjectToViewModel for some reason
    // addObjectToViewModel({ id: objectId, ...updatedProps }); 
    return;
  }
  const obj = viewModelObjects.get(objectId);
  // Perform a deep merge for nested properties like appearance, data, scripts
  const newAppearance = { ...(obj.appearance || {}), ...(updatedProps.appearance || {}) };
  const newData = { ...(obj.data || {}), ...(updatedProps.data || {}) };
  const newScripts = { ...(obj.scripts || {}), ...(updatedProps.scripts || {}) };

  viewModelObjects.set(objectId, { 
    ...obj, 
    ...updatedProps,
    appearance: newAppearance,
    data: newData,
    scripts: newScripts
  });

  if (updatedProps.appearance && updatedProps.appearance.imageUrl) {
    loadImage(updatedProps.appearance.imageUrl, updatedProps.appearance.imageUrl, onDrawNeededCallback);
  } else if (updatedProps.appearance && updatedProps.appearance.imageUrl === '') { // Image removed
    // If loadImage handles null/empty string for removal from cache, this is fine.
    // Otherwise, specific logic might be needed here if images are cached under old URLs.
    // For now, assuming loadImage(null, ...) or loadImage('',...) handles removal or cache correctly.
    loadImage(null, obj.appearance?.imageUrl, onDrawNeededCallback); // Attempt to clear old image if necessary
  }
};

export const removeObjectFromViewModel = (objectId) => {
  if (!viewModelObjects.has(objectId)) {
    console.warn(`[canvas.js] removeObjectFromViewModel: Object ID ${objectId} not found in ViewModel.`);
    return;
  }
  // Potentially handle image cache cleanup if the object had an image, though
  // `loadedImages` is a general cache not strictly tied to objects in viewModel.
  // If an image URL is unique to this object and no longer needed, it could be cleaned up.
  // However, this is complex if images are shared. For now, leave cache as is.
  viewModelObjects.delete(objectId);
};

export const setPanZoomInViewModel = (panZoomState) => {
  if (!panZoomState) {
    console.error('[canvas.js] setPanZoomInViewModel: panZoomState is undefined.');
    return;
  }
  viewModelPanZoom = { ...panZoomState };
};

export const setBackgroundInViewModel = (backgroundState) => {
  if (!backgroundState) {
    console.error('[canvas.js] setBackgroundInViewModel: backgroundState is undefined.');
    return;
  }
  viewModelTableBackground = { ...backgroundState };
  if (backgroundState.type === 'image' && backgroundState.value) {
    loadImage(backgroundState.value, backgroundState.value, onDrawNeededCallback);
  }
};

export const setSelectedObjectInViewModel = (selectedId) => {
  // selectedId can be null
  viewModelSelectedObjectId = selectedId;
};

export const setBoardPropertiesInViewModel = (boardProps) => {
  if (!boardProps) {
    console.error('[canvas.js] setBoardPropertiesInViewModel: boardProps is undefined.');
    return;
  }
  viewModelBoardProperties = { ...boardProps };
};

export const clearAllViewModelObjects = () => {
  viewModelObjects.clear();
  // viewModelSelectedObjectId = null; // This will be handled by a 'selectionChanged' event if selection is cleared in model
  console.log('[canvas.js] All viewModel objects cleared.');
};


export const setCanvasSize = () => {
  if (!canvas || !canvas.parentElement) return;
  const { clientWidth, clientHeight } = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1; // Device Pixel Ratio for HiDPI displays

  if (
    canvas.width !== clientWidth * dpr ||
    canvas.height !== clientHeight * dpr
  ) {
    // Adjust canvas physical size for HiDPI
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
    // Scale canvas logical size back down using CSS
    canvas.style.width = `${clientWidth}px`;
    canvas.style.height = `${clientHeight}px`;
    // Scale canvas context to account for HiDPI, ensuring drawings are sharp
    ctx.scale(dpr, dpr);
    console.log(
      `Canvas resized to ${clientWidth}x${clientHeight} (physical: ${canvas.width}x${canvas.height})`
    );
  }
  onDrawNeededCallback();
};

// --- Image Loading ---
// Getters and Setters for panZoomState, tableBackground, selectedObjectId, boardPhysical, mapInterpretationScale
// have been moved to model.js. canvas.js will now rely on model.js for these states.
// The onDrawNeededCallback for setters is now handled by the modelChanged event listener in main.js.
// The loadImage call within setTableBackground is a special case; if model.setTableBackground
// changes the background to an image, main.js's modelChanged listener will need to call canvas.loadImage.
export const loadImage = (url, cacheKey, callback) => {
  if (!url) {
    if (loadedImages.has(cacheKey)) {
      // Image explicitly removed
      loadedImages.delete(cacheKey);
      if (callback) callback();
    }
    return;
  }
  const existingImage = loadedImages.get(cacheKey);
  if (existingImage && existingImage.status === 'loaded') {
    if (callback) callback(); // Already loaded
    return;
  }
  if (existingImage && existingImage.status === 'loading') {
    return; // Already loading
  }

  loadedImages.set(cacheKey, { img: null, status: 'loading' });
  const image = new Image();
  image.crossOrigin = 'Anonymous'; // For images from other domains if canvas is tainted
  image.onload = () => {
    loadedImages.set(cacheKey, { img: image, status: 'loaded' });
    // Unified log message
    console.log(`Successfully loaded image. Key: ${cacheKey}`);
    if (callback) callback();
  };
  image.onerror = (err) => { // Add err parameter to log it
    loadedImages.set(cacheKey, { img: null, status: 'error' });
    if (url.startsWith('data:image/')) {
      console.error(`loadImage: Error loading data URI. Key: ${cacheKey}`, err);
    } else {
      console.error(`Error loading image: ${url}`, err);
    }
    if (callback) callback(); // Still call callback to redraw, maybe show placeholder
    // Display error message using the new callback
    const errorMsg = `Failed to load image: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`;
    displayMessageFn(errorMsg, 'error');
  };
  // Comment out verbose pre-load log
  // if (url.startsWith('data:image/')) {
  //   console.log(`loadImage: Attempting to load data URI. Starts with: ${url.substring(0, 100)}...`);
  // }
  image.src = url;
};

// --- Drawing Logic ---
// Now uses internal viewModel variables instead of passed arguments
export const drawVTT = () => {
  if (!ctx || !canvas) return;

  const dpr = window.devicePixelRatio || 1;
  // Use viewModel variables
  const { panX, panY, zoom } = viewModelPanZoom;
  const { type: bgType, value: bgValue } = viewModelTableBackground || {};


  // Save the current canvas context state (transformations, styles, etc.)
  // This allows us to restore it later, isolating transformations to this draw call.
  ctx.save();

  // Clear entire canvas viewport with a neutral color (area outside the board)
  // const dpr = window.devicePixelRatio || 1; // dpr is already available in this function
  ctx.fillStyle = '#333740'; // A dark neutral color for off-board area
  ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr); // Use CSS pixel dimensions for full clear


  // Apply global pan and zoom transformations.
  // These transformations are affected by the Device Pixel Ratio (dpr) to ensure
  // panning and zooming feel consistent across different display densities.
  // All subsequent drawing operations will be affected by this transformed coordinate system.
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // (panX, panY, zoom are from viewModelPanZoom)
  // (bgType, bgValue are from viewModelTableBackground)
  // boardPhysical state is now in viewModelBoardProperties
  const { widthPx: currentBoardWidthPx, heightPx: currentBoardHeightPx } = viewModelBoardProperties || { widthPx: 0, heightPx: 0};

  // Draw the board's actual background (color or image)
  // This background covers currentBoardWidthPx by currentBoardHeightPx.
  if (bgType === 'color' && bgValue) {
      ctx.fillStyle = bgValue;
      ctx.fillRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);
  } else if (bgType === 'image' && bgValue) {
      const bgImageEntry = loadedImages.get(bgValue);
      if (bgImageEntry && bgImageEntry.status === 'loaded' && bgImageEntry.img) {
          ctx.drawImage(bgImageEntry.img, 0, 0, currentBoardWidthPx, currentBoardHeightPx);
      } else { // Loading or error for board background image
          ctx.fillStyle = (bgImageEntry && bgImageEntry.status === 'error') ? '#A08080' : '#C0C0C0'; // Error or Loading color
          ctx.fillRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);
          if (!bgImageEntry || bgImageEntry.status === 'loading') { // Check if undefined or still loading
              if(!loadedImages.has(bgValue) || loadedImages.get(bgValue).status !== 'loading') { // Avoid re-triggering load if already loading
                  loadImage(bgValue, bgValue, onDrawNeededCallback); // Start loading
              }
          }
      }
  } else { // Default board background if no specific one is set from currentTblBg
      ctx.fillStyle = '#888888'; // Default board color if nothing else is set
      ctx.fillRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);
  }

  // Draw a border for the board itself
  ctx.strokeStyle = '#111111'; // Dark border for the board
  ctx.lineWidth = Math.max(0.5, 1 / zoom); // Ensure border is visible but not too thick on zoom
  ctx.strokeRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);

  // 2. Draw Objects (sorted by zIndex)
  // Use viewModelObjects
  const sortedObjects = Array.from(viewModelObjects.values()).sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
  );

  sortedObjects.forEach((obj) => {
    // Destructure object properties for easier access.
    // Default 'rotation' to 0 if not specified.
    const {
      x,
      y,
      width,
      height,
      rotation = 0, // Default rotation to 0 if undefined
      shape,
      id,
      appearance, // Nested object, destructured further below
    } = obj;

    // Destructure appearance properties.
    // Use '|| {}' to provide a fallback empty object if 'appearance' is undefined,
    // preventing errors if trying to destructure 'undefined'.
    // Default values are provided for most appearance properties.
    const {
      backgroundColor, // Will be undefined if not set, handled by 'baseFill'
      borderColor,     // Will be undefined if not set
      borderWidth = 0, // Default border width to 0
      imageUrl,        // Will be undefined if not set
      text,            // Will be undefined if not set (this is obj.appearance.text)
      textColor = '#000000', // Default text color
      fontSize = 14,         // Default font size
      fontFamily = 'Arial',  // Default font family
      showLabel = false  // Default to false if not present
    } = appearance || {};

    // Save the current state of the canvas context before drawing this object.
    // This allows restoring the context after this object, so its transformations
    // and style changes don't affect subsequent objects.
    ctx.save();

    // Calculate the center of the object for rotation.
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Apply object-specific transformations:
    // 1. Translate to the object's center: makes rotation act around the center.
    // 2. Rotate the canvas: applies the object's rotation.
    // 3. Translate back from the object's center to its top-left corner:
    //    This ensures that drawing at (0,0) now correctly draws the object at its intended x,y,
    //    respecting its rotation around its own center.
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180); // Convert degrees to radians
    ctx.translate(-width / 2, -height / 2);

    let baseFill = backgroundColor || '#DDDDDD'; // Default fill if backgroundColor is not provided

    if (shape === 'rectangle') {
      ctx.fillStyle = baseFill;
      ctx.fillRect(0, 0, width, height);
      if (borderColor && borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(0, 0, width, height);
      }
    } else if (shape === 'circle') {
      const radius = width / 2;
      ctx.fillStyle = baseFill;
      ctx.beginPath();
      ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
      ctx.fill();
      if (borderColor && borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    if (imageUrl) {
      const imgEntry = loadedImages.get(imageUrl);
      if (imgEntry && imgEntry.status === 'loaded' && imgEntry.img) {
        ctx.drawImage(imgEntry.img, 0, 0, width, height);
      } else if (!imgEntry || imgEntry.status === 'loading') {
        if (!imgEntry)
          loadImage(imageUrl, imageUrl, onDrawNeededCallback);
      }
      // ---> ERROR DRAWING LOGIC USES EXISTING imgEntry <---
      // const imgEntry = loadedImages.get(imageUrl); // This line was removed
      if (imgEntry && imgEntry.status === 'error') {
          // Ensure base styles like fillStyle for text are set if not already
          ctx.strokeStyle = 'red';
          ctx.lineWidth = Math.max(1, Math.min(4, 2 / zoom)); // Adjust based on zoom, similar to selection highlight
          ctx.beginPath();
          // Draw X from top-left to bottom-right
          ctx.moveTo(0, 0); // Using 0,0 because we are in object's transformed space
          ctx.lineTo(width, height);
          // Draw X from top-right to bottom-left
          ctx.moveTo(width, 0);
          ctx.lineTo(0, height);
          ctx.stroke();
          // console.log(`Drew error X for object ${obj.id} with image ${imageUrl}`); // For debugging
      }
    }

    // Render internal object label (appearance.text)
    if (showLabel === true && typeof text === 'string' && text.trim() !== '') {
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);
    }

    // Draw object name (if any) - Placed before selection highlight
    if (obj.name && typeof obj.name === 'string' && obj.name.trim() !== '') {
      const nameFontSize = 12;
      ctx.font = `${nameFontSize}px Arial`;
      ctx.fillStyle = '#000000'; // Black color for the name
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom'; // To draw text above the point

      const nameTopMargin = 5; // Number of pixels above the object's bounding box

      // Draw the name centered above the object
      ctx.fillText(obj.name, width / 2, -nameTopMargin);
    }

    // Use viewModelSelectedObjectId
    if (id === viewModelSelectedObjectId) {
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)'; // Bright blue for selection
      // Adjust line width of selection highlight based on zoom, ensuring it's visible but not too thick/thin.
      // Max(0.5, ...) ensures a minimum line width even when zoomed out.
      // Min(4, ...) caps the line width when zoomed in.
      // '2 / zoom' makes the line thinner as you zoom in, thicker as you zoom out (world space thickness).
      ctx.lineWidth = Math.max(0.5, Math.min(4, 2 / zoom));
      const offset = borderWidth / 2 + ctx.lineWidth / 2; // Position highlight slightly outside the object's border
      ctx.strokeRect(
        -offset, // Adjust x for offset
        -offset,
        width + 2 * offset,
        height + 2 * offset
      );
    }

    ctx.restore(); // Restore context for next object
  });

  // Restore context state from initial save (removes pan/zoom/scale)
  ctx.restore();
};

// --- Coordinate Conversion & Object Picking ---
// Uses viewModelPanZoom internally now
export const getMousePositionOnCanvas = (event) => {
  if (!canvas) return { x: 0, y: 0 };

  // Use viewModelPanZoom for panX, panY, zoom
  const { panX, panY, zoom } = viewModelPanZoom;

  // Convert mouse click coordinates (relative to viewport) to canvas screen coordinates (CSS pixels)
  // Use event.offsetX and event.offsetY which are relative to the padding edge of the target element (canvas)
  const screenX = event.offsetX;
  const screenY = event.offsetY;

  // Convert canvas screen coordinates to world coordinates
  // 1. Subtract pan offset (panX, panY are in CSS pixels relative to canvas origin)
  // 2. Divide by zoom factor to get world space coordinates
  const worldX = (screenX - panX) / zoom;
  const worldY = (screenY - panY) / zoom;

  return { x: worldX, y: worldY };
};

// Uses viewModelObjects internally now
export const getObjectAtPosition = (worldX, worldY) => {
  // Ensure inputs are valid numbers
  if (typeof worldX !== 'number' || isNaN(worldX) || typeof worldY !== 'number' || isNaN(worldY)) {
    console.error('getObjectAtPosition: Invalid worldX or worldY input', { worldX, worldY });
    return null;
  }

  // Use viewModelObjects instead of passed objectsMap
  if (!(viewModelObjects instanceof Map)) {
    console.error('getObjectAtPosition: viewModelObjects is not a Map', viewModelObjects);
    return null;
  }

  const sortedObjects = Array.from(viewModelObjects.values()).sort(
    (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
  );

  for (const obj of sortedObjects) {
    if (!obj || typeof obj !== 'object') {
      console.warn('getObjectAtPosition: Encountered invalid object in sortedObjects', obj);
      continue; 
    }

    const { id, shape } = obj;
    const x = parseFloat(obj.x);
    const y = parseFloat(obj.y);
    const width = parseFloat(obj.width);
    const height = parseFloat(obj.height);
    let rotation = parseFloat(obj.rotation);

    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
      console.warn('getObjectAtPosition: Object with id', id, 'has invalid x,y,width,or height.', {x,y,width,height});
      continue; 
    }
    if (width <= 0 || height <= 0) {
        console.warn('getObjectAtPosition: Object with id', id, 'has non-positive width or height.', {width,height});
        continue;
    }
    if (isNaN(rotation)) {
        console.warn('getObjectAtPosition: Object with id', id, 'has NaN rotation. Defaulting to 0.', {rotation});
        rotation = 0; 
    }

    if (shape === 'rectangle') {
      if (rotation === 0) {
        // Simplified AABB check for non-rotated rectangles
        if (
          worldX >= x &&
          worldX <= x + width &&
          worldY >= y &&
          worldY <= y + height
        ) {
          console.log('getObjectAtPosition: Found non-rotated rectangle', id);
          return id;
        }
      } else {
        // Rotated Rectangle Logic
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        let localX = worldX - centerX;
        let localY = worldY - centerY;

        const rad = (-rotation * Math.PI) / 180;
        const cosTheta = Math.cos(rad);
        const sinTheta = Math.sin(rad);
        const rotatedLocalX = localX * cosTheta - localY * sinTheta;
        const rotatedLocalY = localX * sinTheta + localY * cosTheta;
        localX = rotatedLocalX;
        localY = rotatedLocalY;

        if (
          localX >= -width / 2 &&
          localX <= width / 2 &&
          localY >= -height / 2 &&
          localY <= height / 2
        ) {
          console.log('getObjectAtPosition: Found rotated rectangle', id);
          return id;
        }
      }
    } else if (shape === 'circle') {
      const radius = width / 2; 
      const circleCenterX = x + radius;
      const circleCenterY = y + radius;
      
      const distanceSq = (worldX - circleCenterX) ** 2 + (worldY - circleCenterY) ** 2;
      if (distanceSq <= radius ** 2) {
        console.log('getObjectAtPosition: Found circle', id);
        return id;
      }
    }
  }
  // console.log('getObjectAtPosition: No object found at', { worldX, worldY }); // Optional: for debugging misses
  return null;
};

// updateBoardProperties and getBoardProperties have been moved to model.js
// canvas.js will receive board properties via drawVTT arguments.

// --- Canvas Event Handlers ---
function handleMouseDown(e) {
    // Use local getMousePositionOnCanvas which now uses viewModelPanZoom
    const { x: mouseX, y: mouseY } = getMousePositionOnCanvas(e); 
    // Use local getObjectAtPosition which now uses viewModelObjects
    const clickedObjectId = getObjectAtPosition(mouseX, mouseY); 

    if (clickedObjectId) {
        const objectDetails = viewModelObjects.get(clickedObjectId); // Get from ViewModel
        if (objectDetails.isMovable) {
            isDragging = true;
            dragOffsetX = mouseX - objectDetails.x;
            dragOffsetY = mouseY - objectDetails.y;
        }
        if (viewModelSelectedObjectId !== clickedObjectId) {
            viewModelSelectedObjectId = clickedObjectId;
            VTT_API.setSelectedObjectId(clickedObjectId); // Propagate to main model
            // No direct onDrawNeededCallback here, selection highlight change will be part of next draw cycle
        }
    } else {
        isPanning = true;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        if (viewModelSelectedObjectId !== null) {
            viewModelSelectedObjectId = null;
            VTT_API.setSelectedObjectId(null); // Propagate to main model
        }
    }
    // Call onDrawNeededCallback if immediate feedback for selection/deselection is desired
    // without waiting for VTT_API to trigger modelChanged.
    // However, VTT_API.setSelectedObjectId should trigger a modelChanged event.
    // onDrawNeededCallback(); 
}

function handleMouseMove(e) {
    const { x: mouseX, y: mouseY } = getMousePositionOnCanvas(e); // Uses viewModelPanZoom

    if (isDragging && viewModelSelectedObjectId) {
        const draggedObject = viewModelObjects.get(viewModelSelectedObjectId);
        if (draggedObject) {
            draggedObject.x = mouseX - dragOffsetX;
            draggedObject.y = mouseY - dragOffsetY;
            onDrawNeededCallback(); // Redraw with local ViewModel changes
        }
    } else if (isPanning) {
        const dx = e.clientX - lastPanX;
        const dy = e.clientY - lastPanY;
        
        viewModelPanZoom.panX += dx;
        viewModelPanZoom.panY += dy;
        
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        onDrawNeededCallback(); // Redraw with local ViewModel changes
    }
}

function handleMouseUp(e) {
    const wasDragging = isDragging;
    const wasPanning = isPanning;

    if (isDragging && viewModelSelectedObjectId) {
        const draggedObject = viewModelObjects.get(viewModelSelectedObjectId);
        if (draggedObject) {
            VTT_API.updateObject(viewModelSelectedObjectId, { x: draggedObject.x, y: draggedObject.y });
        }
    }
    
    if (isPanning) {
        VTT_API.setPanZoomState({ 
            panX: viewModelPanZoom.panX, 
            panY: viewModelPanZoom.panY, 
            zoom: viewModelPanZoom.zoom 
        });
    }

    isDragging = false;
    isPanning = false;

    // Script execution for non-drag clicks
    if (!wasDragging && !wasPanning) {
        const { x: mouseX, y: mouseY } = getMousePositionOnCanvas(e);
        const clickedObjectId = getObjectAtPosition(mouseX, mouseY); // Uses viewModelObjects

        if (clickedObjectId) {
            // Fetch latest from main model for script execution to ensure consistency
            const objectDetailsFromModel = VTT_API.getObject(clickedObjectId); 
            if (objectDetailsFromModel && objectDetailsFromModel.scripts && objectDetailsFromModel.scripts.onClick) {
                console.log(`Executing onClick for ${objectDetailsFromModel.id}:`, objectDetailsFromModel.scripts.onClick);
                try {
                    // Script execution context still needs direct model access if scripts directly mutate object reference
                    // This is a known point from previous steps.
                    const objectRefForScript = model.currentObjects.get(objectDetailsFromModel.id); 
                    new Function('VTT', 'object', objectDetailsFromModel.scripts.onClick)(
                        VTT_API,
                        objectRefForScript 
                    );
                } catch (scriptError) {
                    console.error('Script execution error:', scriptError);
                    VTT_API.showMessage(
                        `Script Error in onClick for object ${objectDetailsFromModel.id}: ${scriptError.message}`,
                        'error'
                    );
                }
            }
        }
    }
    // VTT_API calls above should trigger modelChanged and thus a redraw.
    // Call onDrawNeededCallback() if an immediate redraw is needed for snapping back or visual finalization
    // not covered by model changes (e.g. if VTT_API calls are debounced/batched later)
    // For now, relying on VTT_API calls to trigger redraw.
}

function handleMouseLeave() {
    if (isDragging && viewModelSelectedObjectId) {
        const object = viewModelObjects.get(viewModelSelectedObjectId);
        if (object) {
            VTT_API.updateObject(viewModelSelectedObjectId, { x: object.x, y: object.y });
        }
    }
    if (isPanning) {
        VTT_API.setPanZoomState(viewModelPanZoom);
    }

    isDragging = false;
    isPanning = false;
    // onDrawNeededCallback(); // Consider if a final draw based on local state is needed before API confirms
}

function handleWheel(e) {
    e.preventDefault();
    // Ensure canvas is available, though it should be if this event is firing
    if (!canvas) return; 
    const { left, top } = canvas.getBoundingClientRect();

    const mouseXCanvas = e.clientX - left; // Mouse position relative to canvas element
    const mouseYCanvas = e.clientY - top;

    const oldZoom = viewModelPanZoom.zoom;
    const newZoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.max(0.1, Math.min(oldZoom * newZoomFactor, 10));

    // Calculate new pan position to keep the point under the mouse cursor fixed
    const newPanX = mouseXCanvas - (newZoom / oldZoom) * (mouseXCanvas - viewModelPanZoom.panX);
    const newPanY = mouseYCanvas - (newZoom / oldZoom) * (mouseYCanvas - viewModelPanZoom.panY);

    // Update local view-model first
    viewModelPanZoom.panX = newPanX;
    viewModelPanZoom.panY = newPanY;
    viewModelPanZoom.zoom = newZoom;
    
    onDrawNeededCallback(); // Redraw with local ViewModel changes for immediate feedback

    // Then, synchronize with the main model
    VTT_API.setPanZoomState({ 
        panX: viewModelPanZoom.panX, 
        panY: viewModelPanZoom.panY, 
        zoom: viewModelPanZoom.zoom 
    });
}
