// src/model.js
import log from "loglevel";
import debug from "debug";
import VTTObject from "./VTTObject.js"; // Import VTTObject class
import Board from "./Board.js"; // Import Board class

const dModel = debug("app:model");
dModel("model.js module loaded - Refactored");

/**
 * Dispatches a 'modelChanged' custom event with the given detail.
 * This is the primary mechanism for the model to notify other parts of the application (ViewModels, Views via main.js) about data changes.
 * @param {object} detail - The event detail object, typically including a 'type' (e.g., 'objectAdded', 'panZoomChanged') and 'payload'.
 */
const dispatchModelChangeEvent = (detail) => {
    if (typeof document !== "undefined" && document.dispatchEvent) {
        dModel(
            "Dispatching modelChanged event: Type - %s, Payload: %o",
            detail.type,
            detail.payload,
        );
        document.dispatchEvent(new CustomEvent("modelChanged", { detail }));
    } else {
        log.warn(
            "Cannot dispatch modelChanged event: `document` is not available.",
        );
        dModel(
            "Cannot dispatch modelChanged event: `document` is not available. Detail: %o",
            detail,
        );
    }
};

/**
 * @type {Map<string, VTTObject>}
 * Stores all VTT objects currently on the canvas, keyed by their unique IDs.
 * Now stores instances of the VTTObject class.
 */
export const currentObjects = new Map();

// Instantiate the Board class to manage board-specific state
const board = new Board();

/**
 * Creates a new VTTObject with the given shape and properties, adds it to the model,
 * and dispatches a 'modelChanged' event of type 'objectAdded'.
 * @param {string} shapeArgument - The basic shape of the object (e.g., 'rectangle', 'circle').
 * @param {Partial<VTTObject>} [initialProps={}] - Optional initial properties to override defaults.
 * @returns {VTTObject} A copy of the newly created object's state.
 */
export const createObject = (shapeArgument, initialProps = {}) => {
    dModel(
        "createObject called with shapeArgument: %s, initialProps: %o",
        shapeArgument,
        initialProps,
    );

    // The VTTObject constructor now handles ID generation and default property assignment.
    // Pass currentObjects.size to assist with default naming if necessary.
    const newVTTObject = new VTTObject(shapeArgument, initialProps, currentObjects.size);

    currentObjects.set(newVTTObject.id, newVTTObject);
    dModel(
        "New VTTObject instance added to currentObjects map. ID: %s, Object: %o",
        newVTTObject.id,
        newVTTObject,
    );

    dispatchModelChangeEvent({
        type: "objectAdded",
        payload: { ...newVTTObject }, // Dispatch a copy of the object's state
    });
    dModel("createObject returning copy of new VTTObject: %o", newVTTObject);
    return { ...newVTTObject }; // Return a copy of the object's state
};

/**
 * Updates an existing VTTObject with new properties.
 * If the properties result in an actual change to the object's state (deep comparison handled by VTTObject.update),
 * it updates the object in the model and dispatches a 'modelChanged' event of type 'objectUpdated'.
 * @param {string} objectId - The ID of the object to update.
 * @param {Partial<VTTObject>} updatedProps - An object containing properties to update.
 * @returns {VTTObject | null} A copy of the updated object state, or null if the object was not found.
 */
export const updateObject = (objectId, updatedProps) => {
    dModel(
        "updateObject called for id: %s, updatedProps: %o",
        objectId,
        updatedProps,
    );
    if (!currentObjects.has(objectId)) {
        log.warn(`Object with ID ${objectId} not found for update.`);
        dModel("updateObject failed: Object %s not found", objectId);
        return null;
    }

    const existingObject = currentObjects.get(objectId);
    dModel("Existing VTTObject instance for %s: %o", objectId, existingObject);

    // The VTTObject's update method handles the changes and internal comparison
    const changed = existingObject.update(updatedProps);

    if (changed) {
        dModel(
            "VTTObject %s updated. New state: %o",
            objectId,
            existingObject,
        );
        log.info(
            `Object [${objectId}] updated. Name: '${existingObject.name || "N/A"}'`,
            existingObject,
        );
        dispatchModelChangeEvent({
            type: "objectUpdated",
            payload: { ...existingObject }, // Dispatch a copy of the object's state
        });
    } else {
        dModel(
            "Object update for %s resulted in no changes. Not dispatching event.",
            objectId,
        );
    }
    dModel(
        "updateObject returning (potentially unchanged) state for %s: %o",
        objectId,
        existingObject,
    );
    return { ...existingObject }; // Return a copy of the object's current state
};

/**
 * Deletes a VTTObject from the model by its ID.
 * If successful, dispatches a 'modelChanged' event of type 'objectDeleted'.
 * @param {string} objectId - The ID of the object to delete.
 * @returns {boolean} True if the object was found and deleted, false otherwise.
 */
export const deleteObject = (objectId) => {
    dModel("deleteObject called for id: %s", objectId);
    if (currentObjects.has(objectId)) {
        const deleted = currentObjects.delete(objectId);
        if (deleted) {
            dModel("Object %s deleted from currentObjects map.", objectId);
            dispatchModelChangeEvent({
                type: "objectDeleted",
                payload: { id: objectId },
            });
        } else {
            dModel(
                "Object %s was in map, but delete operation returned false.",
                objectId,
            );
        }
        return deleted;
    }
    log.warn(`Object with ID ${objectId} not found for deletion.`);
    dModel("deleteObject failed: Object %s not found for deletion.", objectId);
    return false;
};

/**
 * Retrieves a copy of a VTTObject's state by its ID.
 * @param {string} objectId - The ID of the object to retrieve.
 * @returns {VTTObject | undefined} A copy of the object's state if found, otherwise undefined.
 */
export const getObject = (objectId) => {
    dModel("getObject called for id: %s", objectId);
    if (!currentObjects.has(objectId)) {
        dModel("getObject: Object %s not found.", objectId);
        return undefined;
    }
    const obj = currentObjects.get(objectId);
    dModel("getObject returning copy for %s: %o", objectId, obj);
    return { ...obj }; // Return a copy of the object's state
};

/**
 * Retrieves copies of all VTTObjects' states currently in the model.
 * @returns {VTTObject[]} An array of VTTObject state copies.
 */
export const getAllObjects = () => {
    dModel("getAllObjects called");
    const allObjectStates = Array.from(currentObjects.values()).map((obj) => ({
        ...obj, // Create a shallow copy of each object's state
    }));
    dModel("getAllObjects returning %d object states.", allObjectStates.length);
    return allObjectStates;
};

/**
 * Removes all VTTObjects from the model.
 * Dispatches a 'modelChanged' event of type 'allObjectsCleared'.
 */
export const clearAllObjects = () => {
    dModel("clearAllObjects called");
    currentObjects.clear();
    dModel("currentObjects map cleared.");
    dispatchModelChangeEvent({ type: "allObjectsCleared", payload: null });
};

// --- Board State Management ---
// Board state is now managed by the Board class instance.
// MM_PER_UNIT is now in Board.js

/** @type {string | null} ID of the currently selected object, or null if no object is selected. */
let selectedObjectId = null; // Remains in model.js for now

// Getters - Delegate to Board instance
/**
 * Retrieves a copy of the current pan and zoom state from the Board.
 * @returns {{panX: number, panY: number, zoom: number}} The current pan and zoom state.
 */
export const getPanZoomState = () => {
    return board.getPanZoomState();
};

/**
 * Retrieves a copy of the current table background configuration from the Board.
 * @returns {{type: 'color' | 'image', value: string}} The current background configuration.
 */
export const getTableBackground = () => {
    return board.getTableBackground();
};

/**
 * Retrieves the ID of the currently selected object.
 * @returns {string | null} The ID of the selected object, or null if no object is selected.
 */
export const getSelectedObjectId = () => {
    dModel("getSelectedObjectId called, returning: %s", selectedObjectId);
    return selectedObjectId;
};

/**
 * Retrieves a consolidated object of current board properties from the Board.
 * @returns {{widthUser: number, heightUser: number, unitForDimensions: string, widthPx: number, heightPx: number, scaleRatio: number, unitForRatio: string}}
 */
export const getBoardProperties = () => {
    return board.getBoardProperties();
};

// Setters - Delegate to Board instance, dispatch events if changed
/**
 * Updates the pan and/or zoom state of the canvas via the Board instance.
 * Dispatches a 'modelChanged' event of type 'panZoomChanged' if any value changes.
 * @param {{panX?: number, panY?: number, zoom?: number}} newState - An object containing new panX, panY, or zoom values.
 */
export const setPanZoomState = (newState) => {
    const changed = board.setPanZoomState(newState);
    if (changed) {
        dModel(
            "PanZoom state changed via Board, dispatching event. New state: %o",
            board.getPanZoomState(), // Get the latest state from board
        );
        dispatchModelChangeEvent({
            type: "panZoomChanged",
            payload: board.getPanZoomState(),
        });
    } else {
        dModel("PanZoom state did not change via Board.");
    }
};

/**
 * Sets the table background via the Board instance.
 * Dispatches a 'modelChanged' event of type 'backgroundChanged' if the background actually changes.
 * @param {{type: 'color' | 'image', value: string}} newBackground - The new background configuration object.
 */
export const setTableBackground = (newBackground) => {
    const changed = board.setTableBackground(newBackground);
    if (changed) {
        dModel(
            "Table background changed via Board, dispatching event. New background: %o",
            board.getTableBackground(), // Get the latest state from board
        );
        dispatchModelChangeEvent({
            type: "backgroundChanged",
            payload: board.getTableBackground(),
        });
    } else {
        dModel("Table background did not change via Board.");
    }
};

/**
 * Sets the ID of the currently selected object.
 * Dispatches a 'modelChanged' event of type 'selectionChanged' if the selection changes.
 * @param {string | null} id - The ID of the object to select, or null to deselect.
 */
export const setSelectedObjectId = (id) => {
    dModel("setSelectedObjectId called with id: %s", id);
    if (selectedObjectId !== id) {
        dModel("Selected object ID changed from %s to %s", selectedObjectId, id);
        selectedObjectId = id;
        dispatchModelChangeEvent({
            type: "selectionChanged",
            payload: selectedObjectId,
        });
    } else {
        dModel("Selected object ID did not change (%s).", id);
    }
};

/**
 * Updates various board properties via the Board instance.
 * Dispatches a 'modelChanged' event of type 'boardPropertiesChanged' if any property changes.
 * @param {object} newProps - An object containing new board properties to apply.
 * @returns {object} The consolidated current board properties after the update.
 */
export const updateBoardProperties = (newProps) => {
    const { changed, newProperties } = board.updateBoardProperties(newProps);
    if (changed) {
        dModel("Board properties changed via Board, dispatching event.");
        dispatchModelChangeEvent({
            type: "boardPropertiesChanged",
            payload: newProperties,
        });
    } else {
        dModel(
            "No user-facing board properties or calculated pixel dimensions changed via Board.",
        );
    }
    return newProperties;
};

// The objectsAreEqual function is no longer needed here as VTTObject.objectsAreEqual will be used.
// Ensure it is removed from this file if it existed.
