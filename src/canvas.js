// src/canvas.js
let canvas;
let ctx;
let panZoomState = { panX: 0, panY: 0, zoom: 1.0 };
let tableBackground = { type: 'color', value: '#cccccc' }; // Default background
let selectedObjectId = null;
// let isPanning = false; // isPanning and lastMousePosition are not used in this file, managed by main.js
// let lastMousePosition = { x: 0, y: 0 };

// Cache for loaded images (for object appearances and table background)
const loadedImages = new Map(); // url -> { img: Image, status: 'loading' | 'loaded' | 'error' }

let onDrawNeededCallback = () => {}; // Callback to request a redraw from main.js

// Debounce function
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}


export function initCanvas(canvasElement, drawNeededCallback) {
    if (!canvasElement) {
        console.error("Canvas element not provided!");
        return;
    }
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    onDrawNeededCallback = drawNeededCallback || (() => console.warn("onDrawNeededCallback not set"));

    setCanvasSize(); // Set initial size
    window.addEventListener('resize', debounce(setCanvasSize, 250));
    console.log("Canvas initialized");
}

export function setCanvasSize() {
    if (!canvas || !canvas.parentElement) return;
    // Simple fill parent, adjust as needed for layout
    const dpr = window.devicePixelRatio || 1;
    const newWidth = canvas.parentElement.clientWidth;
    const newHeight = canvas.parentElement.clientHeight;

    if (canvas.width !== newWidth * dpr || canvas.height !== newHeight * dpr) {
        canvas.width = newWidth * dpr;
        canvas.height = newHeight * dpr;
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
        ctx.scale(dpr, dpr); // Scale context once for HiDPI
        console.log(`Canvas resized to ${newWidth}x${newHeight} (physical: ${canvas.width}x${canvas.height})`);
    }
    onDrawNeededCallback();
}

// --- Getters and Setters ---
export function getPanZoomState() {
    return { ...panZoomState };
}

export function setPanZoomState(newState) {
    let changed = false;
    if (newState.panX !== undefined && newState.panX !== panZoomState.panX) {
        panZoomState.panX = newState.panX;
        changed = true;
    }
    if (newState.panY !== undefined && newState.panY !== panZoomState.panY) {
        panZoomState.panY = newState.panY;
        changed = true;
    }
    if (newState.zoom !== undefined && newState.zoom !== panZoomState.zoom) {
        // Add zoom limits
        panZoomState.zoom = Math.max(0.1, Math.min(newState.zoom, 10));
        changed = true;
    }
    if (changed) {
        // console.log("PanZoom state updated:", panZoomState);
        onDrawNeededCallback();
    }
}

export function getTableBackground() {
    return { ...tableBackground };
}

export function setTableBackground(newBackground) { // { type: 'color'|'image', value: string }
    if (newBackground && typeof newBackground === 'object') {
        let changed = tableBackground.type !== newBackground.type || tableBackground.value !== newBackground.value;
        tableBackground = { ...newBackground };
        if (tableBackground.type === 'image' && tableBackground.value) {
            loadImage(tableBackground.value, tableBackground.value, onDrawNeededCallback);
        } else if (changed) {
            onDrawNeededCallback();
        }
        // console.log("Table background updated:", tableBackground);
    }
}

export function getSelectedObjectId() {
    return selectedObjectId;
}

export function setSelectedObjectId(id) {
    if (selectedObjectId !== id) {
        selectedObjectId = id;
        // console.log("Selected object ID:", selectedObjectId);
        onDrawNeededCallback();
    }
}

// --- Image Loading ---
function loadImage(url, cacheKey, callback) {
    if (!url) {
        if (loadedImages.has(cacheKey)) { // Image explicitly removed
             loadedImages.delete(cacheKey);
             if(callback) callback();
        }
        return;
    }
    const existingImage = loadedImages.get(cacheKey);
    if (existingImage && existingImage.status === 'loaded') {
        if (callback) callback(); // Already loaded
        return;
    }
    if (existingImage && existingImage.status === 'loading') {
        return; // Already loading
    }

    loadedImages.set(cacheKey, { img: null, status: 'loading' });
    const image = new Image();
    image.crossOrigin = "Anonymous"; // For images from other domains if canvas is tainted
    image.onload = () => {
        loadedImages.set(cacheKey, { img: image, status: 'loaded' });
        console.log(`Image loaded: ${url}`);
        if (callback) callback();
    };
    image.onerror = () => {
        loadedImages.set(cacheKey, { img: null, status: 'error' });
        console.error(`Error loading image: ${url}`);
        if (callback) callback(); // Still call callback to redraw, maybe show placeholder
    };
    image.src = url;
}


// --- Drawing Logic ---
export function drawVTT(objectsMap, currentPZS, currentTblBg, currentSelectedId) {
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;

    // Save context state
    ctx.save();
    // Adjust for DPR if not already handled by ctx.scale in setCanvasSize
    // If setCanvasSize already scales by DPR, this scale might be redundant or need adjustment.
    // However, transformations like pan/zoom need to operate in the CSS pixel space.
    // So, we clear based on physical pixels, then apply transformations.

    // Clear canvas (physical pixels)
    ctx.fillStyle = 'white'; // Fallback clear color
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Use physical width/height

    // Apply pan and zoom (relative to CSS pixel space, but context is scaled by DPR)
    ctx.translate(currentPZS.panX * dpr, currentPZS.panY * dpr);
    ctx.scale(currentPZS.zoom * dpr, currentPZS.zoom * dpr);
    // After this, all drawing coordinates are effectively in 'world' units
    // but will be scaled by zoom * dpr.

    // 1. Draw Table Background
    // Background should cover the viewport in world coordinates.
    // The viewport, in world coordinates, is (canvas.width / dpr / zoom) wide.
    const viewWidthWorld = canvas.width / dpr / currentPZS.zoom;
    const viewHeightWorld = canvas.height / dpr / currentPZS.zoom;

    if (currentTblBg) {
        if (currentTblBg.type === 'color' && currentTblBg.value) {
            ctx.fillStyle = currentTblBg.value;
            ctx.fillRect(0, 0, viewWidthWorld, viewHeightWorld);
        } else if (currentTblBg.type === 'image' && currentTblBg.value) {
            const bgImageEntry = loadedImages.get(currentTblBg.value);
            if (bgImageEntry && bgImageEntry.status === 'loaded' && bgImageEntry.img) {
                ctx.drawImage(bgImageEntry.img, 0, 0, viewWidthWorld, viewHeightWorld);
            } else if (!bgImageEntry || bgImageEntry.status === 'loading') {
                ctx.fillStyle = '#e0e0e0'; // Loading placeholder
                ctx.fillRect(0, 0, viewWidthWorld, viewHeightWorld);
                if (!bgImageEntry) loadImage(currentTblBg.value, currentTblBg.value, onDrawNeededCallback);
            } else { // Error or no image
                ctx.fillStyle = '#c0c0c0'; // Error placeholder
                ctx.fillRect(0, 0, viewWidthWorld, viewHeightWorld);
            }
        }
    }

    // 2. Draw Objects (sorted by zIndex)
    const sortedObjects = Array.from(objectsMap.values()).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    sortedObjects.forEach(obj => {
        ctx.save();

        // Object's center for rotation
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((obj.rotation || 0) * Math.PI / 180);
        ctx.translate(-obj.width / 2, -obj.height / 2); // Translate to object's top-left for drawing

        // Default fill if no image or color
        let baseFill = obj.appearance?.backgroundColor || '#DDDDDD'; // A bit lighter default

        // Draw object shape
        if (obj.shape === 'rectangle') {
            ctx.fillStyle = baseFill;
            ctx.fillRect(0, 0, obj.width, obj.height);
            if (obj.appearance?.borderColor && (obj.appearance?.borderWidth || 0) > 0) {
                ctx.strokeStyle = obj.appearance.borderColor;
                ctx.lineWidth = obj.appearance.borderWidth;
                ctx.strokeRect(0, 0, obj.width, obj.height);
            }
        } else if (obj.shape === 'circle') {
            const radius = obj.width / 2; // Assuming width is diameter
            ctx.fillStyle = baseFill;
            ctx.beginPath();
            ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
            ctx.fill();
            if (obj.appearance?.borderColor && (obj.appearance?.borderWidth || 0) > 0) {
                ctx.strokeStyle = obj.appearance.borderColor;
                ctx.lineWidth = obj.appearance.borderWidth;
                ctx.beginPath();
                ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }

        // Draw object image if URL is provided and loaded
        if (obj.appearance?.imageUrl) {
            const imgEntry = loadedImages.get(obj.appearance.imageUrl);
            if (imgEntry && imgEntry.status === 'loaded' && imgEntry.img) {
                ctx.drawImage(imgEntry.img, 0, 0, obj.width, obj.height);
            } else if (!imgEntry || imgEntry.status === 'loading') {
                if (!imgEntry) loadImage(obj.appearance.imageUrl, obj.appearance.imageUrl, onDrawNeededCallback);
                // Optional: Draw loading placeholder on object
            } else {
                // Optional: Draw error indicator on object
            }
        }

        // Draw text
        if (obj.appearance?.text) {
            ctx.fillStyle = obj.appearance.textColor || '#000000';
            ctx.font = `${obj.appearance.fontSize || 14}px ${obj.appearance.fontFamily || 'Arial'}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(obj.appearance.text, obj.width / 2, obj.height / 2);
        }

        // Draw selection highlight
        if (obj.id === currentSelectedId) {
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)'; // More opaque
             // Make highlight responsive to zoom but not overly thin/thick
            ctx.lineWidth = Math.max(0.5, Math.min(4, 2 / currentPZS.zoom));
            const offset = (obj.appearance?.borderWidth || 0) / 2 + ctx.lineWidth / 2; // Position outside border
            ctx.strokeRect(-offset, -offset, obj.width + 2 * offset, obj.height + 2 * offset);
        }

        ctx.restore(); // Restore context for next object
    });

    // Restore context state from initial save (removes pan/zoom/scale)
    ctx.restore();
}


// --- Coordinate Conversion & Object Picking ---
export function getMousePositionOnCanvas(event, currentPZS) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect(); // Gives position/size in CSS pixels
    const dpr = window.devicePixelRatio || 1;

    // Screen coordinates relative to canvas top-left (CSS pixels)
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Convert to world coordinates
    // currentPZS.panX and .panY are in CSS pixels space
    // currentPZS.zoom is a multiplier
    const worldX = (screenX - currentPZS.panX) / currentPZS.zoom;
    const worldY = (screenY - currentPZS.panY) / currentPZS.zoom;

    return { x: worldX, y: worldY };
}

// Basic AABB check for rectangles, point-in-circle for circles
// Does not account for rotation for simplicity in this MVP stage for picking.
export function getObjectAtPosition(worldX, worldY, objectsMap) {
    // Iterate in reverse order of drawing (highest zIndex first)
    const sortedObjects = Array.from(objectsMap.values()).sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

    for (const obj of sortedObjects) {
        // --- Basic Hit Test (Rotation Ignored for Simplicity) ---
        // Transform worldX, worldY into the object's local coordinate system if object was rotated
        // For unrotated objects, object's local top-left is (obj.x, obj.y) in world space.
        // So, point (worldX, worldY) relative to object's top-left is (worldX - obj.x, worldY - obj.y)

        if (obj.shape === 'rectangle') {
            if (worldX >= obj.x && worldX <= obj.x + obj.width &&
                worldY >= obj.y && worldY <= obj.y + obj.height) {
                return obj.id;
            }
        } else if (obj.shape === 'circle') {
            const radius = obj.width / 2; // Assuming width is diameter
            const centerX = obj.x + radius;
            const centerY = obj.y + radius;
            const distanceSq = (worldX - centerX) ** 2 + (worldY - centerY) ** 2;
            if (distanceSq <= radius ** 2) {
                return obj.id;
            }
        }
    }
    return null; // No object found
}
