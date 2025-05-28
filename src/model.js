// src/model.js

const dispatchModelChangeEvent = (detail) => {
  // Ensure 'document' is available (might not be in pure Node.js test environments without JSDOM)
  if (typeof document !== 'undefined' && document.dispatchEvent) {
    document.dispatchEvent(new CustomEvent('modelChanged', { detail }));
  } else {
    console.warn('Cannot dispatch modelChanged event: `document` is not available.');
  }
};

/**
 * @typedef {Object} VTTObjectAppearance
 * @property {string} [imageUrl] - URL for an image to display.
 * @property {string} [backgroundColor] - Object's background color (e.g., '#FF0000').
 * @property {string} [borderColor] - Object's border color.
 * @property {number} [borderWidth] - Object's border width.
 * @property {string} [textColor] - Color of the text.
 * @property {string} [text] - Text to display on the object.
 * @property {string} [fontFamily] - Font for the text.
 * @property {number} [fontSize] - Font size for the text.
 * @property {boolean} [showLabel] - Whether to display the object's name as a label.
 */

/**
 * @typedef {Object} VTTObjectScripts
 * @property {string} [onClick] - JavaScript code string to execute on click.
 * @property {string} [onCollision] - (Future use)
 * @property {string} [onDrop] - (Future use)
 */

/**
 * @typedef {Object} VTTObject
 * @property {string} id - Unique identifier (UUID).
 * @property {string} type - General type classification (e.g., 'token', 'card', 'mapTile').
 * @property {number} x - X-coordinate on the canvas.
 * @property {number} y - Y-coordinate on the canvas.
 * @property {number} zIndex - Stacking order.
 * @property {number} width - Width of the object.
 * @property {number} height - Height of the object (for circles, this might be interpreted as diameter or radius depending on drawing logic).
 * @property {number} rotation - Rotation angle in degrees.
 * @property {'rectangle' | 'circle'} shape - The specific shape to render.
 * @property {VTTObjectAppearance} appearance - How the object looks.
 * @property {boolean} isMovable - If the object can be moved by users.
 * @property {Object<string, any>} data - User-defined custom data (e.g., character stats, card effects).
 * @property {VTTObjectScripts} scripts - Scripts associated with the object.
 * @property {string} [name] - Optional display name for the object.
 * @property {boolean} [isSelected] - (Consider if this is a local UI state or part of object data)
 */

export const currentObjects = new Map();

// Basic UUID generator
const generateUUID = () => {
  // Standard RFC4122 version 4 compliant UUID generator.
  // 'x' characters are replaced with random hexadecimal digits.
  // 'y' characters are replaced with '8', '9', 'a', or 'b' (to satisfy version 4 requirements).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = (Math.random() * 16) | 0; // Generate a random number between 0 and 15.
    // For 'y', ensure the bits are 10xx (as per RFC4122 section 4.4).
    // For 'x', use the random number directly.
    let v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16); // Convert to hexadecimal.
  });
};

export const createObject = (shape, initialProps = {}) => {
  const id = generateUUID();
  const defaults = {
    type: shape === 'rectangle' ? 'generic-rectangle' : 'generic-circle',
    x: 50,
    y: 50,
    zIndex: 0,
    width: shape === 'rectangle' ? 100 : 50, // Default width (radius for circle)
    height: shape === 'rectangle' ? 100 : 50, // Default height (radius for circle)
    rotation: 0,
    shape: shape,
    appearance: {
      backgroundColor: '#CCCCCC',
      borderColor: '#333333',
      borderWidth: 1,
      textColor: '#000000',
      text: '', // Default label text is empty
      fontFamily: 'Arial',
      fontSize: 14,
      showLabel: false, // Default to not showing the label
    },
    isMovable: true,
    data: {},
    scripts: {},
    name: `Object ${currentObjects.size + 1}`,
  };

  const newObject = {
    ...defaults,
    ...initialProps,
    id,
    shape,
    appearance: {
      ...defaults.appearance,
      ...(initialProps.appearance || {}),
    },
    data: {
      ...defaults.data,
      ...(initialProps.data || {}),
    },
    scripts: {
      ...defaults.scripts,
      ...(initialProps.scripts || {}),
    },
  };

  currentObjects.set(id, newObject);
  console.log(`Object created: ${id}`, newObject);
  return { ...newObject };
};

export const updateObject = (objectId, updatedProps) => {
  if (!currentObjects.has(objectId)) {
    console.warn(`Object with ID ${objectId} not found for update.`);
    return null;
  }

  const existingObject = currentObjects.get(objectId);

  const newObjectState = {
    ...existingObject,
    ...updatedProps,
    id: objectId,
    appearance: {
      ...existingObject.appearance,
      ...(updatedProps.appearance || {}),
    },
    data: {
      ...existingObject.data,
      ...(updatedProps.data || {}),
    },
    scripts: {
      ...existingObject.scripts,
      ...(updatedProps.scripts || {}),
    },
  };

  currentObjects.set(objectId, newObjectState);
  console.log(`Object updated: ${objectId}`, newObjectState);
  return { ...newObjectState };
};

export const deleteObject = (objectId) => {
  if (currentObjects.has(objectId)) {
    const deleted = currentObjects.delete(objectId);
    console.log(`Object deleted: ${objectId}`);
    if (deleted) {
      dispatchModelChangeEvent({ type: 'objectDeleted', payload: { id: objectId } });
    }
    return deleted;
  }
  console.warn(`Object with ID ${objectId} not found for deletion.`);
  return false;
};

export const getObject = (objectId) => {
  if (!currentObjects.has(objectId)) {
    return undefined;
  }
  return { ...currentObjects.get(objectId) };
};

export const getAllObjects = () => {
  return Array.from(currentObjects.values()).map((obj) => ({ ...obj }));
};

export const clearAllObjects = () => {
  currentObjects.clear();
  console.log('All local objects cleared.');
};

// --- Board State Management ---

// Event Dispatcher for model changes (other than object changes which have their own system via API)
// const dispatchModelChangeEvent = (detail) => { // Already added at the top
//   document.dispatchEvent(new CustomEvent('modelChanged', { detail }));
// };

export const MM_PER_UNIT = {
  'in': 25.4,
  'ft': 304.8,
  'm': 1000,
  'cm': 10,
  'mm': 1,
};

let panZoomState = { panX: 0, panY: 0, zoom: 1.0 };
let tableBackground = { type: 'color', value: '#cccccc' }; // Default background
let selectedObjectId = null;

let boardPhysical = {
  widthUser: 36,
  heightUser: 24,
  unitForDimensions: 'in',
  widthPx: 36 * MM_PER_UNIT['in'],
  heightPx: 24 * MM_PER_UNIT['in'],
};

let mapInterpretationScale = {
  ratio: 1,
  unitForRatio: 'mm',
};

// Getters
export const getPanZoomState = () => ({ ...panZoomState });
export const getTableBackground = () => ({ ...tableBackground });
export const getSelectedObjectId = () => selectedObjectId;

export const getBoardProperties = () => {
  return {
     widthUser: boardPhysical.widthUser,
     heightUser: boardPhysical.heightUser,
     unitForDimensions: boardPhysical.unitForDimensions,
     widthPx: boardPhysical.widthPx,
     heightPx: boardPhysical.heightPx,
     scaleRatio: mapInterpretationScale.ratio,
     unitForRatio: mapInterpretationScale.unitForRatio
  };
};

// Setters
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
    // Clamp zoom to reasonable values
    const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
    if (clampedZoom !== panZoomState.zoom) {
        panZoomState.zoom = clampedZoom;
        changed = true;
    }
  }

  if (changed) {
    dispatchModelChangeEvent({ type: 'panZoomChanged', payload: { ...panZoomState } });
  }
};

export const setTableBackground = (newBackground) => {
  if (newBackground && typeof newBackground === 'object') {
    const { type: newType, value: newValue } = newBackground;
    let changed = false;

    if (tableBackground.type !== newType || tableBackground.value !== newValue) {
        tableBackground.type = newType;
        tableBackground.value = newValue;
        changed = true;
    }

    if (changed) {
      dispatchModelChangeEvent({ type: 'backgroundChanged', payload: { ...tableBackground } });
    }
  }
};

export const setSelectedObjectId = (id) => {
  if (selectedObjectId !== id) {
    selectedObjectId = id;
    dispatchModelChangeEvent({ type: 'selectionChanged', payload: selectedObjectId });
  }
};

export const updateBoardProperties = (newProps) => {
  let modelPropertiesChanged = false;

  // Update physical board dimensions and their unit
  const newWidthUser = newProps.widthUser !== undefined ? parseFloat(newProps.widthUser) : boardPhysical.widthUser;
  if (!isNaN(newWidthUser) && boardPhysical.widthUser !== newWidthUser) {
    boardPhysical.widthUser = newWidthUser;
    modelPropertiesChanged = true;
  }

  const newHeightUser = newProps.heightUser !== undefined ? parseFloat(newProps.heightUser) : boardPhysical.heightUser;
  if (!isNaN(newHeightUser) && boardPhysical.heightUser !== newHeightUser) {
    boardPhysical.heightUser = newHeightUser;
    modelPropertiesChanged = true;
  }

  if (newProps.unitForDimensions && MM_PER_UNIT[newProps.unitForDimensions] && boardPhysical.unitForDimensions !== newProps.unitForDimensions) {
    boardPhysical.unitForDimensions = newProps.unitForDimensions;
    modelPropertiesChanged = true;
  }

  // Update map interpretation scale properties
  const newScaleRatio = newProps.scaleRatio !== undefined ? parseFloat(newProps.scaleRatio) : mapInterpretationScale.ratio;
  if (!isNaN(newScaleRatio) && mapInterpretationScale.ratio !== newScaleRatio) {
    mapInterpretationScale.ratio = newScaleRatio;
    modelPropertiesChanged = true;
  }

  if (newProps.unitForRatio && MM_PER_UNIT[newProps.unitForRatio] && mapInterpretationScale.unitForRatio !== newProps.unitForRatio) {
    mapInterpretationScale.unitForRatio = newProps.unitForRatio;
    modelPropertiesChanged = true;
  }

  if (modelPropertiesChanged) {
    const unitMultiplier = MM_PER_UNIT[boardPhysical.unitForDimensions] || MM_PER_UNIT['in'];
    boardPhysical.widthPx = boardPhysical.widthUser * unitMultiplier;
    boardPhysical.heightPx = boardPhysical.heightUser * unitMultiplier;
    
    dispatchModelChangeEvent({ type: 'boardPropertiesChanged', payload: getBoardProperties() });
  }
  return getBoardProperties(); // Return the current state
};
