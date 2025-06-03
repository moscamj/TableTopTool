// src/views/components/modalView.js
/**
 * @file Manages the display and interaction logic for all modal dialogs in the application.
 * This includes generic modals for messages/confirmations, a specific modal for creating objects,
 * and a generic selection modal for lists of choices.
 * It interacts with UiViewModel to be shown and to report user actions.
 */

/** @type {UiViewModel | null} Instance of the UiViewModel. */
let uiViewModelInstance = null;

/**
 * @type {Object<string, HTMLElement|null>}
 * Stores references to the core DOM elements that make up the modal structure.
 */
const domElements = {
    modalContainer: null, // The main container for the modal, visibility is toggled
    modalTitle: null,     // Element to display the modal's title
    modalContent: null,   // Element where custom HTML content is injected
    modalButtons: null,   // Container for action buttons (OK, Cancel, etc.)
};

/**
 * Caches references to the core modal DOM elements.
 */
const cacheDOMElements = () => {
    domElements.modalContainer = document.getElementById('modal-container');
    domElements.modalTitle = document.getElementById('modal-title');
    domElements.modalContent = document.getElementById('modal-content');
    domElements.modalButtons = document.getElementById('modal-buttons');
};

/**
 * Displays a modal dialog with the specified title, HTML content, and buttons.
 * @param {string} title - The title to display in the modal header.
 * @param {string} contentHtml - HTML string to render as the modal's main content.
 * @param {Array<{text: string, type: 'primary'|'secondary'|'danger', onClickCallback?: function, preventHide?: boolean}>} [buttonsArray]
 *        Array of button configuration objects. Each object defines:
 *        - `text`: Text label for the button.
 *        - `type`: Button style ('primary', 'secondary', 'danger'). Defaults to 'primary'.
 *        - `onClickCallback`: Optional function to execute when the button is clicked. Modal hides by default after callback.
 *        - `preventHide`: Optional boolean. If true, modal won't hide automatically after `onClickCallback`.
 */
const showModal = (title, contentHtml, buttonsArray = [{ text: 'OK', type: 'primary' }]) => {
    if (!domElements.modalContainer) {
        console.error('[modalView.js] Modal container not cached/found.');
        return;
    }

    domElements.modalTitle.textContent = title;
    domElements.modalContent.innerHTML = contentHtml;
    domElements.modalButtons.innerHTML = ''; // Clear existing buttons

    buttonsArray.forEach((btnConfig) => {
        const { text, type, onClickCallback, preventHide = false } = btnConfig;
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'px-4 py-2 rounded text-sm';
        switch (type) {
            case 'secondary': button.classList.add('bg-gray-500', 'hover:bg-gray-600', 'text-white'); break;
            case 'danger': button.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white'); break;
            default: button.classList.add('bg-blue-500', 'hover:bg-blue-600', 'text-white');
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

/**
 * Hides the modal dialog and clears its content and buttons.
 */
const hideModal = () => {
    if (!domElements.modalContainer) return;
    domElements.modalContainer.classList.add('hidden');
    // Clear content for next use
    domElements.modalTitle.textContent = '';
    domElements.modalContent.innerHTML = '';
    domElements.modalButtons.innerHTML = '';
};

/**
 * Displays a specialized modal for creating new VTT objects.
 * This modal contains a form for object properties (shape, dimensions, color).
 * On submission, it calls `uiViewModelInstance.createObject`.
 * This function is typically invoked as a callback when UiViewModel requests it.
 */
const displayCreateObjectModal = () => {
    if (!uiViewModelInstance) {
        console.error('[modalView.js] UiViewModel not available for create object modal.');
        return;
    }
    // Form HTML for creating an object. Includes basic fields and inline styles for simplicity.
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
      <div><label class="modal-label" for="create-obj-x">X:</label><input type="number" id="create-obj-x" value="50" class="modal-input"></div>
      <div><label class="modal-label" for="create-obj-y">Y:</label><input type="number" id="create-obj-y" value="50" class="modal-input"></div>
      <div><label class="modal-label" for="create-obj-width">Width:</label><input type="number" id="create-obj-width" value="100" class="modal-input"></div>
      <div><label class="modal-label" for="create-obj-height">Height:</label><input type="number" id="create-obj-height" value="100" class="modal-input"></div>
      <div><label class="modal-label" for="create-obj-bgcolor">Color:</label><input type="color" id="create-obj-bgcolor" value="#CCCCCC" class="modal-input"></div>
    `;

    const buttonsArray = [
        {
            text: 'Create', type: 'primary',
            onClickCallback: () => {
                const shape = document.getElementById('create-obj-shape').value;
                const props = {
                    x: parseInt(document.getElementById('create-obj-x').value, 10) || 0,
                    y: parseInt(document.getElementById('create-obj-y').value, 10) || 0,
                    width: parseInt(document.getElementById('create-obj-width').value, 10) || 50,
                    height: parseInt(document.getElementById('create-obj-height').value, 10) || 50,
                    appearance: { backgroundColor: document.getElementById('create-obj-bgcolor').value },
                };
                // Instead of dispatching event, call UiViewModel directly
                if (uiViewModelInstance.createObject) {
                    uiViewModelInstance.createObject(shape, props);
                } else {
                     console.error('[modalView.js] createObject method not found on UiViewModel.');
                }
            },
        },
        { text: 'Cancel', type: 'secondary' },
    ];
    showModal('Create New Object', modalContentHtml, buttonsArray);
};

/**
 * Returns the main content DOM element of the modal.
 * This was previously used by session_management.js to inject content,
 * but might be less relevant now that modal content is primarily passed as HTML strings
 * or generated internally (e.g., for selection modal).
 * @returns {HTMLElement | null} The modal content DOM element, or null if not cached.
 */
const getModalContentElement = () => {
    return domElements.modalContent || null;
};

/**
 * Initializes the modal view component.
 * Stores the UiViewModel instance, caches DOM elements, and registers handlers
 * with UiViewModel for requests to display the "Create Object" modal and the generic "Selection" modal.
 * @param {UiViewModel} uiViewModel - The UiViewModel instance.
 */
export const init = (uiViewModel) => {
    uiViewModelInstance = uiViewModel;
    if (!uiViewModelInstance) {
        console.error('[modalView.js] UiViewModel not provided during init!');
        return;
    }
    
    cacheDOMElements();

    // Register a handler for when UiViewModel requests the "Create Object" modal
    if (uiViewModelInstance.onCreateObjectModalRequested) {
        uiViewModelInstance.onCreateObjectModalRequested(displayCreateObjectModal);
    } else {
        console.warn('[modalView.js] onCreateObjectModalRequested callback registration not found on UiViewModel.');
    }

    // Register handler for generic selection modal (e.g., for loading memory states)
    if (uiViewModelInstance.onShowSelectionModalRequested) {
        uiViewModelInstance.onShowSelectionModalRequested(showSelectionModal);
    } else {
        console.warn('[modalView.js] onShowSelectionModalRequested callback registration not found on UiViewModel.');
    }
    // console.log('[modalView.js] Initialized.'); // Already commented out
};

/**
 * Displays a modal dialog that presents a list of choices to the user.
 * Used for scenarios like selecting a memory state to load.
 * @param {string} title - The title for the selection modal.
 * @param {Array<{id: any, text: string}>} choices - An array of choice objects.
 *        Each object should have an `id` (value to be returned on selection) and `text` (display text).
 * @param {function(selectedId: any | null): void} onSelectionCallback - Callback function invoked when a choice is made or cancelled.
 *        It receives the `id` of the selected choice, or `null` if cancelled.
 */
const showSelectionModal = (title, choices, onSelectionCallback) => {
    if (!domElements.modalContainer) {
        console.error('[modalView.js] Modal container not cached/found.');
        if (onSelectionCallback) onSelectionCallback(null); // Indicate failure/cancellation
        return;
    }

    // Dynamically create HTML for choice buttons
    let contentHtml = '<div class="flex flex-col space-y-2">';
    choices.forEach(choice => {
        // Ensure text and id are treated as strings and properly escaped for HTML attributes/content if necessary.
        // For simplicity, assuming they are safe for now.
        const text = String(choice.text);
        const id = String(choice.id);
        contentHtml += `<button class="w-full text-left p-2 bg-gray-600 hover:bg-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 modal-choice-button" data-id="${id}">${text}</button>`;
    });
    contentHtml += '</div>';
    
    const buttonsArray = [
        {
            text: 'Cancel',
            type: 'secondary',
            onClickCallback: () => {
                if (onSelectionCallback) onSelectionCallback(null);
            }
        }
    ];

    showModal(title, contentHtml, buttonsArray);

    // Add event listeners to the newly created choice buttons
    // These listeners are added *after* showModal populates modalContent
    if (domElements.modalContent) {
        const choiceButtons = domElements.modalContent.querySelectorAll('.modal-choice-button');
        choiceButtons.forEach(button => {
            // Important: Clone and replace to remove any old listeners from potentially reused button elements
            // if modalContent isn't perfectly cleared or buttons have generic classes that might persist.
            // However, standard addEventListener should be fine if buttons are freshly created by innerHTML.
            const newButton = button.cloneNode(true); // Simple way to remove listeners
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', () => {
                const selectedId = newButton.getAttribute('data-id');
                // The `id` from `choices` could be an index (number) or a string ID.
                // The `onSelectionCallback` in UiViewModel expects the original index for getMemoryStateByIndex.
                // So, if `choice.id` was set to the index, this should work.
                // If `choice.id` was a string, the callback needs to handle that.
                // For `requestLoadMemoryState`, `choice.id` is the index.
                const numericId = parseInt(selectedId, 10); // Assuming id is the index
                if (onSelectionCallback) onSelectionCallback(isNaN(numericId) ? selectedId : numericId);
                hideModal();
            });
        });
    }
};

// Export showModal and hideModal if they need to be called by other UI parts (e.g. uiView for errors)
export { showModal, hideModal, getModalContentElement };
