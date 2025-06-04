# TableTopTool Architecture (MVVM)

## 1. Overview

The TableTopTool application has transitioned to an **MVVM (Model-View-ViewModel)** architecture. This pattern provides a clearer separation of concerns, enhancing maintainability and testability. The application remains a client-side web application, operating in an **offline-first, in-memory mode** for the MVP, with all data managed locally.

The core components of the MVVM pattern in this application are:

-   **Model**: Represents the application's data and business logic. It's the single source of truth for all tabletop elements (objects, board state). The model is not directly aware of the View or ViewModel. It notifies listeners (typically ViewModels) of data changes through events.
-   **View**: The user interface (UI) that the user interacts with. This includes the main canvas, inspector panels, toolbars, and modals. The View is responsible for displaying data provided by the ViewModel and capturing user input. It does not contain application logic.
-   **ViewModel**: Acts as an intermediary between the Model and the View. It retrieves data from the Model, transforms it into a format suitable for display by the View, and manages the View's state. It also handles user interactions received from the View, often by invoking operations on the Model (typically via the `VTT_API`).

This architecture promotes a decoupled system where changes in one part have minimal impact on others.

## 2. Module Breakdown

The application's code is organized into the following main categories, reflecting the MVVM pattern:

-   **Model**:
    -   `src/model/model.js`: The central hub of the model. Manages all `VTTObject` instances and the `Board` state (pan/zoom, background, dimensions). Responsible for data integrity, core business logic, and persistence operations (though persistence itself is delegated). Dispatches `modelChanged` events when any data is altered, ensuring that other parts of the application can react to changes.
    -   `src/model/VTTObject.js`: Defines the `VTTObject` class. This class encapsulates all properties and behaviors of individual items on the tabletop, such as their ID, type, position (x, y), size (width, height), rotation, visual appearance, custom user data (`data` property), and associated scripts.
    -   `src/model/Board.js`: Defines the `Board` class. This class manages canvas-wide properties, including the current pan position, zoom level, background color or image, and the overall dimensions and scale of the tabletop area.

-   **ViewModel**:
    -   `src/viewmodels/canvasViewModel.js`: Manages presentation logic and state specifically for the canvas area. It holds observable data such as the list of objects to be rendered, current pan/zoom values, background details, the ID of any selected object, and caches for loaded images. It provides methods for coordinate conversions (e.g., world to screen), object picking (identifying an object at a given point), and prepares data for consumption by `canvasView.js`.
    -   `src/viewmodels/uiViewModel.js`: Manages presentation logic and state for all UI elements outside the main canvas. This includes the inspector panel, modal dialogs, user messages, and board settings forms. It listens for `modelChanged` events (often via `uiView.js`) and prepares data derived from the model for display in various UI components. It also handles UI actions (e.g., button clicks from the inspector) and typically forwards these requests to the `VTT_API` for processing by the model.

-   **View**:
    -   `src/views/canvasView.js`: Responsible for rendering all visual elements onto the HTML5 canvas. This includes drawing all `VTTObject` instances, the table background, and selection highlights, based on the data provided by `canvasViewModel.js`. It also captures all user interactions directly on the canvas, such as mouse clicks (for selection or script execution), drags (for panning or moving objects), and zoom events (mouse wheel), communicating these to `canvasViewModel.js` or directly to the `VTT_API` as appropriate.
    -   `src/views/uiView.js`: Initializes and manages the overall UI structure of the application. This includes setting up the main toolbar, the inspector panel, modal dialogs, and the message display area. It instantiates the core ViewModels (`canvasViewModel`, `uiViewModel`) and orchestrates interactions between them and the various view components. It plays a crucial role in setting up event listeners for `modelChanged` events from the model and delegating UI updates to the appropriate components or ViewModels.
    -   `src/views/components/`: This directory contains specialized, reusable view components for different parts of the UI. Examples include `inspectorView.js` (for the object details panel) and `boardSettingsView.js` (for configuring board dimensions and background). These components typically interact with `uiViewModel.js` (or dedicated, more granular ViewModels if complexity increases) to display data and handle user input.

-   **Supporting Modules**:
    -   `src/main.js`: The main entry point for the application. Its primary responsibilities are to initialize essential services like logging (via `loggingConfig.js`) and then to delegate the setup and initialization of the entire user interface and application logic to `uiView.js`.
    -   `src/api.js`: Exports the `VTT_API` object. This API provides a stable, controlled, and consistent interface for other parts of the application (primarily ViewModels and user-defined object scripts) to interact with the data model (`model.js`). It decouples ViewModels from needing to know the direct, internal details of `model.js`, promoting cleaner architecture.
    -   `src/session_management.js`: Handles the saving and loading of the entire application state. This includes all `VTTObject` instances, board settings (like background and dimensions), and the current view state (pan/zoom). It serializes this data to JSON for file export and parses JSON files for import. It uses the `VTT_API` to query and update the model during these operations.
    -   `src/firebase.js`: This module is currently a stubbed placeholder for potential future integration with Firebase services (e.g., for real-time collaboration or cloud storage). In the current offline MVP, it operates in a fully offline mode, and its functions typically log that Firebase is not active.
    -   `src/loggingConfig.js`: Configures the `loglevel` library, which is used for application-wide logging. This allows for consistent log formatting and control over log levels during development and production.

## 3. Data Flow Examples

These examples illustrate how data flows through the MVVM architecture for common operations:

-   **Example 1: Creating an Object (e.g., Rectangle via UI Button)**
    1.  User clicks a "Create Rectangle" button in `uiView.js` (e.g., within a toolbar component).
    2.  The `uiView.js` component (or its sub-component) calls a method on `uiViewModel.js`, for instance, `handleCreateObject('rectangle')`.
    3.  `uiViewModel.js` processes this request and calls `VTT_API.createObject('rectangle', { /* default properties */ })`.
    4.  `VTT_API.createObject()` forwards the call to the corresponding method in `src/model/model.js`.
    5.  `model.js` instantiates a new `VTTObject`, assigns it a unique ID, and adds it to its internal collection of objects.
    6.  `model.js` then dispatches a `modelChanged` event, (e.g., `{ type: 'objectAdded', payload: newObject }`). This event is typically broadcast using a custom event or a simple observer pattern.
    7.  Both `canvasViewModel.js` and `uiViewModel.js` (often via `uiView.js`, which listens for `modelChanged` and delegates, or ViewModels might listen directly) receive the `modelChanged` event.
    8.  `canvasViewModel.js` updates its internal list of objects (e.g., `viewModelObjects`) and, if it has an `onDrawNeededCallback` registered by `canvasView.js`, calls it to signal that the canvas needs to be redrawn.
    9.  `uiViewModel.js` might update its state if the new object's creation affects non-canvas UI. For example, if the new object should be automatically selected, `uiViewModel.js` would update its `inspectorData` property and notify `uiView.js` (or its inspector component) to refresh the inspector display.
    10. `canvasView.js` (triggered by the callback from `canvasViewModel.js`) redraws the entire canvas, now including the newly created rectangle.
    11. `uiView.js` (specifically, its inspector component, if notified by `uiViewModel.js`) updates to display the details of the new object if it was selected.

-   **Example 2: Updating an Object via Inspector**
    1.  User changes a property (e.g., X position) in the inspector panel (managed by `inspectorView.js`, which is part of `uiView.js`) for a currently selected object.
    2.  User clicks an "Apply Changes" button within the inspector.
    3.  `inspectorView.js` gathers the changed properties and calls a method on `uiViewModel.js`, such as `applyInspectorChanges(objectId, changedProps)`.
    4.  `uiViewModel.js` validates or processes these changes and then calls `VTT_API.updateObject(objectId, changedProps)`.
    5.  `VTT_API.updateObject()` forwards this call to the corresponding method in `src/model/model.js`.
    6.  `model.js` finds the specified `VTTObject` instance and updates its properties.
    7.  `model.js` dispatches a `modelChanged` event (e.g., `{ type: 'objectUpdated', payload: updatedObject }`).
    8.  `canvasViewModel.js` and `uiViewModel.js` (or `uiView.js`) receive this event.
    9.  `canvasViewModel.js` updates the representation of the object in its `viewModelObjects` list and requests a redraw from `canvasView.js` (via `onDrawNeededCallback`).
    10. `uiViewModel.js` updates its `inspectorData` if the updated object is the one currently displayed in the inspector, and notifies `inspectorView.js` to refresh its display.
    11. `canvasView.js` redraws the canvas, showing the object with its new position.
    12. `inspectorView.js` refreshes its fields to show the confirmed new state of the object.

-   **Example 3: Panning the Canvas**
    1.  User presses the mouse button down on an empty area of the canvas and starts dragging.
    2.  `canvasView.js` captures the `mousedown` and subsequent `mousemove` events.
    3.  During `mousemove`, `canvasView.js` calculates the change in mouse position (delta).
    4.  For immediate visual feedback, `canvasView.js` can call a method on `canvasViewModel.js` like `canvasViewModel.locallyUpdatePanZoom(newPanX, newPanY)`. This method updates `viewModelPanZoom` (or similar reactive properties) within `canvasViewModel.js`. This local update triggers `canvasView.js` (via the `onDrawNeededCallback` or by observing ViewModel properties) to redraw the canvas.
    5.  `canvasView.js` redraws the canvas content based on the locally updated pan position from `canvasViewModel.js`.
    6.  When the user releases the mouse button (`mouseup`), `canvasView.js` determines the final pan position. It then calls `VTT_API.setPanZoomState({ panX: finalPanX, panY: finalPanY, zoom: currentZoom })` to persist the change to the model.
    7.  `VTT_API.setPanZoomState()` calls the corresponding state update method in `src/model/model.js` (which updates the `Board` instance).
    8.  `model.js` updates its authoritative pan state (within its `Board` object).
    9.  `model.js` dispatches a `modelChanged` event (e.g., `{ type: 'panZoomChanged', payload: newPanZoomState }`).
    10. `canvasViewModel.js` receives this `modelChanged` event. It updates its `viewModelPanZoom` properties from the payload to ensure it is perfectly synchronized with the authoritative state in the Model. This might trigger another redraw if the values differ from its local updates, ensuring consistency.

## 4. Object Data Structure

The canonical data structure for all items on the tabletop is defined by the `VTTObject` class, located in `src/model/VTTObject.js`. This class encapsulates all properties associated with a tabletop object.

Detailed descriptions of each property can be found within the JSDoc typedefs (`@typedef`) in `src/model/VTTObject.js`, specifically for `VTTObject`, `VTTObjectAppearance`, and `VTTObjectScripts`.

As an overview, the main properties of a `VTTObject` instance include:
-   `id`: A unique string identifier (UUID).
-   `type`: A string indicating the general type of object (e.g., "generic-rectangle", "token", "map-tile").
-   `name`: An optional user-friendly name for the object.
-   `x`, `y`: Numerical values representing the object's position on the canvas (typically top-left corner).
-   `width`, `height`: Numerical values for the object's dimensions.
-   `rotation`: Numerical value for the object's rotation in degrees.
-   `zIndex`: Numerical value determining the stacking order on the canvas.
-   `shape`: A string defining the basic geometric shape (e.g., "rectangle", "circle", "polygon").
-   `isMovable`: A boolean indicating if the object can be moved by user interaction.
-   `appearance`: An object (`VTTObjectAppearance`) detailing visual properties like colors, border, image URL, and text styling.
-   `data`: A flexible object (`Object<string, any>`) for storing arbitrary user-defined data.
-   `scripts`: An object (`VTTObjectScripts`) containing user-defined scripts, such as an `onClick` handler.

## 5. Save/Load Format (`.ttt.json`)

The application state, including all objects, board settings, and view configuration, is saved and loaded as a JSON file with the `.ttt.json` extension. The `src/session_management.js` module is responsible for handling these operations, coordinating with the `VTT_API` to get data from and restore data to the model.

The JSON structure is as follows:

```json
{
  "sessionId": "local-session",
  "savedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "appVersion": "TableTopTool-MVP-Offline-v1", // Or current app version
  "objects": [
    // Array of VTTObject instances (as defined in src/model/VTTObject.js)
    {
      "id": "uuid-...",
      "type": "generic-rectangle",
      // ... all other VTTObject properties (name, x, y, appearance, data, scripts, etc.)
    }
    // ... more objects
  ],
  "background": { // From Board state in model.js
    "type": "color", // or "image"
    "value": "#RRGGBB" // or "/path/to/image.png" or image data URL
  },
  "viewState": { // From Board state in model.js (panZoomState)
    "panX": 0,
    "panY": 0,
    "zoom": 1.0
  },
  "boardProperties": { // From Board state in model.js
    "widthUser": 36,
    "heightUser": 24,
    "unitForDimensions": "in",
    "widthPx": 914.4, // Calculated pixel dimension based on user units and DPI/scale
    "heightPx": 609.6, // Calculated pixel dimension
    "scaleRatio": 1,   // e.g., 1 unit on map = 5ft (if unitForRatio is 'ft')
    "unitForRatio": "mm" // unit for the scaleRatio (e.g., 'mm', 'in', 'ft', 'm')
  }
}
```

## 6. Scripting API (`VTT_API`)

The `VTT_API`, exposed via `src/api.js`, provides a controlled way for user-defined scripts to interact with the application's data and functionalities.

When an object's script (e.g., an `onClick` handler) is executed, it runs in a scope where two key variables are available:
-   `VTT`: This is the `VTT_API` object itself, providing access to its methods.
-   `object`: A reference to the specific `VTTObject` instance (from the model) that hosts the script being executed. This allows the script to easily refer to its own properties.

Key methods available to scripts via the `VTT` object include:
-   **`VTT.getObject(objectId)`**: Retrieves a copy of any `VTTObject` from the model by its ID. This is useful for inspecting other objects on the tabletop.
-   **`VTT.updateObjectState(objectId, newData)`**: This is the primary method for scripts to modify an object. It is specifically designed to merge the `newData` object only into the `data` property of the target `VTTObject`. This targeted update ensures that scripts modify a designated area for custom state, reducing the risk of corrupting core object properties. Importantly, calling this method will result in `model.js` dispatching a `modelChanged` event, which in turn leads to UI updates (e.g., canvas redraws, inspector refresh).
-   **`VTT.log(message)`**: Logs a message to the browser's developer console, automatically prefixed with information about the script's context (e.g., the ID or name of the object whose script is logging).

Scripts are typically triggered by user interactions handled by the view layer. For example:
1.  The `canvasView.js` detects a click on a `VTTObject`.
2.  If the object has an `onClick` script defined in its `scripts` property, `canvasView.js` (or a handler it calls, possibly in `canvasViewModel.js` or `uiViewModel.js`) will retrieve this script.
3.  The script execution is then invoked. The view/viewModel layer provides the `VTT_API` and the specific `object` reference to the script's execution context.
4.  The script code uses `VTT.updateObjectState()` or other `VTT_API` methods. These API methods call functions within `src/model/model.js` to read or modify data.
5.  If `model.js` data is changed (e.g., via `VTT.updateObjectState()`), it dispatches a `modelChanged` event, leading to the appropriate view updates.
