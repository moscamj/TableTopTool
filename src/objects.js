// src/objects.js

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

let currentObjects = new Map();

// Basic UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function createGenericObject(shape, initialProps = {}) {
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
            text: '',
            fontFamily: 'Arial',
            fontSize: 14,
        },
        isMovable: true,
        data: {},
        scripts: {},
        name: `Object ${currentObjects.size + 1}`
    };

    // Deep merge for appearance, data, and scripts, shallow for others
    const newObject = {
        ...defaults,
        ...initialProps,
        id, // Ensure ID is not overwritten by initialProps
        shape, // Ensure shape is correctly set from the argument
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
    return { ...newObject }; // Return a copy
}

export function updateLocalObject(objectId, updatedProps) {
    if (!currentObjects.has(objectId)) {
        console.warn(`Object with ID ${objectId} not found for update.`);
        return null;
    }

    const existingObject = currentObjects.get(objectId);

    // Deep merge for nested properties, shallow for others
    const newObjectState = {
        ...existingObject,
        ...updatedProps,
        id: objectId, // Ensure ID cannot be changed by updatedProps
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
    return { ...newObjectState }; // Return a copy
}

export function deleteLocalObject(objectId) {
    if (currentObjects.has(objectId)) {
        const deleted = currentObjects.delete(objectId);
        console.log(`Object deleted: ${objectId}`);
        return deleted; // Returns true if deletion was successful, false otherwise
    }
    console.warn(`Object with ID ${objectId} not found for deletion.`);
    return false;
}

export function getLocalObject(objectId) {
    if (!currentObjects.has(objectId)) {
        // console.warn(`Object with ID ${objectId} not found.`); // Keep this quiet as per instruction
        return undefined;
    }
    // Return a copy to prevent direct modification of the stored object outside of updateLocalObject
    return { ...currentObjects.get(objectId) };
}

export function getAllLocalObjects() {
    // Return an array of copies
    return Array.from(currentObjects.values()).map(obj => ({ ...obj }));
}

export function clearLocalObjects() {
    currentObjects.clear();
    console.log('All local objects cleared.');
}

// Example usage (for testing in browser console if needed, or for main.js)
// window.objectStore = {
// createGenericObject,
// updateLocalObject,
// deleteLocalObject,
// getLocalObject,
// getAllLocalObjects,
// clearLocalObjects,
// currentObjects // For direct inspection if needed during debugging
// };
