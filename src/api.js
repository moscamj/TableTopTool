// src/api.js
import * as objects from './objects.js';
import * as ui from './ui.js'; // Optional: for displaying logs as UI messages

/**
 * Dispatches a custom event to signal that a redraw is needed.
 * main.js should listen for this event on the document.
 */
const requestRedrawEvent = () => {
  document.dispatchEvent(
    new CustomEvent('stateChangedForRedraw', { bubbles: true, composed: true })
  );
};

export const VTT_API = {
  /**
   * Retrieves a copy of an object by its ID.
   * @param {string} objectId - The ID of the object to retrieve.
   * @param {VTTObject} [contextObject] - The object whose script is currently executing (for context).
   * @returns {VTTObject | undefined} A copy of the object, or undefined if not found.
   */
  getObject: (objectId, contextObject) => {
    // getLocalObject already returns a copy
    return objects.getLocalObject(objectId);
  },

  /**
   * Updates the 'data' field of a specified object.
   * @param {string} objectId - The ID of the object to update.
   * @param {Object} newData - The new data to merge into the object's existing 'data' property.
   * @param {VTTObject} [contextObject] - The object whose script is currently executing.
   */
  updateObjectState: (objectId, newData, contextObject) => {
    const obj = objects.getLocalObject(objectId); // Gets a copy
    if (obj) {
      // It's crucial that updateLocalObject handles the merge correctly,
      // especially for the 'data' field.
      // We are updating only the 'data' field here as per the spec.
      const updatedData = { ...obj.data, ...newData };
      objects.updateLocalObject(objectId, { data: updatedData });

      // If the update was on the contextObject itself, its reference might be stale.
      // However, scripts are short-lived. The main concern is the central store being updated.
      requestRedrawEvent(); // Signal that the canvas needs to be redrawn
      ui.displayMessage(`Object ${objectId} updated by script.`, 'info', 1500); // Optional feedback
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
