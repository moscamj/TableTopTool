// src/views/canvasView.js
import { VTT_API } from '../api.js'; // Path updated
import * as model from '../model/model.js'; // For direct model access for script execution context (temporary)

// Canvas and context will be module-level variables, specific to this view.
let canvas;
let ctx;
let viewModel; // This will hold the CanvasViewModel instance

// Variables for canvas interaction states internal to the view
let isDragging = false;
let isPanning = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastPanX = 0;
let lastPanY = 0;

// Debounce function (remains as a local utility if not shared, or could be moved to a utils file)
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export const initCanvas = (canvasElement, cvm) => { // cvm is the CanvasViewModel instance
  if (!canvasElement) {
    console.error('[canvasView.js] Canvas element not provided!');
    return;
  }
  if (!cvm) {
    console.error('[canvasView.js] CanvasViewModel not provided!');
    return;
  }
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  viewModel = cvm; // Store the ViewModel instance

  setCanvasSize(); // Set initial size
  window.addEventListener('resize', debounce(setCanvasSize, 250));

  // Register event listeners
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('wheel', handleWheel);

  console.log('canvasView.js initialized with CanvasViewModel');
};

// setCanvasSize remains in canvasView.js as it directly manipulates the canvas element
export const setCanvasSize = () => {
  if (!canvas || !canvas.parentElement) return;
  const { clientWidth, clientHeight } = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;

  if (
    canvas.width !== clientWidth * dpr ||
    canvas.height !== clientHeight * dpr
  ) {
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
    canvas.style.width = `${clientWidth}px`;
    canvas.style.height = `${clientHeight}px`;
    ctx.scale(dpr, dpr);
    console.log(
      `Canvas resized to ${clientWidth}x${clientHeight} (physical: ${canvas.width}x${canvas.height})`
    );
  }
  if (viewModel && viewModel.onDrawNeededCallback) {
    viewModel.onDrawNeededCallback();
  } else {
    console.warn('[canvasView.js] ViewModel or onDrawNeededCallback not available for setCanvasSize redraw.');
  }
};

// --- Drawing Logic ---
// drawVTT now sources all data from the viewModel
export const drawVTT = () => {
  if (!ctx || !canvas || !viewModel) return;

  const dpr = window.devicePixelRatio || 1;
  const { panX, panY, zoom } = viewModel.getPanZoom();
  const { type: bgType, value: bgValue } = viewModel.getBackground() || {};
  const { widthPx: currentBoardWidthPx, heightPx: currentBoardHeightPx } = viewModel.getBoardProperties() || { widthPx: 0, heightPx: 0 };
  const viewModelObjects = viewModel.getObjects(); // Map of objects
  const viewModelSelectedObjectId = viewModel.getSelectedObjectId();

  ctx.save();
  ctx.fillStyle = '#333740';
  ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  if (bgType === 'color' && bgValue) {
    ctx.fillStyle = bgValue;
    ctx.fillRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);
  } else if (bgType === 'image' && bgValue) {
    const bgImageEntry = viewModel.getLoadedImage(bgValue);
    if (bgImageEntry && bgImageEntry.status === 'loaded' && bgImageEntry.img) {
      ctx.drawImage(bgImageEntry.img, 0, 0, currentBoardWidthPx, currentBoardHeightPx);
    } else {
      ctx.fillStyle = (bgImageEntry && bgImageEntry.status === 'error') ? '#A08080' : '#C0C0C0';
      ctx.fillRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);
      if (!bgImageEntry || bgImageEntry.status !== 'loading') {
         // Call loadImage via viewModel, it now uses onDrawNeededCallback internally
        viewModel.loadImage(bgValue, bgValue);
      }
    }
  } else {
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);
  }

  ctx.strokeStyle = '#111111';
  ctx.lineWidth = Math.max(0.5, 1 / zoom);
  ctx.strokeRect(0, 0, currentBoardWidthPx, currentBoardHeightPx);

  const sortedObjects = Array.from(viewModelObjects.values()).sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
  );

  sortedObjects.forEach((obj) => {
    const { x, y, width, height, rotation = 0, shape, id, appearance, name } = obj;
    const {
      backgroundColor, borderColor, borderWidth = 0, imageUrl,
      text, textColor = '#000000', fontSize = 14, fontFamily = 'Arial', showLabel = false
    } = appearance || {};

    ctx.save();
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);

    let baseFill = backgroundColor || '#DDDDDD';

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
      const imgEntry = viewModel.getLoadedImage(imageUrl);
      if (imgEntry && imgEntry.status === 'loaded' && imgEntry.img) {
        ctx.drawImage(imgEntry.img, 0, 0, width, height);
      } else if (!imgEntry || imgEntry.status !== 'loading') {
         // Call loadImage via viewModel
        viewModel.loadImage(imageUrl, imageUrl);
      }
      if (imgEntry && imgEntry.status === 'error') {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = Math.max(1, Math.min(4, 2 / zoom));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);
        ctx.stroke();
      }
    }

    if (showLabel === true && typeof text === 'string' && text.trim() !== '') {
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);
    }

    if (name && typeof name === 'string' && name.trim() !== '') {
      const nameFontSize = 12;
      ctx.font = `${nameFontSize}px Arial`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const nameTopMargin = 5;
      ctx.fillText(name, width / 2, -nameTopMargin);
    }

    if (id === viewModelSelectedObjectId) {
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)';
      ctx.lineWidth = Math.max(0.5, Math.min(4, 2 / zoom));
      const offset = (borderWidth || 0) / 2 + ctx.lineWidth / 2;
      ctx.strokeRect(-offset, -offset, width + 2 * offset, height + 2 * offset);
    }
    ctx.restore();
  });
  ctx.restore();
};

// --- Canvas Event Handlers ---
// These now use the viewModel for coordinate conversion and object picking.
// State changes are communicated via VTT_API.
// Local updates to viewModel can happen for responsiveness if desired.

function handleMouseDown(e) {
  if (!viewModel) return;
  // Pass canvas element to viewModel's getMousePositionOnCanvas
  const { x: mouseX, y: mouseY } = viewModel.getMousePositionOnCanvas(e, canvas);
  const clickedObjectId = viewModel.getObjectAtPosition(mouseX, mouseY);
  const currentSelectedId = viewModel.getSelectedObjectId(); // Get from VM

  if (clickedObjectId) {
    const objectDetails = viewModel.getObjects().get(clickedObjectId); // Get from VM's objects
    if (objectDetails && objectDetails.isMovable) {
      isDragging = true;
      dragOffsetX = mouseX - objectDetails.x;
      dragOffsetY = mouseY - objectDetails.y;
    }
    if (currentSelectedId !== clickedObjectId) {
      // viewModel.setSelectedObjectInViewModel(clickedObjectId); // VM updated by modelChanged event
      VTT_API.setSelectedObjectId(clickedObjectId);
    }
  } else {
    isPanning = true;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    if (currentSelectedId !== null) {
      // viewModel.setSelectedObjectInViewModel(null); // VM updated by modelChanged event
      VTT_API.setSelectedObjectId(null);
    }
  }
  // Redraw might be triggered by modelChanged event from VTT_API calls
  // If immediate visual feedback for selection/deselection before model events is needed, call:
  // viewModel.onDrawNeededCallback();
}

function handleMouseMove(e) {
  if (!viewModel) return;
  const { x: mouseX, y: mouseY } = viewModel.getMousePositionOnCanvas(e, canvas);
  const selectedObjectId = viewModel.getSelectedObjectId(); // Get from VM

  if (isDragging && selectedObjectId) {
    const newX = mouseX - dragOffsetX;
    const newY = mouseY - dragOffsetY;
    // Local update for responsiveness
    viewModel.locallyUpdateObjectPosition(selectedObjectId, newX, newY);
    viewModel.onDrawNeededCallback(); // Redraw with local changes
  } else if (isPanning) {
    const dx = e.clientX - lastPanX;
    const dy = e.clientY - lastPanY;
    
    const currentPanZoom = viewModel.getPanZoom();
    // Local update for responsiveness
    viewModel.locallyUpdatePanZoom(currentPanZoom.panX + dx, currentPanZoom.panY + dy);

    lastPanX = e.clientX;
    lastPanY = e.clientY;
    viewModel.onDrawNeededCallback(); // Redraw with local changes
  }
}

function handleMouseUp(e) {
  if (!viewModel) return;
  const wasDragging = isDragging;
  const wasPanning = isPanning;
  const selectedObjectId = viewModel.getSelectedObjectId(); // Get from VM

  if (isDragging && selectedObjectId) {
    const draggedObject = viewModel.getObjects().get(selectedObjectId); // Get from VM's objects
    if (draggedObject) {
      // Final update to the main model via API
      VTT_API.updateObject(selectedObjectId, { x: draggedObject.x, y: draggedObject.y });
    }
  }
  
  if (isPanning) {
    // Final update to the main model via API
    VTT_API.setPanZoomState(viewModel.getPanZoom()); // Send the locally updated panZoom
  }

  isDragging = false;
  isPanning = false;

  if (!wasDragging && !wasPanning) {
    const { x: mouseX, y: mouseY } = viewModel.getMousePositionOnCanvas(e, canvas);
    const clickedObjectId = viewModel.getObjectAtPosition(mouseX, mouseY);

    if (clickedObjectId) {
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
  // VTT_API calls should trigger modelChanged and thus a redraw via main.js
}

function handleMouseLeave() {
  if (!viewModel) return;
  const selectedObjectId = viewModel.getSelectedObjectId(); // Get from VM

  if (isDragging && selectedObjectId) {
    const object = viewModel.getObjects().get(selectedObjectId); // Get from VM's objects
    if (object) {
      VTT_API.updateObject(selectedObjectId, { x: object.x, y: object.y });
    }
  }
  if (isPanning) {
    VTT_API.setPanZoomState(viewModel.getPanZoom());
  }

  isDragging = false;
  isPanning = false;
  // Redraw will be handled by modelChanged events
}

function handleWheel(e) {
  if (!viewModel || !canvas) return;
  e.preventDefault();
  
  const { left, top } = canvas.getBoundingClientRect();
  const mouseXCanvas = e.clientX - left;
  const mouseYCanvas = e.clientY - top;

  const currentPanZoom = viewModel.getPanZoom();
  const oldZoom = currentPanZoom.zoom;
  const newZoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  const newZoom = Math.max(0.1, Math.min(oldZoom * newZoomFactor, 10));

  const newPanX = mouseXCanvas - (newZoom / oldZoom) * (mouseXCanvas - currentPanZoom.panX);
  const newPanY = mouseYCanvas - (newZoom / oldZoom) * (mouseYCanvas - currentPanZoom.panY);

  // Local update for responsiveness
  viewModel.locallyUpdatePanZoom(newPanX, newPanY, newZoom);
  viewModel.onDrawNeededCallback(); // Redraw with local ViewModel changes

  // Then, synchronize with the main model
  VTT_API.setPanZoomState(viewModel.getPanZoom()); // Send the locally updated panZoom
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
