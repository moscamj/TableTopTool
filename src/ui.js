// src/ui.js

// Store DOM element references
const domElements = {
    // Header
    headerTitle: null, userIdDisplay: null, sessionIdDisplay: null,
    sessionLoadInput: null, sessionLoadButton: null, sessionSaveButton: null,

    // Tools Sidebar
    toolsSidebar: null, createRectButton: null, createCircleButton: null,
    backgroundUrlInput: null, backgroundColorInput: null, setBackgroundButton: null,

    // Canvas
    canvasContainer: null, vttCanvas: null,

    // Inspector Sidebar
    inspectorSidebar: null, inspectorContent: null, inspectorActions: null,
    objId: null, objX: null, objY: null, objWidth: null, objHeight: null,
    objRotation: null, objBgColor: null, objImageUrl: null, objZIndex: null,
    objIsMovable: null, objShape: null, objData: null, objScriptOnClick: null,
    objName: null, // Assuming an ID like #obj-name exists or will be added
    updateObjectButton: null, deleteObjectButton: null,

    // Modal
    modalContainer: null, modalTitle: null, modalContent: null, modalButtons: null,

    // Message Area
    messageArea: null,

    // File input (hidden, triggered by button)
    fileInput: null
};

/**
 * Call this once at startup to cache all DOM element references.
 */
function cacheDOMElements() {
    domElements.headerTitle = document.getElementById('header-title');
    domElements.userIdDisplay = document.getElementById('user-id-display');
    domElements.sessionIdDisplay = document.getElementById('session-id-display');
    domElements.sessionLoadInput = document.getElementById('session-load-input');
    domElements.sessionLoadButton = document.getElementById('session-load-button');
    domElements.sessionSaveButton = document.getElementById('session-save-button');

    domElements.toolsSidebar = document.getElementById('tools-sidebar');
    domElements.createRectButton = document.getElementById('create-rect-button');
    domElements.createCircleButton = document.getElementById('create-circle-button');
    domElements.backgroundUrlInput = document.getElementById('background-url-input');
    domElements.backgroundColorInput = document.getElementById('background-color-input');
    domElements.setBackgroundButton = document.getElementById('set-background-button');

    domElements.canvasContainer = document.getElementById('canvas-container');
    domElements.vttCanvas = document.getElementById('vtt-canvas');

    domElements.inspectorSidebar = document.getElementById('inspector-sidebar');
    domElements.inspectorContent = document.getElementById('inspector-content'); // The div holding all fields
    domElements.inspectorActions = document.getElementById('inspector-actions');
    domElements.objId = document.getElementById('obj-id');
    domElements.objX = document.getElementById('obj-x');
    domElements.objY = document.getElementById('obj-y');
    domElements.objWidth = document.getElementById('obj-width');
    domElements.objHeight = document.getElementById('obj-height');
    domElements.objRotation = document.getElementById('obj-rotation');
    domElements.objBgColor = document.getElementById('obj-bg-color');
    domElements.objImageUrl = document.getElementById('obj-image-url');
    domElements.objZIndex = document.getElementById('obj-z-index');
    domElements.objIsMovable = document.getElementById('obj-is-movable');
    domElements.objShape = document.getElementById('obj-shape');
    domElements.objData = document.getElementById('obj-data');
    domElements.objScriptOnClick = document.getElementById('obj-script-onclick');
    // domElements.objName = document.getElementById('obj-name'); // Add to index.html if needed

    domElements.updateObjectButton = document.getElementById('update-object-button');
    domElements.deleteObjectButton = document.getElementById('delete-object-button');

    domElements.modalContainer = document.getElementById('modal-container');
    domElements.modalTitle = document.getElementById('modal-title');
    domElements.modalContent = document.getElementById('modal-content');
    domElements.modalButtons = document.getElementById('modal-buttons');

    domElements.messageArea = document.getElementById('message-area');

    // Create a hidden file input for loading
    domElements.fileInput = document.createElement('input');
    domElements.fileInput.type = 'file';
    domElements.fileInput.accept = '.json,.ttt.json'; // Accept .ttt.json and .json
    domElements.fileInput.style.display = 'none';
    document.body.appendChild(domElements.fileInput);

    // Update button texts and visibility for offline mode
    if (domElements.sessionSaveButton) domElements.sessionSaveButton.textContent = 'Save to File';
    if (domElements.sessionLoadButton) domElements.sessionLoadButton.textContent = 'Load from File';
    if (domElements.sessionIdDisplay) domElements.sessionIdDisplay.style.display = 'none';
    if (domElements.sessionLoadInput) domElements.sessionLoadInput.style.display = 'none';
    // Also hide the "User:" display as it's Firebase auth related
    if (domElements.userIdDisplay && domElements.userIdDisplay.parentElement) {
         domElements.userIdDisplay.parentElement.style.display = 'none';
    }


}

// Call cacheDOMElements when the DOM is ready
document.addEventListener('DOMContentLoaded', cacheDOMElements);


export function initUIEventListeners(callbacks) {
    if (!domElements.createRectButton) cacheDOMElements(); // Ensure elements are cached

    if (callbacks.onCreateRectangle && domElements.createRectButton) {
        domElements.createRectButton.addEventListener('click', callbacks.onCreateRectangle);
    }
    if (callbacks.onCreateCircle && domElements.createCircleButton) {
        domElements.createCircleButton.addEventListener('click', callbacks.onCreateCircle);
    }
    if (callbacks.onSetBackground && domElements.setBackgroundButton) {
        domElements.setBackgroundButton.addEventListener('click', callbacks.onSetBackground);
    }

    // Inspector property changes
    const inspectorInputs = domElements.inspectorContent ? domElements.inspectorContent.querySelectorAll('.prop-input') : [];
    inspectorInputs.forEach(input => {
        if (callbacks.onInspectorPropertyChange) {
            input.addEventListener('change', () => callbacks.onInspectorPropertyChange(readObjectInspector()));
            // Use 'input' for textareas/text inputs if more real-time updates are needed before "Apply"
        }
    });

    if (callbacks.onApplyObjectChanges && domElements.updateObjectButton) {
        domElements.updateObjectButton.addEventListener('click', callbacks.onApplyObjectChanges);
    }
    if (callbacks.onDeleteObject && domElements.deleteObjectButton) {
        domElements.deleteObjectButton.addEventListener('click', callbacks.onDeleteObject);
    }

    // File Save/Load
    if (callbacks.onSaveToFile && domElements.sessionSaveButton) {
        domElements.sessionSaveButton.addEventListener('click', callbacks.onSaveToFile);
    }
    if (callbacks.onLoadFromFileRequest && domElements.sessionLoadButton) { // Renamed for clarity
        domElements.sessionLoadButton.addEventListener('click', () => {
            domElements.fileInput.value = null; // Clear previous selection
            domElements.fileInput.click(); // Trigger hidden file input
        });
    }
    if (callbacks.onLoadFromFileInputChange && domElements.fileInput) {
         domElements.fileInput.addEventListener('change', callbacks.onLoadFromFileInputChange);
    }
}

export function populateObjectInspector(objectData) {
    if (!domElements.inspectorContent) return;

    const inspectorContentDiv = domElements.inspectorContent.querySelector('div:first-child'); // The one with text
    const inspectorFieldsContainer = domElements.inspectorContent; // Assuming this is the direct parent of field divs

    if (objectData) {
        if(inspectorContentDiv && inspectorContentDiv.querySelector('p')) inspectorContentDiv.querySelector('p').style.display = 'none';

        domElements.objId.textContent = objectData.id || '';
        // domElements.objName.value = objectData.name || ''; // Add if #obj-name exists
        domElements.objX.value = objectData.x || 0;
        domElements.objY.value = objectData.y || 0;
        domElements.objWidth.value = objectData.width || 0;
        domElements.objHeight.value = objectData.height || 0;
        domElements.objRotation.value = objectData.rotation || 0;
        domElements.objZIndex.value = objectData.zIndex || 0;
        domElements.objIsMovable.checked = objectData.isMovable !== undefined ? objectData.isMovable : true;
        domElements.objShape.value = objectData.shape || 'rectangle';

        if (objectData.appearance) {
            domElements.objBgColor.value = objectData.appearance.backgroundColor || '#CCCCCC';
            domElements.objImageUrl.value = objectData.appearance.imageUrl || '';
            // Add other appearance fields like textColor, text, fontFamily, fontSize if they exist in HTML
        } else {
            domElements.objBgColor.value = '#CCCCCC';
            domElements.objImageUrl.value = '';
        }

        domElements.objData.value = objectData.data ? JSON.stringify(objectData.data, null, 2) : '{}';
        domElements.objScriptOnClick.value = objectData.scripts && objectData.scripts.onClick ? objectData.scripts.onClick : '';

        if(domElements.inspectorActions) domElements.inspectorActions.classList.remove('hidden');
        // Make individual fields visible if they were previously hidden
        Array.from(inspectorFieldsContainer.children).forEach(child => {
            if (child !== inspectorContentDiv && child !== domElements.inspectorActions) child.style.display = '';
        });

    } else {
        if(inspectorContentDiv && inspectorContentDiv.querySelector('p')) {
            inspectorContentDiv.querySelector('p').textContent = 'Select an object to inspect.';
            inspectorContentDiv.querySelector('p').style.display = '';
        }
        // Hide all field containers except the placeholder message
        Array.from(inspectorFieldsContainer.children).forEach(child => {
            if (child !== inspectorContentDiv && child !== domElements.inspectorActions) child.style.display = 'none';
        });

        if(domElements.inspectorActions) domElements.inspectorActions.classList.add('hidden');
    }
}


export function readObjectInspector() {
    if (!domElements.objId || !domElements.objId.textContent) return null; // No object selected or ID missing

    const dataStr = domElements.objData.value;
    let data = {};
    try {
        data = JSON.parse(dataStr);
    } catch (e) {
        displayMessage('Error: Custom Data is not valid JSON.', 'error');
        // console.error("Invalid JSON in data field:", e);
        // Potentially return null or throw to indicate error
    }

    return {
        id: domElements.objId.textContent, // ID is read-only from display
        // name: domElements.objName.value, // if #obj-name exists
        x: parseFloat(domElements.objX.value) || 0,
        y: parseFloat(domElements.objY.value) || 0,
        width: parseFloat(domElements.objWidth.value) || 0,
        height: parseFloat(domElements.objHeight.value) || 0,
        rotation: parseFloat(domElements.objRotation.value) || 0,
        zIndex: parseInt(domElements.objZIndex.value, 10) || 0,
        isMovable: domElements.objIsMovable.checked,
        shape: domElements.objShape.value,
        appearance: {
            backgroundColor: domElements.objBgColor.value,
            imageUrl: domElements.objImageUrl.value.trim(),
            // Add other appearance props from their respective inputs
        },
        data: data,
        scripts: {
            onClick: domElements.objScriptOnClick.value.trim(),
        },
    };
}

export function displayMessage(text, type = 'info', duration = 3000) {
    if (!domElements.messageArea) return;

    const messageEl = document.createElement('div');
    messageEl.textContent = text;
    messageEl.className = 'p-3 rounded-md shadow-lg text-sm mb-2'; // Base classes

    switch (type) {
        case 'error':
            messageEl.classList.add('bg-red-500', 'text-white');
            break;
        case 'success':
            messageEl.classList.add('bg-green-500', 'text-white');
            break;
        case 'warning':
            messageEl.classList.add('bg-yellow-500', 'text-black');
            break;
        default: // info
            messageEl.classList.add('bg-blue-500', 'text-white');
            break;
    }

    domElements.messageArea.appendChild(messageEl);

    setTimeout(() => {
        messageEl.style.opacity = '0'; // Start fade out
        setTimeout(() => {
            messageEl.remove();
        }, 500); // Remove after fade
    }, duration);
}

export function showModal(title, contentHtml, buttonsArray = [{ text: 'OK', type: 'primary' }]) {
    if (!domElements.modalContainer) return;

    domElements.modalTitle.textContent = title;
    domElements.modalContent.innerHTML = contentHtml;
    domElements.modalButtons.innerHTML = ''; // Clear existing buttons

    buttonsArray.forEach(btnConfig => {
        const button = document.createElement('button');
        button.textContent = btnConfig.text;
        button.className = 'px-4 py-2 rounded text-sm'; // Base
        switch (btnConfig.type) {
            case 'secondary':
                button.classList.add('bg-gray-500', 'hover:bg-gray-600', 'text-white');
                break;
            case 'danger':
                button.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white');
                break;
            default: // primary
                button.classList.add('bg-blue-500', 'hover:bg-blue-600', 'text-white');
        }
        if (btnConfig.onClickCallback) {
            button.addEventListener('click', () => {
                btnConfig.onClickCallback();
                // Default behavior: hide modal after click, unless callback prevents it
                if (!btnConfig.preventHide) hideModal();
            });
        } else {
            button.addEventListener('click', hideModal);
        }
        domElements.modalButtons.appendChild(button);
    });

    domElements.modalContainer.classList.remove('hidden');
}

export function hideModal() {
    if (!domElements.modalContainer) return;
    domElements.modalContainer.classList.add('hidden');
    domElements.modalTitle.textContent = '';
    domElements.modalContent.innerHTML = '';
    domElements.modalButtons.innerHTML = '';
}

export function getToolbarValues() {
    if (!domElements.backgroundUrlInput) cacheDOMElements();
    return {
        backgroundUrl: domElements.backgroundUrlInput ? domElements.backgroundUrlInput.value.trim() : '',
        backgroundColor: domElements.backgroundColorInput ? domElements.backgroundColorInput.value : '#cccccc',
    };
}

// Initial call to populateObjectInspector with null to set default inspector state
document.addEventListener('DOMContentLoaded', () => {
    populateObjectInspector(null);
});
