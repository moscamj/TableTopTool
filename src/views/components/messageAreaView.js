// src/views/components/messageAreaView.js
/**
 * @file Manages the display of user feedback messages (toasts/notifications).
 * It listens for requests from the UiViewModel to display messages and handles
 * their creation, styling, and timed removal from the DOM.
 */
import log from "loglevel"; // For general logging (errors, warnings)
import debug from "debug"; // For verbose, development-specific logging

const dMsgArea = debug("app:view:messageArea");

/** @type {UiViewModel | null} Instance of the UiViewModel. */
let uiViewModelInstance = null;

/**
 * @type {Object<string, HTMLElement|null>}
 * Stores references to DOM elements managed by this component.
 */
const domElements = {
        messageArea: null, // The container where messages are appended
};

/**
 * Caches references to DOM elements used by this component.
 */
const cacheDOMElements = () => {
        dMsgArea("Caching DOM elements for message area.");
        domElements.messageArea = document.getElementById("message-area");
};

/**
 * Displays a message in the message area.
 * Creates a new message element, styles it based on the message type,
 * appends it to the message area, and sets a timeout to remove it.
 * This function is typically registered as a callback with UiViewModel.
 * @param {string} text - The message text to display.
 * @param {'info' | 'success' | 'warning' | 'error'} [type='info'] - The type of message, determining its styling.
 * @param {number} [duration=3000] - How long the message should be visible in milliseconds.
 */
const displayMessage = (text, type = "info", duration = 3000) => {
        dMsgArea(
                'displayMessage called. Text: "%s", Type: %s, Duration: %dms',
                text,
                type,
                duration,
        );
        if (!domElements.messageArea) {
                log.warn(
                        "[messageAreaView.js] Message area DOM not cached/found. Cannot display message:",
                        text,
                );
                dMsgArea(
                        'displayMessage warning: Message area DOM not found. Message: "%s"',
                        text,
                );
                // Fallback for critical messages if DOM isn't ready (though init should prevent this)
                // alert(`${type.toUpperCase()}: ${text}`);
                return;
        }

        const messageEl = document.createElement("div");
        dMsgArea("Created message element.");
        messageEl.textContent = text;
        messageEl.className =
    "p-3 rounded-md shadow-lg text-sm mb-2 transition-opacity duration-500 ease-out"; // Added transition classes

        switch (type) {
        case "error":
                messageEl.classList.add("bg-red-500", "text-white");
                break;
        case "success":
                messageEl.classList.add("bg-green-500", "text-white");
                break;
        case "warning":
                messageEl.classList.add("bg-yellow-500", "text-black");
                break;
        default:
                messageEl.classList.add("bg-blue-500", "text-white");
                break;
        }

        domElements.messageArea.appendChild(messageEl);
        dMsgArea("Appended message to message area.");

        // Force reflow to ensure animation plays
        // void messageEl.offsetWidth; // Not strictly needed with tailwind opacity transition on appear

        // Fade out and remove
        setTimeout(() => {
                dMsgArea('Fading out message: "%s"', text);
                messageEl.style.opacity = "0";
                setTimeout(() => {
                        messageEl.remove();
                        dMsgArea('Removed message: "%s"', text);
                }, 500); // Time for fade out animation
        }, duration);
};

export const init = (uiViewModel) => {
        dMsgArea("Initializing messageAreaView with uiViewModel: %o", uiViewModel);
        uiViewModelInstance = uiViewModel;

        if (!uiViewModelInstance) {
                log.error("[messageAreaView.js] UiViewModel not provided during init!");
                dMsgArea("Error: UiViewModel not provided during init.");
                return;
        }
        dMsgArea("UiViewModel instance stored.");

        // Ensure DOM elements are cached. If cacheDOMElements relies on DOMContentLoaded,
        // and init is called before that, this might be an issue.
        // However, typically init is called after DOMContentLoaded in main.js.
        cacheDOMElements();
        if (!domElements.messageArea) {
                log.error(
                        "[messageAreaView.js] Message area DOM element not found after cache attempt. Messages will not be displayed.",
                );
                dMsgArea("Error: Message area DOM element not found after cache attempt.");
                // Do not register if the essential element is missing.
                return;
        }
        dMsgArea("Message area DOM element found.");

        // Register this component's displayMessage function with the UiViewModel
        if (uiViewModelInstance.onDisplayMessage) {
                uiViewModelInstance.onDisplayMessage(displayMessage);
                dMsgArea(
                        "Registered displayMessage with uiViewModelInstance.onDisplayMessage.",
                );
        } else {
                log.error(
                        "[messageAreaView.js] onDisplayMessage callback registration not found on UiViewModel.",
                );
                dMsgArea(
                        "Error: onDisplayMessage callback registration not found on UiViewModel.",
                );
        }

        log.debug("[messageAreaView.js] Initialized."); // This log.debug is fine as a general module init message
        dMsgArea("messageAreaView initialization complete.");
};

// Export displayMessage directly if other modules need to call it (though ideally through UiViewModel)
// For now, keeping it internal and triggered by UiViewModel callback.
// export { displayMessage };
