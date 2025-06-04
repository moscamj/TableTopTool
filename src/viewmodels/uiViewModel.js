// src/viewmodels/uiViewModel.js
import log from "loglevel";
import debug from "debug";
import * as sessionManagement from "../session_management.js";

const dUiVM = debug("app:vm:ui");

class UiViewModel {
  constructor() {
    dUiVM("UiViewModel constructor called");
    this.vttApi = null;
    this.inspectorData = null;
    this.boardProperties = {};
    this._onInspectorDataChanged = null;
    this._onBoardSettingsChanged = null;
    this._onDisplayMessage = null;
    this._onCreateObjectModalRequested = null;
    this._onShowSelectionModalRequested = null;
  }

  init(vttApi) {
    dUiVM("init called with vttApi: %o", vttApi);
    this.vttApi = vttApi;
    if (!this.vttApi) {
      log.error("[UiViewModel] VTT_API not provided during init!");
      dUiVM("init error: VTT_API not provided.");
      return;
    }
    document.addEventListener(
      "modelChanged",
      this._handleModelChange.bind(this),
    );
    dUiVM("modelChanged event listener added.");
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

  getInspectorData() {
    return this.inspectorData;
  }

  getBoardPropertiesForDisplay() {
    return this.boardProperties;
  }

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
      case "selectionChanged": {
        const newSelectedObject = payload
          ? this.vttApi.getObject(payload)
          : null;
        if (payload && !newSelectedObject) {
          log.warn(
            `[UiViewModel] selectionChanged: Object with ID '${payload}' not found via API, though it was selected. Inspector will be cleared.`,
          );
          dUiVM(
            `[UiViewModel] selectionChanged: Object with ID '${payload}' not found via API. Forcing inspectorData to null.`,
          );
        }
        this.inspectorData =
          newSelectedObject &&
          typeof newSelectedObject.id === "string" &&
          newSelectedObject.id
            ? newSelectedObject
            : null;
        dUiVM("Selection changed. New inspectorData: %o", this.inspectorData);
        refreshInspector = true;
        break;
      }
      case "objectUpdated": {
        if (
          this.inspectorData &&
          payload &&
          this.inspectorData.id === payload.id
        ) {
          const updatedObject = this.vttApi.getObject(payload.id);
          if (!updatedObject) {
            log.warn(
              `[UiViewModel] objectUpdated: Inspected object with ID '${payload.id}' not found via API after update. Clearing inspector.`,
            );
            dUiVM(
              `[UiViewModel] objectUpdated: Inspected object with ID '${payload.id}' not found via API. Forcing inspectorData to null.`,
            );
          }
          this.inspectorData =
            updatedObject &&
            typeof updatedObject.id === "string" &&
            updatedObject.id
              ? updatedObject
              : null;
          dUiVM(
            "Currently inspected object %s updated. New inspectorData: %o",
            payload.id,
            this.inspectorData,
          );
          refreshInspector = true;
        }
        break;
      }
      case "objectDeleted": {
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
      }
      case "allObjectsCleared": {
        this.inspectorData = null;
        dUiVM("All objects cleared. InspectorData set to null.");
        refreshInspector = true;
        break;
      }
      case "boardPropertiesChanged": {
        this.boardProperties = { ...payload };
        dUiVM(
          "Board properties changed. New boardProperties: %o",
          this.boardProperties,
        );
        refreshBoardSettings = true;
        break;
      }
      default: {
        dUiVM("Unhandled model change type in UiViewModel: %s", type);
        break;
      }
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

      const updatePayload = {};

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
          Object.prototype.hasOwnProperty.call(inspectorSnapshot, key) &&
          inspectorSnapshot[key] !== currentObject[key]
        ) {
          if (
            ["x", "y", "width", "height", "rotation", "zIndex"].includes(key)
          ) {
            const numVal = parseFloat(inspectorSnapshot[key]);
            if (!isNaN(numVal)) {
              updatePayload[key] = numVal;
            }
          } else {
            updatePayload[key] = inspectorSnapshot[key];
          }
        }
      });

      if (inspectorSnapshot.appearance) {
        updatePayload.appearance = {};
        const currentAppearance = currentObject.appearance || {};
        for (const key in inspectorSnapshot.appearance) {
          if (
            Object.prototype.hasOwnProperty.call(
              inspectorSnapshot.appearance,
              key,
            ) &&
            inspectorSnapshot.appearance[key] !== currentAppearance[key]
          ) {
            if (key === "showLabel") {
              updatePayload.appearance[key] =
                inspectorSnapshot.appearance[key] === true ||
                inspectorSnapshot.appearance[key] === "true";
            } else if (key === "borderWidth" || key === "fontSize") {
              const numVal = parseFloat(inspectorSnapshot.appearance[key]);
              if (!isNaN(numVal)) {
                updatePayload.appearance[key] = numVal;
              }
            } else {
              updatePayload.appearance[key] = inspectorSnapshot.appearance[key];
            }
          }
        }
        if (Object.keys(updatePayload.appearance).length === 0) {
          delete updatePayload.appearance;
        }
      }

      if (inspectorSnapshot.scripts) {
        updatePayload.scripts = {};
        const currentScripts = currentObject.scripts || {};
        for (const key in inspectorSnapshot.scripts) {
          if (
            Object.prototype.hasOwnProperty.call(
              inspectorSnapshot.scripts,
              key,
            ) &&
            inspectorSnapshot.scripts[key] !== currentScripts[key]
          ) {
            updatePayload.scripts[key] = inspectorSnapshot.scripts[key];
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
      } else {
        this.displayMessage(
          `No changes detected for object ${objectId}.`,
          "info",
          1500,
        );
      }
    } catch (error) {
      log.error("[UiViewModel] Error applying inspector changes:", error);
      this.displayMessage(`Error applying changes: ${error.message}`, "error");
    }
  }

  handleDeleteSelectedObject(objectId) {
    dUiVM(
      "handleDeleteSelectedObject called for objectId: %s (Note: generally unused)",
      objectId,
    );
    if (!this.vttApi || !objectId) return;
    const result = this.vttApi.deleteObject(objectId);
    if (result) {
      this.displayMessage(`Object ${objectId} deleted.`, "success", 1500);
    } else {
      this.displayMessage(`Failed to delete object ${objectId}.`, "error");
    }
  }

  applyBoardSettings(newProps) {
    dUiVM("applyBoardSettings called with newProps: %o", newProps);
    if (!this.vttApi) return;
    const updatedProps = this.vttApi.setBoardProperties(newProps);
    if (updatedProps) {
      this.displayMessage("Board settings updated.", "success", 1500);
    } else {
      this.displayMessage("Failed to update board settings.", "error");
    }
  }

  createObject(shape, props = {}) {
    dUiVM("createObject called with shape: %s, props: %o", shape, props);
    if (!this.vttApi) return null;
    const newObj = this.vttApi.createObject(shape, props);
    if (newObj) {
      this.displayMessage(
        `${shape} object "${newObj.name}" created.`,
        "success",
        1500,
      );
    } else {
      this.displayMessage(`Failed to create ${shape} object.`, "error");
    }
    return newObj;
  }

  setTableBackground(backgroundProps) {
    dUiVM(
      "setTableBackground called with backgroundProps: %o",
      backgroundProps,
    );
    if (!this.vttApi) return;
    this.vttApi.setTableBackground(backgroundProps);
    this.displayMessage("Table background updated.", "success", 1500);
  }

  requestCreateObjectModal() {
    dUiVM("requestCreateObjectModal called.");
    if (typeof this._onCreateObjectModalRequested === "function") {
      this._onCreateObjectModalRequested();
    } else {
      this.displayMessage("Cannot open create object dialog.", "error");
    }
  }

  displayMessage(text, type = "info", duration = 3000) {
    dUiVM(
      'displayMessage called. Text: "%s", Type: %s, Duration: %dms',
      text,
      type,
      duration,
    );
    if (typeof this._onDisplayMessage === "function") {
      this._onDisplayMessage(text, type, duration);
    } else {
      log.warn(
        `[UiViewModel] displayMessage called, but no handler registered. Message: ${type} - ${text}`,
      );
    }
  }

  requestLoadMemoryState() {
    dUiVM("requestLoadMemoryState called.");
    const availableStates = sessionManagement.getAvailableMemoryStates();
    if (!availableStates || availableStates.length === 0) {
      dUiVM("No memory states available to load.");
      return;
    }

    if (typeof this._onShowSelectionModalRequested === "function") {
      const modalTitle = "Load State from Memory";
      const choices = availableStates.map((state, index) => ({
        id: index,
        text: state.name,
      }));
      this._onShowSelectionModalRequested(
        modalTitle,
        choices,
        (selectedIndex) => {
          if (
            selectedIndex !== null &&
            selectedIndex >= 0 &&
            selectedIndex < availableStates.length
          ) {
            const stateToLoad =
              sessionManagement.getMemoryStateByIndex(selectedIndex);
            if (stateToLoad) {
              sessionManagement.applyMemoryState(stateToLoad);
            } else {
              this.displayMessage(
                "Selected state could not be retrieved.",
                "error",
              );
            }
          } else if (selectedIndex !== null) {
            this.displayMessage("Invalid selection.", "info");
          } else {
            this.displayMessage("Load from memory cancelled.", "info");
          }
        },
      );
    } else {
      this.displayMessage(
        "Cannot display memory states: UI component not ready.",
        "error",
      );
    }
  }
}

export default UiViewModel;
