// src/api.js
import * as model from './model/model.js';
// import * as uiView from './views/uiView.js'; // No longer needed here for showMessage

let showMessageCallback = null;

/**
 * Initializes the VTT_API module, primarily by setting up necessary callbacks.
 * @param {object} config - Configuration object for the API.
 * @param {function(text: string, type: string, duration?: number): void} config.showMessage - Callback function to display messages to the user.
 */
export function VTT_API_INIT(config) {
    if (config && typeof config.showMessage === 'function') {
        showMessageCallback = config.showMessage;
    } else {
        console.error('VTT_API_INIT: showMessage callback not provided or invalid.');
    }
}

// requestRedrawEvent is removed as model.js should dispatch 'modelChanged'
// which main.js listens to for redrawing.

/**
 * VTT_API provides a comprehensive interface for interacting with the virtual tabletop's core functionalities,
 * primarily by abstracting interactions with the underlying data model (model.js).
 * It handles object manipulation, state retrieval, and other core operations.
 */
export const VTT_API = {
  /**
   * Retrieves a copy of an object by its ID.
   * @param {string} objectId - The ID of the object to retrieve.
   * @param {VTTObject} [contextObject] - The object whose script is currently executing (for context).
   * @returns {VTTObject | undefined} A copy of the object, or undefined if not found.
   */
  getObject: (objectId, contextObject) => {
    // model.getObject is expected to return a copy
    return model.getObject(objectId);
  },

  /**
   * Updates the 'data' field of a specified object.
   * @param {string} objectId - The ID of the object to update.
   * @param {Object} newData - The new data to merge into the object's existing 'data' property.
   * @param {VTTObject} [contextObject] - The object whose script is currently executing.
   */
  updateObjectState: (objectId, newData, contextObject) => {
    const obj = model.getObject(objectId); // model.getObject returns a copy
    if (obj) {
      // We are updating only the 'data' field here as per the spec.
      const updatedData = { ...obj.data, ...newData };
      model.updateObject(objectId, { data: updatedData });

      // If the update was on the contextObject itself, its reference might be stale.
      // However, scripts are short-lived. The main concern is the central store being updated.
      // requestRedrawEvent(); // Removed: model.updateObject should trigger 'modelChanged'
      if (typeof showMessageCallback === 'function') {
          showMessageCallback(`Object ${objectId} updated by script.`, 'info', 1500); // Optional feedback
      }
    } else {
      console.warn(`[VTT_API.updateObjectState] Object ${objectId} not found.`);
    }
  },

  /**
   * Logs a message to the console and optionally to the UI.
   * @param {any} message - The message to log.
   * @param {VTTObject} [contextObject] - The object whose script is currently executing.
   */
  log: (message, contextObject) => {
    const prefix = contextObject
      ? `[Script Log - ${contextObject.name || contextObject.id}]`
      : '[Script Log - Global]';
    console.log(prefix, message);

    // Optional: Display log message in the UI (can be verbose)
    // const uiMessage = typeof message === 'object' ? JSON.stringify(message) : String(message);
    // ui.displayMessage(`${prefix}: ${uiMessage.substring(0, 100)}`, 'info', 2000);
  },

  // --- Future API methods (examples, not for current MVP implementation) ---

  /**
   * Creates a new object on the canvas.
   * Can be called with a shape string and optional properties, or a single object containing all properties including shape.
   * @param {string | object} arg1 - Either the shape of the object (e.g., 'rectangle', 'circle') or an object containing initial properties (including 'shape').
   * @param {object} [arg2] - If arg1 is a shape string, this object contains the initial properties (e.g., x, y, width, appearance).
   * @returns {VTTObject | null} A copy of the newly created object, or null if creation failed.
   */
  createObject: (arg1, arg2) => { // arg1 can be shape (string) or full object props
    let shape, initialProps;
    if (typeof arg1 === 'string' && (typeof arg2 === 'object' || arg2 === undefined)) { 
      // Called as VTT_API.createObject('rectangle', {x:10, ...}) or VTT_API.createObject('rectangle')
      shape = arg1;
      initialProps = arg2 || {}; // Ensure initialProps is an object
    } else if (typeof arg1 === 'object' && arg2 === undefined) { 
      // Called as VTT_API.createObject({id:'id1', shape:'circle', ...})
      initialProps = arg1;
      shape = initialProps.shape; // Get shape from the object itself
      if (!shape) {
        console.error("VTT_API.createObject: Object argument missing 'shape' property.", arg1);
        return null; // Or throw error
      }
    } else {
      console.error("VTT_API.createObject: Invalid arguments.", arg1, arg2);
      return null; // Or throw error
    }
    // model.createObject now expects (shapeArgument, initialProps)
    // initialProps contains the full object data if loaded from file, including its own shape.
    // shape (derived above) acts as shapeArgument for model.createObject.
    const newObj = model.createObject(shape, initialProps); 
    // requestRedrawEvent(); // Removed: model.createObject now dispatches 'modelChanged' event
    return newObj;
  },

  /**
   * Updates an existing object with new properties.
   * @param {string} objectId - The ID of the object to update.
   * @param {Partial<VTTObject>} updatedProps - An object containing the properties to update.
   * @returns {VTTObject | null} A copy of the updated object, or null if the object was not found or update failed.
   */
  updateObject: (objectId, updatedProps) => {
    const updatedObj = model.updateObject(objectId, updatedProps);
    // requestRedrawEvent(); // Removed: model.updateObject should trigger 'modelChanged'
    return updatedObj;
  },

  /**
   * Deletes an object from the canvas.
   * @param {string} objectId - The ID of the object to delete.
   * @returns {boolean} True if deletion was successful, false otherwise.
   */
  deleteObject: (objectId) => {
    const result = model.deleteObject(objectId);
    // requestRedrawEvent(); // Removed: model.deleteObject should trigger 'modelChanged'
    return result;
  },

  /**
   * Retrieves copies of all objects currently on the canvas.
   * @returns {VTTObject[]} An array of object copies.
   */
  getAllObjects: () => {
    return model.getAllObjects();
  },

  /**
   * Removes all objects from the canvas.
   */
  clearAllObjects: () => {
    model.clearAllObjects();
    // requestRedrawEvent(); // Removed: model.clearAllObjects should trigger 'modelChanged'
  },

  /**
   * Sets the background of the table (canvas).
   * @param {object} backgroundProps - Properties for the background.
   * @param {'color' | 'image'} backgroundProps.type - The type of background.
   * @param {string} backgroundProps.value - The color value (e.g., '#RRGGBB') or image URL.
   */
  setTableBackground: (backgroundProps) => {
    // model.setTableBackground will dispatch a modelChanged event,
    // which is handled by main.js to trigger a redraw event.
    model.setTableBackground(backgroundProps);
    // requestRedrawEvent(); // Removed, modelChanged event handles this
  },

  /**
   * Displays a message to the user via the registered showMessageCallback.
   * @param {string} text - The message text.
   * @param {'info' | 'success' | 'warning' | 'error'} type - The type of message.
   * @param {number} [duration] - Optional duration in milliseconds for how long the message should be visible.
   */
  showMessage: (text, type, duration) => {
    if (typeof showMessageCallback === 'function') {
        showMessageCallback(text, type, duration);
    } else {
        // Fallback if not initialized, though this shouldn't happen in a correctly initialized app
        console.warn(`VTT_API.showMessage (fallback): ${type} - ${text}`);
        alert(`${type.toUpperCase()}: ${text}`); // Avoid alert if possible, but it's a fallback
    }
  },

  /**
   * Sets various board properties like dimensions, units, and scale.
   * @param {object} properties - An object containing new board properties to apply.
   *                              Example: `{ widthUser: 36, heightUser: 24, unitForDimensions: 'in', scaleRatio: 1, unitForRatio: 'mm' }`
   * @returns {object} The consolidated current board properties after the update.
   */
  setBoardProperties: (properties) => {
    // properties is an object e.g., { widthUser: 36, heightUser: 24, unitForDimensions: 'in', scaleRatio: 1, unitForRatio: 'mm' }
    const currentBoardProps = model.updateBoardProperties(properties);
    // model.updateBoardProperties will dispatch a modelChanged event.
    // requestRedrawEvent(); // Removed, modelChanged event handles this
    return currentBoardProps; // Return the confirmed, possibly recalculated, properties.
  },

  /**
   * Retrieves the current board properties.
   * @returns {object} An object containing board properties (widthUser, heightUser, unitForDimensions, widthPx, heightPx, scaleRatio, unitForRatio).
   */
  getBoardProperties: () => {
    return model.getBoardProperties();
  },

  /**
   * Retrieves the current pan and zoom state of the canvas.
   * @returns {object} An object with panX, panY, and zoom properties.
   */
  getPanZoomState: () => {
    return model.getPanZoomState();
  },

  /**
   * Sets the pan and zoom state of the canvas.
   * @param {object} newState - An object with panX, panY, and/or zoom properties to update.
   */
  setPanZoomState: (newState) => {
    model.setPanZoomState(newState);
    // No requestRedrawEvent() here; model.setPanZoomState dispatches 'modelChanged'
  },

  /**
   * Retrieves the current table background configuration.
   * @returns {object} An object with type ('color' or 'image') and value (color string or image URL).
   */
  getTableBackground: () => {
    return model.getTableBackground();
  },
  // setTableBackground already exists and calls model.setTableBackground

  /**
   * Retrieves the ID of the currently selected object.
   * @returns {string | null} The ID of the selected object, or null if no object is selected.
   */
  getSelectedObjectId: () => {
    return model.getSelectedObjectId();
  },

  /**
   * Sets the currently selected object.
   * @param {string | null} id - The ID of the object to select, or null to deselect.
   */
  setSelectedObjectId: (id) => {
    model.setSelectedObjectId(id);
    // No requestRedrawEvent() here; model.setSelectedObjectId dispatches 'modelChanged'
  },
  // getBoardProperties and setBoardProperties already exist

  // getSelectedObjects: (contextObject) => { /* ... */ },
  // createObject: (shape, properties, contextObject) => { /* ... */ },
  // deleteObject: (objectId, contextObject) => { /* ... */ },
  // getMousePosition: (contextObject) => { /* ... */ },
  // showSimpleModal: (title, text, contextObject) => {
  //     ui.showModal(title, `<p>${text}</p>`);
  // }
};

// For debugging in console:
// window.VTT_API = VTT_API;
