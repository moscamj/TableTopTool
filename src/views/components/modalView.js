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
    // console.log('[modalView.js] Modal DOM elements cached.');
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
    
    console.log('[modalView.js] Initialized.');
};

// Export showModal and hideModal if they need to be called by other UI parts (e.g. uiView for errors)
export { showModal, hideModal, getModalContentElement };
