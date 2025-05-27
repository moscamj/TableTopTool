// src/ui.js

let domElementsCached = false; // Guard flag for cacheDOMElements

// Store DOM element references
const domElements = {
  // Header
  headerTitle: null,
  userIdDisplay: null,
  sessionIdDisplay: null,
  sessionLoadInput: null,
  sessionLoadButton: null,
  sessionSaveButton: null,

  // Tools Sidebar
  toolsSidebar: null,
  createObjectButton: null,
  backgroundUrlInput: null,
  backgroundColorInput: null,
  setBackgroundButton: null,
  chooseBackgroundImageButton: null, // Added for "Choose File" button for background image

  // Canvas
  canvasContainer: null,
  vttCanvas: null,

  // Inspector Sidebar
  inspectorSidebar: null,
  inspectorContent: null,
  inspectorActions: null,
  objId: null,
  objX: null,
  objY: null,
  objWidth: null,
  objHeight: null,
  objRotation: null,
  objBgColor: null,
  objImageUrl: null,
  objZIndex: null,
  objIsMovable: null,
  objShape: null,
  objData: null,
  objScriptOnClick: null,
  objName: null, // Assuming an ID like #obj-name exists or will be added
  updateObjectButton: null,
  deleteObjectButton: null,

  // Modal
  modalContainer: null,
  modalTitle: null,
  modalContent: null,
  modalButtons: null,

  // Message Area
  messageArea: null,

  // File input (hidden, triggered by button)
  fileInput: null,
  backgroundImageFileInput: null, // Added for background image selection
};

/**
 * Call this once at startup to cache all DOM element references.
 */
const cacheDOMElements = () => {
  if (domElementsCached) {
    console.log('[ui.js] cacheDOMElements: Already cached. Skipping.');
    return;
  }
  console.log('[ui.js] cacheDOMElements: Caching DOM elements now.');
  domElementsCached = true;

  domElements.headerTitle = document.getElementById('header-title');
  domElements.userIdDisplay = document.getElementById('user-id-display');
  domElements.sessionIdDisplay = document.getElementById('session-id-display');
  domElements.sessionLoadInput = document.getElementById('session-load-input');
  domElements.sessionLoadButton = document.getElementById(
    'session-load-button'
  );
  domElements.sessionSaveButton = document.getElementById(
    'session-save-button'
  );

  domElements.toolsSidebar = document.getElementById('tools-sidebar');
  domElements.createObjectButton = document.getElementById('create-object-button');
  domElements.backgroundUrlInput = document.getElementById(
    'background-url-input'
  );
  domElements.backgroundColorInput = document.getElementById(
    'background-color-input'
  );
  domElements.setBackgroundButton = document.getElementById(
    'set-background-button'
  );
  domElements.chooseBackgroundImageButton = document.getElementById(
    'choose-background-image-button' // Added
  );
  console.log('[ui.js] chooseBackgroundImageButton found:', domElements.chooseBackgroundImageButton ? 'Yes' : 'No');

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

  domElements.updateObjectButton = document.getElementById(
    'update-object-button'
  );
  domElements.deleteObjectButton = document.getElementById(
    'delete-object-button'
  );

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

  // Create a hidden file input for background images
  domElements.backgroundImageFileInput = document.createElement('input');
  domElements.backgroundImageFileInput.type = 'file';
  domElements.backgroundImageFileInput.accept = 'image/*'; // Accept all image types
  // domElements.backgroundImageFileInput.style.display = 'none'; // Remove this line

  // Add these lines:
  domElements.backgroundImageFileInput.style.position = 'absolute';
  domElements.backgroundImageFileInput.style.left = '-9999px';
  domElements.backgroundImageFileInput.style.top = '-9999px'; // Optional, but good practice
  domElements.backgroundImageFileInput.style.width = '1px';   // Make it minimally sized
  domElements.backgroundImageFileInput.style.height = '1px';  // Make it minimally sized
  domElements.backgroundImageFileInput.style.opacity = '0';   // Make it transparent
  domElements.backgroundImageFileInput.style.overflow = 'hidden'; // Ensure no part of it is accidentally visible
  document.body.appendChild(domElements.backgroundImageFileInput);
  console.log('[ui.js] backgroundImageFileInput created:', domElements.backgroundImageFileInput ? 'Yes' : 'No');

  // Update button texts and visibility for offline mode
  if (domElements.sessionSaveButton)
    domElements.sessionSaveButton.textContent = 'Save to File';
  if (domElements.sessionLoadButton)
    domElements.sessionLoadButton.textContent = 'Load from File';
  if (domElements.sessionIdDisplay)
    domElements.sessionIdDisplay.style.display = 'none';
  if (domElements.sessionLoadInput)
    domElements.sessionLoadInput.style.display = 'none';
  // Also hide the "User:" display as it's Firebase auth related
  if (domElements.userIdDisplay && domElements.userIdDisplay.parentElement) {
    domElements.userIdDisplay.parentElement.style.display = 'none';
  }
}

// Call cacheDOMElements when the DOM is ready
document.addEventListener('DOMContentLoaded', cacheDOMElements);

export const initUIEventListeners = (callbacks) => {
  // Destructure callback functions passed from main.js for easier reference.
  const {
    // onCreateRectangle, // Removed
    // onCreateCircle, // Removed
    onSetBackground,
    onInspectorPropertyChange,
    onApplyObjectChanges,
    onDeleteObject,
    onSaveToFile,
    onLoadFromFileRequest, // Renamed for clarity in original code, kept here
    onLoadFromFileInputChange,
    onCreateObjectRequested, // Added for the new "Create Object" modal
    onBackgroundImageFileSelected, // New callback for background image file selection
  } = callbacks;

  // Ensure DOM elements are cached before attaching listeners.
  // This is a fallback if initUIEventListeners is called before DOMContentLoaded.
  if (!domElements.toolsSidebar) cacheDOMElements(); // Changed from createRectButton

  if (onCreateObjectRequested && domElements.createObjectButton) {
    domElements.createObjectButton.addEventListener('click', onCreateObjectRequested);
  }

  if (onSetBackground && domElements.setBackgroundButton) {
    domElements.setBackgroundButton.addEventListener('click', onSetBackground);
  }

  // Inspector property changes
  const inspectorInputs = domElements.inspectorContent
    ? domElements.inspectorContent.querySelectorAll('.prop-input')
    : [];
  // Setup event listeners for each input field in the inspector.
  // If an onInspectorPropertyChange callback is provided (for live updates),
  // it's called when any inspector input's 'change' event fires.
  inspectorInputs.forEach((input) => {
    if (onInspectorPropertyChange) {
      input.addEventListener('change', () =>
        onInspectorPropertyChange(readObjectInspector())
      );
    }
  });

  if (onApplyObjectChanges && domElements.updateObjectButton) {
    domElements.updateObjectButton.addEventListener(
      'click',
      onApplyObjectChanges
    );
  }
  if (onDeleteObject && domElements.deleteObjectButton) {
    domElements.deleteObjectButton.addEventListener('click', onDeleteObject);
  }

  // File Save/Load
  if (onSaveToFile && domElements.sessionSaveButton) {
    domElements.sessionSaveButton.addEventListener('click', onSaveToFile);
  }
  if (onLoadFromFileRequest && domElements.sessionLoadButton) {
    domElements.sessionLoadButton.addEventListener('click', () => {
      domElements.fileInput.value = null; // Clear previous selection
      domElements.fileInput.click(); // Trigger hidden file input
    });
  }
  if (onLoadFromFileInputChange && domElements.fileInput) {
    domElements.fileInput.addEventListener(
      'change',
      onLoadFromFileInputChange
    );
  }

  // Event listener for the "Choose File" button for background image
  if (domElements.chooseBackgroundImageButton) {
    domElements.chooseBackgroundImageButton.addEventListener('click', () => {
      console.log('[ui.js] "Choose File" button clicked.'); 
      if (domElements.backgroundImageFileInput) {
        domElements.backgroundImageFileInput.value = null; // Clear previous selection
        domElements.backgroundImageFileInput.click(); // Trigger hidden file input
        console.log('[ui.js] Triggered click on hidden backgroundImageFileInput.'); 
      } else {
        console.error('[ui.js] backgroundImageFileInput not found on button click.'); 
      }
    });
  } else {
    console.error('[ui.js] chooseBackgroundImageButton not found, cannot attach click listener.'); 
  }

  // Event listener for the actual file input change (for background image)
  console.log('[ui.js] Attempting to attach "change" listener to backgroundImageFileInput.'); 
  if (onBackgroundImageFileSelected && domElements.backgroundImageFileInput) {
    console.log('[ui.js] "onBackgroundImageFileSelected" callback IS defined and backgroundImageFileInput IS found. Attaching listener.'); 
    domElements.backgroundImageFileInput.addEventListener('change', (event) => {
      console.log('[ui.js] "change" event detected on backgroundImageFileInput.'); 
      onBackgroundImageFileSelected(event);
    });
  } else {
    
    if (!onBackgroundImageFileSelected) {
      console.error('[ui.js] "onBackgroundImageFileSelected" callback is NOT defined. Cannot attach change listener to backgroundImageFileInput.');
    }
    if (!domElements.backgroundImageFileInput) {
      console.error('[ui.js] backgroundImageFileInput element not found. Cannot attach change listener.');
    }
  }
};

export const populateObjectInspector = (objectData) => {
  if (!domElements.inspectorContent) return;

  const inspectorContentDiv =
    domElements.inspectorContent.querySelector('div:first-child');
  const inspectorFieldsContainer = domElements.inspectorContent;

  if (objectData) {
    // Destructure properties from objectData to populate inspector fields.
    // Default values are provided for most properties to ensure robust population
    // even if some fields are missing from objectData.
    const {
      id,
      name, // Placeholder for a potential object name field
      x = 0,
      y = 0,
      width = 0,
      height = 0,
      rotation = 0,
      zIndex = 0,
      isMovable = true, // Default to true if not specified
      shape = 'rectangle', // Default shape
      appearance, // Nested object, destructured below
      data, // Custom data object
      scripts, // Scripts object
    } = objectData;

    if (inspectorContentDiv && inspectorContentDiv.querySelector('p'))
      inspectorContentDiv.querySelector('p').style.display = 'none'; // Hide placeholder message

    domElements.objId.textContent = id || '';
    // domElements.objName.value = name || ''; // If #obj-name input exists
    domElements.objX.value = x;
    domElements.objY.value = y;
    domElements.objWidth.value = width;
    domElements.objHeight.value = height;
    domElements.objRotation.value = rotation;
    domElements.objZIndex.value = zIndex;
    domElements.objIsMovable.checked = isMovable;
    domElements.objShape.value = shape;

    if (appearance) {
      const { backgroundColor = '#CCCCCC', imageUrl = '' } = appearance;
      domElements.objBgColor.value = backgroundColor;
      domElements.objImageUrl.value = imageUrl;
    } else {
      domElements.objBgColor.value = '#CCCCCC';
      domElements.objImageUrl.value = '';
    }

    domElements.objData.value = data ? JSON.stringify(data, null, 2) : '{}';
    domElements.objScriptOnClick.value = scripts && scripts.onClick ? scripts.onClick : '';

    if (domElements.inspectorActions)
      domElements.inspectorActions.classList.remove('hidden');
    // Ensure all inspector field sections (except the placeholder message and actions footer) are visible.
    Array.from(inspectorFieldsContainer.children).forEach((child) => {
      if (
        child !== inspectorContentDiv && // Don't hide/show the placeholder message div itself
        child !== domElements.inspectorActions // Don't hide/show the actions footer
      )
        child.style.display = ''; // Reset display to default (usually block or flex)
    });
  } else {
    // No objectData, so display the placeholder message and hide all inspector fields.
    if (inspectorContentDiv && inspectorContentDiv.querySelector('p')) {
      inspectorContentDiv.querySelector('p').textContent =
        'Select an object to inspect.';
      inspectorContentDiv.querySelector('p').style.display = '';
    }
    // Hide all individual field containers (divs wrapping label+input)
    // except the placeholder message div and the actions footer.
    Array.from(inspectorFieldsContainer.children).forEach((child) => {
      if (
        child !== inspectorContentDiv &&
        child !== domElements.inspectorActions
      )
        child.style.display = 'none';
    });

    if (domElements.inspectorActions)
      domElements.inspectorActions.classList.add('hidden');
  }
};

export const readObjectInspector = () => {
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
};

export const displayMessage = (text, type = 'info', duration = 3000) => {
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

export const showModal = (
  title,
  contentHtml,
  buttonsArray = [{ text: 'OK', type: 'primary' }]
) => {
  if (!domElements.modalContainer) return;

  domElements.modalTitle.textContent = title;
  domElements.modalContent.innerHTML = contentHtml;
  domElements.modalButtons.innerHTML = ''; // Clear existing buttons

  // Dynamically create buttons based on the buttonsArray configuration.
  buttonsArray.forEach((btnConfig) => {
    // Destructure button configuration with a default for preventHide.
    // btnConfig is an object like: { text: 'OK', type: 'primary', onClickCallback: () => {...} }
    const {
      text,
      type,
      onClickCallback,
      preventHide = false, // If true, modal won't auto-hide on this button's click.
    } = btnConfig;

    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'px-4 py-2 rounded text-sm'; // Base
    switch (type) {
      case 'secondary':
        button.classList.add('bg-gray-500', 'hover:bg-gray-600', 'text-white');
        break;
      case 'danger':
        button.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white');
        break;
      default: // primary
        button.classList.add('bg-blue-500', 'hover:bg-blue-600', 'text-white');
    }
    if (onClickCallback) {
      button.addEventListener('click', () => {
        onClickCallback();
        if (!preventHide) hideModal();
      });
    } else {
      button.addEventListener('click', hideModal);
    }
    domElements.modalButtons.appendChild(button);
  });

  domElements.modalContainer.classList.remove('hidden');
};

export const hideModal = () => {
  if (!domElements.modalContainer) return;
  domElements.modalContainer.classList.add('hidden');
  domElements.modalTitle.textContent = '';
  domElements.modalContent.innerHTML = '';
  domElements.modalButtons.innerHTML = '';
};

export const displayCreateObjectModal = (createCallback) => {
  const modalContentHtml = `
    <style>
      .modal-label { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; color: #E2E8F0; }
      .modal-input { background-color: #4A5568; border: 1px solid #718096; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.875rem; margin-bottom: 0.75rem; width: 100%; color: #E2E8F0; box-sizing: border-box; }
      .modal-input[type="color"] { padding: 0.1rem; height: 2.5rem; }
    </style>
    <div>
      <label class="modal-label" for="create-obj-shape">Shape:</label>
      <select id="create-obj-shape" class="modal-input">
        <option value="rectangle" selected>Rectangle</option>
        <option value="circle">Circle</option>
      </select>
    </div>
    <div>
      <label class="modal-label" for="create-obj-x">X Position:</label>
      <input type="number" id="create-obj-x" value="50" class="modal-input">
    </div>
    <div>
      <label class="modal-label" for="create-obj-y">Y Position:</label>
      <input type="number" id="create-obj-y" value="50" class="modal-input">
    </div>
    <div>
      <label class="modal-label" for="create-obj-width">Width:</label>
      <input type="number" id="create-obj-width" value="100" class="modal-input">
    </div>
    <div>
      <label class="modal-label" for="create-obj-height">Height:</label>
      <input type="number" id="create-obj-height" value="100" class="modal-input">
    </div>
    <div>
      <label class="modal-label" for="create-obj-bgcolor">Background Color:</label>
      <input type="color" id="create-obj-bgcolor" value="#CCCCCC" class="modal-input">
    </div>
  `;

  const buttonsArray = [
    {
      text: 'Create',
      type: 'primary',
      onClickCallback: () => {
        const shape = document.getElementById('create-obj-shape').value;
        const props = {
          x: parseInt(document.getElementById('create-obj-x').value, 10) || 0,
          y: parseInt(document.getElementById('create-obj-y').value, 10) || 0,
          width: parseInt(document.getElementById('create-obj-width').value, 10) || 50,
          height: parseInt(document.getElementById('create-obj-height').value, 10) || 50,
          appearance: {
            backgroundColor: document.getElementById('create-obj-bgcolor').value,
          },
        };
        if (createCallback) {
          createCallback(shape, props);
        }
        // hideModal() is called by default by showModal's button handler
      },
    },
    {
      text: 'Cancel',
      type: 'secondary',
      // onClickCallback: hideModal, // Default behavior, explicitly stating is fine too
    },
  ];

  showModal('Create New Object', modalContentHtml, buttonsArray);
};

export const getToolbarValues = () => {
  if (!domElements.backgroundUrlInput) cacheDOMElements();
  return {
    backgroundUrl: domElements.backgroundUrlInput
      ? domElements.backgroundUrlInput.value.trim()
      : '',
    backgroundColor: domElements.backgroundColorInput
      ? domElements.backgroundColorInput.value
      : '#cccccc',
  };
}

// Initial call to populateObjectInspector with null to set default inspector state
document.addEventListener('DOMContentLoaded', () => {
  populateObjectInspector(null);
});

/**
 * Sets the text content of the background URL input field.
 * @param {string} text - The text to set.
 */
export const setBackgroundUrlInputText = (text) => {
  if (domElements.backgroundUrlInput) {
    domElements.backgroundUrlInput.value = text;
  }
};
