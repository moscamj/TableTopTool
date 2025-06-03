// src/viewmodels/canvasViewModel.js

class CanvasViewModel {
    constructor(onDrawNeededCallback, displayMessageFn) {
        this.onDrawNeededCallback = onDrawNeededCallback || (() => console.warn('onDrawNeededCallback not set in ViewModel'));
        this.displayMessageFn = displayMessageFn || ((msg, type) => console.warn('displayMessageFn not set in ViewModel:', msg, type));

        this.viewModelObjects = new Map();
        this.viewModelPanZoom = { panX: 0, panY: 0, zoom: 1.0 };
        this.viewModelTableBackground = { type: 'color', value: '#cccccc' }; // Default background
        this.viewModelSelectedObjectId = null;
        this.viewModelBoardProperties = {
            widthUser: 36, heightUser: 24, unitForDimensions: 'in', // User-facing dimensions
            widthPx: 1000, heightPx: 800, // Pixel dimensions for rendering (example defaults)
            scaleRatio: 1, unitForRatio: 'mm' // Scale interpretation
        };
        this.loadedImages = new Map(); // url -> { img: Image, status: 'loading' | 'loaded' | 'error' }
    }

    // --- Getters ---
    getObjects() {
        return this.viewModelObjects;
    }

    getPanZoom() {
        return this.viewModelPanZoom;
    }

    getBackground() {
        return this.viewModelTableBackground;
    }

    getSelectedObjectId() {
        return this.viewModelSelectedObjectId;
    }

    getBoardProperties() {
        return this.viewModelBoardProperties;
    }

    getLoadedImage(url) {
        return this.loadedImages.get(url);
    }

    // --- ViewModel Update Functions ---
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

    removeObjectFromViewModel(objectId) {
        if (!this.viewModelObjects.has(objectId)) {
            console.warn(`[CanvasViewModel] removeObjectFromViewModel: Object ID ${objectId} not found in ViewModel.`);
            return;
        }
        this.viewModelObjects.delete(objectId);
    }

    setPanZoomInViewModel(panZoomState) {
        if (!panZoomState) {
            console.error('[CanvasViewModel] setPanZoomInViewModel: panZoomState is undefined.');
            return;
        }
        this.viewModelPanZoom = { ...panZoomState };
    }
    
    // For local updates before API call for responsiveness
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

    locallyUpdateObjectPosition(objectId, x, y) {
        const obj = this.viewModelObjects.get(objectId);
        if (obj && (obj.x !== x || obj.y !== y)) {
            obj.x = x;
            obj.y = y;
            this.onDrawNeededCallback();
        }
    }


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

    setSelectedObjectInViewModel(selectedId) {
        this.viewModelSelectedObjectId = selectedId;
    }

    setBoardPropertiesInViewModel(boardProps) {
        if (!boardProps) {
            console.error('[CanvasViewModel] setBoardPropertiesInViewModel: boardProps is undefined.');
            return;
        }
        this.viewModelBoardProperties = { ...boardProps };
    }

    clearAllViewModelObjects() {
        this.viewModelObjects.clear();
        console.log('[CanvasViewModel] All viewModel objects cleared.');
    }

    // --- Image Loading ---
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
            console.log(`Successfully loaded image. Key: ${cacheKey}`);
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
    getMousePositionOnCanvas(event, canvas) { // canvas element needed for offset calculation
        if (!canvas) return { x: 0, y: 0 };

        const { panX, panY, zoom } = this.viewModelPanZoom;
        const screenX = event.offsetX;
        const screenY = event.offsetY;
        const worldX = (screenX - panX) / zoom;
        const worldY = (screenY - panY) / zoom;
        return { x: worldX, y: worldY };
    }

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
