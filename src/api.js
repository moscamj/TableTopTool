// src/api.js
import * as model from './model/model.js';
// import * as uiView from './views/uiView.js'; // No longer needed here for showMessage

let showMessageCallback = null;

export function VTT_API_INIT(config) {
    if (config && typeof config.showMessage === 'function') {
        showMessageCallback = config.showMessage;
    } else {
        console.error('VTT_API_INIT: showMessage callback not provided or invalid.');
    }
}

// requestRedrawEvent is removed as model.js should dispatch 'modelChanged'
// which main.js listens to for redrawing.

export const VTT_API = {
  /**
   * Retrieves a copy of an object by its ID.
   * @param {string} objectId - The ID of the object to retrieve.
   * @param {VTTObject} [contextObject] - The object whose script is currently executing (for context).
   * @returns {VTTObject | undefined} A copy of the object, or undefined if not found.
   */
  getObject: (objectId, contextObject) => {
    // getLocalObject already returns a copy
    return model.getObject(objectId);
  },

  /**
   * Updates the 'data' field of a specified object.
   * @param {string} objectId - The ID of the object to update.
   * @param {Object} newData - The new data to merge into the object's existing 'data' property.
   * @param {VTTObject} [contextObject] - The object whose script is currently executing.
   */
  updateObjectState: (objectId, newData, contextObject) => {
    const obj = model.getObject(objectId); // Gets a copy
    if (obj) {
      // It's crucial that updateLocalObject handles the merge correctly,
      // especially for the 'data' field.
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

  updateObject: (objectId, updatedProps) => {
    const updatedObj = model.updateObject(objectId, updatedProps);
    // requestRedrawEvent(); // Removed: model.updateObject should trigger 'modelChanged'
    return updatedObj;
  },

  deleteObject: (objectId) => {
    const result = model.deleteObject(objectId);
    // requestRedrawEvent(); // Removed: model.deleteObject should trigger 'modelChanged'
    return result;
  },

  getAllObjects: () => {
    return model.getAllObjects();
  },

  clearAllObjects: () => {
    model.clearAllObjects();
    // requestRedrawEvent(); // Removed: model.clearAllObjects should trigger 'modelChanged'
  },

  setTableBackground: (backgroundProps) => {
    // model.setTableBackground will dispatch a modelChanged event,
    // which is handled by main.js to trigger a redraw event.
    model.setTableBackground(backgroundProps);
    // requestRedrawEvent(); // Removed, modelChanged event handles this
  },

  showMessage: (text, type, duration) => {
    if (typeof showMessageCallback === 'function') {
        showMessageCallback(text, type, duration);
    } else {
        // Fallback if not initialized, though this shouldn't happen in a correctly initialized app
        console.warn(`VTT_API.showMessage (fallback): ${type} - ${text}`);
        alert(`${type.toUpperCase()}: ${text}`); // Avoid alert if possible, but it's a fallback
    }
  },

  setBoardProperties: (properties) => {
    // properties is an object e.g., { widthUser: 36, heightUser: 24, unitForDimensions: 'in', scaleRatio: 1, unitForRatio: 'mm' }
    const currentBoardProps = model.updateBoardProperties(properties);
    // model.updateBoardProperties will dispatch a modelChanged event.
    // requestRedrawEvent(); // Removed, modelChanged event handles this
    return currentBoardProps; // Return the confirmed, possibly recalculated, properties.
  },

  getBoardProperties: () => {
    return model.getBoardProperties();
  },

  getPanZoomState: () => {
    return model.getPanZoomState();
  },
  setPanZoomState: (newState) => {
    model.setPanZoomState(newState);
    // No requestRedrawEvent() here; model.setPanZoomState dispatches 'modelChanged'
  },
  getTableBackground: () => {
    return model.getTableBackground();
  },
  // setTableBackground already exists and calls model.setTableBackground

  getSelectedObjectId: () => {
    return model.getSelectedObjectId();
  },
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
