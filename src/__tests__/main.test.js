// src/__tests__/main.test.js
import { initializeApplication } from '../main.js';
import * as objects from '../objects.js';
import * as canvas from '../canvas.js'; // This will be the mocked version
import * as ui from '../ui.js'; // This will be the mocked version

// --- Mocking src/ui.js ---
jest.mock('../ui.js', () => ({
  populateObjectInspector: jest.fn(),
  initUIEventListeners: jest.fn(), // Important to prevent DOM issues
  displayMessage: jest.fn(),
  showModal: jest.fn(),
  getToolbarValues: jest.fn().mockReturnValue({ backgroundUrl: '', backgroundColor: '#cccccc' }), // Called in init
  displayCreateObjectModal: jest.fn(),
  // Add any other functions from ui.js that main.js might call during initialization or event handling
}));

// --- Mocking src/canvas.js (Revised Strategy) ---
let mockSelectedObjectId = null;
let globalOnDrawNeededCallback = null; // To store the redraw callback

jest.mock('../canvas.js', () => {
  // We don't need jest.requireActual here if we explicitly mock everything main.js uses from canvas.
  return {
    initCanvas: jest.fn((canvasElement, drawNeededCallback) => {
      globalOnDrawNeededCallback = drawNeededCallback; // Store the callback
      // Simulate canvas context if any part of main.js (or modules it calls) expects it
      if (canvasElement && typeof canvasElement.getContext === 'function') {
        canvasElement.getContext = () => ({
          scale: jest.fn(),
          translate: jest.fn(),
          fillRect: jest.fn(),
          save: jest.fn(),
          restore: jest.fn(),
          beginPath: jest.fn(),
          arc: jest.fn(),
          fill: jest.fn(),
          stroke: jest.fn(),
          drawImage: jest.fn(),
          measureText: jest.fn(() => ({ width: 0 })),
          fillText: jest.fn(),
        });
      } else if (canvasElement) {
        // If it's not null but doesn't have getContext, add it for safety
        canvasElement.getContext = jest.fn().mockReturnValue({
            scale: jest.fn(),
            translate: jest.fn(),
            fillRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            stroke: jest.fn(),
            drawImage: jest.fn(),
            measureText: jest.fn(() => ({ width: 0 })),
            fillText: jest.fn(),
        });
      }
    }),
    getPanZoomState: jest.fn().mockReturnValue({ panX: 0, panY: 0, zoom: 1.0 }),
    getMousePositionOnCanvas: jest.fn(),
    getObjectAtPosition: jest.fn(),
    setSelectedObjectId: jest.fn((id) => {
      mockSelectedObjectId = id;
      // Simulate that a selection change might trigger a redraw if the actual canvas does
      // if (globalOnDrawNeededCallback) globalOnDrawNeededCallback();
    }),
    getSelectedObjectId: jest.fn(() => mockSelectedObjectId),
    drawVTT: jest.fn(),
    setTableBackground: jest.fn(), // Called during init via uiCallbacks
    getTableBackground: jest.fn().mockReturnValue({ type: 'color', value: '#cccccc' }), // Called by requestRedraw
    // Mock any other canvas functions that main.js might directly or indirectly call
    // For example, if loadImage is called and it's in canvas.js
    loadImage: jest.fn(),
  };
});


describe('Object Selection in main.js', () => {
  let canvasEl;

  beforeAll(() => {
    // Set up a basic HTML structure required by main.js for initialization
    document.body.innerHTML = `
      <div id="canvas-container">
        <canvas id="vtt-canvas"></canvas>
      </div>
      <div id="tools-sidebar">
        <button id="create-object-button"></button>
        <input id="background-url-input" />
        <input id="background-color-input" />
        <button id="set-background-button"></button>
      </div>
      <div id="inspector-sidebar">
        <div id="inspector-content">
            <div><p>Select an object</p></div>
            <div id="obj-id-container"><span id="obj-id"></span></div>
            <div id="obj-x-container"><input type="number" id="obj-x" class="prop-input"></div>
            </div>
        <div id="inspector-actions" class="hidden">
            <button id="update-object-button"></button>
            <button id="delete-object-button"></button>
        </div>
      </div>
      <div id="message-area"></div>
      // Add other minimal elements if main.js init touches them, e.g.
      // <div id="session-id-display"></div>
      // <div id="user-id-display"></div>
      // <input id="session-load-input" />
      // <button id="session-load-button"></button>
      // <button id="session-save-button"></button>
    `;
    canvasEl = document.getElementById('vtt-canvas');
  });

  beforeEach(async () => {
    jest.clearAllMocks(); // Clears usage data for all mocks
    objects.clearLocalObjects();
    mockSelectedObjectId = null; // Explicitly reset our state variable for the mock

    // Initialize the application. This sets up event listeners on canvasEl.
    // It's async because of Firebase stub, but our mocks make it effectively sync for these tests.
    await initializeApplication();

    // Ensure globalOnDrawNeededCallback is captured from the mock initCanvas call
    if (canvas.initCanvas.mock.calls.length > 0) {
        globalOnDrawNeededCallback = canvas.initCanvas.mock.calls[0][1];
    } else {
        // Fallback if initializeApplication didn't call initCanvas (e.g. if test structure changes)
        // This might indicate an issue with the test setup or assumptions
        console.warn("canvas.initCanvas was not called during beforeEach, globalOnDrawNeededCallback may not be set.");
    }
  });

  test('Test Case 1: Selecting an Object', () => {
    // Arrange
    const testObject = objects.createGenericObject('rectangle', {
      x: 10, y: 10, width: 50, height: 50, name: 'TestObj1', isMovable: true,
      // Add other properties like id, appearance, scripts if main.js uses them directly
      // For this test, main.js primarily cares about `isMovable` and coordinates for dragging,
      // and the full object for populating the inspector.
    });
    // Ensure the object as fetched by main.js (via objects.getLocalObject) includes all needed props.
    const expectedInspectorArg = objects.getLocalObject(testObject.id);


    canvas.getMousePositionOnCanvas.mockReturnValue({ x: 25, y: 25 }); // Simulate click within the object
    canvas.getObjectAtPosition.mockReturnValue(testObject.id); // Simulate object found at click

    // Act: Simulate a mousedown event on the canvas
    const mousedownEvent = new MouseEvent('mousedown', { clientX: 25, clientY: 25, bubbles: true });
    canvasEl.dispatchEvent(mousedownEvent);

    // Assert
    // 1. canvas.setSelectedObjectId was called with the object's ID
    expect(canvas.setSelectedObjectId).toHaveBeenCalledWith(testObject.id);

    // 2. ui.populateObjectInspector was called with the object's properties
    expect(ui.populateObjectInspector).toHaveBeenCalledWith(expectedInspectorArg);

    // 3. Verify our mock's internal state for selectedObjectId is correct
    expect(canvas.getSelectedObjectId()).toBe(testObject.id);

    // 4. Check if a redraw was requested. For selection on mousedown, main.js
    // usually defers redraw until mouseup unless deselection occurs.
    // So, no redraw expected here.
    // If globalOnDrawNeededCallback was called, it would fail this:
    expect(globalOnDrawNeededCallback).not.toHaveBeenCalled();
    expect(canvas.drawVTT).not.toHaveBeenCalled();
  });

  test('Test Case 2: Deselecting an Object (Clicking Background)', () => {
    // Arrange
    const testObject = objects.createGenericObject('rectangle', {
      x: 10, y: 10, width: 50, height: 50, name: 'TestObj1', isMovable: true,
    });
    // Simulate that testObject was already selected
    mockSelectedObjectId = testObject.id;
    // Clear mocks that might have been called during this pre-selection setup
    // (though with mockSelectedObjectId direct set, they wouldn't be)
    canvas.setSelectedObjectId.mockClear();
    ui.populateObjectInspector.mockClear();
    if(globalOnDrawNeededCallback) globalOnDrawNeededCallback.mockClear();


    canvas.getMousePositionOnCanvas.mockReturnValue({ x: 100, y: 100 }); // Click outside any object
    canvas.getObjectAtPosition.mockReturnValue(null); // Simulate click on empty space

    // Act: Simulate a mousedown event on the canvas
    const mousedownEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true });
    canvasEl.dispatchEvent(mousedownEvent);

    // Assert
    // 1. canvas.setSelectedObjectId was called with null (to deselect)
    expect(canvas.setSelectedObjectId).toHaveBeenCalledWith(null);

    // 2. ui.populateObjectInspector was called with null (to clear inspector)
    expect(ui.populateObjectInspector).toHaveBeenCalledWith(null);

    // 3. Verify our mock's internal state for selectedObjectId is now null
    expect(canvas.getSelectedObjectId()).toBeNull();

    // 4. Check if a redraw was requested. Deselection by clicking background should trigger a redraw.
    expect(globalOnDrawNeededCallback).toHaveBeenCalled();
  });
});
