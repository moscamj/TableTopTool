// src/viewmodels/uiViewModel.js
import * as sessionManagement from '../session_management.js';

class UiViewModel {
    constructor() {
        this.vttApi = null; // To be set during init

        // Internal state
        this.inspectorData = null;
        this.boardProperties = {}; // Will hold the current board properties

        // Callbacks to be registered by the View (uiView.js or components)
        this._onInspectorDataChanged = null;
        this._onBoardSettingsChanged = null;
        this._onDisplayMessage = null; 
        this._onCreateObjectModalRequested = null; // For modalView
        this._onShowSelectionModalRequested = null; // For modalView to show generic list selection
    }

    init(vttApi) {
        this.vttApi = vttApi;
        if (!this.vttApi) {
            console.error('[UiViewModel] VTT_API not provided during init!');
            return;
        }
        // Listen for model changes directly
        document.addEventListener('modelChanged', this._handleModelChange.bind(this));
        console.log('[UiViewModel] Initialized and listening for modelChanged events.');

        // Initialize with current state from the model
        this.boardProperties = this.vttApi.getBoardProperties() || {};
        const selectedId = this.vttApi.getSelectedObjectId();
        if (selectedId) {
            this.inspectorData = this.vttApi.getObject(selectedId);
        } else {
            this.inspectorData = null;
        }
    }

    requestObjectDelete(objectId, objectName = 'object') {
        if (!this.vttApi || !objectId) {
            this.displayMessage('Cannot delete object: API or Object ID missing.', 'error');
            return;
        }
        const success = this.vttApi.deleteObject(objectId);
        if (success) {
            this.displayMessage(`Object "${objectName}" deleted.`, 'success');
        } else {
            this.displayMessage(`Failed to delete object "${objectName}". It might have been already deleted.`, 'error');
        }
    }

    // --- Callback Registration Methods by View ---
    onInspectorDataChanged(callback) {
        this._onInspectorDataChanged = callback;
    }

    onBoardSettingsChanged(callback) {
        this._onBoardSettingsChanged = callback;
    }

    onDisplayMessage(callback) {
        this._onDisplayMessage = callback;
    }

    onCreateObjectModalRequested(callback) {
        this._onCreateObjectModalRequested = callback;
    }

    onShowSelectionModalRequested(callback) {
        this._onShowSelectionModalRequested = callback;
    }

    // --- Getters ---
    getInspectorData() {
        return this.inspectorData;
    }

    getBoardPropertiesForDisplay() {
        // Potentially format or select specific properties for display if needed
        return this.boardProperties;
    }

    // --- Model Change Handler ---
    _handleModelChange(event) {
        if (!event.detail || !this.vttApi) return;

        const { type, payload } = event.detail;
        let refreshInspector = false;
        let refreshBoardSettings = false;

        switch (type) {
            case 'selectionChanged':
                this.inspectorData = payload ? this.vttApi.getObject(payload) : null;
                refreshInspector = true;
                break;
            case 'objectUpdated':
                if (this.inspectorData && payload && this.inspectorData.id === payload.id) {
                    this.inspectorData = this.vttApi.getObject(payload.id); // Get the full updated object
                    refreshInspector = true;
                }
                break;
            case 'objectDeleted':
                if (this.inspectorData && payload && this.inspectorData.id === payload.id) {
                    this.inspectorData = null;
                    refreshInspector = true;
                }
                break;
            case 'allObjectsCleared':
                this.inspectorData = null;
                refreshInspector = true;
                break;
            case 'boardPropertiesChanged':
                this.boardProperties = { ...payload };
                refreshBoardSettings = true;
                break;
        }

        if (refreshInspector && typeof this._onInspectorDataChanged === 'function') {
            this._onInspectorDataChanged(this.inspectorData);
        }
        if (refreshBoardSettings && typeof this._onBoardSettingsChanged === 'function') {
            this._onBoardSettingsChanged(this.boardProperties);
        }
    }

    // --- Action Methods (called by View) ---

    applyInspectorChanges(objectId, inspectorSnapshot) {
        if (!this.vttApi) return;
        try {
            const currentObject = this.vttApi.getObject(objectId);
            if (!currentObject) {
                this.displayMessage(`Object with ID ${objectId} not found. Cannot apply changes.`, 'error');
                return;
            }

            // Prepare updatePayload by comparing snapshot with currentObject and only including changes
            // This is a simplified version; a more robust diffing or specific property mapping might be needed.
            const updatePayload = {};

            // Top-level properties
            ['name', 'x', 'y', 'width', 'height', 'rotation', 'zIndex', 'isMovable', 'shape'].forEach(key => {
                if (inspectorSnapshot.hasOwnProperty(key) && inspectorSnapshot[key] !== currentObject[key]) {
                    // Special handling for numeric types that might come as strings from input fields
                    if (['x', 'y', 'width', 'height', 'rotation', 'zIndex'].includes(key)) {
                        const numVal = parseFloat(inspectorSnapshot[key]);
                        if (!isNaN(numVal)) updatePayload[key] = numVal;
                    } else {
                        updatePayload[key] = inspectorSnapshot[key];
                    }
                }
            });
            
            // Appearance properties (assuming inspectorSnapshot.appearance is a flat object from UI fields)
            if (inspectorSnapshot.appearance) {
                updatePayload.appearance = {};
                const currentAppearance = currentObject.appearance || {};
                for (const key in inspectorSnapshot.appearance) {
                    if (inspectorSnapshot.appearance.hasOwnProperty(key) && inspectorSnapshot.appearance[key] !== currentAppearance[key]) {
                         // Handle boolean for showLabel
                        if (key === 'showLabel') {
                            updatePayload.appearance[key] = inspectorSnapshot.appearance[key] === true || inspectorSnapshot.appearance[key] === 'true';
                        } else if (key === 'borderWidth' || key === 'fontSize') {
                            const numVal = parseFloat(inspectorSnapshot.appearance[key]);
                            if(!isNaN(numVal)) updatePayload.appearance[key] = numVal;
                        }
                        else {
                            updatePayload.appearance[key] = inspectorSnapshot.appearance[key];
                        }
                    }
                }
                if (Object.keys(updatePayload.appearance).length === 0) {
                    delete updatePayload.appearance; // Don't send empty appearance object
                }
            }
            
            // Scripts (assuming simple string updates for now)
            if(inspectorSnapshot.scripts) {
                updatePayload.scripts = {};
                const currentScripts = currentObject.scripts || {};
                for (const key in inspectorSnapshot.scripts) {
                    if(inspectorSnapshot.scripts.hasOwnProperty(key) && inspectorSnapshot.scripts[key] !== currentScripts[key]) {
                        updatePayload.scripts[key] = inspectorSnapshot.scripts[key];
                    }
                }
                if (Object.keys(updatePayload.scripts).length === 0) {
                    delete updatePayload.scripts;
                }
            }


            if (Object.keys(updatePayload).length > 0) {
                this.vttApi.updateObject(objectId, updatePayload);
                this.displayMessage(`Object ${objectId} updated.`, 'success', 1500);
            } else {
                this.displayMessage(`No changes detected for object ${objectId}.`, 'info', 1500);
            }

        } catch (error) {
            console.error('[UiViewModel] Error applying inspector changes:', error);
            this.displayMessage(`Error applying changes: ${error.message}`, 'error');
        }
    }

    handleDeleteSelectedObject(objectId) { // This method seems unused. requestObjectDelete is used instead by inspectorView
        if (!this.vttApi || !objectId) return;
        const result = this.vttApi.deleteObject(objectId);
        if (result) {
             this.displayMessage(`Object ${objectId} deleted.`, 'success', 1500);
        } else {
             this.displayMessage(`Failed to delete object ${objectId}.`, 'error');
        }
    }

    applyBoardSettings(newProps) {
        if (!this.vttApi) return;
        // newProps should be validated or structured as expected by VTT_API.setBoardProperties
        // e.g., { widthUser, heightUser, unitForDimensions, scaleRatio, unitForRatio }
        const updatedProps = this.vttApi.setBoardProperties(newProps);
        if (updatedProps) {
            this.displayMessage('Board settings updated.', 'success', 1500);
        } else {
            this.displayMessage('Failed to update board settings.', 'error');
        }
    }

    createObject(shape, props = {}) {
        if (!this.vttApi) return null;
        const newObj = this.vttApi.createObject(shape, props);
        if (newObj) {
            this.displayMessage(`${shape} object "${newObj.name}" created.`, 'success', 1500);
        } else {
            this.displayMessage(`Failed to create ${shape} object.`, 'error');
        }
        return newObj;
    }

    setTableBackground(backgroundProps) {
        if (!this.vttApi) return;
        this.vttApi.setTableBackground(backgroundProps);
        this.displayMessage('Table background updated.', 'success', 1500);
    }

    requestCreateObjectModal() {
        if (typeof this._onCreateObjectModalRequested === 'function') {
            this._onCreateObjectModalRequested();
        } else {
            console.warn('[UiViewModel] Create object modal requested, but no handler registered.');
            this.displayMessage('Cannot open create object dialog.', 'error');
        }
    }

    /**
     * Public method to request a message display.
     * This will trigger the _onDisplayMessage callback if a handler (e.g., messageAreaView) is registered.
     */
    displayMessage(text, type = 'info', duration = 3000) {
        if (typeof this._onDisplayMessage === 'function') {
            this._onDisplayMessage(text, type, duration);
        } else {
            // Fallback if no message display handler is registered (e.g., during early init or if messageAreaView fails)
            console.warn(`[UiViewModel] displayMessage called, but no handler registered. Message: ${type} - ${text}`);
            // alert(`${type.toUpperCase()}: ${text}`); // Avoid alert in ViewModel
        }
    }

    // Placeholder for image upload handling if needed directly in ViewModel

    requestLoadMemoryState() {
        const availableStates = sessionManagement.getAvailableMemoryStates();

        if (!availableStates || availableStates.length === 0) {
            // displayMessage will be called by getAvailableMemoryStates if it's empty
            // or if it returns [] and we explicitly message here.
            // sessionManagement.getAvailableMemoryStates already calls displayMessage if empty.
            return;
        }

        if (typeof this._onShowSelectionModalRequested === 'function') {
            const modalTitle = 'Load State from Memory';
            const choices = availableStates.map((state, index) => ({
                id: index, // Use index as a simple ID for selection
                text: state.name // Assumes state.name is what getAvailableMemoryStates provides
            }));

            this._onShowSelectionModalRequested(modalTitle, choices, (selectedIndex) => {
                if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < availableStates.length) {
                    const stateToLoad = sessionManagement.getMemoryStateByIndex(selectedIndex);
                    if (stateToLoad) {
                        sessionManagement.applyMemoryState(stateToLoad);
                        // applyMemoryState in sessionManagement now handles success/error messages.
                    } else {
                        this.displayMessage('Selected state could not be retrieved.', 'error');
                    }
                } else if (selectedIndex !== null) { // Not null means a selection was made, but it was invalid (e.g. header clicked)
                    this.displayMessage('Invalid selection.', 'info');
                } else { // Null means user cancelled (e.g. clicked cancel button or outside modal)
                    this.displayMessage('Load from memory cancelled.', 'info');
                }
            });
        } else {
            console.error('[UiViewModel] _onShowSelectionModalRequested callback not registered. Cannot show memory states.');
            this.displayMessage('Cannot display memory states: UI component not ready.', 'error');
        }
    }
}

export default UiViewModel;
