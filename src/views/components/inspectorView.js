// src/views/components/inspectorView.js
/**
 * @file Manages the object inspector UI component.
 * This component is responsible for displaying the properties of the currently selected VTT object
 * and allowing users to edit these properties. It interacts with the UiViewModel to receive
 * selected object data and to send updates.
 */
import log from 'loglevel';
import debug from 'debug';

const dInspector = debug('app:view:inspector');

/** @type {UiViewModel | null} Instance of the UiViewModel, used for data and actions. */
let uiViewModelInstance = null;

/**
 * @type {Object<string, HTMLElement|HTMLInputElement|HTMLSelectElement|null>}
 * Stores references to DOM elements within the inspector panel for easy access and manipulation.
 */
const domElements = {
        inspectorSidebar: null, // The main sidebar container for the inspector
        inspectorContent: null, // The content area where object properties are displayed/edited
        inspectorActions: null, // Container for action buttons like "Update" and "Delete"
        objId: null,
        objName: null,
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
        objLabelText: null,
        objShowLabel: null,
        updateObjectButton: null,
        deleteObjectButton: null,
        chooseObjectImageButton: null,
        objectImageFileInput: null, // The hidden file input for choosing an object's image
};

/**
 * Caches references to all relevant DOM elements within the inspector panel.
 * This is called once during initialization to improve performance by avoiding repeated DOM queries.
 */
const cacheDOMElements = () => {
        dInspector('cacheDOMElements called');
        domElements.inspectorSidebar =
                document.getElementById('inspector-sidebar');
        domElements.inspectorContent =
                document.getElementById('inspector-content');
        domElements.inspectorActions =
                document.getElementById('inspector-actions');
        domElements.objId = document.getElementById('obj-id');
        domElements.objName = document.getElementById('obj-name');
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
        domElements.objScriptOnClick =
                document.getElementById('obj-script-onclick');
        domElements.objLabelText = document.getElementById('obj-label-text');
        domElements.objShowLabel = document.getElementById('obj-show-label');
        domElements.updateObjectButton = document.getElementById(
                'update-object-button'
        );
        domElements.deleteObjectButton = document.getElementById(
                'delete-object-button'
        );
        domElements.chooseObjectImageButton = document.getElementById(
                'choose-object-image-button'
        );
        domElements.objectImageFileInput = document.getElementById(
                'objectImageFileInput'
        );
};

/**
 * Populates the inspector form fields with the properties of the given object.
 * If no objectData is provided (e.g., no object selected), it clears the inspector
 * and displays a "Select an object" message.
 * @param {VTTObject | null} objectData - The object whose properties are to be displayed,
 *                                      or null to clear the inspector. Typically from UiViewModel.
 */
const populateObjectInspector = (objectData) => {
        dInspector(
                'populateObjectInspector called with objectData: %o',
                objectData
        );
        if (!domElements.inspectorContent) {
                log.warn(
                        '[inspectorView.js] Inspector content DOM not cached/found. Cannot populate.'
                );
                dInspector(
                        'populateObjectInspector warning: inspectorContent DOM not found.'
                );
                return;
        }

        const inspectorContentDiv =
                domElements.inspectorContent.querySelector('div:first-child'); // Used to show/hide the "Select an object" placeholder
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

                if (
                        inspectorContentDiv &&
                        inspectorContentDiv.querySelector('p')
                ) {
                        inspectorContentDiv.querySelector('p').style.display =
                                'none';
                }

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
                        const {
                                backgroundColor = '#CCCCCC',
                                imageUrl = '',
                                text = '',
                                showLabel = false,
                        } = appearance;
                        domElements.objBgColor.value = backgroundColor;
                        domElements.objImageUrl.value = imageUrl;
                        if (domElements.objLabelText)
                                domElements.objLabelText.value = text || '';
                        if (domElements.objShowLabel)
                                domElements.objShowLabel.checked =
                                        showLabel || false;
                } else {
                        domElements.objBgColor.value = '#CCCCCC';
                        domElements.objImageUrl.value = '';
                        if (domElements.objLabelText)
                                domElements.objLabelText.value = '';
                        if (domElements.objShowLabel)
                                domElements.objShowLabel.checked = false;
                }

                domElements.objData.value = data
                        ? JSON.stringify(data, null, 2)
                        : '{}';
                domElements.objScriptOnClick.value =
                        scripts && scripts.onClick ? scripts.onClick : '';

                if (domElements.inspectorActions)
                        domElements.inspectorActions.classList.remove('hidden');
                Array.from(inspectorFieldsContainer.children).forEach(
                        (child) => {
                                if (
                                        child !== inspectorContentDiv &&
                                        child !== domElements.inspectorActions
                                ) {
                                        child.style.display = '';
                                }
                        }
                );
        } else {
                // objectData is null
                if (domElements.objId) domElements.objId.textContent = ''; // <-- ADD THIS LINE
                if (
                        inspectorContentDiv &&
                        inspectorContentDiv.querySelector('p')
                ) {
                        inspectorContentDiv.querySelector('p').textContent =
                                'Select an object to inspect.';
                        inspectorContentDiv.querySelector('p').style.display =
                                '';
                }
                Array.from(inspectorFieldsContainer.children).forEach(
                        (child) => {
                                if (
                                        child !== inspectorContentDiv &&
                                        child !== domElements.inspectorActions
                                ) {
                                        child.style.display = 'none';
                                }
                        }
                );
                if (domElements.objName) domElements.objName.value = '';
                if (domElements.objLabelText)
                        domElements.objLabelText.value = '';
                if (domElements.objShowLabel)
                        domElements.objShowLabel.checked = false;
                if (domElements.inspectorActions)
                        domElements.inspectorActions.classList.add('hidden');
        }
};

/**
 * Reads all property values from the inspector form fields and constructs an object snapshot.
 * This snapshot represents the current state of the inspector UI.
 * Includes basic validation for JSON data in the 'data' field.
 * @returns {object | null} An object containing all properties read from the inspector,
 *                          or null if no object is currently being inspected (ID field is empty).
 */
const readObjectInspector = () => {
        if (!domElements.objId || !domElements.objId.textContent) {
                dInspector(
                        'readObjectInspector: No object ID found, returning null.'
                );
                return null;
        }

        const dataStr = domElements.objData.value;
        let data = {};
        try {
                data = JSON.parse(dataStr);
        } catch (e) {
                log.error('Invalid JSON in data field:', e);
                dInspector(
                        'readObjectInspector error: Invalid JSON in data field. Error: %o',
                        e
                );
                if (uiViewModelInstance && uiViewModelInstance.displayMessage) {
                        uiViewModelInstance.displayMessage(
                                'Error: Custom Data is not valid JSON.',
                                'error'
                        );
                } else {
                        alert('Error: Custom Data is not valid JSON.'); // Fallback
                }
        }
        const snapshot = {
                id: domElements.objId.textContent,
                name: domElements.objName
                        ? domElements.objName.value.trim()
                        : '',
                x: parseFloat(domElements.objX.value) || 0,
                y: parseFloat(domElements.objY.value) || 0,
                width: (() => {
                        let w = parseFloat(domElements.objWidth.value);
                        return isNaN(w) || w < 1 ? 1 : w;
                })(),
                height: (() => {
                        let h = parseFloat(domElements.objHeight.value);
                        return isNaN(h) || h < 1 ? 1 : h;
                })(),
                rotation: parseFloat(domElements.objRotation.value) || 0,
                zIndex: parseInt(domElements.objZIndex.value, 10) || 0,
                isMovable: domElements.objIsMovable.checked,
                shape: domElements.objShape.value,
                appearance: {
                        backgroundColor: domElements.objBgColor.value,
                        imageUrl: domElements.objImageUrl.value.trim(),
                        text: domElements.objLabelText
                                ? domElements.objLabelText.value
                                : '',
                        showLabel: domElements.objShowLabel
                                ? domElements.objShowLabel.checked
                                : false,
                },
                data: data,
                scripts: {
                        onClick: domElements.objScriptOnClick.value.trim(),
                },
        };
};

/**
 * Handles the click event for the "Update Object" button.
 * Reads the current properties from the inspector (via readObjectInspector)
 * and then calls `uiViewModelInstance.applyInspectorChanges` to update the model.
 */
const handleApplyObjectChanges = () => {
        dInspector('handleApplyObjectChanges called');
        const updatedProps = readObjectInspector();
        dInspector('Read inspector properties: %o', updatedProps);
        if (updatedProps && updatedProps.id && uiViewModelInstance) {
                uiViewModelInstance.applyInspectorChanges(
                        updatedProps.id,
                        updatedProps
                );
                dInspector(
                        'Called uiViewModelInstance.applyInspectorChanges for ID: %s',
                        updatedProps.id
                );
        } else if (!uiViewModelInstance) {
                log.error(
                        '[inspectorView.js] UiViewModel not initialized. Cannot apply object changes.'
                );
                dInspector(
                        'handleApplyObjectChanges error: UiViewModel not initialized.'
                );
        } else {
                log.warn(
                        '[inspectorView.js] No object selected or ID missing for update.'
                );
                dInspector(
                        'handleApplyObjectChanges warning: No object selected or ID missing for update.'
                );
                if (uiViewModelInstance && uiViewModelInstance.displayMessage) {
                        uiViewModelInstance.displayMessage(
                                'No object selected or ID missing for update.',
                                'warning'
                        );
                }
        }
};

/**
 * Handles the click event for the "Delete Object" button.
 * Reads the current object's ID and name from the inspector (via readObjectInspector)
 * and then calls `uiViewModelInstance.requestObjectDelete` to initiate deletion.
 */
const handleDeleteObject = () => {
        dInspector('handleDeleteObject called');
        const currentObject = readObjectInspector();
        dInspector('Read inspector properties for delete: %o', currentObject);
        if (currentObject && currentObject.id && uiViewModelInstance) {
                if (uiViewModelInstance.requestObjectDelete) {
                        // Check if method exists on ViewModel
                        uiViewModelInstance.requestObjectDelete(
                                currentObject.id,
                                currentObject.name || currentObject.id
                        );
                        dInspector(
                                'Called uiViewModelInstance.requestObjectDelete for ID: %s',
                                currentObject.id
                        );
                } else {
                        log.error(
                                '[inspectorView.js] uiViewModelInstance or requestObjectDelete method not available.'
                        );
                        dInspector(
                                'handleDeleteObject error: requestObjectDelete method not available on UiViewModel.'
                        );
                        // Fallback message if necessary, though displayMessage on ViewModel is preferred
                        alert('Error: Could not initiate object deletion.');
                }
        } else if (!uiViewModelInstance) {
                log.error(
                        '[inspectorView.js] UiViewModel not initialized. Cannot delete object.'
                );
                dInspector(
                        'handleDeleteObject error: UiViewModel not initialized.'
                );
        } else {
                dInspector(
                        'handleDeleteObject warning: No object selected to delete.'
                );
                if (uiViewModelInstance && uiViewModelInstance.displayMessage) {
                        uiViewModelInstance.displayMessage(
                                'No object selected to delete.',
                                'warning'
                        );
                }
        }
};

/**
 * Sets the text value of the object's image URL input field.
 * Used internally when an image is selected via the file picker to show a data URL or placeholder.
 * @param {string} text - The text to set in the image URL input field.
 */
const setObjectImageUrlText = (text) => {
        dInspector('setObjectImageUrlText called with text: %s', text);
        if (domElements.objImageUrl) {
                domElements.objImageUrl.value = text;
        } else {
                log.error(
                        '[inspectorView.js] objImageUrl element not found. Cannot set text.'
                );
                dInspector(
                        'setObjectImageUrlText error: objImageUrl DOM element not found.'
                );
        }
};

/**
 * Handles the 'change' event for the hidden object image file input.
 * When a file is selected, it reads the image as a data URL,
 * updates the image URL input field in the inspector using `setObjectImageUrlText`,
 * and informs the user via `uiViewModelInstance.displayMessage` that they need to click "Update Object" to apply.
 * @param {Event} event - The file input change event, containing the selected file(s).
 */
const handleObjectImageFileChange = (event) => {
        dInspector(
                'handleObjectImageFileChange event triggered. File: %o',
                event.target.files[0]
        );
        const file = event.target.files[0];
        if (!file) {
                dInspector('No file selected.');
                return;
        }

        if (!file.type.startsWith('image/')) {
                dInspector('Selected file is not an image: %s', file.type);
                if (uiViewModelInstance && uiViewModelInstance.displayMessage) {
                        uiViewModelInstance.displayMessage(
                                'Please select an image file for the object.',
                                'error'
                        );
                }
                return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
                dInspector(
                        'File loaded as data URL. Length: %d',
                        e.target.result.length
                );
                setObjectImageUrlText(e.target.result);
                if (uiViewModelInstance && uiViewModelInstance.displayMessage) {
                        uiViewModelInstance.displayMessage(
                                'Object image updated in inspector. Click "Update Object" to apply.',
                                'info'
                        );
                }
        };
        reader.onerror = () => {
                log.error(
                        '[inspectorView.js] Error reading object image file:',
                        reader.error
                );
                dInspector('Error reading object image file: %o', reader.error);
                if (uiViewModelInstance && uiViewModelInstance.displayMessage) {
                        uiViewModelInstance.displayMessage(
                                'Error reading object image file.',
                                'error'
                        );
                }
        };
        reader.readAsDataURL(file);
        dInspector('Started reading file as data URL: %s', file.name);
};

/**
 * Initializes the inspector view component.
 * Stores the UiViewModel instance, caches DOM elements, sets up event listeners
 * for inspector actions (update, delete, choose image), and registers a callback
 * with UiViewModel to update the inspector when selected object data changes.
 * Also performs an initial population of the inspector.
 * @param {UiViewModel} uiViewModel - The UiViewModel instance.
 * @param {object} vttApi - The VTT_API instance (passed but not directly used in event handlers, actions go via ViewModel).
 */
export const init = (uiViewModel, vttApi) => {
        dInspector(
                'init called with uiViewModel: %o, vttApi: %o',
                uiViewModel,
                vttApi
        );
        uiViewModelInstance = uiViewModel;

        if (!uiViewModelInstance) {
                log.error(
                        '[inspectorView.js] UiViewModel not provided during init!'
                );
                dInspector('init error: UiViewModel not provided.');
                return;
        }
        dInspector('UiViewModel instance stored.');

        cacheDOMElements();
        dInspector('DOM elements cached.');

        if (domElements.updateObjectButton) {
                domElements.updateObjectButton.addEventListener(
                        'click',
                        handleApplyObjectChanges
                );
                dInspector('Event listener added for updateObjectButton.');
        }
        if (domElements.deleteObjectButton) {
                domElements.deleteObjectButton.addEventListener(
                        'click',
                        handleDeleteObject
                );
                dInspector('Event listener added for deleteObjectButton.');
        }
        if (
                domElements.chooseObjectImageButton &&
                domElements.objectImageFileInput
        ) {
                domElements.chooseObjectImageButton.addEventListener(
                        'click',
                        (e) => {
                                e.preventDefault();
                                dInspector(
                                        'Choose Object Image button clicked.'
                                );
                                domElements.objectImageFileInput.value = null; // Reset file input
                                domElements.objectImageFileInput.click();
                                dInspector(
                                        'Hidden objectImageFileInput clicked.'
                                );
                        }
                );
                domElements.objectImageFileInput.addEventListener(
                        'change',
                        handleObjectImageFileChange
                );
                dInspector(
                        'Event listener added for objectImageFileInput change.'
                );
        }

        uiViewModelInstance.onInspectorDataChanged(populateObjectInspector);
        dInspector(
                'Registered populateObjectInspector with uiViewModelInstance.onInspectorDataChanged.'
        );

        // Initial population of the inspector with currently selected object data (if any)
        populateObjectInspector(uiViewModelInstance.getInspectorData());
        dInspector('Initial population of inspector complete.');
        // log.debug('[inspectorView.js] Initialized.'); // Removed for cleaner logs
};
