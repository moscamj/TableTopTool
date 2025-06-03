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
    
    // This input is created dynamically in the main uiView.js, then cached there.
    // For toolbarView to use it, it must be passed in or selected globally.
    // For now, let's assume it's globally accessible or uiView will pass it.
    // A better approach might be for uiView to pass the element after it's created.
    // For this step, we'll rely on it being found by ID if it was added with one,
    // or passed if dynamically created without an ID by uiView.
    // The original uiView.js creates it and appends to body, but without an ID.
    // This will need careful handling.
    // Let's assume for now uiView.js will provide it or it's queryable.
    // Re-checking uiView.js: it *is* created and appended to body, but not assigned an ID.
    // This is problematic for encapsulation.
    // A temporary solution: query it if it's the only one of its kind, or uiView must pass it.
    // For now, let's assume uiView.js will handle its creation and events, and toolbarView
    // will just have the button that triggers it.
    // OR, toolbarView can create its own hidden input if it's fully self-contained.
    // Let's make toolbarView create its own hidden input for background images.
    
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

    // console.log('[toolbarView.js] Toolbar DOM elements cached.');
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
            if (uiViewModelInstance.onDisplayMessage) { // Check if display message callback is set
                 uiViewModelInstance.onDisplayMessage('Failed to load background image from file.', 'error');
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
    
    console.log('[toolbarView.js] Initialized.');
};
