// src/viewmodels/canvasViewModel.js

/**
 * Manages the state and logic specific to the canvas view.
 * This includes object positions, pan/zoom state, background, selection,
 * board properties, loaded images, and coordinate conversions.
 * It receives data updates from model changes (via main.js) and provides
 * data for rendering to canvasView.js.
 */
class CanvasViewModel {
    /**
     * Creates an instance of CanvasViewModel.
     * @param {function(): void} onDrawNeededCallback - A callback function to be invoked when the canvas needs to be redrawn.
     * @param {function(text: string, type: string, duration?: number): void} displayMessageFn - A function to display messages to the user (delegated from UiViewModel).
     */
    constructor(onDrawNeededCallback, displayMessageFn) {
        /** @type {function(): void} Callback to request a redraw of the canvas. */
        this.onDrawNeededCallback = onDrawNeededCallback || (() => console.warn('onDrawNeededCallback not set in ViewModel'));

        /** @type {function(text: string, type: string, duration?: number): void} Function to display user messages. */
        this.displayMessageFn = displayMessageFn || ((msg, type) => console.warn('displayMessageFn not set in ViewModel:', msg, type));

        /** @type {Map<string, VTTObject>} Stores VTT objects for rendering, keyed by ID. */
        this.viewModelObjects = new Map();

        /** @type {{panX: number, panY: number, zoom: number}} Current pan and zoom state. */
        this.viewModelPanZoom = { panX: 0, panY: 0, zoom: 1.0 };

        /** @type {{type: 'color' | 'image', value: string}} Current table background. */
        this.viewModelTableBackground = { type: 'color', value: '#cccccc' }; // Default background

        /** @type {string | null} ID of the currently selected object. */
        this.viewModelSelectedObjectId = null;

        /**
         * @type {{widthUser: number, heightUser: number, unitForDimensions: string, widthPx: number, heightPx: number, scaleRatio: number, unitForRatio: string}}
         * Properties of the game board.
         */
        this.viewModelBoardProperties = {
            widthUser: 36, heightUser: 24, unitForDimensions: 'in', // User-facing dimensions
            widthPx: 1000, heightPx: 800, // Pixel dimensions for rendering (example defaults)
            scaleRatio: 1, unitForRatio: 'mm' // Scale interpretation
        };

        /** @type {Map<string, {img: HTMLImageElement|null, status: 'loading'|'loaded'|'error'}>} Cache for loaded images. */
        this.loadedImages = new Map(); // url -> { img: Image, status: 'loading' | 'loaded' | 'error' }
    }

    // --- Getters ---
    /** @returns {Map<string, VTTObject>} The map of objects for rendering. */
    getObjects() {
        return this.viewModelObjects;
    }

    /** @returns {{panX: number, panY: number, zoom: number}} The current pan and zoom state. */
    getPanZoom() {
        return this.viewModelPanZoom;
    }

    /** @returns {{type: 'color' | 'image', value: string}} The current background configuration. */
    getBackground() {
        return this.viewModelTableBackground;
    }

    /** @returns {string | null} The ID of the currently selected object. */
    getSelectedObjectId() {
        return this.viewModelSelectedObjectId;
    }

    /** @returns {{widthUser: number, heightUser: number, unitForDimensions: string, widthPx: number, heightPx: number, scaleRatio: number, unitForRatio: string}} The current board properties. */
    getBoardProperties() {
        return this.viewModelBoardProperties;
    }

    /**
     * Retrieves a loaded image entry from the cache.
     * @param {string} url - The URL of the image.
     * @returns {{img: HTMLImageElement|null, status: 'loading'|'loaded'|'error'} | undefined} The image entry or undefined if not found.
     */
    getLoadedImage(url) {
        return this.loadedImages.get(url);
    }

    // --- ViewModel Update Functions ---
    /**
     * Loads the initial state into the ViewModel.
     * This is typically called once during application startup based on data from the model.
     * @param {object} initialState - The initial state object.
     * @param {Array<VTTObject>} initialState.objects - Objects to load. (Note: API provides Array)
     * @param {{panX: number, panY: number, zoom: number}} initialState.panZoomState - Initial pan/zoom state.
     * @param {{type: 'color' | 'image', value: string}} initialState.tableBackground - Initial background.
     * @param {string | null} initialState.selectedObjectId - Initially selected object ID.
     * @param {object} initialState.boardProperties - Initial board properties.
     */
    loadStateIntoViewModel(initialState) {
        if (!initialState) {
            console.error('[CanvasViewModel] loadStateIntoViewModel: initialState is undefined. Cannot populate ViewModel.');
            this.viewModelObjects.clear();
            this.viewModelPanZoom = { panX: 0, panY: 0, zoom: 1.0 };
            this.viewModelTableBackground = { type: 'color', value: '#cccccc' };
            this.viewModelSelectedObjectId = null;
            this.viewModelBoardProperties = {
                widthUser: 36, heightUser: 24, unitForDimensions: 'in',
                widthPx: 1000, heightPx: 800,
                scaleRatio: 1, unitForRatio: 'mm'
            };
            return;
        }

        this.viewModelObjects.clear();
        if (initialState.objects && Array.isArray(initialState.objects)) {
            initialState.objects.forEach(obj => this.viewModelObjects.set(obj.id, { ...obj }));
        }

        if (initialState.panZoomState) {
            this.viewModelPanZoom = { ...initialState.panZoomState };
        } else {
            this.viewModelPanZoom = { panX: 0, panY: 0, zoom: 1.0 };
        }

        if (initialState.tableBackground) {
            this.viewModelTableBackground = { ...initialState.tableBackground };
        } else {
            this.viewModelTableBackground = { type: 'color', value: '#cccccc' };
        }

        this.viewModelSelectedObjectId = initialState.selectedObjectId !== undefined ? initialState.selectedObjectId : null;

        if (initialState.boardProperties) {
            this.viewModelBoardProperties = { ...initialState.boardProperties };
        } else {
            this.viewModelBoardProperties = {
                widthUser: 36, heightUser: 24, unitForDimensions: 'in',
                widthPx: 1000, heightPx: 800,
                scaleRatio: 1, unitForRatio: 'mm'
            };
        }
    }

    /**
     * Adds a new object to the ViewModel's collection of objects.
     * Typically called when an 'objectAdded' model event occurs.
     * Also initiates loading of the object's image if applicable.
     * @param {VTTObject} objectData - The data for the new object.
     */
    addObjectToViewModel(objectData) {
        if (!objectData || !objectData.id) {
            console.error('[CanvasViewModel] addObjectToViewModel: Invalid objectData provided.', objectData);
            return;
        }
        this.viewModelObjects.set(objectData.id, { ...objectData });
        if (objectData.appearance && objectData.appearance.imageUrl) {
            this.loadImage(objectData.appearance.imageUrl, objectData.appearance.imageUrl);
        }
    }

    /**
     * Updates an existing object in the ViewModel's collection.
     * Typically called when an 'objectUpdated' model event occurs.
     * Handles deep merging for appearance, data, and scripts.
     * Initiates image loading if the image URL changes.
     * @param {string} objectId - The ID of the object to update.
     * @param {Partial<VTTObject>} updatedProps - The properties to update on the object.
     */
    updateObjectInViewModel(objectId, updatedProps) {
        if (!this.viewModelObjects.has(objectId)) {
            console.warn(`[CanvasViewModel] updateObjectInViewModel: Object ID ${objectId} not found in ViewModel.`);
            return;
        }
        const obj = this.viewModelObjects.get(objectId);
        const newAppearance = { ...(obj.appearance || {}), ...(updatedProps.appearance || {}) };
        const newData = { ...(obj.data || {}), ...(updatedProps.data || {}) };
        const newScripts = { ...(obj.scripts || {}), ...(updatedProps.scripts || {}) };

        this.viewModelObjects.set(objectId, {
            ...obj,
            ...updatedProps,
            appearance: newAppearance,
            data: newData,
            scripts: newScripts
        });

        if (updatedProps.appearance && updatedProps.appearance.imageUrl) {
            this.loadImage(updatedProps.appearance.imageUrl, updatedProps.appearance.imageUrl);
        } else if (updatedProps.appearance && updatedProps.appearance.imageUrl === '') {
            this.loadImage(null, obj.appearance?.imageUrl);
        }
    }

    /**
     * Removes an object from the ViewModel's collection.
     * Typically called when an 'objectDeleted' model event occurs.
     * @param {string} objectId - The ID of the object to remove.
     */
    removeObjectFromViewModel(objectId) {
        if (!this.viewModelObjects.has(objectId)) {
            console.warn(`[CanvasViewModel] removeObjectFromViewModel: Object ID ${objectId} not found in ViewModel.`);
            return;
        }
        this.viewModelObjects.delete(objectId);
    }

    /**
     * Sets the pan and zoom state in the ViewModel.
     * Typically called when a 'panZoomChanged' model event occurs.
     * @param {{panX: number, panY: number, zoom: number}} panZoomState - The new pan and zoom state.
     */
    setPanZoomInViewModel(panZoomState) {
        if (!panZoomState) {
            console.error('[CanvasViewModel] setPanZoomInViewModel: panZoomState is undefined.');
            return;
        }
        this.viewModelPanZoom = { ...panZoomState };
    }
    
    /**
     * Updates the pan and zoom state locally for immediate responsiveness during user interaction (e.g., dragging to pan).
     * It directly modifies the ViewModel's pan/zoom state and triggers a redraw.
     * The View is expected to later call VTT_API.setPanZoomState to persist this change to the model.
     * @param {number} [panX] - The new panX value.
     * @param {number} [panY] - The new panY value.
     * @param {number} [zoom] - The new zoom value.
     */
    locallyUpdatePanZoom(panX, panY, zoom) {
        let changed = false;
        if (panX !== undefined && this.viewModelPanZoom.panX !== panX) {
            this.viewModelPanZoom.panX = panX;
            changed = true;
        }
        if (panY !== undefined && this.viewModelPanZoom.panY !== panY) {
            this.viewModelPanZoom.panY = panY;
            changed = true;
        }
        if (zoom !== undefined && this.viewModelPanZoom.zoom !== zoom) {
            this.viewModelPanZoom.zoom = zoom;
            changed = true;
        }
        if (changed) {
            this.onDrawNeededCallback();
        }
    }

    /**
     * Updates an object's position locally for immediate responsiveness during user interaction (e.g., dragging an object).
     * It directly modifies the object's x/y coordinates in the ViewModel and triggers a redraw.
     * The View is expected to later call VTT_API.updateObject to persist this change to the model.
     * @param {string} objectId - The ID of the object being moved.
     * @param {number} x - The new x-coordinate.
     * @param {number} y - The new y-coordinate.
     */
    locallyUpdateObjectPosition(objectId, x, y) {
        const obj = this.viewModelObjects.get(objectId);
        if (obj && (obj.x !== x || obj.y !== y)) {
            obj.x = x;
            obj.y = y;
            this.onDrawNeededCallback();
        }
    }

    /**
     * Sets the background state in the ViewModel.
     * Typically called when a 'backgroundChanged' model event occurs.
     * Initiates loading of the background image if applicable.
     * @param {{type: 'color' | 'image', value: string}} backgroundState - The new background state.
     */
    setBackgroundInViewModel(backgroundState) {
        if (!backgroundState) {
            console.error('[CanvasViewModel] setBackgroundInViewModel: backgroundState is undefined.');
            return;
        }
        this.viewModelTableBackground = { ...backgroundState };
        if (backgroundState.type === 'image' && backgroundState.value) {
            this.loadImage(backgroundState.value, backgroundState.value);
        }
    }

    /**
     * Sets the ID of the currently selected object in the ViewModel.
     * Typically called when a 'selectionChanged' model event occurs.
     * @param {string | null} selectedId - The ID of the selected object, or null.
     */
    setSelectedObjectInViewModel(selectedId) {
        this.viewModelSelectedObjectId = selectedId;
    }

    /**
     * Sets the board properties in the ViewModel.
     * Typically called when a 'boardPropertiesChanged' model event occurs.
     * @param {object} boardProps - The new board properties.
     */
    setBoardPropertiesInViewModel(boardProps) {
        if (!boardProps) {
            console.error('[CanvasViewModel] setBoardPropertiesInViewModel: boardProps is undefined.');
            return;
        }
        this.viewModelBoardProperties = { ...boardProps };
    }

    /**
     * Clears all objects from the ViewModel's collection.
     * Typically called when an 'allObjectsCleared' model event occurs.
     */
    clearAllViewModelObjects() {
        this.viewModelObjects.clear();
        // console.log('[CanvasViewModel] All viewModel objects cleared.'); // Removed for cleaner logs
    }

    // --- Image Loading ---
    /**
     * Loads an image from a URL and caches it.
     * If the image is already loaded or loading, it avoids redundant operations.
     * Triggers a redraw via `onDrawNeededCallback` on load success, error, or if an image is cleared.
     * Displays an error message via `displayMessageFn` on load failure.
     * @param {string | null} url - The URL of the image to load. If null or empty, and a cacheKey is provided,
     *                              it attempts to remove the image associated with cacheKey.
     * @param {string} cacheKey - The key to use for caching this image (often the same as the URL).
     */
    loadImage(url, cacheKey) { // Removed callback, will use this.onDrawNeededCallback
        if (!url) {
            if (this.loadedImages.has(cacheKey)) {
                this.loadedImages.delete(cacheKey);
                if (this.onDrawNeededCallback) this.onDrawNeededCallback();
            }
            return;
        }
        const existingImage = this.loadedImages.get(cacheKey);
        if (existingImage && existingImage.status === 'loaded') {
            if (this.onDrawNeededCallback) this.onDrawNeededCallback();
            return;
        }
        if (existingImage && existingImage.status === 'loading') {
            return;
        }

        this.loadedImages.set(cacheKey, { img: null, status: 'loading' });
        const image = new Image();
        image.crossOrigin = 'Anonymous';
        image.onload = () => {
            this.loadedImages.set(cacheKey, { img: image, status: 'loaded' });
            // console.log(`Successfully loaded image. Key: ${cacheKey}`); // Removed for cleaner logs
            if (this.onDrawNeededCallback) this.onDrawNeededCallback();
        };
        image.onerror = (err) => {
            this.loadedImages.set(cacheKey, { img: null, status: 'error' });
            if (url.startsWith('data:image/')) {
                console.error(`[CanvasViewModel] loadImage: Error loading data URI. Key: ${cacheKey}`, err);
            } else {
                console.error(`[CanvasViewModel] Error loading image: ${url}`, err);
            }
            if (this.onDrawNeededCallback) this.onDrawNeededCallback();
            const errorMsg = `Failed to load image: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`;
            this.displayMessageFn(errorMsg, 'error');
        };
        image.src = url;
    }

    // --- Coordinate Conversion & Object Picking ---
    /**
     * Converts mouse event coordinates from screen space to canvas world space,
     * considering the current pan and zoom state.
     * @param {MouseEvent} event - The mouse event (e.g., mousedown, mousemove).
     * @param {HTMLCanvasElement} canvas - The HTML canvas element, used to get offsetX/offsetY.
     * @returns {{x: number, y: number}} The mouse coordinates in world space.
     */
    getMousePositionOnCanvas(event, canvas) { // canvas element needed for offset calculation
        if (!canvas) return { x: 0, y: 0 };

        const { panX, panY, zoom } = this.viewModelPanZoom;
        const screenX = event.offsetX;
        const screenY = event.offsetY;
        const worldX = (screenX - panX) / zoom;
        const worldY = (screenY - panY) / zoom;
        return { x: worldX, y: worldY };
    }

    /**
     * Determines which object, if any, is at the given world coordinates.
     * Objects are checked in descending order of their zIndex.
     * Supports picking for 'rectangle' and 'circle' shapes, including rotated rectangles.
     * @param {number} worldX - The x-coordinate in canvas world space.
     * @param {number} worldY - The y-coordinate in canvas world space.
     * @returns {string | null} The ID of the topmost object at the given coordinates, or null if no object is found.
     */
    getObjectAtPosition(worldX, worldY) {
        if (typeof worldX !== 'number' || isNaN(worldX) || typeof worldY !== 'number' || isNaN(worldY)) {
            console.error('[CanvasViewModel] getObjectAtPosition: Invalid worldX or worldY input', { worldX, worldY });
            return null;
        }
        if (!(this.viewModelObjects instanceof Map)) {
            console.error('[CanvasViewModel] getObjectAtPosition: viewModelObjects is not a Map', this.viewModelObjects);
            return null;
        }

        const sortedObjects = Array.from(this.viewModelObjects.values()).sort(
            (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
        );

        for (const obj of sortedObjects) {
            if (!obj || typeof obj !== 'object') {
                console.warn('[CanvasViewModel] getObjectAtPosition: Encountered invalid object', obj);
                continue;
            }
            const { id, shape } = obj;
            const x = parseFloat(obj.x);
            const y = parseFloat(obj.y);
            const width = parseFloat(obj.width);
            const height = parseFloat(obj.height);
            let rotation = parseFloat(obj.rotation);

            if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
                console.warn('[CanvasViewModel] getObjectAtPosition: Object with id', id, 'has invalid coords/dims.', { x, y, width, height });
                continue;
            }
            if (width <= 0 || height <= 0) {
                 console.warn('[CanvasViewModel] getObjectAtPosition: Object with id', id, 'has non-positive size.', {width,height});
                continue;
            }
            if (isNaN(rotation)) {
                rotation = 0;
            }

            if (shape === 'rectangle') {
                if (rotation === 0) {
                    if (worldX >= x && worldX <= x + width && worldY >= y && worldY <= y + height) {
                        return id;
                    }
                } else {
                    const centerX = x + width / 2;
                    const centerY = y + height / 2;
                    let localX = worldX - centerX;
                    let localY = worldY - centerY;
                    const rad = (-rotation * Math.PI) / 180;
                    const cosTheta = Math.cos(rad);
                    const sinTheta = Math.sin(rad);
                    const rotatedLocalX = localX * cosTheta - localY * sinTheta;
                    const rotatedLocalY = localX * sinTheta + localY * cosTheta;
                    if (rotatedLocalX >= -width / 2 && rotatedLocalX <= width / 2 &&
                        rotatedLocalY >= -height / 2 && rotatedLocalY <= height / 2) {
                        return id;
                    }
                }
            } else if (shape === 'circle') {
                const radius = width / 2;
                const circleCenterX = x + radius;
                const circleCenterY = y + radius;
                const distanceSq = (worldX - circleCenterX) ** 2 + (worldY - circleCenterY) ** 2;
                if (distanceSq <= radius ** 2) {
                    return id;
                }
            }
        }
        return null;
    }
}

export default CanvasViewModel;
