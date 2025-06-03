// src/viewmodels/uiViewModel.js
import log from "loglevel";
import debug from "debug";
import * as sessionManagement from "../session_management.js";

const dUiVM = debug("app:vm:ui");

/**
 * Manages the state and logic for the main user interface, excluding the canvas.
 * This includes handling data for the inspector, board settings, modals, and user messages.
 * It orchestrates actions triggered by UI components and interacts with the VTT_API.
 * UiViewModel also listens to model changes to keep its data synchronized and notifies
 * registered view components to update their displays.
 */
class UiViewModel {
        /**
   * Creates an instance of UiViewModel.
   */
        constructor() {
                dUiVM("UiViewModel constructor called");
                /** @type {object | null} Reference to the VTT_API instance. Set via init(). */
                this.vttApi = null; // To be set during init

                // Internal state
                /** @type {VTTObject | null} Data for the currently selected object to be displayed in the inspector. */
                this.inspectorData = null;
                /** @type {object} Current properties of the game board (dimensions, scale, etc.). */
                this.boardProperties = {}; // Will hold the current board properties

                // Callbacks to be registered by the View (uiView.js or components)
                /** @type {function(VTTObject | null): void | null} Callback to notify when inspector data changes. */
                this._onInspectorDataChanged = null;
                /** @type {function(object): void | null} Callback to notify when board settings change. */
                this._onBoardSettingsChanged = null;
                /** @type {function(text: string, type: string, duration?: number): void | null} Callback to display a message to the user. */
                this._onDisplayMessage = null;
                /** @type {function(): void | null} Callback to request the display of the "Create Object" modal. */
                this._onCreateObjectModalRequested = null; // For modalView
                /** @type {function(title: string, choices: Array<{id: any, text: string}>, onSelect: function): void | null} Callback to request display of a generic selection modal. */
                this._onShowSelectionModalRequested = null; // For modalView to show generic list selection
        }

        /**
   * Initializes the UiViewModel with a reference to the VTT_API.
   * It also sets up a listener for 'modelChanged' events to update its internal state
   * and fetches initial board properties and selected object data.
   * @param {object} vttApi - The VTT_API instance.
   */
        init(vttApi) {
                dUiVM("init called with vttApi: %o", vttApi);
                this.vttApi = vttApi;
                if (!this.vttApi) {
                        log.error("[UiViewModel] VTT_API not provided during init!");
                        dUiVM("init error: VTT_API not provided.");
                        return;
                }
                // Listen for model changes directly
                document.addEventListener(
                        "modelChanged",
                        this._handleModelChange.bind(this),
                );
                dUiVM("modelChanged event listener added.");
                // log.debug('[UiViewModel] Initialized and listening for modelChanged events.'); // Removed for cleaner logs

                // Initialize with current state from the model
                this.boardProperties = this.vttApi.getBoardProperties() || {};
                dUiVM("Initial boardProperties set: %o", this.boardProperties);
                const selectedId = this.vttApi.getSelectedObjectId();
                if (selectedId) {
                        this.inspectorData = this.vttApi.getObject(selectedId);
                        dUiVM(
                                "Initial inspectorData set for selectedId %s: %o",
                                selectedId,
                                this.inspectorData,
                        );
                } else {
                        this.inspectorData = null;
                        dUiVM("No object initially selected, inspectorData is null.");
                }
        }

        /**
   * Requests deletion of an object via the VTT_API.
   * Displays success or failure messages.
   * @param {string} objectId - The ID of the object to delete.
   * @param {string} [objectName='object'] - The user-friendly name of the object, for messages.
   */
        requestObjectDelete(objectId, objectName = "object") {
                dUiVM(
                        "requestObjectDelete called for objectId: %s, objectName: %s",
                        objectId,
                        objectName,
                );
                if (!this.vttApi || !objectId) {
                        dUiVM(
                                "requestObjectDelete error: API or Object ID missing. API: %o, ID: %s",
                                this.vttApi,
                                objectId,
                        );
                        this.displayMessage(
                                "Cannot delete object: API or Object ID missing.",
                                "error",
                        );
                        return;
                }
                const success = this.vttApi.deleteObject(objectId);
                if (success) {
                        dUiVM("Object %s successfully deleted via API.", objectId);
                        this.displayMessage(`Object "${objectName}" deleted.`, "success");
                } else {
                        dUiVM("Failed to delete object %s via API.", objectId);
                        this.displayMessage(
                                `Failed to delete object "${objectName}". It might have been already deleted.`,
                                "error",
                        );
                }
        }

        // --- Callback Registration Methods by View ---
        /**
   * Registers a callback function to be invoked when inspector data changes.
   * @param {function(VTTObject | null): void} callback - The function to call with the new inspector data.
   */
        onInspectorDataChanged(callback) {
                this._onInspectorDataChanged = callback;
        }

        /**
   * Registers a callback function to be invoked when board settings change.
   * @param {function(object): void} callback - The function to call with the new board properties.
   */
        onBoardSettingsChanged(callback) {
                this._onBoardSettingsChanged = callback;
        }

        /**
   * Registers a callback function for displaying messages to the user.
   * This is typically called by messageAreaView.js.
   * @param {function(text: string, type: string, duration?: number): void} callback - The function to call to display a message.
   */
        onDisplayMessage(callback) {
                this._onDisplayMessage = callback;
        }

        /**
   * Registers a callback function to be invoked when the "Create Object" modal is requested.
   * This is typically called by modalView.js.
   * @param {function(): void} callback - The function to call to display the create object modal.
   */
        onCreateObjectModalRequested(callback) {
                this._onCreateObjectModalRequested = callback;
        }

        /**
   * Registers a callback function to be invoked when a generic selection modal is requested.
   * This is typically called by modalView.js.
   * @param {function(title: string, choices: Array<{id: any, text: string}>, onSelect: function): void} callback - The function to call to display the selection modal.
   */
        onShowSelectionModalRequested(callback) {
                this._onShowSelectionModalRequested = callback;
        }

        // --- Getters ---
        /**
   * Retrieves the data for the currently selected object.
   * @returns {VTTObject | null} The selected object's data, or null if no object is selected.
   */
        getInspectorData() {
                return this.inspectorData;
        }

        /**
   * Retrieves the current board properties for display.
   * @returns {object} The current board properties.
   */
        getBoardPropertiesForDisplay() {
                // Potentially format or select specific properties for display if needed
                return this.boardProperties;
        }

        // --- Model Change Handler ---
        /**
   * Handles 'modelChanged' events dispatched from the model.
   * Updates internal state (inspectorData, boardProperties) based on the event type
   * and notifies relevant view components via registered callbacks.
   * @param {CustomEvent} event - The 'modelChanged' event, with event.detail containing type and payload.
   * @private
   */
        _handleModelChange(event) {
                dUiVM("_handleModelChange called with event: %o", event);
                if (!event.detail || !this.vttApi) {
                        dUiVM(
                                "_handleModelChange: Event detail or VTT API missing. Detail: %o, API: %o",
                                event.detail,
                                this.vttApi,
                        );
                        return;
                }

                const { type, payload } = event.detail;
                dUiVM("Model changed: type=%s, payload=%o", type, payload);
                let refreshInspector = false;
                let refreshBoardSettings = false;

                switch (type) {
                case "selectionChanged":
                        this.inspectorData = payload ? this.vttApi.getObject(payload) : null;
                        dUiVM("Selection changed. New inspectorData: %o", this.inspectorData);
                        refreshInspector = true;
                        break;
                case "objectUpdated":
                        if (
                                this.inspectorData &&
          payload &&
          this.inspectorData.id === payload.id
                        ) {
                                this.inspectorData = this.vttApi.getObject(payload.id); // Get the full updated object
                                dUiVM(
                                        "Currently inspected object %s updated. New inspectorData: %o",
                                        payload.id,
                                        this.inspectorData,
                                );
                                refreshInspector = true;
                        }
                        break;
                case "objectDeleted":
                        if (
                                this.inspectorData &&
          payload &&
          this.inspectorData.id === payload.id
                        ) {
                                this.inspectorData = null;
                                dUiVM(
                                        "Currently inspected object %s deleted. InspectorData set to null.",
                                        payload.id,
                                );
                                refreshInspector = true;
                        }
                        break;
                case "allObjectsCleared":
                        this.inspectorData = null;
                        dUiVM("All objects cleared. InspectorData set to null.");
                        refreshInspector = true;
                        break;
                case "boardPropertiesChanged":
                        this.boardProperties = { ...payload };
                        dUiVM(
                                "Board properties changed. New boardProperties: %o",
                                this.boardProperties,
                        );
                        refreshBoardSettings = true;
                        break;
                default:
                        dUiVM("Unhandled model change type in UiViewModel: %s", type);
                }

                if (
                        refreshInspector &&
      typeof this._onInspectorDataChanged === "function"
                ) {
                        dUiVM("Inspector needs refresh, calling _onInspectorDataChanged.");
                        this._onInspectorDataChanged(this.inspectorData);
                }
                if (
                        refreshBoardSettings &&
      typeof this._onBoardSettingsChanged === "function"
                ) {
                        dUiVM("Board settings need refresh, calling _onBoardSettingsChanged.");
                        this._onBoardSettingsChanged(this.boardProperties);
                }
        }

        // --- Action Methods (called by View) ---

        /**
   * Applies changes from the inspector panel to a specified object via the VTT_API.
   * Constructs an update payload containing only the changed properties.
   * @param {string} objectId - The ID of the object to update.
   * @param {object} inspectorSnapshot - An object containing all properties from the inspector form.
   */
        applyInspectorChanges(objectId, inspectorSnapshot) {
                dUiVM(
                        "applyInspectorChanges called for objectId: %s, snapshot: %o",
                        objectId,
                        inspectorSnapshot,
                );
                if (!this.vttApi) {
                        dUiVM("applyInspectorChanges error: VTT API not available.");
                        return;
                }
                try {
                        const currentObject = this.vttApi.getObject(objectId);
                        if (!currentObject) {
                                dUiVM("applyInspectorChanges error: Object %s not found.", objectId);
                                this.displayMessage(
                                        `Object with ID ${objectId} not found. Cannot apply changes.`,
                                        "error",
                                );
                                return;
                        }
                        dUiVM("Current state of object %s: %o", objectId, currentObject);

                        // Prepare updatePayload by comparing snapshot with currentObject and only including changes
                        // This is a simplified version; a more robust diffing or specific property mapping might be needed.
                        const updatePayload = {};

                        // Top-level properties
                        [
                                "name",
                                "x",
                                "y",
                                "width",
                                "height",
                                "rotation",
                                "zIndex",
                                "isMovable",
                                "shape",
                        ].forEach((key) => {
                                if (
                                        inspectorSnapshot.hasOwnProperty(key) &&
          inspectorSnapshot[key] !== currentObject[key]
                                ) {
                                        // Special handling for numeric types that might come as strings from input fields
                                        if (
                                                ["x", "y", "width", "height", "rotation", "zIndex"].includes(key)
                                        ) {
                                                const numVal = parseFloat(inspectorSnapshot[key]);
                                                if (!isNaN(numVal)) {
                                                        updatePayload[key] = numVal;
                                                        dUiVM(
                                                                "Inspector change detected for %s: %s -> %s (numeric)",
                                                                key,
                                                                currentObject[key],
                                                                numVal,
                                                        );
                                                }
                                        } else {
                                                updatePayload[key] = inspectorSnapshot[key];
                                                dUiVM(
                                                        "Inspector change detected for %s: %s -> %s",
                                                        key,
                                                        currentObject[key],
                                                        inspectorSnapshot[key],
                                                );
                                        }
                                }
                        });

                        // Appearance properties (assuming inspectorSnapshot.appearance is a flat object from UI fields)
                        if (inspectorSnapshot.appearance) {
                                updatePayload.appearance = {};
                                const currentAppearance = currentObject.appearance || {};
                                for (const key in inspectorSnapshot.appearance) {
                                        if (
                                                inspectorSnapshot.appearance.hasOwnProperty(key) &&
            inspectorSnapshot.appearance[key] !== currentAppearance[key]
                                        ) {
                                                // Handle boolean for showLabel
                                                if (key === "showLabel") {
                                                        const boolVal =
                inspectorSnapshot.appearance[key] === true ||
                inspectorSnapshot.appearance[key] === "true";
                                                        updatePayload.appearance[key] = boolVal;
                                                        dUiVM(
                                                                "Inspector change detected for appearance.%s: %s -> %s (boolean)",
                                                                key,
                                                                currentAppearance[key],
                                                                boolVal,
                                                        );
                                                } else if (key === "borderWidth" || key === "fontSize") {
                                                        const numVal = parseFloat(inspectorSnapshot.appearance[key]);
                                                        if (!isNaN(numVal)) {
                                                                updatePayload.appearance[key] = numVal;
                                                                dUiVM(
                                                                        "Inspector change detected for appearance.%s: %s -> %s (numeric)",
                                                                        key,
                                                                        currentAppearance[key],
                                                                        numVal,
                                                                );
                                                        }
                                                } else {
                                                        updatePayload.appearance[key] = inspectorSnapshot.appearance[key];
                                                        dUiVM(
                                                                "Inspector change detected for appearance.%s: %s -> %s",
                                                                key,
                                                                currentAppearance[key],
                                                                inspectorSnapshot.appearance[key],
                                                        );
                                                }
                                        }
                                }
                                if (Object.keys(updatePayload.appearance).length === 0) {
                                        delete updatePayload.appearance; // Don't send empty appearance object
                                }
                        }

                        // Scripts (assuming simple string updates for now)
                        if (inspectorSnapshot.scripts) {
                                updatePayload.scripts = {};
                                const currentScripts = currentObject.scripts || {};
                                for (const key in inspectorSnapshot.scripts) {
                                        if (
                                                inspectorSnapshot.scripts.hasOwnProperty(key) &&
            inspectorSnapshot.scripts[key] !== currentScripts[key]
                                        ) {
                                                updatePayload.scripts[key] = inspectorSnapshot.scripts[key];
                                                dUiVM("Inspector change detected for scripts.%s", key);
                                        }
                                }
                                if (Object.keys(updatePayload.scripts).length === 0) {
                                        delete updatePayload.scripts;
                                }
                        }

                        dUiVM("Final updatePayload for object %s: %o", objectId, updatePayload);
                        if (Object.keys(updatePayload).length > 0) {
                                this.vttApi.updateObject(objectId, updatePayload);
                                this.displayMessage(`Object ${objectId} updated.`, "success", 1500);
                                dUiVM("Object %s updated via API.", objectId);
                        } else {
                                this.displayMessage(
                                        `No changes detected for object ${objectId}.`,
                                        "info",
                                        1500,
                                );
                                dUiVM("No changes detected for object %s. No API call made.", objectId);
                        }
                } catch (error) {
                        log.error("[UiViewModel] Error applying inspector changes:", error);
                        dUiVM(
                                "Error applying inspector changes for object %s: %o",
                                objectId,
                                error,
                        );
                        this.displayMessage(`Error applying changes: ${error.message}`, "error");
                }
        }

        /**
   * Handles deletion of a selected object via VTT_API.
   * Note: This method seems currently unused; inspectorView directly calls `requestObjectDelete`.
   * @param {string} objectId - The ID of the object to delete.
   */
        handleDeleteSelectedObject(objectId) {
                // This method seems unused. requestObjectDelete is used instead by inspectorView
                dUiVM(
                        "handleDeleteSelectedObject called for objectId: %s (Note: generally unused)",
                        objectId,
                );
                if (!this.vttApi || !objectId) {
                        dUiVM(
                                "handleDeleteSelectedObject error: API or Object ID missing. API: %o, ID: %s",
                                this.vttApi,
                                objectId,
                        );
                        return;
                }
                const result = this.vttApi.deleteObject(objectId);
                if (result) {
                        dUiVM("Object %s deleted via handleDeleteSelectedObject.", objectId);
                        this.displayMessage(`Object ${objectId} deleted.`, "success", 1500);
                } else {
                        dUiVM(
                                "Failed to delete object %s via handleDeleteSelectedObject.",
                                objectId,
                        );
                        this.displayMessage(`Failed to delete object ${objectId}.`, "error");
                }
        }

        /**
   * Applies new board settings (dimensions, units, scale) via the VTT_API.
   * @param {object} newProps - An object containing the new board properties.
   * Expected properties: `widthUser`, `heightUser`, `unitForDimensions`, `scaleRatio`, `unitForRatio`.
   */
        applyBoardSettings(newProps) {
                dUiVM("applyBoardSettings called with newProps: %o", newProps);
                if (!this.vttApi) {
                        dUiVM("applyBoardSettings error: VTT API not available.");
                        return;
                }
                // newProps should be validated or structured as expected by VTT_API.setBoardProperties
                // e.g., { widthUser, heightUser, unitForDimensions, scaleRatio, unitForRatio }
                const updatedProps = this.vttApi.setBoardProperties(newProps);
                if (updatedProps) {
                        dUiVM(
                                "Board settings updated via API. New props from API: %o",
                                updatedProps,
                        );
                        this.displayMessage("Board settings updated.", "success", 1500);
                } else {
                        dUiVM("Failed to update board settings via API.");
                        this.displayMessage("Failed to update board settings.", "error");
                }
        }

        /**
   * Requests the creation of a new object via the VTT_API.
   * @param {string} shape - The shape of the new object (e.g., 'rectangle', 'circle').
   * @param {object} [props={}] - Optional initial properties for the new object.
   * @returns {VTTObject | null} The newly created object, or null if creation failed.
   */
        createObject(shape, props = {}) {
                dUiVM("createObject called with shape: %s, props: %o", shape, props);
                if (!this.vttApi) {
                        dUiVM("createObject error: VTT API not available.");
                        return null;
                }
                const newObj = this.vttApi.createObject(shape, props);
                if (newObj) {
                        dUiVM("Object created via API: %o", newObj);
                        this.displayMessage(
                                `${shape} object "${newObj.name}" created.`,
                                "success",
                                1500,
                        );
                } else {
                        dUiVM("Failed to create %s object via API.", shape);
                        this.displayMessage(`Failed to create ${shape} object.`, "error");
                }
                return newObj;
        }

        /**
   * Sets the table background via the VTT_API.
   * @param {{type: 'color' | 'image', value: string}} backgroundProps - The background properties.
   */
        setTableBackground(backgroundProps) {
                dUiVM(
                        "setTableBackground called with backgroundProps: %o",
                        backgroundProps,
                );
                if (!this.vttApi) {
                        dUiVM("setTableBackground error: VTT API not available.");
                        return;
                }
                this.vttApi.setTableBackground(backgroundProps);
                dUiVM("Table background updated via API.");
                this.displayMessage("Table background updated.", "success", 1500);
        }

        /**
   * Requests the display of the "Create Object" modal by invoking the registered callback.
   */
        requestCreateObjectModal() {
                dUiVM("requestCreateObjectModal called.");
                if (typeof this._onCreateObjectModalRequested === "function") {
                        this._onCreateObjectModalRequested();
                        dUiVM("_onCreateObjectModalRequested callback invoked.");
                } else {
                        log.warn(
                                "[UiViewModel] Create object modal requested, but no handler registered.",
                        );
                        dUiVM(
                                "requestCreateObjectModal warning: _onCreateObjectModalRequested callback not registered.",
                        );
                        this.displayMessage("Cannot open create object dialog.", "error");
                }
        }

        /**
   * Public method to request a message display.
   * This will trigger the _onDisplayMessage callback if a handler (e.g., messageAreaView) is registered.
   */
        displayMessage(text, type = "info", duration = 3000) {
                dUiVM(
                        'displayMessage called. Text: "%s", Type: %s, Duration: %dms',
                        text,
                        type,
                        duration,
                );
                if (typeof this._onDisplayMessage === "function") {
                        this._onDisplayMessage(text, type, duration);
                        dUiVM("_onDisplayMessage callback invoked.");
                } else {
                        // Fallback if no message display handler is registered (e.g., during early init or if messageAreaView fails)
                        log.warn(
                                `[UiViewModel] displayMessage called, but no handler registered. Message: ${type} - ${text}`,
                        );
                        dUiVM(
                                "displayMessage warning: _onDisplayMessage callback not registered.",
                        );
                        // alert(`${type.toUpperCase()}: ${text}`); // Avoid alert in ViewModel
                }
        }

        // Placeholder for image upload handling if needed directly in ViewModel

        /**
   * Requests the display of a modal to load a board state from memory.
   * It retrieves available memory states from `sessionManagement`, then uses
   * the `_onShowSelectionModalRequested` callback to ask the View (modalView)
   * to display these states. If a state is selected, it's applied using `sessionManagement.applyMemoryState`.
   */
        requestLoadMemoryState() {
                dUiVM("requestLoadMemoryState called.");
                const availableStates = sessionManagement.getAvailableMemoryStates();
                dUiVM("Available memory states: %o", availableStates);

                if (!availableStates || availableStates.length === 0) {
                        // displayMessage will be called by getAvailableMemoryStates if it's empty
                        // or if it returns [] and we explicitly message here.
                        // sessionManagement.getAvailableMemoryStates already calls displayMessage if empty.
                        dUiVM("No memory states available to load.");
                        return;
                }

                if (typeof this._onShowSelectionModalRequested === "function") {
                        const modalTitle = "Load State from Memory";
                        const choices = availableStates.map((state, index) => ({
                                id: index, // Use index as a simple ID for selection
                                text: state.name, // Assumes state.name is what getAvailableMemoryStates provides
                        }));
                        dUiVM(
                                'Requesting selection modal with title: "%s", choices: %o',
                                modalTitle,
                                choices,
                        );

                        this._onShowSelectionModalRequested(
                                modalTitle,
                                choices,
                                (selectedIndex) => {
                                        dUiVM(
                                                "Selection modal callback received with selectedIndex: %s",
                                                selectedIndex,
                                        );
                                        if (
                                                selectedIndex !== null &&
            selectedIndex >= 0 &&
            selectedIndex < availableStates.length
                                        ) {
                                                const stateToLoad =
              sessionManagement.getMemoryStateByIndex(selectedIndex);
                                                if (stateToLoad) {
                                                        dUiVM(
                                                                "State to load retrieved: %o. Applying memory state.",
                                                                stateToLoad,
                                                        );
                                                        sessionManagement.applyMemoryState(stateToLoad);
                                                        // applyMemoryState in sessionManagement now handles success/error messages.
                                                } else {
                                                        dUiVM(
                                                                "Selected state index %s could not be retrieved.",
                                                                selectedIndex,
                                                        );
                                                        this.displayMessage(
                                                                "Selected state could not be retrieved.",
                                                                "error",
                                                        );
                                                }
                                        } else if (selectedIndex !== null) {
                                                // Not null means a selection was made, but it was invalid (e.g. header clicked)
                                                dUiVM("Invalid selection from modal: %s", selectedIndex);
                                                this.displayMessage("Invalid selection.", "info");
                                        } else {
                                                // Null means user cancelled (e.g. clicked cancel button or outside modal)
                                                dUiVM("Load from memory cancelled by user.");
                                                this.displayMessage("Load from memory cancelled.", "info");
                                        }
                                },
                        );
                } else {
                        log.error(
                                "[UiViewModel] _onShowSelectionModalRequested callback not registered. Cannot show memory states.",
                        );
                        dUiVM(
                                "requestLoadMemoryState error: _onShowSelectionModalRequested callback not registered.",
                        );
                        this.displayMessage(
                                "Cannot display memory states: UI component not ready.",
                                "error",
                        );
                }
        }
}

export default UiViewModel;
