// src/api.js
import log from "loglevel";
import debug from "debug";
import * as model from "./model/model.js";

const dApi = debug("app:api");
dApi("api.js module loaded");

let showMessageCallback = null;

/**
 * Initializes the VTT_API module, primarily by setting up necessary callbacks.
 * @param {object} config - Configuration object for the API.
 * @param {function(text: string, type: string, duration?: number): void} config.showMessage - Callback function to display messages to the user.
 */
export function VTT_API_INIT(config) {
        dApi("VTT_API_INIT called with config: %o", config);
        if (config && typeof config.showMessage === "function") {
                showMessageCallback = config.showMessage;
                dApi("showMessageCallback set");
        } else {
                log.error("VTT_API_INIT: showMessage callback not provided or invalid.");
                dApi("showMessageCallback NOT set due to invalid config");
        }
}

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
                dApi("getObject called for id: %s, context: %o", objectId, contextObject);
                // model.getObject is expected to return a copy
                const obj = model.getObject(objectId);
                dApi("getObject returning: %o", obj);
                return obj;
        },

        /**
   * Updates the 'data' field of a specified object.
   * @param {string} objectId - The ID of the object to update.
   * @param {Object} newData - The new data to merge into the object's existing 'data' property.
   * @param {VTTObject} [contextObject] - The object whose script is currently executing.
   */
        updateObjectState: (objectId, newData, contextObject) => {
                dApi(
                        "updateObjectState called for id: %s, newData: %o, context: %o",
                        objectId,
                        newData,
                        contextObject,
                );
                const obj = model.getObject(objectId); // model.getObject returns a copy
                if (obj) {
                        // We are updating only the 'data' field here as per the spec.
                        const updatedData = { ...obj.data, ...newData };
                        dApi("Updating object %s with merged data: %o", objectId, updatedData);
                        model.updateObject(objectId, { data: updatedData });

                        // If the update was on the contextObject itself, its reference might be stale.
                        // However, scripts are short-lived. The main concern is the central store being updated.
                        // requestRedrawEvent(); // Removed: model.updateObject should trigger 'modelChanged'
                        if (typeof showMessageCallback === "function") {
                                showMessageCallback(
                                        `Object ${objectId} updated by script.`,
                                        "info",
                                        1500,
                                ); // Optional feedback
                        }
                        dApi("updateObjectState completed for id: %s", objectId);
                } else {
                        log.warn(`[VTT_API.updateObjectState] Object ${objectId} not found.`);
                        dApi("updateObjectState failed: Object %s not found", objectId);
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
                        : "[Script Log - Global]";
                log.info(prefix, message); // This is already a log, using loglevel.info
                dApi("VTT_API.log called. Prefix: %s, Message: %o", prefix, message); // Added debug log

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
        createObject: (arg1, arg2) => {
                // arg1 can be shape (string) or full object props
                dApi("createObject called with: %o, %o", arg1, arg2);
                let shape, initialProps;
                if (
                        typeof arg1 === "string" &&
      (typeof arg2 === "object" || arg2 === undefined)
                ) {
                        // Called as VTT_API.createObject('rectangle', {x:10, ...}) or VTT_API.createObject('rectangle')
                        shape = arg1;
                        initialProps = arg2 || {}; // Ensure initialProps is an object
                        dApi("createObject: shape from string, initialProps: %o", initialProps);
                } else if (typeof arg1 === "object" && arg2 === undefined) {
                        // Called as VTT_API.createObject({id:'id1', shape:'circle', ...})
                        initialProps = arg1;
                        shape = initialProps.shape; // Get shape from the object itself
                        dApi("createObject: shape from object, initialProps: %o", initialProps);
                        if (!shape) {
                                log.error(
                                        "VTT_API.createObject: Object argument missing 'shape' property.",
                                        arg1,
                                );
                                dApi(
                                        'createObject error: Object argument missing "shape" property. %o',
                                        arg1,
                                );
                                return null; // Or throw error
                        }
                } else {
                        log.error("VTT_API.createObject: Invalid arguments.", arg1, arg2);
                        dApi("createObject error: Invalid arguments. %o, %o", arg1, arg2);
                        return null; // Or throw error
                }
                // model.createObject now expects (shapeArgument, initialProps)
                // initialProps contains the full object data if loaded from file, including its own shape.
                // shape (derived above) acts as shapeArgument for model.createObject.
                const newObj = model.createObject(shape, initialProps);
                dApi("createObject: model.createObject returned: %o", newObj);
                return newObj;
        },

        /**
   * Updates an existing object with new properties.
   * @param {string} objectId - The ID of the object to update.
   * @param {Partial<VTTObject>} updatedProps - An object containing the properties to update.
   * @returns {VTTObject | null} A copy of the updated object, or null if the object was not found or update failed.
   */
        updateObject: (objectId, updatedProps) => {
                dApi(
                        "updateObject called for id: %s, updatedProps: %o",
                        objectId,
                        updatedProps,
                );
                const updatedObj = model.updateObject(objectId, updatedProps);
                dApi("updateObject: model.updateObject returned: %o", updatedObj);
                return updatedObj;
        },

        /**
   * Deletes an object from the canvas.
   * @param {string} objectId - The ID of the object to delete.
   * @returns {boolean} True if deletion was successful, false otherwise.
   */
        deleteObject: (objectId) => {
                dApi("deleteObject called for id: %s", objectId);
                const result = model.deleteObject(objectId);
                dApi("deleteObject: model.deleteObject returned: %s", result);
                return result;
        },

        /**
   * Retrieves copies of all objects currently on the canvas.
   * @returns {VTTObject[]} An array of object copies.
   */
        getAllObjects: () => {
                dApi("getAllObjects called");
                const allObjects = model.getAllObjects();
                dApi("getAllObjects returning %d objects.", allObjects.length);
                return allObjects;
        },

        /**
   * Removes all objects from the canvas.
   */
        clearAllObjects: () => {
                dApi("clearAllObjects called");
                model.clearAllObjects();
                dApi("clearAllObjects: model.clearAllObjects executed");
        },

        /**
   * Sets the background of the table (canvas).
   * @param {object} backgroundProps - Properties for the background.
   * @param {'color' | 'image'} backgroundProps.type - The type of background.
   * @param {string} backgroundProps.value - The color value (e.g., '#RRGGBB') or image URL.
   */
        setTableBackground: (backgroundProps) => {
                dApi("setTableBackground called with: %o", backgroundProps);
                // model.setTableBackground will dispatch a modelChanged event,
                // which is handled by main.js to trigger a redraw event.
                model.setTableBackground(backgroundProps);
                dApi("setTableBackground: model.setTableBackground executed");
        },

        /**
   * Displays a message to the user via the registered showMessageCallback.
   * @param {string} text - The message text.
   * @param {'info' | 'success' | 'warning' | 'error'} type - The type of message.
   * @param {number} [duration] - Optional duration in milliseconds for how long the message should be visible.
   */
        showMessage: (text, type, duration) => {
                dApi(
                        'showMessage called: Text - "%s", Type - %s, Duration - %dms',
                        text,
                        type,
                        duration,
                );
                if (typeof showMessageCallback === "function") {
                        showMessageCallback(text, type, duration);
                        dApi("showMessage: showMessageCallback executed");
                } else {
                        // Fallback if not initialized, though this shouldn't happen in a correctly initialized app
                        log.warn(`VTT_API.showMessage (fallback): ${type} - ${text}`);
                        dApi("showMessage: showMessageCallback NOT available, fallback used.");
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
                dApi("setBoardProperties called with: %o", properties);
                // properties is an object e.g., { widthUser: 36, heightUser: 24, unitForDimensions: 'in', scaleRatio: 1, unitForRatio: 'mm' }
                const currentBoardProps = model.updateBoardProperties(properties);
                dApi(
                        "setBoardProperties: model.updateBoardProperties returned: %o",
                        currentBoardProps,
                );
                // model.updateBoardProperties will dispatch a modelChanged event.
                return currentBoardProps; // Return the confirmed, possibly recalculated, properties.
        },

        /**
   * Retrieves the current board properties.
   * @returns {object} An object containing board properties (widthUser, heightUser, unitForDimensions, widthPx, heightPx, scaleRatio, unitForRatio).
   */
        getBoardProperties: () => {
                dApi("getBoardProperties called");
                const props = model.getBoardProperties();
                dApi("getBoardProperties returning: %o", props);
                return props;
        },

        /**
   * Retrieves the current pan and zoom state of the canvas.
   * @returns {object} An object with panX, panY, and zoom properties.
   */
        getPanZoomState: () => {
                dApi("getPanZoomState called");
                const state = model.getPanZoomState();
                dApi("getPanZoomState returning: %o", state);
                return state;
        },

        /**
   * Sets the pan and zoom state of the canvas.
   * @param {object} newState - An object with panX, panY, and/or zoom properties to update.
   */
        setPanZoomState: (newState) => {
                dApi("setPanZoomState called with: %o", newState);
                model.setPanZoomState(newState);
                dApi("setPanZoomState: model.setPanZoomState executed");
        },

        /**
   * Retrieves the current table background configuration.
   * @returns {object} An object with type ('color' or 'image') and value (color string or image URL).
   */
        getTableBackground: () => {
                dApi("getTableBackground called");
                const bg = model.getTableBackground();
                dApi("getTableBackground returning: %o", bg);
                return bg;
        },
        // setTableBackground already exists and calls model.setTableBackground

        /**
   * Retrieves the ID of the currently selected object.
   * @returns {string | null} The ID of the selected object, or null if no object is selected.
   */
        getSelectedObjectId: () => {
                dApi("getSelectedObjectId called");
                const id = model.getSelectedObjectId();
                dApi("getSelectedObjectId returning: %s", id);
                return id;
        },

        /**
   * Sets the currently selected object.
   * @param {string | null} id - The ID of the object to select, or null to deselect.
   */
        setSelectedObjectId: (id) => {
                dApi("setSelectedObjectId called with id: %s", id);
                model.setSelectedObjectId(id);
                dApi("setSelectedObjectId: model.setSelectedObjectId executed");
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
