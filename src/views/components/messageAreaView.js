// src/views/components/messageAreaView.js

let uiViewModelInstance = null;

const domElements = {
    messageArea: null,
};

const cacheDOMElements = () => {
    domElements.messageArea = document.getElementById('message-area');
    // console.log('[messageAreaView.js] Message Area DOM element cached.');
};

const displayMessage = (text, type = 'info', duration = 3000) => {
    if (!domElements.messageArea) {
        console.warn('[messageAreaView.js] Message area DOM not cached/found. Cannot display message:', text);
        // Fallback for critical messages if DOM isn't ready (though init should prevent this)
        // alert(`${type.toUpperCase()}: ${text}`); 
        return;
    }

    const messageEl = document.createElement('div');
    messageEl.textContent = text;
    messageEl.className = 'p-3 rounded-md shadow-lg text-sm mb-2 transition-opacity duration-500 ease-out'; // Added transition classes

    switch (type) {
        case 'error':   messageEl.classList.add('bg-red-500', 'text-white'); break;
        case 'success': messageEl.classList.add('bg-green-500', 'text-white'); break;
        case 'warning': messageEl.classList.add('bg-yellow-500', 'text-black'); break;
        default:        messageEl.classList.add('bg-blue-500', 'text-white'); break;
    }

    domElements.messageArea.appendChild(messageEl);

    // Force reflow to ensure animation plays
    // void messageEl.offsetWidth; // Not strictly needed with tailwind opacity transition on appear

    // Fade out and remove
    setTimeout(() => {
        messageEl.style.opacity = '0';
        setTimeout(() => {
            messageEl.remove();
        }, 500); // Time for fade out animation
    }, duration);
};

export const init = (uiViewModel) => {
    uiViewModelInstance = uiViewModel;

    if (!uiViewModelInstance) {
        console.error('[messageAreaView.js] UiViewModel not provided during init!');
        return;
    }
    
    // Ensure DOM elements are cached. If cacheDOMElements relies on DOMContentLoaded,
    // and init is called before that, this might be an issue.
    // However, typically init is called after DOMContentLoaded in main.js.
    cacheDOMElements();
    if (!domElements.messageArea) {
         console.error('[messageAreaView.js] Message area DOM element not found after cache attempt. Messages will not be displayed.');
         // Do not register if the essential element is missing.
         return;
    }

    // Register this component's displayMessage function with the UiViewModel
    if (uiViewModelInstance.onDisplayMessage) {
        uiViewModelInstance.onDisplayMessage(displayMessage);
    } else {
        console.error('[messageAreaView.js] onDisplayMessage callback registration not found on UiViewModel.');
    }
    
    console.log('[messageAreaView.js] Initialized.');
};

// Export displayMessage directly if other modules need to call it (though ideally through UiViewModel)
// For now, keeping it internal and triggered by UiViewModel callback.
// export { displayMessage };
