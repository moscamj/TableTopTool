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

export const initCanvas = (canvasElement, drawNeededCallback) => {
  if (!canvasElement) {
    console.error('Canvas element not provided!');
    return;
  }
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  onDrawNeededCallback =
    drawNeededCallback || (() => console.warn('onDrawNeededCallback not set'));

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
    let changed =
      tableBackground.type !== newType || tableBackground.value !== newValue;
    
    // Update tableBackground directly with new properties
    tableBackground.type = newType;
    tableBackground.value = newValue;

    if (newType === 'image' && newValue) {
      loadImage(newValue, newValue, onDrawNeededCallback);
    } else if (changed) {
      // Ensure redraw if only color changed or image removed
      onDrawNeededCallback();
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
    console.log(`Image loaded: ${url}`); // Kept template literal as it was already correct
    if (callback) callback();
  };
  image.onerror = () => {
    loadedImages.set(cacheKey, { img: null, status: 'error' });
    console.error(`Error loading image: ${url}`); // Kept template literal
    if (callback) callback(); // Still call callback to redraw, maybe show placeholder
  };
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
  ctx.translate(panX * dpr, panY * dpr);
  ctx.scale(zoom * dpr, zoom * dpr);

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
      text,            // Will be undefined if not set
      textColor = '#000000', // Default text color
      fontSize = 14,         // Default font size
      fontFamily = 'Arial',  // Default font family
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
    }

    if (text) {
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);
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

  const { clientX, clientY } = event;
  const rect = canvas.getBoundingClientRect(); // Get canvas position and size in CSS pixels
  const { left: rectLeft, top: rectTop } = rect; // Destructure for clarity
  const { panX, panY, zoom } = currentPZS; // Current pan and zoom state

  // Convert mouse click coordinates (relative to viewport) to canvas screen coordinates (CSS pixels)
  const screenX = clientX - rectLeft;
  const screenY = clientY - rectTop;

  // Convert canvas screen coordinates to world coordinates
  // 1. Subtract pan offset (panX, panY are in CSS pixels relative to canvas origin)
  // 2. Divide by zoom factor to get world space coordinates
  const worldX = (screenX - panX) / zoom;
  const worldY = (screenY - panY) / zoom;

  return { x: worldX, y: worldY };
};

// Basic AABB check for rectangles, point-in-circle for circles
// Does not account for rotation for simplicity in this MVP stage for picking.
export const getObjectAtPosition = (worldX, worldY, objectsMap) => {
  const sortedObjects = Array.from(objectsMap.values()).sort(
    (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
  );

  for (const obj of sortedObjects) {
    const { x, y, width, height, shape, id } = obj;

    if (shape === 'rectangle') {
      if (
        worldX >= x &&
        worldX <= x + width &&
        worldY >= y &&
        worldY <= y + height
      ) {
        return id;
      }
    } else if (shape === 'circle') {
      const radius = width / 2;
      const centerX = x + radius;
      const centerY = y + radius;
      const distanceSq = (worldX - centerX) ** 2 + (worldY - centerY) ** 2;
      if (distanceSq <= radius ** 2) {
        return id;
      }
    }
  }
  return null; // No object found
};
