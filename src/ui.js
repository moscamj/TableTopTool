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
};

/**
 * Call this once at startup to cache all DOM element references.
 */
const _cacheDOMElements = () => {
  if (domElementsCached) {
    // console.log('[ui.js] cacheDOMElements: Already cached. Skipping.'); // Keep console logs minimal for now
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

  domElements.fileInput = document.createElement('input');
  domElements.fileInput.type = 'file';
  domElements.fileInput.accept = '.json,.ttt.json'; 
  domElements.fileInput.style.display = 'none';
  document.body.appendChild(domElements.fileInput);

  domElements.backgroundImageFileInput = document.createElement('input');
  domElements.backgroundImageFileInput.type = 'file';
  domElements.backgroundImageFileInput.accept = 'image/*'; 
  domElements.backgroundImageFileInput.style.position = 'absolute';
  domElements.backgroundImageFileInput.style.left = '-9999px';
  domElements.backgroundImageFileInput.style.top = '-9999px'; 
  domElements.backgroundImageFileInput.style.width = '1px';   
  domElements.backgroundImageFileInput.style.height = '1px';  
  domElements.backgroundImageFileInput.style.opacity = '0';   
  domElements.backgroundImageFileInput.style.overflow = 'hidden'; 
  document.body.appendChild(domElements.backgroundImageFileInput);

  domElements.chooseObjectImageButton = document.getElementById('choose-object-image-button');
  domElements.objectImageFileInput = document.getElementById('objectImageFileInput');

  if (domElements.sessionSaveButton)
    domElements.sessionSaveButton.textContent = 'Save to File';
  if (domElements.sessionLoadButton)
    domElements.sessionLoadButton.textContent = 'Load from File';
  if (domElements.sessionIdDisplay)
    domElements.sessionIdDisplay.style.display = 'none';
  if (domElements.sessionLoadInput)
    domElements.sessionLoadInput.style.display = 'none';
  if (domElements.userIdDisplay && domElements.userIdDisplay.parentElement) {
    domElements.userIdDisplay.parentElement.style.display = 'none';
  }
};

// Call cacheDOMElements when the DOM is ready
document.addEventListener('DOMContentLoaded', () => uiController.cacheDOMElements());

const _initUIEventListeners = (callbacks) => {
  const {
    onSetBackground,
    onInspectorPropertyChange,
    onApplyObjectChanges,
    onDeleteObject,
    onSaveToFile,
    onLoadFromFileRequest, 
    onLoadFromFileInputChange,
    onCreateObjectRequested, 
    onBackgroundImageFileSelected, 
    onObjectImageFileSelected, 
  } = callbacks;

  if (!domElements.toolsSidebar) uiController.cacheDOMElements();

  if (onCreateObjectRequested && domElements.createObjectButton) {
    domElements.createObjectButton.addEventListener('click', onCreateObjectRequested);
  }

  if (onSetBackground && domElements.setBackgroundButton) {
    domElements.setBackgroundButton.addEventListener('click', onSetBackground);
  }

  const inspectorInputs = domElements.inspectorContent
    ? domElements.inspectorContent.querySelectorAll('.prop-input')
    : [];
  inspectorInputs.forEach((input) => {
    if (onInspectorPropertyChange) {
      input.addEventListener('change', () =>
        onInspectorPropertyChange(uiController.readObjectInspector()) 
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

  if (onSaveToFile && domElements.sessionSaveButton) {
    domElements.sessionSaveButton.addEventListener('click', onSaveToFile);
  }
  if (onLoadFromFileRequest && domElements.sessionLoadButton) {
    domElements.sessionLoadButton.addEventListener('click', () => {
      domElements.fileInput.value = null; 
      domElements.fileInput.click(); 
    });
  }
  if (onLoadFromFileInputChange && domElements.fileInput) {
    domElements.fileInput.addEventListener(
      'change',
      onLoadFromFileInputChange
    );
  }

  if (domElements.chooseBackgroundImageButton) {
    domElements.chooseBackgroundImageButton.addEventListener('click', () => {
      if (domElements.backgroundImageFileInput) {
        domElements.backgroundImageFileInput.value = null; 
        domElements.backgroundImageFileInput.click(); 
      } else {
        console.error('[ui.js] backgroundImageFileInput not found on button click.'); 
      }
    });
  } else {
    console.error('[ui.js] chooseBackgroundImageButton not found, cannot attach click listener.'); 
  }
 
  if (onBackgroundImageFileSelected && domElements.backgroundImageFileInput) {
    domElements.backgroundImageFileInput.addEventListener('change', (event) => {
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

  if (domElements.chooseObjectImageButton) {
    domElements.chooseObjectImageButton.addEventListener('click', (event) => {
      event.preventDefault(); 
      if (domElements.objectImageFileInput) {
        domElements.objectImageFileInput.value = null; 
        domElements.objectImageFileInput.click(); 
      } else {
        console.error('[ui.js] objectImageFileInput not found on button click.');
      }
    });
  } else {
    console.error('[ui.js] chooseObjectImageButton not found, cannot attach click listener.');
  }

  if (onObjectImageFileSelected && domElements.objectImageFileInput) {
    domElements.objectImageFileInput.addEventListener('change', (event) => {
      onObjectImageFileSelected(event);
    });
  } else {
    if (!onObjectImageFileSelected) {
      console.error('[ui.js] "onObjectImageFileSelected" callback is NOT defined. Cannot attach change listener to objectImageFileInput.');
    }
    if (!domElements.objectImageFileInput) {
      console.error('[ui.js] objectImageFileInput element not found. Cannot attach change listener.');
    }
  }
};

const _populateObjectInspector = (objectData) => {
  if (!domElements.inspectorContent) return;

  const inspectorContentDiv =
    domElements.inspectorContent.querySelector('div:first-child');
  const inspectorFieldsContainer = domElements.inspectorContent;

  if (objectData) {
    const {
      id,
      name = '', 
      x = 0,
      y = 0,
      width = 0,
      height = 0,
      rotation = 0,
      zIndex = 0,
      isMovable = true, 
      shape = 'rectangle', 
      appearance, 
      data, 
      scripts, 
    } = objectData;

    if (inspectorContentDiv && inspectorContentDiv.querySelector('p'))
      inspectorContentDiv.querySelector('p').style.display = 'none'; 

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
    Array.from(inspectorFieldsContainer.children).forEach((child) => {
      if (
        child !== inspectorContentDiv && 
        child !== domElements.inspectorActions 
      )
        child.style.display = ''; 
    });
  } else {
    if (inspectorContentDiv && inspectorContentDiv.querySelector('p')) {
      inspectorContentDiv.querySelector('p').textContent =
        'Select an object to inspect.';
      inspectorContentDiv.querySelector('p').style.display = '';
    }
    Array.from(inspectorFieldsContainer.children).forEach((child) => {
      if (
        child !== inspectorContentDiv &&
        child !== domElements.inspectorActions
      ) {
        child.style.display = 'none';
      }
    });
    if (domElements.objName) domElements.objName.value = '';
    if (domElements.objLabelText) domElements.objLabelText.value = '';
    if (domElements.objShowLabel) domElements.objShowLabel.checked = false;
    if (domElements.objId) domElements.objId.textContent = ''; 

    if (domElements.objX) domElements.objX.value = ''; 
    if (domElements.objY) domElements.objY.value = '';
    if (domElements.objWidth) domElements.objWidth.value = '';
    if (domElements.objHeight) domElements.objHeight.value = '';
    if (domElements.objRotation) domElements.objRotation.value = '';
    if (domElements.objBgColor) domElements.objBgColor.value = '#CCCCCC'; 
    if (domElements.objImageUrl) domElements.objImageUrl.value = '';
    if (domElements.objZIndex) domElements.objZIndex.value = '';
    if (domElements.objIsMovable) domElements.objIsMovable.checked = false; 
    if (domElements.objShape) domElements.objShape.value = 'rectangle'; 
    if (domElements.objData) domElements.objData.value = '{}';
    if (domElements.objScriptOnClick) domElements.objScriptOnClick.value = '';
    
    if (domElements.inspectorActions)
      domElements.inspectorActions.classList.add('hidden');
  }
};

const _readObjectInspector = () => {
  if (!domElements.objId || !domElements.objId.textContent) return null; 

  const dataStr = domElements.objData.value;
  let data = {};
  try {
    data = JSON.parse(dataStr);
  } catch (e) {
    uiController.displayMessage('Error: Custom Data is not valid JSON.', 'error'); 
  }

  return {
    id: domElements.objId.textContent, 
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
    },
    data: data,
    scripts: {
      onClick: domElements.objScriptOnClick.value.trim(),
    },
  };
};

const _displayMessage = (text, type = 'info', duration = 3000) => {
  if (!domElements.messageArea) return;

  const messageEl = document.createElement('div');
  messageEl.textContent = text;
  messageEl.className = 'p-3 rounded-md shadow-lg text-sm mb-2'; 

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
    default: 
      messageEl.classList.add('bg-blue-500', 'text-white');
      break;
  }

  domElements.messageArea.appendChild(messageEl);

  setTimeout(() => {
    messageEl.style.opacity = '0'; 
    setTimeout(() => {
      messageEl.remove();
    }, 500); 
  }, duration);
}

const _showModal = (
  title,
  contentHtml,
  buttonsArray = [{ text: 'OK', type: 'primary' }]
) => {
  if (!domElements.modalContainer) return;

  domElements.modalTitle.textContent = title;
  domElements.modalContent.innerHTML = contentHtml;
  domElements.modalButtons.innerHTML = ''; 

  buttonsArray.forEach((btnConfig) => {
    const {
      text,
      type,
      onClickCallback,
      preventHide = false, 
    } = btnConfig;

    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'px-4 py-2 rounded text-sm'; 
    switch (type) {
      case 'secondary':
        button.classList.add('bg-gray-500', 'hover:bg-gray-600', 'text-white');
        break;
      case 'danger':
        button.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white');
        break;
      default: 
        button.classList.add('bg-blue-500', 'hover:bg-blue-600', 'text-white');
    }
    if (onClickCallback) {
      button.addEventListener('click', () => {
        onClickCallback();
        if (!preventHide) uiController.hideModal(); 
      });
    } else {
      button.addEventListener('click', () => uiController.hideModal()); 
    }
    domElements.modalButtons.appendChild(button);
  });

  domElements.modalContainer.classList.remove('hidden');
};

const _hideModal = () => {
  if (!domElements.modalContainer) return;
  domElements.modalContainer.classList.add('hidden');
  domElements.modalTitle.textContent = '';
  domElements.modalContent.innerHTML = '';
  domElements.modalButtons.innerHTML = '';
};

const _displayCreateObjectModal = (createCallback) => {
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
      },
    },
    {
      text: 'Cancel',
      type: 'secondary',
    },
  ];
  
  uiController.showModal('Create New Object', modalContentHtml, buttonsArray); 
};

const _getToolbarValues = () => {
  if (!domElements.backgroundUrlInput) uiController.cacheDOMElements(); 
  return {
    backgroundUrl: domElements.backgroundUrlInput
      ? domElements.backgroundUrlInput.value.trim()
      : '',
    backgroundColor: domElements.backgroundColorInput
      ? domElements.backgroundColorInput.value
      : '#cccccc',
  };
}

document.addEventListener('DOMContentLoaded', () => {
  uiController.populateObjectInspector(null); 
});

const __resetUIDOMCache = () => { 
  domElementsCached = false;
};

const _setBackgroundUrlInputText = (text) => {
  if (domElements.backgroundUrlInput) {
    domElements.backgroundUrlInput.value = text;
  }
};

const _setObjectImageUrlText = (text) => {
  if (domElements.objImageUrl) {
    domElements.objImageUrl.value = text;
  } else {
    console.error('[ui.js] objImageUrl element not found. Cannot set text.');
  }
};

export const uiController = {
  showModal: _showModal,
  hideModal: _hideModal,
  displayCreateObjectModal: _displayCreateObjectModal,
  cacheDOMElements: _cacheDOMElements,
  populateObjectInspector: _populateObjectInspector,
  readObjectInspector: _readObjectInspector,
  displayMessage: _displayMessage,
  initUIEventListeners: _initUIEventListeners,
  getToolbarValues: _getToolbarValues,
  _resetUIDOMCache: __resetUIDOMCache, 
  setBackgroundUrlInputText: _setBackgroundUrlInputText,
  setObjectImageUrlText: _setObjectImageUrlText
};
