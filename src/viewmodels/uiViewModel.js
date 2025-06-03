// src/viewmodels/uiViewModel.js

class UiViewModel {
    constructor() {
        this.vttApi = null; // To be set during init

        // Internal state
        this.inspectorData = null;
        this.boardProperties = {}; // Will hold the current board properties
        // this.activeModal = null; // Example for future modal management

        // Callbacks to be registered by the View (uiView.js or components)
        this._onInspectorDataChanged = null;
        this._onBoardSettingsChanged = null;
        this._onDisplayMessage = null; 
        this._onCreateObjectModalRequested = null; // For modalView
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

    // --- Action Methods (called by View or Controller) ---

    // Note: updateInspectorField is not strictly necessary if changes are applied via a snapshot.
    // If live field-by-field updates to VTT_API were desired, it would go here.
    // For now, we'll use applyInspectorChanges with a snapshot.

    applyInspectorChanges(objectId, inspectorSnapshot) {
        if (!this.vttApi) return;
        try {
            // We need to ensure that the snapshot contains only properties
            // that VTT_API.updateObject can handle.
            // For example, 'id' should not be in the props to change.
            // Also, nested structures like 'appearance' need to be handled correctly.
            
            const currentObject = this.vttApi.getObject(objectId);
            if (!currentObject) {
                if(this._onDisplayMessage) this._onDisplayMessage(`Object with ID ${objectId} not found. Cannot apply changes.`, 'error');
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
                if(this._onDisplayMessage) this._onDisplayMessage(`Object ${objectId} updated.`, 'success', 1500);
            } else {
                if(this._onDisplayMessage) this._onDisplayMessage(`No changes detected for object ${objectId}.`, 'info', 1500);
            }

        } catch (error) {
            console.error('[UiViewModel] Error applying inspector changes:', error);
            if(this._onDisplayMessage) this._onDisplayMessage(`Error applying changes: ${error.message}`, 'error');
        }
    }

    handleDeleteSelectedObject(objectId) {
        if (!this.vttApi || !objectId) return;
        const result = this.vttApi.deleteObject(objectId);
        if (result) {
             if(this._onDisplayMessage) this._onDisplayMessage(`Object ${objectId} deleted.`, 'success', 1500);
        } else {
             if(this._onDisplayMessage) this._onDisplayMessage(`Failed to delete object ${objectId}.`, 'error');
        }
    }

    applyBoardSettings(newProps) {
        if (!this.vttApi) return;
        // newProps should be validated or structured as expected by VTT_API.setBoardProperties
        // e.g., { widthUser, heightUser, unitForDimensions, scaleRatio, unitForRatio }
        const updatedProps = this.vttApi.setBoardProperties(newProps);
        if (updatedProps) {
            if(this._onDisplayMessage) this._onDisplayMessage('Board settings updated.', 'success', 1500);
        } else {
            if(this._onDisplayMessage) this._onDisplayMessage('Failed to update board settings.', 'error');
        }
    }

    createObject(shape, props = {}) {
        if (!this.vttApi) return null;
        const newObj = this.vttApi.createObject(shape, props);
        if (newObj) {
            if(this._onDisplayMessage) this._onDisplayMessage(`${shape} object "${newObj.name}" created.`, 'success', 1500);
        } else {
            if(this._onDisplayMessage) this._onDisplayMessage(`Failed to create ${shape} object.`, 'error');
        }
        return newObj;
    }

    setTableBackground(backgroundProps) {
        if (!this.vttApi) return;
        this.vttApi.setTableBackground(backgroundProps);
        if(this._onDisplayMessage) this._onDisplayMessage('Table background updated.', 'success', 1500);
    }

    requestCreateObjectModal() {
        if (typeof this._onCreateObjectModalRequested === 'function') {
            this._onCreateObjectModalRequested();
        } else {
            console.warn('[UiViewModel] Create object modal requested, but no handler registered.');
            if(this._onDisplayMessage) this._onDisplayMessage('Cannot open create object dialog.', 'error');
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
    // handleImageUploadForBackground(file, callback) { ... }
    // handleImageUploadForObject(objectId, file, callback) { ... }
}

export default UiViewModel;
