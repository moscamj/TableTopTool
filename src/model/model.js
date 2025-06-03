// src/model.js
import log from "loglevel";
import debug from "debug";

const dModel = debug("app:model");
dModel("model.js module loaded");

/**
 * Dispatches a 'modelChanged' custom event with the given detail.
 * This is the primary mechanism for the model to notify other parts of the application (ViewModels, Views via main.js) about data changes.
 * @param {object} detail - The event detail object, typically including a 'type' (e.g., 'objectAdded', 'panZoomChanged') and 'payload'.
 */
const dispatchModelChangeEvent = (detail) => {
        // Ensure 'document' is available (might not be in pure Node.js test environments without JSDOM)
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
 * Performs a deep comparison of two objects to check if they are equal.
 * Handles primitives, nested objects, and arrays (by virtue of object key iteration).
 * @param {*} obj1 - The first object to compare.
 * @param {*} obj2 - The second object to compare.
 * @returns {boolean} True if the objects are deeply equal, false otherwise.
 */
function objectsAreEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        if (
                obj1 == null ||
    obj2 == null ||
    typeof obj1 !== "object" ||
    typeof obj2 !== "object"
        ) {
                return false;
        }

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) return false;

        for (const key of keys1) {
                if (!keys2.includes(key)) return false;
                // Ensure recursive call is to the same function name
                if (!objectsAreEqual(obj1[key], obj2[key])) return false;
        }
        return true;
}

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

/**
 * @type {Map<string, VTTObject>}
 * Stores all VTT objects currently on the canvas, keyed by their unique IDs.
 */
export const currentObjects = new Map();

/**
 * Generates a basic RFC4122 version 4 compliant UUID.
 * @returns {string} A new UUID string.
 */
const generateUUID = () => {
        // Standard RFC4122 version 4 compliant UUID generator.
        // 'x' characters are replaced with random hexadecimal digits.
        // 'y' characters are replaced with '8', '9', 'a', or 'b' (to satisfy version 4 requirements).
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
                let r = (Math.random() * 16) | 0; // Generate a random number between 0 and 15.
                // For 'y', ensure the bits are 10xx (as per RFC4122 section 4.4).
                // For 'x', use the random number directly.
                let v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16); // Convert to hexadecimal.
        });
};

/**
 * Creates a new VTTObject with the given shape and properties, adds it to the model,
 * and dispatches a 'modelChanged' event of type 'objectAdded'.
 * @param {string} shapeArgument - The basic shape of the object (e.g., 'rectangle', 'circle'). This is used if initialProps.shape is not set.
 * @param {Partial<VTTObject>} [initialProps={}] - Optional initial properties to override defaults. If `id` is provided, it's used; otherwise, a new UUID is generated. If `shape` is provided, it overrides `shapeArgument`.
 * @returns {VTTObject} A copy of the newly created object.
 */
export const createObject = (shapeArgument, initialProps = {}) => {
        // Renamed 'shape' to 'shapeArgument'
        dModel(
                "createObject called with shapeArgument: %s, initialProps: %o",
                shapeArgument,
                initialProps,
        );
        // Determine ID: Use ID from initialProps if available, otherwise generate a new one.
        const idToUse = initialProps.id || generateUUID();
        dModel("Using ID for new object: %s", idToUse);

        // Determine Shape: Use shape from initialProps if available, otherwise use shapeArgument.
        const shapeToUse = initialProps.shape || shapeArgument;

        const defaults = {
                type: shapeToUse === "rectangle" ? "generic-rectangle" : "generic-circle", // Use shapeToUse
                x: 50,
                y: 50,
                zIndex: 0,
                width: shapeToUse === "rectangle" ? 100 : 50, // Corrected: Use shapeToUse
                height: shapeToUse === "rectangle" ? 100 : 50, // Default height, use shapeToUse
                rotation: 0,
                // shape is set below using shapeToUse
                appearance: {
                        backgroundColor: "#CCCCCC", // Default appearance
                        borderColor: "#333333",
                        borderWidth: 1,
                        textColor: "#000000",
                        text: "", // Default label text is empty
                        fontFamily: "Arial",
                        fontSize: 14,
                        showLabel: false, // Default to not showing the label
                },
                isMovable: true,
                data: {},
                scripts: {},
                name: `Object ${currentObjects.size + 1}`,
        };

        const newObject = {
                ...defaults, // Start with defaults
                ...initialProps, // Overlay with all initialProps (from file/caller)
                id: idToUse, // Ensure the determined ID is final
                shape: shapeToUse, // Ensure the determined shape is final
                appearance: {
                        // Deep merge for appearance
                        ...defaults.appearance,
                        ...(initialProps.appearance || {}),
                },
                data: {
                        // Deep merge for data
                        ...defaults.data,
                        ...(initialProps.data || {}),
                },
                scripts: {
                        // Deep merge for scripts
                        ...defaults.scripts,
                        ...(initialProps.scripts || {}),
                },
        };

        currentObjects.set(idToUse, newObject);
        dModel(
                "New object added to currentObjects map. ID: %s, Object: %o",
                idToUse,
                newObject,
        );
        dispatchModelChangeEvent({
                type: "objectAdded",
                payload: { ...newObject },
        }); // Dispatch event
        // console.log(`Object created/loaded: ${idToUse}`, newObject); // Removed for cleaner logs
        dModel("createObject returning copy: %o", newObject);
        return { ...newObject }; // Return a copy
};

/**
 * Updates an existing VTTObject with new properties.
 * If the properties result in an actual change to the object's state (deep comparison),
 * it updates the object in the model and dispatches a 'modelChanged' event of type 'objectUpdated'.
 * @param {string} objectId - The ID of the object to update.
 * @param {Partial<VTTObject>} updatedProps - An object containing properties to update.
 * @returns {VTTObject | null} A copy of the updated object state (even if no change occurred), or null if the object was not found.
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
        dModel("Existing object state for %s: %o", objectId, existingObject);

        // Perform the deep merge to create the potential new state
        const newObjectState = {
                ...existingObject,
                ...updatedProps,
                id: objectId, // Ensure ID is not overwritten by updatedProps
                // Deep merge for nested properties
                appearance: {
                        ...(existingObject.appearance || {}),
                        ...(updatedProps.appearance || {}),
                },
                data: {
                        ...(existingObject.data || {}),
                        ...(updatedProps.data || {}),
                },
                scripts: {
                        ...(existingObject.scripts || {}),
                        ...(updatedProps.scripts || {}),
                },
        };

        // Compare the existing object with the potential new state
        if (!objectsAreEqual(existingObject, newObjectState)) {
                currentObjects.set(objectId, newObjectState);
                dModel(
                        "Object %s updated in currentObjects map. New state: %o",
                        objectId,
                        newObjectState,
                );
                log.info(
                        `Object [${objectId}] updated. Name: '${newObjectState.name || "N/A"}'`,
                        newObjectState,
                );
                dispatchModelChangeEvent({
                        type: "objectUpdated",
                        payload: { ...newObjectState },
                });
                // console.log(`Object updated: ${objectId}`, newObjectState); // Removed for cleaner logs
        } else {
                dModel(
                        "Object update for %s resulted in no changes. Not dispatching event.",
                        objectId,
                );
                // Optional: Log that no change occurred, for debugging, or do nothing.
                // console.log(`Object update for ${objectId} resulted in no changes.`);
        }
        dModel(
                "updateObject returning (potentially unchanged) state for %s: %o",
                objectId,
                newObjectState,
        );
        return { ...newObjectState }; // Always return the (potentially unchanged) new state as a copy
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
                // console.log(`Object deleted: ${objectId}`); // Removed for cleaner logs
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
 * Retrieves a copy of a VTTObject by its ID.
 * @param {string} objectId - The ID of the object to retrieve.
 * @returns {VTTObject | undefined} A copy of the object if found, otherwise undefined.
 */
export const getObject = (objectId) => {
        dModel("getObject called for id: %s", objectId);
        if (!currentObjects.has(objectId)) {
                dModel("getObject: Object %s not found.", objectId);
                return undefined;
        }
        const obj = currentObjects.get(objectId);
        dModel("getObject returning copy for %s: %o", objectId, obj);
        return { ...obj };
};

/**
 * Retrieves copies of all VTTObjects currently in the model.
 * @returns {VTTObject[]} An array of VTTObject copies.
 */
export const getAllObjects = () => {
        dModel("getAllObjects called");
        const allObjects = Array.from(currentObjects.values()).map((obj) => ({
                ...obj,
        }));
        dModel("getAllObjects returning %d objects.", allObjects.length);
        return allObjects;
};

/**
 * Removes all VTTObjects from the model.
 * Dispatches a 'modelChanged' event of type 'allObjectsCleared'.
 */
export const clearAllObjects = () => {
        dModel("clearAllObjects called");
        currentObjects.clear();
        dModel("currentObjects map cleared.");
        // console.log('All local objects cleared.'); // Removed for cleaner logs
        dispatchModelChangeEvent({ type: "allObjectsCleared", payload: null });
};

// --- Board State Management ---

/**
 * @const {Object<string, number>} MM_PER_UNIT
 * Conversion factors from various units to millimeters.
 * Used for calculating board dimensions in a consistent internal unit (mm, interpreted as pixels for rendering at 1:1).
 */
export const MM_PER_UNIT = {
        in: 25.4, // Inches to millimeters
        ft: 304.8, // Feet to millimeters
        m: 1000,
        cm: 10, // Centimeters to millimeters
        mm: 1, // Millimeters to millimeters
};

/** @type {{panX: number, panY: number, zoom: number}} Current pan and zoom state of the canvas. */
let panZoomState = { panX: 0, panY: 0, zoom: 1.0 };

/** @type {{type: 'color' | 'image', value: string}} Current table background configuration. */
let tableBackground = { type: "color", value: "#cccccc" }; // Default background

/** @type {string | null} ID of the currently selected object, or null if no object is selected. */
let selectedObjectId = null;

/**
 * @type {{widthUser: number, heightUser: number, unitForDimensions: string, widthPx: number, heightPx: number}}
 * Physical dimensions of the board.
 * `widthUser` and `heightUser` are the user-defined values in `unitForDimensions`.
 * `widthPx` and `heightPx` are the calculated dimensions in millimeters (used as pixels for rendering).
 */
let boardPhysical = {
        widthUser: 36, // User-defined width (e.g., 36 inches)
        heightUser: 24, // User-defined height (e.g., 24 inches)
        unitForDimensions: "in", // Unit for user-defined dimensions
        widthPx: 36 * MM_PER_UNIT["in"], // Calculated width in mm (pixels)
        heightPx: 24 * MM_PER_UNIT["in"], // Calculated height in mm (pixels)
};

/**
 * @type {{ratio: number, unitForRatio: string}}
 * Map scale interpretation properties.
 * Defines how distances on the map relate to real-world or game-world units if a scale is applied.
 * E.g., 1 inch on map = 5 feet in game. (Currently, `ratio` might be pixels per unitForRatio, e.g. 1px per mm)
 */
let mapInterpretationScale = {
        ratio: 1, // Default scale ratio (e.g., 1 if 1px = 1mm on the map)
        unitForRatio: "mm", // Unit that the ratio applies to (e.g., 'mm', 'ft')
};

// Getters
/**
 * Retrieves a copy of the current pan and zoom state of the canvas.
 * @returns {{panX: number, panY: number, zoom: number}} The current pan and zoom state.
 */
export const getPanZoomState = () => {
        dModel("getPanZoomState called, returning: %o", panZoomState);
        return { ...panZoomState };
};

/**
 * Retrieves a copy of the current table background configuration.
 * @returns {{type: 'color' | 'image', value: string}} The current background configuration.
 */
export const getTableBackground = () => {
        dModel("getTableBackground called, returning: %o", tableBackground);
        return { ...tableBackground };
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
 * Retrieves a consolidated object of current board properties.
 * This includes user-defined dimensions, their units, calculated pixel dimensions, and map scale interpretation.
 * @returns {{widthUser: number, heightUser: number, unitForDimensions: string, widthPx: number, heightPx: number, scaleRatio: number, unitForRatio: string}}
 * An object containing all current board properties.
 */
export const getBoardProperties = () => {
        return {
                widthUser: boardPhysical.widthUser,
                heightUser: boardPhysical.heightUser,
                unitForDimensions: boardPhysical.unitForDimensions,
                widthPx: boardPhysical.widthPx,
                heightPx: boardPhysical.heightPx,
                scaleRatio: mapInterpretationScale.ratio,
                unitForRatio: mapInterpretationScale.unitForRatio,
        };
};

// Setters
/**
 * Updates the pan and/or zoom state of the canvas.
 * Dispatches a 'modelChanged' event of type 'panZoomChanged' if any value changes.
 * Zoom is clamped between 0.1 and 10.
 * @param {{panX?: number, panY?: number, zoom?: number}} newState - An object containing new panX, panY, or zoom values.
 */
export const setPanZoomState = (newState) => {
        dModel("setPanZoomState called with newState: %o", newState);
        const { panX: newPanX, panY: newPanY, zoom: newZoom } = newState;
        let changed = false;

        if (newPanX !== undefined && newPanX !== panZoomState.panX) {
                dModel("panX changed from %d to %d", panZoomState.panX, newPanX);
                panZoomState.panX = newPanX;
                changed = true;
        }
        if (newPanY !== undefined && newPanY !== panZoomState.panY) {
                dModel("panY changed from %d to %d", panZoomState.panY, newPanY);
                panZoomState.panY = newPanY;
                changed = true;
        }
        if (newZoom !== undefined && newZoom !== panZoomState.zoom) {
                // Clamp zoom to reasonable values
                const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
                if (clampedZoom !== panZoomState.zoom) {
                        dModel(
                                "zoom changed from %f to %f (clamped from %f)",
                                panZoomState.zoom,
                                clampedZoom,
                                newZoom,
                        );
                        panZoomState.zoom = clampedZoom;
                        changed = true;
                } else {
                        dModel(
                                "zoom change from %f to %f ignored due to clamping resulting in same value.",
                                panZoomState.zoom,
                                newZoom,
                        );
                }
        }

        if (changed) {
                dModel(
                        "PanZoom state changed, dispatching event. New state: %o",
                        panZoomState,
                );
                dispatchModelChangeEvent({
                        type: "panZoomChanged",
                        payload: { ...panZoomState },
                });
        } else {
                dModel("PanZoom state did not change.");
        }
};

/**
 * Sets the table background.
 * Dispatches a 'modelChanged' event of type 'backgroundChanged' if the background actually changes.
 * @param {{type: 'color' | 'image', value: string}} newBackground - The new background configuration object.
 */
export const setTableBackground = (newBackground) => {
        dModel("setTableBackground called with newBackground: %o", newBackground);
        if (newBackground && typeof newBackground === "object") {
                const { type: newType, value: newValue } = newBackground;
                let changed = false;

                if (
                        tableBackground.type !== newType ||
      tableBackground.value !== newValue
                ) {
                        dModel(
                                'Table background changed from type %s, value "%s" to type %s, value "%s"',
                                tableBackground.type,
                                tableBackground.value,
                                newType,
                                newValue,
                        );
                        tableBackground.type = newType;
                        tableBackground.value = newValue;
                        changed = true;
                }

                if (changed) {
                        dModel(
                                "Table background changed, dispatching event. New background: %o",
                                tableBackground,
                        );
                        dispatchModelChangeEvent({
                                type: "backgroundChanged",
                                payload: { ...tableBackground },
                        });
                } else {
                        dModel("Table background did not change.");
                }
        } else {
                dModel("setTableBackground: newBackground is invalid or not an object.");
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
 * Updates various board properties such as user-defined dimensions, units, and map scale.
 * Recalculates pixel dimensions based on user inputs.
 * Dispatches a 'modelChanged' event of type 'boardPropertiesChanged' if any user-facing property
 * or calculated pixel dimension changes.
 * @param {object} newProps - An object containing new board properties to apply.
 * @param {number} [newProps.widthUser] - New user-defined width.
 * @param {number} [newProps.heightUser] - New user-defined height.
 * @param {string} [newProps.unitForDimensions] - New unit for user-defined dimensions (e.g., 'in', 'ft', 'mm').
 * @param {number} [newProps.scaleRatio] - New map scale ratio.
 * @param {string} [newProps.unitForRatio] - New unit for the map scale ratio.
 * @returns {object} The consolidated current board properties after the update.
 */
export const updateBoardProperties = (newProps) => {
        dModel("updateBoardProperties called with newProps: %o", newProps);
        let anyPropertyChanged = false;

        // Store old pixel values for comparison later
        const oldWidthPx = boardPhysical.widthPx;
        const oldHeightPx = boardPhysical.heightPx;
        dModel(
                "Old board pixel dimensions: widthPx=%f, heightPx=%f",
                oldWidthPx,
                oldHeightPx,
        );

        // Update physical board dimensions and their unit
        const newWidthUser =
    newProps.widthUser !== undefined
            ? parseFloat(newProps.widthUser)
            : boardPhysical.widthUser;
        // Ensure positive
        if (
                !isNaN(newWidthUser) &&
    boardPhysical.widthUser !== newWidthUser &&
    newWidthUser > 0
        ) {
                dModel(
                        "boardPhysical.widthUser changed from %f to %f",
                        boardPhysical.widthUser,
                        newWidthUser,
                );
                boardPhysical.widthUser = newWidthUser;
                anyPropertyChanged = true;
        }

        const newHeightUser =
    newProps.heightUser !== undefined
            ? parseFloat(newProps.heightUser)
            : boardPhysical.heightUser;
        // Ensure positive
        if (
                !isNaN(newHeightUser) &&
    boardPhysical.heightUser !== newHeightUser &&
    newHeightUser > 0
        ) {
                dModel(
                        "boardPhysical.heightUser changed from %f to %f",
                        boardPhysical.heightUser,
                        newHeightUser,
                );
                boardPhysical.heightUser = newHeightUser;
                anyPropertyChanged = true;
        }

        if (
                newProps.unitForDimensions &&
    MM_PER_UNIT[newProps.unitForDimensions] &&
    boardPhysical.unitForDimensions !== newProps.unitForDimensions
        ) {
                dModel(
                        "boardPhysical.unitForDimensions changed from %s to %s",
                        boardPhysical.unitForDimensions,
                        newProps.unitForDimensions,
                );
                boardPhysical.unitForDimensions = newProps.unitForDimensions;
                anyPropertyChanged = true;
        }

        // Update map interpretation scale properties
        const newScaleRatio =
    newProps.scaleRatio !== undefined
            ? parseFloat(newProps.scaleRatio)
            : mapInterpretationScale.ratio;
        // Allow scaleRatio = 0, but not negative.
        if (
                !isNaN(newScaleRatio) &&
    mapInterpretationScale.ratio !== newScaleRatio &&
    newScaleRatio >= 0
        ) {
                dModel(
                        "mapInterpretationScale.ratio changed from %f to %f",
                        mapInterpretationScale.ratio,
                        newScaleRatio,
                );
                mapInterpretationScale.ratio = newScaleRatio;
                anyPropertyChanged = true;
        }

        if (
                newProps.unitForRatio &&
    MM_PER_UNIT[newProps.unitForRatio] &&
    mapInterpretationScale.unitForRatio !== newProps.unitForRatio
        ) {
                dModel(
                        "mapInterpretationScale.unitForRatio changed from %s to %s",
                        mapInterpretationScale.unitForRatio,
                        newProps.unitForRatio,
                );
                mapInterpretationScale.unitForRatio = newProps.unitForRatio;
                anyPropertyChanged = true;
        }

        // Always recalculate pixel dimensions using the potentially updated user values and units
        const unitMultiplier =
    MM_PER_UNIT[boardPhysical.unitForDimensions] || MM_PER_UNIT["in"];
        boardPhysical.widthPx = boardPhysical.widthUser * unitMultiplier;
        boardPhysical.heightPx = boardPhysical.heightUser * unitMultiplier;
        dModel(
                "Recalculated board pixel dimensions: widthPx=%f, heightPx=%f (multiplier: %f)",
                boardPhysical.widthPx,
                boardPhysical.heightPx,
                unitMultiplier,
        );

        // Check if pixel dimensions actually changed
        const pixelDimensionsChanged =
    boardPhysical.widthPx !== oldWidthPx ||
    boardPhysical.heightPx !== oldHeightPx;
        if (pixelDimensionsChanged) dModel("Pixel dimensions changed.");

        // Dispatch event if any user-facing property changed OR if pixel dimensions changed
        if (anyPropertyChanged || pixelDimensionsChanged) {
                dModel("Board properties or pixel dimensions changed, dispatching event.");
                dispatchModelChangeEvent({
                        type: "boardPropertiesChanged",
                        payload: getBoardProperties(),
                });
        } else {
                dModel(
                        "No user-facing board properties or calculated pixel dimensions changed.",
                );
        }

        const finalBoardProps = getBoardProperties();
        dModel("updateBoardProperties returning: %o", finalBoardProps);
        return finalBoardProps; // Return the current state
};
