// src/views/components/modalView.js

let uiViewModelInstance = null;

const domElements = {
    modalContainer: null,
    modalTitle: null,
    modalContent: null,
    modalButtons: null,
};

const cacheDOMElements = () => {
    domElements.modalContainer = document.getElementById('modal-container');
    domElements.modalTitle = document.getElementById('modal-title');
    domElements.modalContent = document.getElementById('modal-content');
    domElements.modalButtons = document.getElementById('modal-buttons');
};

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

const hideModal = () => {
    if (!domElements.modalContainer) return;
    domElements.modalContainer.classList.add('hidden');
    domElements.modalTitle.textContent = '';
    domElements.modalContent.innerHTML = '';
    domElements.modalButtons.innerHTML = '';
};

const displayCreateObjectModal = () => {
    if (!uiViewModelInstance) {
        console.error('[modalView.js] UiViewModel not available for create object modal.');
        return;
    }
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

const getModalContentElement = () => {
    return domElements.modalContent || null;
};


export const init = (uiViewModel) => {
    uiViewModelInstance = uiViewModel;
    if (!uiViewModelInstance) {
        console.error('[modalView.js] UiViewModel not provided during init!');
        return;
    }
    
    cacheDOMElements();

    // Register a handler for when UiViewModel requests the modal
    if (uiViewModelInstance.onCreateObjectModalRequested) {
        uiViewModelInstance.onCreateObjectModalRequested(displayCreateObjectModal);
    } else {
        console.warn('[modalView.js] onCreateObjectModalRequested callback registration not found on UiViewModel.');
    }

    // Register handler for generic selection modal
    if (uiViewModelInstance.onShowSelectionModalRequested) {
        uiViewModelInstance.onShowSelectionModalRequested(showSelectionModal);
    } else {
        console.warn('[modalView.js] onShowSelectionModalRequested callback registration not found on UiViewModel.');
    }
    // console.log('[modalView.js] Initialized.');
};

const showSelectionModal = (title, choices, onSelectionCallback) => {
    if (!domElements.modalContainer) {
        console.error('[modalView.js] Modal container not cached/found.');
        if (onSelectionCallback) onSelectionCallback(null); // Indicate failure/cancellation
        return;
    }

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
