// src/views/uiView.js
import * as inspectorView from './components/inspectorView.js';
import * as boardSettingsView from './components/boardSettingsView.js';
import * as toolbarView from './components/toolbarView.js';
import * as modalView from './components/modalView.js';
import * as messageAreaView from './components/messageAreaView.js';

let uiViewModelInstance = null;
let vttApiInstance = null;

let domElementsCached = false;

// Store DOM element references for elements NOT managed by sub-components
const domElements = {
  // Header
  headerTitle: null,
  userIdDisplay: null,
  sessionIdDisplay: null,
  sessionLoadInput: null,
  sessionLoadButton: null,
  sessionSaveButton: null,
  clearBoardButton: null,
  saveMemoryStateButton: null,
  loadMemoryStateButton: null,

  // Tools Sidebar - Most elements moved to toolbarView
  toolsSidebar: null, 

  // Canvas
  canvasContainer: null,
  vttCanvas: null,

  // Modal - Elements moved to modalView

  // Message Area - Moved to messageAreaView.js
  // messageArea: null, 

  // File input (hidden, triggered by button) - General file input, not specific to a component yet
  fileInput: null, 
  // backgroundImageFileInput is now in toolbarView
};

const cacheDOMElements = () => {
  if (domElementsCached) return;
  domElementsCached = true;

  domElements.headerTitle = document.getElementById('header-title');
  domElements.userIdDisplay = document.getElementById('user-id-display');
  domElements.sessionIdDisplay = document.getElementById('session-id-display');
  domElements.sessionLoadInput = document.getElementById('session-load-input');
  domElements.sessionLoadButton = document.getElementById('session-load-button');
  domElements.sessionSaveButton = document.getElementById('session-save-button');
  domElements.clearBoardButton = document.getElementById('clear-board-button');
  domElements.saveMemoryStateButton = document.getElementById('save-memory-state-button');
  domElements.loadMemoryStateButton = document.getElementById('load-memory-state-button');

  domElements.toolsSidebar = document.getElementById('tools-sidebar');
  // Toolbar elements (createObjectButton, backgroundUrlInput, etc.) are cached in toolbarView.js

  domElements.canvasContainer = document.getElementById('canvas-container');
  domElements.vttCanvas = document.getElementById('vtt-canvas');

  // Modal elements are cached in modalView.js

  // Message area is cached in messageAreaView.js
  // domElements.messageArea = document.getElementById('message-area');

  domElements.fileInput = document.createElement('input');
  domElements.fileInput.type = 'file';
  domElements.fileInput.accept = '.json,.ttt.json';
  domElements.fileInput.style.display = 'none';
  document.body.appendChild(domElements.fileInput);

  // backgroundImageFileInput is created and managed by toolbarView.js now
  
  // Update button texts and visibility for offline mode (remains the same for these elements)
  if (domElements.sessionSaveButton) domElements.sessionSaveButton.textContent = 'Save to File';
  if (domElements.sessionLoadButton) domElements.sessionLoadButton.textContent = 'Load from File';
  if (domElements.sessionIdDisplay) domElements.sessionIdDisplay.style.display = 'none';
  if (domElements.sessionLoadInput) domElements.sessionLoadInput.style.display = 'none';
  if (domElements.userIdDisplay && domElements.userIdDisplay.parentElement) {
    domElements.userIdDisplay.parentElement.style.display = 'none';
  }
  // console.log('[uiView.js] Main DOM elements cached.');
};

// document.addEventListener('DOMContentLoaded', cacheDOMElements); // Called by main.js or implicitly via component loads.
// Let's ensure cacheDOMElements is called if not already.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cacheDOMElements);
} else {
    cacheDOMElements();
}

export const init = (uiViewModel, vttApi) => {
  uiViewModelInstance = uiViewModel;
  vttApiInstance = vttApi;

  if (!uiViewModelInstance) {
    console.error('[uiView.js] UiViewModel not provided during init!');
    return;
  }
  // vttApiInstance might be null if not passed, handle gracefully if some methods rely on it.

  // Initialize sub-components
  inspectorView.init(uiViewModelInstance, vttApiInstance);
  boardSettingsView.init(uiViewModelInstance);
  toolbarView.init(uiViewModelInstance);
  modalView.init(uiViewModelInstance); 
  messageAreaView.init(uiViewModelInstance); // Initialize MessageAreaView

  // Callbacks for inspector, board settings, and messages are now handled by their respective components.
  // uiViewModelInstance.onDisplayMessage(displayMessage); // This is now done in messageAreaView.js
  
  // showModal and hideModal are exported by modalView, uiView can use them if needed for other modals
  // (e.g. the clear board confirmation modal still uses the showModal from this file).
  
  console.log('[uiView.js] Initialized with UiViewModel, VTT_API, and all sub-components.');
};


// --- Functions moved to components ---
// updateBoardSettingsDisplay -> boardSettingsView.js
// handleApplyBoardProperties -> boardSettingsView.js
// populateObjectInspector -> inspectorView.js
// readObjectInspector -> inspectorView.js
// handleApplyObjectChangesFromInspector -> inspectorView.js
// handleDeleteObjectFromInspector -> inspectorView.js
// handleObjectImageFileChange -> inspectorView.js
// setObjectImageUrlText -> inspectorView.js
// getToolbarValues -> toolbarView.js
// setBackgroundUrlInputText -> toolbarView.js
// handleSetBackgroundFromToolbar -> toolbarView.js
// handleBackgroundImageFileChange -> toolbarView.js
// displayCreateObjectModal -> modalView.js
// showModal -> modalView.js
// hideModal -> modalView.js
// getModalContentElement -> modalView.js


// --- Main UI Event Listener Setup (for elements uiView.js still manages) ---
export const initUIEventListeners = (callbacks) => {
  const {
    onSaveToFile,
    onLoadFromFileInputChange,
    onSaveMemoryState,
    // onLoadMemoryStateRequest, // This will now be handled by uiViewModelInstance.requestLoadMemoryState()
  } = callbacks;

  if (!domElementsCached) cacheDOMElements(); // Ensure elements are cached

  // Toolbar buttons (createObjectButton, setBackgroundButton, chooseBackgroundImageButton)
  // are now handled within toolbarView.js

  if (onSaveToFile && domElements.sessionSaveButton) {
    domElements.sessionSaveButton.addEventListener('click', onSaveToFile);
  }
  
  if (domElements.sessionLoadButton) {
    domElements.sessionLoadButton.addEventListener('click', () => {
      if (domElements.fileInput) {
        domElements.fileInput.value = null;
        domElements.fileInput.click();
      } else {
        console.error('[uiView.js] fileInput element not found.');
      }
    });
  }

  if (onLoadFromFileInputChange && domElements.fileInput) {
    domElements.fileInput.addEventListener('change', onLoadFromFileInputChange);
  }

  // chooseBackgroundImageButton and its backgroundImageFileInput are managed by toolbarView.js now.
  
  if (domElements.clearBoardButton) {
    domElements.clearBoardButton.addEventListener('click', () => {
      // Use modalView.showModal for consistency if uiView itself needs to show a modal
      modalView.showModal( 
        'Confirm Clear Board',
        '<p>Are you sure you want to clear all objects and reset the background?</p>',
        [
          { text: 'Cancel', type: 'secondary' },
          {
            text: 'Clear Board',
            type: 'danger',
            onClickCallback: () => {
              if (vttApiInstance) vttApiInstance.clearAllObjects();
              if (uiViewModelInstance) {
                uiViewModelInstance.setTableBackground({ type: 'color', value: '#cccccc' });
              } else if (vttApiInstance) {
                vttApiInstance.setTableBackground({ type: 'color', value: '#cccccc' });
              }
              // Toolbar's backgroundUrlInput and backgroundColorInput are not directly accessible here.
              // This part of the clear board functionality might need rethinking.
              // For now, we rely on UiViewModel to clear background which redraws canvas.
              // Toolbar inputs might not reflect this reset unless UiViewModel also notifies toolbarView.
              // Or, uiView can call a method on toolbarView if one is exposed.
              // For now, just call displayMessage.
              if (uiViewModelInstance) { // Check uiViewModelInstance itself
                 uiViewModelInstance.displayMessage('Board cleared.', 'info');
              }
            },
          },
        ]
      );
    });
  }

  if (onSaveMemoryState && domElements.saveMemoryStateButton) { // Changed from callbacks.onSaveMemoryState
    domElements.saveMemoryStateButton.addEventListener('click', onSaveMemoryState);
  }

  // Updated: Load Memory State button now calls uiViewModelInstance.requestLoadMemoryState()
  if (domElements.loadMemoryStateButton) {
    domElements.loadMemoryStateButton.addEventListener('click', () => {
      if (uiViewModelInstance) {
        uiViewModelInstance.requestLoadMemoryState();
      } else {
        console.error('[uiView.js] UiViewModel not available for loading memory state.');
        // Optionally, show an alert or a more user-facing error
      }
    });
  }
};

// displayMessage is now in messageAreaView.js
// export const displayMessage = (text, type = 'info', duration = 3000) => { ... }


// Modal related functions (showModal, hideModal, displayCreateObjectModal, getModalContentElement)
// are now primarily managed by modalView.js.
// uiView.js can still use modalView.showModal/hideModal (imported from modalView) 
// if it needs to display its own modals (e.g., the clear board confirmation, as done above).

// Functions like getToolbarValues, setBackgroundUrlInputText,
// handleSetBackgroundFromToolbar, handleBackgroundImageFileChange are now in toolbarView.js.

// For any functions that were previously exported from uiView but are now in components,
// other modules should import them from their new component locations if direct access is still needed
// (though ideally, interaction happens via UiViewModel or events).
