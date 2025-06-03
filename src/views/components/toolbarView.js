// src/views/components/toolbarView.js

let uiViewModelInstance = null;

const domElements = {
    createObjectButton: null,
    backgroundUrlInput: null,
    backgroundColorInput: null,
    setBackgroundButton: null,
    chooseBackgroundImageButton: null,
    backgroundImageFileInput: null, // This is the actual <input type="file">
};

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
    document.body.appendChild(domElements.backgroundImageFileInput); // Add to body to be interactive
};

const getToolbarValues = () => {
    return {
        backgroundUrl: domElements.backgroundUrlInput ? domElements.backgroundUrlInput.value.trim() : '',
        backgroundColor: domElements.backgroundColorInput ? domElements.backgroundColorInput.value : '#cccccc',
    };
};

const setBackgroundUrlInputText = (text) => {
    if (domElements.backgroundUrlInput) {
        domElements.backgroundUrlInput.value = text;
    }
};

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
    // console.log('[toolbarView.js] Initialized.');
};
