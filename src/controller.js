// src/controller.js
import { populateObjectInspector } from './ui.js'; // Added import

let vttApi = null;

const Controller = {
  init: function(api) {
    vttApi = api;
    console.log('Controller initialized with VTT_API.');
    this.setupUIEventListeners();
    this.setupModelEventListeners();
  },

  setupUIEventListeners: function() {
    // Listen for custom events from ui.js
    console.log('Controller: Setting up UI event listeners.');
    document.addEventListener('uiObjectDeleteRequested', (event) => {
      this.handleObjectDelete(event.detail);
    });
    document.addEventListener('uiCreateObjectRequested', (event) => {
      this.handleCreateObject(event.detail);
    });
    // Other listeners will be added as we refactor ui.js
  },

  setupModelEventListeners: function() {
    // Listen for modelChanged events to update views if necessary
    document.addEventListener('modelChanged', (event) => {
      if (!event.detail) return;
      // console.log('Controller detected modelChanged:', event.detail); // For debugging

      const { type, payload } = event.detail;

      if (type === 'objectDeleted') {
            const currentSelectedId = vttApi.getSelectedObjectId ? vttApi.getSelectedObjectId() : null;
            if (currentSelectedId === payload.id) {
                populateObjectInspector(null);
            }
      } else if (type === 'selectionChanged') {
            const selectedObject = payload ? vttApi.getObject(payload) : null;
            populateObjectInspector(selectedObject);
      } else if (type === 'objectCreated') {
            const newObject = payload;
            if (newObject && vttApi.setSelectedObjectId) {
                vttApi.setSelectedObjectId(newObject.id); // This will trigger 'selectionChanged'
                                                       // which then calls populateObjectInspector.
            }
      }
    });
    console.log('Controller: Setting up Model event listeners.');
  },

  handleObjectDelete: function(detail) {
    if (!detail || !detail.objectId) return;
    const { objectId, objectName } = detail; // objectName for messages

    const success = vttApi.deleteObject(objectId); // vttApi is stored from init

    if (success) {
      vttApi.showMessage(`Object "${objectName || objectId}" deleted.`, 'info');
    } else {
      vttApi.showMessage(`Failed to delete object "${objectName || objectId}". It might have been already deleted.`, 'error');
    }
  },

  handleCreateObject: function(detail) {
    if (!detail || !detail.shape || !detail.props) return;
    const { shape, props } = detail;

    const newObject = vttApi.createObject(shape, props); // vttApi is stored from init

    if (newObject) {
      vttApi.showMessage(`Object "${newObject.name || newObject.id}" created.`, 'success');
      // Auto-selection is handled by the 'objectCreated' listener in setupModelEventListeners
    } else {
      vttApi.showMessage('Failed to create object.', 'error');
    }
  },

  // Placeholder for other handler methods that will be moved from ui.js
  // handleApplyObjectChanges: function(detail) { /* ... */ },
  // handleSetBackground: function(detail) { /* ... */ },
  // handleApplyBoardProperties: function(detail) { /* ... */ }
};

export default Controller;
