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

export const createGenericObject = (shape, initialProps = {}) => {
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

  // Merge strategy:
  // - Top-level properties: initialProps override defaults (shallow merge).
  // - Nested 'appearance', 'data', 'scripts': Properties from initialProps are merged into default nested objects.
  //   The `|| {}` ensures that if e.g. `initialProps.appearance` is undefined, it doesn't break the spread.
  const newObject = {
    ...defaults, // Start with default values.
    ...initialProps, // Override with any top-level initial properties.
    id, // Ensure 'id' is always the generated one, not from initialProps.
    shape, // Ensure 'shape' is from the function argument, not from initialProps.
    appearance: {
      ...defaults.appearance,
      ...(initialProps.appearance || {}), // Merge appearance properties.
    },
    data: {
      ...defaults.data,
      ...(initialProps.data || {}), // Merge data properties.
    },
    scripts: {
      ...defaults.scripts,
      ...(initialProps.scripts || {}), // Merge scripts properties.
    },
  };

  currentObjects.set(id, newObject);
  console.log(`Object created: ${id}`, newObject);
  // Return a shallow copy of the new object to prevent direct external modification.
  return { ...newObject };
};

export const updateLocalObject = (objectId, updatedProps) => {
  if (!currentObjects.has(objectId)) {
    console.warn(`Object with ID ${objectId} not found for update.`);
    return null;
  }

  const existingObject = currentObjects.get(objectId);

  // Merge strategy (similar to createGenericObject):
  // - Top-level properties: updatedProps override existingObject properties (shallow merge).
  // - Nested 'appearance', 'data', 'scripts': Properties from updatedProps are merged into existing nested objects.
  //   The `|| {}` ensures that if e.g. `updatedProps.appearance` is undefined, it doesn't break the spread.
  const newObjectState = {
    ...existingObject, // Start with the existing object's properties.
    ...updatedProps, // Override with any top-level updated properties.
    id: objectId, // Ensure the object's ID cannot be changed.
    appearance: {
      ...existingObject.appearance,
      ...(updatedProps.appearance || {}), // Merge appearance properties.
    },
    data: {
      ...existingObject.data,
      ...(updatedProps.data || {}), // Merge data properties.
    },
    scripts: {
      ...existingObject.scripts,
      ...(updatedProps.scripts || {}), // Merge scripts properties.
    },
  };

  currentObjects.set(objectId, newObjectState);
  console.log(`Object updated: ${objectId}`, newObjectState);
  // Return a shallow copy of the updated object state.
  return { ...newObjectState };
};

export const deleteLocalObject = (objectId) => {
  if (currentObjects.has(objectId)) {
    const deleted = currentObjects.delete(objectId);
    console.log(`Object deleted: ${objectId}`); // This was already a template literal
    return deleted; // Returns true if deletion was successful, false otherwise
  }
  console.warn(`Object with ID ${objectId} not found for deletion.`);
  return false;
};

export const getLocalObject = (objectId) => {
  if (!currentObjects.has(objectId)) {
    // console.warn(`Object with ID ${objectId} not found.`);
    return undefined;
  }
  // Return a shallow copy to prevent direct modification of the object in the store.
  return { ...currentObjects.get(objectId) };
};

export const getAllLocalObjects = () => {
  // Returns an array of shallow copies of all objects.
  // The .map call ensures that each object in the returned array is a copy,
  // protecting the original objects in the `currentObjects` Map.
  return Array.from(currentObjects.values()).map((obj) => ({ ...obj }));
};

export const clearLocalObjects = () => {
  currentObjects.clear();
  console.log('All local objects cleared.'); // This is a simple string, no concatenation.
};

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
