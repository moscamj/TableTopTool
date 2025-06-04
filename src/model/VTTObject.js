// src/model/VTTObject.js
import debug from "debug";

const dVTTObject = debug("app:model:VTTObject");

/**
 * Generates a basic RFC4122 version 4 compliant UUID.
 * @returns {string} A new UUID string.
 */
const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        let r = (Math.random() * 16) | 0;
        let v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
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

class VTTObject {
    /**
     * Unique identifier (UUID).
     * @type {string}
     */
    id;
    /**
     * General type classification (e.g., 'token', 'card', 'mapTile').
     * @type {string}
     */
    type;
    /**
     * X-coordinate on the canvas.
     * @type {number}
     */
    x;
    /**
     * Y-coordinate on the canvas.
     * @type {number}
     */
    y;
    /**
     * Stacking order.
     * @type {number}
     */
    zIndex;
    /**
     * Width of the object.
     * @type {number}
     */
    width;
    /**
     * Height of the object.
     * @type {number}
     */
    height;
    /**
     * Rotation angle in degrees.
     * @type {number}
     */
    rotation;
    /**
     * The specific shape to render.
     * @type {'rectangle' | 'circle'}
     */
    shape;
    /**
     * How the object looks.
     * @type {VTTObjectAppearance}
     */
    appearance;
    /**
     * If the object can be moved by users.
     * @type {boolean}
     */
    isMovable;
    /**
     * User-defined custom data (e.g., character stats, card effects).
     * @type {Object<string, any>}
     */
    data;
    /**
     * Scripts associated with the object.
     * @type {VTTObjectScripts}
     */
    scripts;
    /**
     * Optional display name for the object.
     * @type {string}
     */
    name;

    /**
     * Creates an instance of VTTObject.
     * @param {string} shapeArgument - The basic shape of the object (e.g., 'rectangle', 'circle'). This is used if initialProps.shape is not set.
     * @param {Partial<VTTObject>} [initialProps={}] - Optional initial properties to override defaults. If `id` is provided, it's used; otherwise, a new UUID is generated. If `shape` is provided, it overrides `shapeArgument`.
     * @param {number} [objectCountForDefaultName=0] - Used to generate a default name if not provided.
     */
    constructor(shapeArgument, initialProps = {}, objectCountForDefaultName = 0) {
        dVTTObject(
            "Constructing VTTObject with shapeArgument: %s, initialProps: %o",
            shapeArgument,
            initialProps,
        );

        this.id = initialProps.id || VTTObject.generateUUID();
        dVTTObject("Using ID for new object: %s", this.id);

        this.shape = initialProps.shape || shapeArgument;

        const defaults = {
            type: this.shape === "rectangle" ? "generic-rectangle" : "generic-circle",
            x: 50,
            y: 50,
            zIndex: 0,
            width: this.shape === "rectangle" ? 100 : 50,
            height: this.shape === "rectangle" ? 100 : 50,
            rotation: 0,
            appearance: {
                backgroundColor: "#CCCCCC",
                borderColor: "#333333",
                borderWidth: 1,
                textColor: "#000000",
                text: "",
                fontFamily: "Arial",
                fontSize: 14,
                showLabel: false,
            },
            isMovable: true,
            data: {},
            scripts: {},
            name: `Object ${objectCountForDefaultName + 1}`,
        };

        // Apply defaults
        Object.assign(this, defaults);

        // Apply initialProps, ensuring deep merge for nested objects
        if (initialProps) {
            for (const key in initialProps) {
                if (initialProps.hasOwnProperty(key)) {
                    if (typeof initialProps[key] === 'object' && initialProps[key] !== null && !Array.isArray(initialProps[key]) && key in defaults && typeof defaults[key] === 'object' && defaults[key] !== null) {
                        // Deep merge for objects like appearance, data, scripts
                        this[key] = { ...defaults[key], ...initialProps[key] };
                    } else if (key !== 'id' && key !== 'shape') { // id and shape are already handled
                        this[key] = initialProps[key];
                    }
                }
            }
        }

        // Ensure nested objects are fully initialized if not present in initialProps
        this.appearance = { ...defaults.appearance, ...(initialProps.appearance || {}) };
        this.data = { ...defaults.data, ...(initialProps.data || {}) };
        this.scripts = { ...defaults.scripts, ...(initialProps.scripts || {}) };


        dVTTObject("VTTObject constructed: %o", this);
    }

    static generateUUID = generateUUID;

    /**
     * Updates the object's properties.
     * @param {Partial<VTTObject>} updatedProps - An object containing properties to update.
     * @returns {boolean} True if any property was changed, false otherwise.
     */
    update(updatedProps) {
        dVTTObject("update called for id: %s, updatedProps: %o", this.id, updatedProps);
        let changed = false;

        for (const key in updatedProps) {
            if (updatedProps.hasOwnProperty(key) && key !== 'id') { // ID should not be changed
                const newValue = updatedProps[key];
                const oldValue = this[key];

                if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue) && oldValue !== null && typeof oldValue === 'object') {
                    // Deep merge for nested objects like appearance, data, scripts
                    const nestedChanged = this._updateNestedObject(oldValue, newValue);
                    if (nestedChanged) changed = true;
                } else if (!VTTObject.objectsAreEqual(oldValue, newValue)) {
                    this[key] = newValue;
                    changed = true;
                    dVTTObject("Property %s changed from %o to %o", key, oldValue, newValue);
                }
            }
        }

        if (changed) {
            dVTTObject("Object %s updated. New state: %o", this.id, this);
        } else {
            dVTTObject("Object update for %s resulted in no changes.", this.id);
        }
        return changed;
    }

    /**
     * Helper to update nested objects (e.g., appearance, data).
     * @param {object} target - The target object to update (e.g., this.appearance).
     * @param {object} source - The source object with new values (e.g., updatedProps.appearance).
     * @returns {boolean} True if any property in the nested object was changed.
     * @private
     */
    _updateNestedObject(target, source) {
        let nestedChanged = false;
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (!VTTObject.objectsAreEqual(target[key], source[key])) {
                    target[key] = source[key];
                    nestedChanged = true;
                }
            }
        }
        return nestedChanged;
    }

    /**
     * Performs a deep comparison of two objects to check if they are equal.
     * Handles primitives, nested objects, and arrays.
     * @param {*} obj1 - The first object to compare.
     * @param {*} obj2 - The second object to compare.
     * @returns {boolean} True if the objects are deeply equal, false otherwise.
     */
    static objectsAreEqual(obj1, obj2) {
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
            if (!VTTObject.objectsAreEqual(obj1[key], obj2[key])) return false;
        }
        return true;
    }
}

export default VTTObject;
