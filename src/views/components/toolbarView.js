// src/views/components/toolbarView.js
/**
 * @file Manages the UI and interactions for the main toolbar.
 * This includes buttons for creating objects, setting the table background (URL, color, or file),
 * and other global actions. It interacts with UiViewModel to perform these actions.
 */

/** @type {UiViewModel | null} Instance of the UiViewModel. */
let uiViewModelInstance = null;

/**
 * @type {Object<string, HTMLElement|HTMLInputElement|null>}
 * Stores references to DOM elements within the toolbar.
 */
const domElements = {
    createObjectButton: null,       // Button to open the "Create Object" modal
    backgroundUrlInput: null,     // Input field for background image URL
    backgroundColorInput: null, // Input field for background color
    setBackgroundButton: null,
    chooseBackgroundImageButton: null,  // Button to trigger file chooser for background image
    backgroundImageFileInput: null, // Hidden file input for choosing background image
};

/**
 * Caches references to DOM elements used by the toolbar.
 * Also creates and appends a hidden file input for background image selection.
 */
const cacheDOMElements = () => {
    domElements.createObjectButton = document.getElementById('create-object-button');
    domElements.backgroundUrlInput = document.getElementById('background-url-input');
    domElements.backgroundColorInput = document.getElementById('background-color-input');
    domElements.setBackgroundButton = document.getElementById('set-background-button');
    domElements.chooseBackgroundImageButton = document.getElementById('choose-background-image-button');
    
    // Create a hidden file input for background images, managed by this component.
    domElements.backgroundImageFileInput = document.createElement('input');
    domElements.backgroundImageFileInput.type = 'file';
    domElements.backgroundImageFileInput.accept = 'image/*';
    domElements.backgroundImageFileInput.style.position = 'absolute';
    domElements.backgroundImageFileInput.style.left = '-9999px';
    domElements.backgroundImageFileInput.style.width = '1px';
    domElements.backgroundImageFileInput.style.height = '1px';
    domElements.backgroundImageFileInput.style.opacity = '0';
    domElements.backgroundImageFileInput.style.overflow = 'hidden';
    document.body.appendChild(domElements.backgroundImageFileInput); // Add to body to be interactive for clicks
};

/**
 * Retrieves the current values from the background URL and color input fields.
 * @returns {{backgroundUrl: string, backgroundColor: string}} An object containing the background URL and color.
 */
const getToolbarValues = () => {
    return {
        backgroundUrl: domElements.backgroundUrlInput ? domElements.backgroundUrlInput.value.trim() : '',
        backgroundColor: domElements.backgroundColorInput ? domElements.backgroundColorInput.value : '#cccccc',
    };
};

/**
 * Sets the text value of the background URL input field.
 * Useful for displaying a placeholder like "Local file: ..."
 * @param {string} text - The text to set in the input field.
 */
const setBackgroundUrlInputText = (text) => {
    if (domElements.backgroundUrlInput) {
        domElements.backgroundUrlInput.value = text;
    }
};

/**
 * Handles the click event for the "Set Background" button.
 * Reads values from the URL and color inputs and calls `uiViewModelInstance.setTableBackground`.
 * Prioritizes URL if provided, otherwise uses the color.
 */
const handleSetBackgroundFromToolbar = () => {
    if (!uiViewModelInstance) {
        console.error("[toolbarView.js] UiViewModel not initialized.");
        return;
    }
    let { backgroundUrl, backgroundColor } = getToolbarValues();
    if (backgroundUrl.startsWith('Local file:')) { // Placeholder from local file selection
        setBackgroundUrlInputText(''); // Clear placeholder
        backgroundUrl = ''; // Don't use placeholder as URL
    }

    if (backgroundUrl) {
        uiViewModelInstance.setTableBackground({ type: 'image', value: backgroundUrl });
    } else {
        uiViewModelInstance.setTableBackground({ type: 'color', value: backgroundColor });
    }
};

/**
 * Handles the 'change' event for the hidden background image file input.
 * When a file is selected, it reads the image as a data URL,
 * calls `uiViewModelInstance.setTableBackground` to apply it,
 * and updates the background URL input field to show a placeholder for the local file.
 * @param {Event} event - The file input change event.
 */
const handleBackgroundImageFileChange = (event) => {
    if (!uiViewModelInstance) {
        console.error("[toolbarView.js] UiViewModel not initialized.");
        return;
    }
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataURL = e.target.result;
            uiViewModelInstance.setTableBackground({ type: 'image', value: dataURL });
            setBackgroundUrlInputText(`Local file: ${file.name}`); // Update input to show local file name
        };
        reader.onerror = (e) => {
            console.error('[toolbarView.js] Error reading file for background:', e);
            if (uiViewModelInstance) {
                 uiViewModelInstance.displayMessage('Failed to load background image from file.', 'error');
            }
        };
        reader.readAsDataURL(file);
    }
};

export const init = (uiViewModel) => {
    uiViewModelInstance = uiViewModel;

    if (!uiViewModelInstance) {
        console.error('[toolbarView.js] UiViewModel not provided during init!');
        return;
    }

    cacheDOMElements();

    if (domElements.createObjectButton) {
        domElements.createObjectButton.addEventListener('click', () => {
            if (uiViewModelInstance.requestCreateObjectModal) {
                uiViewModelInstance.requestCreateObjectModal();
            } else {
                console.error('[toolbarView.js] requestCreateObjectModal method not found on UiViewModel.');
            }
        });
    }

    if (domElements.setBackgroundButton) {
        domElements.setBackgroundButton.addEventListener('click', handleSetBackgroundFromToolbar);
    }

    if (domElements.chooseBackgroundImageButton && domElements.backgroundImageFileInput) {
        domElements.chooseBackgroundImageButton.addEventListener('click', () => {
            domElements.backgroundImageFileInput.value = null; // Clear previous selection
            domElements.backgroundImageFileInput.click();
        });
        domElements.backgroundImageFileInput.addEventListener('change', handleBackgroundImageFileChange);
    }
    // console.log('[toolbarView.js] Initialized.'); // Already commented out
};
