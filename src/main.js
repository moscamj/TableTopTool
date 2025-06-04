// src/main.js
import "./loggingConfig.js"; // Initializes loglevel configuration
import log from "loglevel";
import debug from "debug";
import { VTT_API } from "./api.js";
import * as uiView from "./views/uiView.js";

const d = debug("app:main");
d("main.js module loaded");

// --- Application Initialization ---

/**
 * Initializes the main application components by delegating to uiView.
 * @async
 */
const initializeApplication = async () => {
        d("initializeApplication started in main.js");

        // VTT_API is imported. uiView is imported.
        // Initialize uiView, passing VTT_API.
        // uiView.js will be responsible for all further initializations including UiViewModel,
        // VTT_API_INIT, session management callbacks, sub-components, and the canvas system.
        uiView.init(VTT_API);
        d("uiView.init called from main.js. All further app setup is delegated to uiView.");
};

// Ensures the application initializes after the entire page (including stylesheets and images) is fully loaded.
if (document.readyState === "complete") {
        d("Window already loaded, calling initializeApplication directly from main.js");
        initializeApplication();
} else {
        d("Window not fully loaded, adding load event listener for initializeApplication in main.js");
        window.addEventListener("load", initializeApplication);
}
