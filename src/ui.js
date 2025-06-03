// src/ui.js
import { VTT_API } from './api.js';

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
  clearBoardButton: null, // Added for Clear Board
  saveMemoryStateButton: null, // Added for In-Memory Save
  loadMemoryStateButton: null, // Added for In-Memory Load

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
  objName: null,
  objLabelText: null, // New
  objShowLabel: null, // New
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
  chooseObjectImageButton: null, // Added for "Choose Local Image" button for object
  objectImageFileInput: null, // Added for object image selection

  // Board Setup Tools
  boardWidthInput: null,
  boardHeightInput: null,
  boardDimensionUnitInput: null, // Added for the new selector
  boardScaleInput: null,
  boardScaleUnitInput: null,
  effectiveBoardSizeDisplay: null,
  applyBoardPropertiesButton: null,
};

/**
 * Call this once at startup to cache all DOM element references.
 */
const cacheDOMElements = () => {
  if (domElementsCached) {
    console.log('[ui.js] cacheDOMElements: Already cached. Skipping.');
    return;
  }
  // console.log('[ui.js] Caching DOM elements (first run).');
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
  domElements.clearBoardButton = document.getElementById('clear-board-button'); // Added for Clear Board
  domElements.saveMemoryStateButton = document.getElementById('save-memory-state-button'); // Added for In-Memory Save
  domElements.loadMemoryStateButton = document.getElementById('load-memory-state-button'); // Added for In-Memory Load

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
  // console.log('[ui.js] chooseBackgroundImageButton found:', domElements.chooseBackgroundImageButton ? 'Yes' : 'No');

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
  domElements.objName = document.getElementById('obj-name');
  domElements.objLabelText = document.getElementById('obj-label-text'); // New
  domElements.objShowLabel = document.getElementById('obj-show-label'); // New

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
  // console.log('[ui.js] backgroundImageFileInput created:', domElements.backgroundImageFileInput ? 'Yes' : 'No');

  domElements.chooseObjectImageButton = document.getElementById('choose-object-image-button');
  domElements.objectImageFileInput = document.getElementById('objectImageFileInput');

  // Ensure objectImageFileInput is handled like backgroundImageFileInput (created if not directly in HTML, styled hidden)
  // However, in this case, it IS in the HTML, so we just need to ensure it's correctly referenced.
  // If it were to be created dynamically, the following would be used:
  // if (!domElements.objectImageFileInput) { // If not found (e.g. not in HTML)
  //   domElements.objectImageFileInput = document.createElement('input');
  //   domElements.objectImageFileInput.type = 'file';
  //   domElements.objectImageFileInput.accept = 'image/*';
  //   domElements.objectImageFileInput.style.position = 'absolute';
  //   domElements.objectImageFileInput.style.left = '-9999px';
  //   domElements.objectImageFileInput.style.width = '1px';
  //   domElements.objectImageFileInput.style.height = '1px';
  //   domElements.objectImageFileInput.style.opacity = '0';
  //   domElements.objectImageFileInput.style.overflow = 'hidden';
  //   document.body.appendChild(domElements.objectImageFileInput);
  // }
  // Since it's already in index.html with style="display: none;", we don't need to recreate or restyle it here.
  // We just need to ensure the reference is cached.

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

  // Cache new board setup elements
  domElements.boardWidthInput = document.getElementById('board-width-input');
  domElements.boardHeightInput = document.getElementById('board-height-input');
  domElements.boardDimensionUnitInput = document.getElementById('board-dimension-unit-input'); // Added
  domElements.boardScaleInput = document.getElementById('board-scale-input');
  domElements.boardScaleUnitInput = document.getElementById('board-scale-unit-input');
  domElements.effectiveBoardSizeDisplay = document.getElementById('effective-board-size-display');
  domElements.applyBoardPropertiesButton = document.getElementById('apply-board-properties-button');

  // Populate board setup fields on load
  try {
    const initialBoardProps = VTT_API.getBoardProperties(); // VTT_API should be imported at the top of ui.js
    if (initialBoardProps) {
      // Call a function to update the display (defined next)
      updateBoardSettingsDisplay(initialBoardProps);
    }
  } catch (e) {
    console.error("Error fetching initial board properties for UI:", e);
  }
}

// Call cacheDOMElements when the DOM is ready
document.addEventListener('DOMContentLoaded', cacheDOMElements);

// --- Board Settings Display and Handling ---
export const updateBoardSettingsDisplay = (boardProps) => {
  if (!boardProps) return;
  if (domElements.boardWidthInput) domElements.boardWidthInput.value = boardProps.widthUser ?? '';
  if (domElements.boardHeightInput) domElements.boardHeightInput.value = boardProps.heightUser ?? '';
  if (domElements.boardDimensionUnitInput) domElements.boardDimensionUnitInput.value = boardProps.unitForDimensions ?? 'in';
  if (domElements.boardScaleInput) domElements.boardScaleInput.value = boardProps.scaleRatio ?? 1;
  if (domElements.boardScaleUnitInput) domElements.boardScaleUnitInput.value = boardProps.unitForRatio ?? 'mm'; 
  
  if (domElements.effectiveBoardSizeDisplay) {
    if (boardProps.widthPx && boardProps.heightPx) {
      domElements.effectiveBoardSizeDisplay.textContent = `${Math.round(boardProps.widthPx)}px by ${Math.round(boardProps.heightPx)}px (mm)`;
    } else {
      domElements.effectiveBoardSizeDisplay.textContent = 'N/A';
    }
  }
};

const handleApplyBoardProperties = () => {
  if (!domElements.boardWidthInput || 
      !domElements.boardHeightInput || 
      !domElements.boardDimensionUnitInput || // Added check
      !domElements.boardScaleUnitInput || 
      !domElements.boardScaleInput) {
    VTT_API.showMessage('Board property input elements not found in DOM.', 'error');
    return;
  }

  const widthValue = parseFloat(domElements.boardWidthInput.value);      // Renamed local const for clarity
  const heightValue = parseFloat(domElements.boardHeightInput.value);     // Renamed local const for clarity
  const dimUnitValue = domElements.boardDimensionUnitInput.value;   // Renamed local const for clarity
  const scaleRatioValue = parseFloat(domElements.boardScaleInput.value); // Renamed local const for clarity
  const scaleUnitValue = domElements.boardScaleUnitInput.value;   // Renamed local const for clarity

  // Validation should use these new const names too, e.g., if (isNaN(widthValue) || widthValue <= 0 ...)
  if (isNaN(widthValue) || widthValue <= 0 || isNaN(heightValue) || heightValue <= 0) {
    VTT_API.showMessage('Board width and height must be positive numbers.', 'error');
    return;
  }
  // Validation for scaleRatioValue (allowing 0 if explicitly typed, but not negative or typical NaN)
  if (isNaN(scaleRatioValue) || scaleRatioValue < 0) {
    // Check if the original input string was "0" to allow it.
    // Otherwise, if it's 0 due to parseFloat('') or parseFloat('non-numeric'), it's an error.
    if (scaleRatioValue === 0 && domElements.boardScaleInput.value.trim() !== "0") {
         VTT_API.showMessage('Scale ratio must be a positive number or zero. Non-numeric input for scale is invalid.', 'error');
         return;
    } else if (scaleRatioValue < 0) { // Handles negative numbers
         VTT_API.showMessage('Scale ratio cannot be negative.', 'error');
         return;
    }
    // This handles cases like parseFloat('') which results in NaN, or parseFloat('abc')
    if (isNaN(scaleRatioValue)) { 
        VTT_API.showMessage('Scale ratio must be a valid number or zero.', 'error');
        return;
    }
  }
  
  const currentProps = VTT_API.setBoardProperties({ 
    widthUser: widthValue,         // Changed property name
    heightUser: heightValue,        // Changed property name
    unitForDimensions: dimUnitValue, // Changed property name
    scaleRatio: scaleRatioValue,    // Correct, but use new const name
    unitForRatio: scaleUnitValue    // Changed property name
  });

  if (currentProps) {
    updateBoardSettingsDisplay(currentProps);
    VTT_API.showMessage('Board properties applied.', 'success');
  } else {
    VTT_API.showMessage('Failed to apply board properties through API.', 'error');
  }
};

// --- Main UI Event Listener Setup ---
export const initUIEventListeners = (callbacks) => {
  // Destructure callback functions passed from main.js for easier reference.
  const {
    // onCreateRectangle, // Removed
    // onCreateCircle, // Removed
    // onSetBackground, // Removed - handled by handleSetBackgroundFromToolbar
    onInspectorPropertyChange,
    // onApplyObjectChanges, // Removed - handled by handleApplyObjectChangesFromInspector
    // onDeleteObject, // Removed - handled by handleDeleteObjectFromInspector
    onSaveToFile,
    // onLoadFromFileRequest, // Removed as per new requirement
    onLoadFromFileInputChange,
    onSaveMemoryState, // Added for In-Memory Save
    onLoadMemoryStateRequest, // Added for In-Memory Load
    // onCreateObjectRequested, // Removed - createObjectButton now calls displayCreateObjectModal directly
    // onBackgroundImageFileSelected, // Removed - handled by handleBackgroundImageFileChange
    // onObjectImageFileSelected, // Removed - handled by handleObjectImageFileChange
  } = callbacks;

  // Ensure DOM elements are cached before attaching listeners.
  // This is a fallback if initUIEventListeners is called before DOMContentLoaded.
  if (!domElements.toolsSidebar) cacheDOMElements(); // Changed from createRectButton

  // Object Creation: Button now directly calls displayCreateObjectModal
  if (domElements.createObjectButton) {
    domElements.createObjectButton.addEventListener('click', () => displayCreateObjectModal());
  }

  // Set Background from Toolbar: Button now calls handleSetBackgroundFromToolbar
  if (domElements.setBackgroundButton) {
    domElements.setBackgroundButton.addEventListener('click', handleSetBackgroundFromToolbar);
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

  // Object Updates: Button now calls handleApplyObjectChangesFromInspector
  if (domElements.updateObjectButton) {
    domElements.updateObjectButton.addEventListener(
      'click',
      handleApplyObjectChangesFromInspector
    );
  }

  // Object Deletion: Button now calls handleDeleteObjectFromInspector
  if (domElements.deleteObjectButton) {
    domElements.deleteObjectButton.addEventListener('click', handleDeleteObjectFromInspector);
  }

  // File Save/Load
  if (onSaveToFile && domElements.sessionSaveButton) {
    domElements.sessionSaveButton.addEventListener('click', onSaveToFile);
  }
  // File Save/Load
  if (onSaveToFile && domElements.sessionSaveButton) {
    domElements.sessionSaveButton.addEventListener('click', onSaveToFile);
  }
  // if (onLoadFromFileRequest && domElements.sessionLoadButton) { // Old version
  //   domElements.sessionLoadButton.addEventListener('click', () => {
  //     domElements.fileInput.value = null; // Clear previous selection
  //     domElements.fileInput.click(); // Trigger hidden file input
  //   });
  // }

  // New setup for sessionLoadButton
  if (domElements.sessionLoadButton) { // Check if button exists
    domElements.sessionLoadButton.addEventListener('click', () => { // Directly add listener
      if (domElements.fileInput) { // Check if fileInput exists
        domElements.fileInput.value = null; // Clear previous selection
        domElements.fileInput.click(); // Trigger hidden file input
      } else {
        console.error('[ui.js] fileInput element not found when sessionLoadButton clicked.');
      }
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
      // console.log('[ui.js] "Choose File" button clicked.'); 
      if (domElements.backgroundImageFileInput) {
        domElements.backgroundImageFileInput.value = null; // Clear previous selection
        domElements.backgroundImageFileInput.click(); // Trigger hidden file input
        // console.log('[ui.js] Triggered click on hidden backgroundImageFileInput.'); 
      } else {
        // Keep this error log as it indicates a problem if the input isn't found.
        console.error('[ui.js] backgroundImageFileInput not found on button click.'); 
      }
    });
  } else {
    // Keep this error log as it indicates a problem if the button isn't found.
    console.error('[ui.js] chooseBackgroundImageButton not found, cannot attach click listener.'); 
  }

  // Event listener for the actual file input change (for background image)
  if (domElements.backgroundImageFileInput) {
    domElements.backgroundImageFileInput.addEventListener('change', handleBackgroundImageFileChange);
  } else {
    console.error('[ui.js] backgroundImageFileInput element not found. Cannot attach change listener.');
  }

  // Event listener for the "Choose Local Image" button for object image
  if (domElements.chooseObjectImageButton) {
    domElements.chooseObjectImageButton.addEventListener('click', (event) => {
      event.preventDefault(); // Good practice, though for a button it might not be strictly necessary
      if (domElements.objectImageFileInput) {
        domElements.objectImageFileInput.value = null; // Clear previous selection
        domElements.objectImageFileInput.click(); // Trigger hidden file input
      } else {
        console.error('[ui.js] objectImageFileInput not found on button click.');
      }
    });
  } else {
    console.error('[ui.js] chooseObjectImageButton not found, cannot attach click listener.');
  }

  // Event listener for the actual file input change (for object image)
  if (domElements.objectImageFileInput) {
    domElements.objectImageFileInput.addEventListener('change', handleObjectImageFileChange);
  } else {
    console.error('[ui.js] objectImageFileInput element not found. Cannot attach change listener.');
  }

  // Board Setup Apply Button
  if (domElements.applyBoardPropertiesButton) {
    domElements.applyBoardPropertiesButton.addEventListener('click', handleApplyBoardProperties);
  } else {
    console.error('[ui.js] applyBoardPropertiesButton not found in DOM, cannot attach listener.');
  }

  // Event listener for Clear Board button
  if (domElements.clearBoardButton) {
    domElements.clearBoardButton.addEventListener('click', () => {
      showModal(
        'Confirm Clear Board',
        '<p>Are you sure you want to clear all objects and reset the background?</p>',
        [
          { text: 'Cancel', type: 'secondary' },
          {
            text: 'Clear Board',
            type: 'danger',
            onClickCallback: () => {
              VTT_API.clearAllObjects();
              VTT_API.setTableBackground({ type: 'color', value: '#cccccc' }); // Reset background
              // Clear background URL input
              if (domElements.backgroundUrlInput) {
                domElements.backgroundUrlInput.value = '';
              }
              // Reset background color input visually
              if (domElements.backgroundColorInput) {
                domElements.backgroundColorInput.value = '#cccccc';
              }
              VTT_API.showMessage('Board cleared.', 'info');
              // hideModal() is called by default by showModal's button handler
            },
          },
        ]
      );
    });
  } else {
    console.error('[ui.js] clearBoardButton not found in DOM, cannot attach listener.');
  }

  // Event listener for Save Memory State button
  if (callbacks.onSaveMemoryState && domElements.saveMemoryStateButton) {
    domElements.saveMemoryStateButton.addEventListener('click', callbacks.onSaveMemoryState);
  } else {
    if (!callbacks.onSaveMemoryState) console.error('[ui.js] onSaveMemoryState callback not provided.');
    if (!domElements.saveMemoryStateButton) console.error('[ui.js] saveMemoryStateButton not found in DOM.');
  }

  // TODO: Add event listener for loadMemoryStateButton when its functionality is implemented
  // Event listener for Load Memory State button
  if (callbacks.onLoadMemoryStateRequest && domElements.loadMemoryStateButton) {
    domElements.loadMemoryStateButton.addEventListener('click', callbacks.onLoadMemoryStateRequest);
  } else {
    if (!callbacks.onLoadMemoryStateRequest) console.error('[ui.js] onLoadMemoryStateRequest callback not provided.');
    if (!domElements.loadMemoryStateButton) console.error('[ui.js] loadMemoryStateButton not found in DOM.');
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
      name = '', // Default to empty string if name is not provided
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
    if (domElements.objName) domElements.objName.value = name || '';
    domElements.objX.value = x;
    domElements.objY.value = y;
    domElements.objWidth.value = width;
    domElements.objHeight.value = height;
    domElements.objRotation.value = rotation;
    domElements.objZIndex.value = zIndex;
    domElements.objIsMovable.checked = isMovable;
    domElements.objShape.value = shape;

    if (appearance) {
      const { backgroundColor = '#CCCCCC', imageUrl = '', text = '', showLabel = false } = appearance;
      domElements.objBgColor.value = backgroundColor;
      domElements.objImageUrl.value = imageUrl;
      if (domElements.objLabelText) domElements.objLabelText.value = text || '';
      if (domElements.objShowLabel) domElements.objShowLabel.checked = showLabel || false;
    } else {
      domElements.objBgColor.value = '#CCCCCC';
      domElements.objImageUrl.value = '';
      if (domElements.objLabelText) domElements.objLabelText.value = '';
      if (domElements.objShowLabel) domElements.objShowLabel.checked = false;
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
      ) {
        child.style.display = 'none';
      }
    });
    if (domElements.objName) domElements.objName.value = ''; // Clear name field
    if (domElements.objLabelText) domElements.objLabelText.value = ''; // Clear label text
    if (domElements.objShowLabel) domElements.objShowLabel.checked = false; // Uncheck show label

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
    name: domElements.objName ? domElements.objName.value.trim() : '',
    x: parseFloat(domElements.objX.value) || 0,
    y: parseFloat(domElements.objY.value) || 0,
    width: (() => {
      let newWidth = parseFloat(domElements.objWidth.value);
      return (isNaN(newWidth) || newWidth < 1) ? 1 : newWidth;
    })(),
    height: (() => {
      let newHeight = parseFloat(domElements.objHeight.value);
      return (isNaN(newHeight) || newHeight < 1) ? 1 : newHeight;
    })(),
    rotation: parseFloat(domElements.objRotation.value) || 0,
    zIndex: parseInt(domElements.objZIndex.value, 10) || 0,
    isMovable: domElements.objIsMovable.checked,
    shape: domElements.objShape.value,
    appearance: {
      backgroundColor: domElements.objBgColor.value,
      imageUrl: domElements.objImageUrl.value.trim(),
      text: domElements.objLabelText ? domElements.objLabelText.value : '',
      showLabel: domElements.objShowLabel ? domElements.objShowLabel.checked : false,
      // Potentially other existing appearance props like borderColor, borderWidth if they are in inspector
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

// Function to handle applying changes from the object inspector
const handleApplyObjectChangesFromInspector = () => {
  const updatedProps = readObjectInspector();
  if (updatedProps && updatedProps.id) {
    const newObjState = VTT_API.updateObject(updatedProps.id, updatedProps);
    if (newObjState) {
      populateObjectInspector(newObjState);
      VTT_API.showMessage('Object updated successfully.', 'success');
    } else {
      VTT_API.showMessage('Failed to update object. It might have been deleted elsewhere or an error occurred.', 'error');
      // Optionally, refresh inspector if object is gone
      // const currentObject = VTT_API.getObject(updatedProps.id);
      // populateObjectInspector(currentObject); // This would show if it's still there or clear if not
    }
  } else {
    VTT_API.showMessage('No object selected or ID missing for update.', 'warning');
  }
};

// Function to handle deleting an object from the inspector
const handleDeleteObjectFromInspector = () => {
  const currentObject = readObjectInspector();
  if (currentObject && currentObject.id) {
    const objectId = currentObject.id;
    const objectName = currentObject.name || objectId; // Use name if available, else ID

    showModal(
      'Confirm Delete',
      `Are you sure you want to delete object "${objectName}" (ID: ${objectId})?`,
      [
        { text: 'Cancel', type: 'secondary' },
        {
          text: 'Delete',
          type: 'danger',
          onClickCallback: () => {
            // Dispatch event for controller to handle deletion
            document.dispatchEvent(new CustomEvent('uiObjectDeleteRequested', { 
              detail: { objectId: objectId, objectName: objectName },
              bubbles: true, 
              composed: true 
            }));
            // Original direct API calls and UI updates are removed here.
            // hideModal() is called by default by showModal's button handler
          },
        },
      ]
    );
  } else {
    VTT_API.showMessage('No object selected to delete.', 'warning');
  }
};


export const displayCreateObjectModal = () => { // createCallback parameter removed
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
        // Dispatch event for controller to handle creation
        document.dispatchEvent(new CustomEvent('uiCreateObjectRequested', {
          detail: { shape: shape, props: props },
          bubbles: true,
          composed: true
        }));
        // Original direct API calls and UI updates are removed here.
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

// --- New Handler Functions for Background and Image Files ---

const handleSetBackgroundFromToolbar = () => {
  let { backgroundUrl, backgroundColor } = getToolbarValues(); // Use let for backgroundUrl

  // If the input field shows "Local file: ...", it means a local file was already loaded.
  // Pressing "Set Background" with this text should not try to load it as a URL.
  // Clear the input and use color if it's a placeholder.
  if (backgroundUrl.startsWith('Local file:')) {
    setBackgroundUrlInputText(''); // Clear the placeholder text
    backgroundUrl = ''; // Treat as empty for logic below
  }

  if (backgroundUrl) { // This will now be true only for actual URLs
    VTT_API.setTableBackground({
      type: 'image',
      value: backgroundUrl,
    });
    VTT_API.showMessage(`Background image set from URL: ${backgroundUrl}`, 'success');
  } else {
    VTT_API.setTableBackground({
      type: 'color',
      value: backgroundColor,
    });
    VTT_API.showMessage(`Background color set to: ${backgroundColor}`, 'success');
  }
  // VTT_API.setTableBackground itself will trigger redraw via event
};

const handleBackgroundImageFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataURL = e.target.result;
      VTT_API.setTableBackground({
        type: 'image',
        value: dataURL,
      });
      setBackgroundUrlInputText(`Local file: ${file.name}`);
      VTT_API.showMessage(`Background image set to: ${file.name}`, 'success');
    };
    reader.onerror = (e) => {
      console.error('Error reading file for background:', e);
      VTT_API.showMessage('Failed to load background image from file.', 'error');
      // Optionally use showModal for a more prominent error
      // showModal('File Read Error', 'Could not read the selected file for the background image.');
    };
    reader.readAsDataURL(file);
  }
};

const handleObjectImageFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) {
    return; // No file selected
  }

  if (!file.type.startsWith('image/')) {
    VTT_API.showMessage('Please select an image file for the object.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataURL = e.target.result;
    setObjectImageUrlText(dataURL); // Existing ui.js function to update inspector field
    VTT_API.showMessage('Object image updated in inspector. Click "Update Object" to apply.', 'info');
  };
  reader.onerror = () => {
    VTT_API.showMessage('Error reading object image file.', 'error');
    console.error('Error reading object image file:', reader.error);
  };
  reader.readAsDataURL(file);
};

// --- Existing Exported Functions ---

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

/**
 * Sets the text content of the object image URL input field in the inspector.
 * @param {string} text - The text to set (typically a Data URL or web URL).
 */
export const setObjectImageUrlText = (text) => {
  if (domElements.objImageUrl) {
    domElements.objImageUrl.value = text;
    // Optionally, trigger a change event if live updates depend on it,
    // though direct application via "Apply Changes" is the primary mechanism.
    // const event = new Event('change', { bubbles: true });
    // domElements.objImageUrl.dispatchEvent(event);
  } else {
    console.error('[ui.js] objImageUrl element not found. Cannot set text.');
  }
};

/**
 * Returns the modal content DOM element.
 * @returns {HTMLElement|null} The modal content element or null if not found.
 */
export const getModalContentElement = () => {
  if (!domElementsCached) cacheDOMElements(); // Ensure cache is populated
  return domElements.modalContent || null;
};
