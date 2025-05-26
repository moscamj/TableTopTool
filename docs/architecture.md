# TableTopTool Architecture (Offline MVP)

## 1. Overview

The TableTopTool MVP is designed as a modular, client-side web application. It operates entirely in-memory, meaning all data (objects, canvas state, etc.) is held within the browser and does not rely on a backend server for its core VTT functionalities. User interactions drive state changes, which then trigger UI updates and canvas re-renders.

Key architectural principles:
*   **Modularity**: Functionality is broken down into distinct JavaScript modules (`main.js`, `objects.js`, `canvas.js`, `ui.js`, `api.js`).
*   **Single Source of Truth (for objects)**: The `objects.js` module maintains the `currentObjects` Map, which acts as the canonical store for all items on the tabletop.
*   **Event-Driven UI**: User interface interactions (button clicks, input changes, canvas events) are handled by `main.js` and `ui.js`, which then call functions in other modules to update state or perform actions.
*   **Reactive Rendering**: Changes to the application state (e.g., moving an object, updating a property) trigger a redraw of the canvas to reflect the new state.

## 2. Module Breakdown

The project is structured into several key JavaScript modules found in the `src/` directory:

*   **`main.js` (Orchestrator)**
    *   **Responsibilities**: Initializes all other modules, sets up global event listeners (especially for the canvas), defines callbacks for UI events, and manages the main application lifecycle. It orchestrates the overall flow of data and interactions between different modules.
    *   Handles the local save-to-file and load-from-file functionality.
    *   Manages the execution of user-defined scripts attached to objects.

*   **`objects.js` (Object Management)**
    *   **Responsibilities**: Manages the state of all objects on the virtual tabletop.
    *   Contains `currentObjects` (a `Map` where keys are object IDs and values are the object data).
    *   Provides CRUD-like functions for objects: `createGenericObject`, `getLocalObject`, `updateLocalObject`, `deleteLocalObject`, `getAllLocalObjects`, `clearLocalObjects`.
    *   Includes a UUID generator for new objects.
    *   Defines the canonical data structure for VTT objects (see "Object Data Structure" below).

*   **`canvas.js` (Canvas Rendering & Interaction)**
    *   **Responsibilities**: Handles all drawing operations on the HTML5 canvas. This includes rendering objects, the table background, selection highlights, etc.
    *   Manages canvas-specific state: pan position (`panX`, `panY`), zoom level (`zoom`).
    *   Provides functions for coordinate transformations (screen to world coordinates).
    *   Implements object picking logic (`getObjectAtPosition`) to determine which object is at a given canvas coordinate.
    *   Handles asynchronous loading and caching of images used for object appearances and the table background.
    *   Communicates the need for a redraw to `main.js` via a callback.

*   **`ui.js` (User Interface Management)**
    *   **Responsibilities**: Manages all direct interactions with the HTML DOM elements outside of the main canvas.
    *   Caches references to DOM elements (buttons, inputs, inspector fields, modal dialogs, message area).
    *   Initializes event listeners for UI elements and invokes callbacks provided by `main.js`.
    *   Provides functions to populate and read data from the object inspector panel.
    *   Manages the display of modal dialogs (e.g., for errors, confirmations) and timed messages/notifications.

*   **`api.js` (VTT Scripting API)**
    *   **Responsibilities**: Exposes the `VTT_API` object, which is made available to user-defined scripts attached to objects.
    *   Allows scripts to interact with the VTT environment in a controlled manner (e.g., get object data, update an object's custom data, log messages).
    *   Interacts with `objects.js` to modify object state and can trigger canvas redraws via custom events.

*   **`firebase.js` (Firebase Integration - Stubbed for Offline MVP)**
    *   **Responsibilities**: Designed to handle all communication with Firebase services (Authentication, Firestore database).
    *   **Current State**: In the offline MVP, all Firebase functionality is stubbed. Functions in this module log warnings that the app is in offline mode and do not make actual Firebase calls. This allows the overall application structure to remain consistent for potential future Firebase integration.

## 3. Data Flow Examples

*   **Creating an Object:**
    1.  User clicks "Create Rectangle" button (`index.html`).
    2.  `ui.js` captures the click and calls the `onCreateRectangle` callback defined in `main.js`.
    3.  `main.js` calls `objects.createGenericObject('rectangle')`.
    4.  `objects.js` creates a new object, assigns a UUID, adds it to `currentObjects`, and returns the new object.
    5.  `main.js` sets this new object as selected (`canvas.setSelectedObjectId()`) and populates the inspector (`ui.populateObjectInspector()`).
    6.  `main.js` calls `requestRedraw()` (which calls `canvas.drawVTT()`).
    7.  `canvas.drawVTT()` gets all objects from `objects.getAllLocalObjects()` and renders them.

*   **Updating an Object via Inspector:**
    1.  User changes a property (e.g., X position) in the inspector panel for a selected object.
    2.  User clicks "Apply Changes" button.
    3.  `ui.js` captures the click and calls the `onApplyObjectChanges` callback in `main.js`.
    4.  `main.js` calls `ui.readObjectInspector()` to get all properties.
    5.  `main.js` calls `objects.updateLocalObject(selectedId, updatedProps)`.
    6.  `objects.js` updates the object in `currentObjects`.
    7.  `main.js` calls `requestRedraw()`.

*   **Executing an `onClick` Script:**
    1.  User clicks on an object on the canvas that has an `onClick` script.
    2.  `canvas.js` (via `main.js` mousedown/mouseup listeners) identifies the clicked object.
    3.  `main.js` retrieves the object and its script string from `objects.js`.
    4.  `main.js` executes the script string using `new Function('VTT', 'object', scriptString)(api.VTT_API, objectRef)`.
    5.  The script (e.g., `VTT.updateObjectState(object.id, {"newKey": "newValue"})`) calls functions on `api.VTT_API`.
    6.  `api.js` calls `objects.updateLocalObject()` to modify the object's data.
    7.  `api.js` dispatches a `stateChangedForRedraw` event.
    8.  `main.js` listens for this event and calls `requestRedraw()`.
    9.  `main.js` also re-populates the inspector for the potentially modified object.

## 4. Object Data Structure

The canonical structure for objects is defined via JSDoc comments in `src/objects.js`. Here's a summary:

*   **`VTTObject`**:
    *   `id`: string (UUID)
    *   `type`: string (e.g., 'generic-rectangle', 'token')
    *   `name`: string (optional display name)
    *   `x`, `y`: number (top-left coordinates)
    *   `width`, `height`: number
    *   `rotation`: number (degrees)
    *   `zIndex`: number (stacking order)
    *   `shape`: 'rectangle' | 'circle'
    *   `isMovable`: boolean
    *   `appearance`: `VTTObjectAppearance` object
    *   `data`: `Object<string, any>` (user-defined custom properties)
    *   `scripts`: `VTTObjectScripts` object

*   **`VTTObjectAppearance`**:
    *   `imageUrl`: string (optional)
    *   `backgroundColor`: string (e.g., '#RRGGBB')
    *   `borderColor`: string
    *   `borderWidth`: number
    *   `textColor`: string
    *   `text`: string (text to display on object)
    *   `fontFamily`: string
    *   `fontSize`: number

*   **`VTTObjectScripts`**:
    *   `onClick`: string (JavaScript code)

## 5. Save/Load Format (`.ttt.json`)

When the table state is saved, it creates a JSON file with the following structure:

```json
{
  "sessionId": "local-session", // Or the ID active at save time
  "savedAt": "YYYY-MM-DDTHH:mm:ss.sssZ", // ISO 8601 timestamp
  "appVersion": "TableTopTool-MVP-Offline-v1", // Optional versioning
  "objects": [
    // Array of VTTObject instances (as defined above)
    {
      "id": "uuid-...",
      "type": "generic-rectangle",
      "name": "My Rectangle",
      "x": 100,
      "y": 150,
      // ... all other VTTObject properties
      "appearance": { ... },
      "data": { ... },
      "scripts": { ... }
    }
    // ... more objects
  ],
  "background": {
    "type": "color" | "image",
    "value": "#RRGGBB" // or "/path/to/image.png"
  },
  "viewState": {
    "panX": 0,
    "panY": 0,
    "zoom": 1.0
  }
}
```

## 6. Scripting API (`VTT_API`)

Object scripts (currently only `onClick`) are executed within a scope where the `VTT` object (an alias for `VTT_API`) and an `object` variable (a direct reference to the script's host object in `objects.currentObjects`) are available.

Key `VTT_API` methods:

*   **`VTT.getObject(objectId)`**: Retrieves a *copy* of any object on the table by its ID.
*   **`VTT.updateObjectState(objectId, newData)`**: Merges `newData` into the `data` property of the specified object. This is the primary way scripts modify persistent state. This function also triggers a canvas redraw.
*   **`VTT.log(message)`**: Logs a message to the browser's developer console, prefixed with the script's context (e.g., the ID of the object running the script).

Scripts are executed via `new Function('VTT', 'object', scriptString)(api.VTT_API, objectRef)` in `main.js`. This means scripts have access to the `VTT_API` and a reference to their own object data from the `objects.currentObjects` map.
