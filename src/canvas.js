// src/canvas.js
let canvas;
let ctx;
let panZoomState = { panX: 0, panY: 0, zoom: 1.0 };
let tableBackground = { type: 'color', value: '#cccccc' }; // Default background
let selectedObjectId = null;
// let isPanning = false; // isPanning and lastMousePosition are not used in this file, managed by main.js
// let lastMousePosition = { x: 0, y: 0 };

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
  console.log('Canvas initialized');
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

// --- Getters and Setters ---
export const getPanZoomState = () => {
  return { ...panZoomState };
};

export const setPanZoomState = (newState) => {
  const { panX: newPanX, panY: newPanY, zoom: newZoom } = newState;
  let changed = false;

  if (newPanX !== undefined && newPanX !== panZoomState.panX) {
    panZoomState.panX = newPanX;
    changed = true;
  }
  if (newPanY !== undefined && newPanY !== panZoomState.panY) {
    panZoomState.panY = newPanY;
    changed = true;
  }
  if (newZoom !== undefined && newZoom !== panZoomState.zoom) {
    panZoomState.zoom = Math.max(0.1, Math.min(newZoom, 10));
    changed = true;
  }

  if (changed) {
    onDrawNeededCallback();
  }
};

export const getTableBackground = () => {
  return { ...tableBackground };
};

export const setTableBackground = (newBackground) => {
  if (newBackground && typeof newBackground === 'object') {
    const { type: newType, value: newValue } = newBackground;
    const oldType = tableBackground.type;
    const oldValue = tableBackground.value;

    tableBackground.type = newType;
    tableBackground.value = newValue;

    if (newType === 'image') {
      if (newValue) { // If a new image URL/dataURI is provided
        loadImage(newValue, newValue, onDrawNeededCallback);
      }
      // Always request a redraw when the type is 'image',
      // either to draw the new image, a loading state, an error state, or to clear a previous image if newValue is null.
      onDrawNeededCallback(); 
    } else if (newType === 'color') {
      // Only redraw if color actually changed or type changed from image to color
      if (oldType !== newType || oldValue !== newValue) {
        onDrawNeededCallback();
      }
    } else {
      // If type is not image or color but changed (e.g. background removed completely)
      if (oldType !== newType || oldValue !== newValue) {
        onDrawNeededCallback();
      }
    }
  }
};

export const getSelectedObjectId = () => {
  return selectedObjectId;
};

export const setSelectedObjectId = (id) => {
  if (selectedObjectId !== id) {
    selectedObjectId = id;
    onDrawNeededCallback();
  }
};

// --- Image Loading ---
const loadImage = (url, cacheKey, callback) => {
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
export const drawVTT = (
  objectsMap,
  currentPZS,
  currentTblBg,
  currentSelectedId
) => {
  if (!ctx || !canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const { panX, panY, zoom } = currentPZS;
  // Destructure background type and value, providing a fallback if currentTblBg is undefined
  const { type: bgType, value: bgValue } = currentTblBg || {};


  // Save the current canvas context state (transformations, styles, etc.)
  // This allows us to restore it later, isolating transformations to this draw call.
  ctx.save();

  // Clear canvas (physical pixels)
  // This ensures the entire canvas area is cleared before drawing the new frame.
  ctx.fillStyle = 'white'; // Fallback clear color
  ctx.fillRect(0, 0, canvas.width, canvas.height); // Use physical width/height of the canvas

  // Apply global pan and zoom transformations.
  // These transformations are affected by the Device Pixel Ratio (dpr) to ensure
  // panning and zooming feel consistent across different display densities.
  // All subsequent drawing operations will be affected by this transformed coordinate system.
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // 1. Draw Table Background
  // Calculate the width and height of the viewport in "world" coordinates.
  // This is done by taking the canvas's physical dimensions, converting to CSS pixels (dividing by dpr),
  // and then accounting for the current zoom level.
  const viewWidthWorld = canvas.width / dpr / zoom;
  const viewHeightWorld = canvas.height / dpr / zoom;

  if (bgType) {
    if (bgType === 'color' && bgValue) {
      ctx.fillStyle = bgValue;
      ctx.fillRect(0, 0, viewWidthWorld, viewHeightWorld);
    } else if (bgType === 'image' && bgValue) {
      const bgImageEntry = loadedImages.get(bgValue);
      if (
        bgImageEntry &&
        bgImageEntry.status === 'loaded' &&
        bgImageEntry.img
      ) {
        ctx.drawImage(bgImageEntry.img, 0, 0, viewWidthWorld, viewHeightWorld);
      } else if (!bgImageEntry || bgImageEntry.status === 'loading') {
        ctx.fillStyle = '#e0e0e0'; // Loading placeholder
        ctx.fillRect(0, 0, viewWidthWorld, viewHeightWorld);
        if (!bgImageEntry)
          loadImage(bgValue, bgValue, onDrawNeededCallback); // Use destructured bgValue
      } else {
        // Error or no image
        ctx.fillStyle = '#c0c0c0'; // Error placeholder
        ctx.fillRect(0, 0, viewWidthWorld, viewHeightWorld);
      }
    }
  }

  // 2. Draw Objects (sorted by zIndex)
  const sortedObjects = Array.from(objectsMap.values()).sort(
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

    if (id === currentSelectedId) {
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
export const getMousePositionOnCanvas = (event, currentPZS) => {
  if (!canvas) return { x: 0, y: 0 };

  // const { clientX, clientY } = event; // Not needed with offsetX/Y
  // const rect = canvas.getBoundingClientRect(); // Get canvas position and size in CSS pixels
  // const { left: rectLeft, top: rectTop } = rect; // Destructure for clarity
  const { panX, panY, zoom } = currentPZS; // Current pan and zoom state

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

export const getObjectAtPosition = (worldX, worldY, objectsMap) => {
  // Ensure inputs are valid numbers
  if (typeof worldX !== 'number' || isNaN(worldX) || typeof worldY !== 'number' || isNaN(worldY)) {
    console.error('getObjectAtPosition: Invalid worldX or worldY input', { worldX, worldY });
    return null;
  }

  if (!(objectsMap instanceof Map)) {
    console.error('getObjectAtPosition: objectsMap is not a Map', objectsMap);
    return null;
  }

  const sortedObjects = Array.from(objectsMap.values()).sort(
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
