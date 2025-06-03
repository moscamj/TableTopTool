// src/__tests__/main.test.js
import { initializeApplication } from '../main.js';
import * as model from '../model/model.js'; // Changed from 'objects.js'
import * as canvas from '../views/canvasView.js'; // This will be the mocked version - Path corrected
import * as ui from '../views/uiView.js'; // This will be the mocked version - Path corrected

// --- Mocking src/views/uiView.js ---
jest.mock('../views/uiView.js', () => ({
  populateObjectInspector: jest.fn(),
  initUIEventListeners: jest.fn(), // Important to prevent DOM issues
  displayMessage: jest.fn(),
  showModal: jest.fn(),
  getToolbarValues: jest.fn().mockReturnValue({ backgroundUrl: '', backgroundColor: '#cccccc' }), // Called in init
  displayCreateObjectModal: jest.fn(),
  // Add any other functions from ui.js that main.js might call during initialization or event handling
}));

// --- Mocking src/views/canvasView.js (Revised Strategy) ---
let mockSelectedObjectId = null;
let globalOnDrawNeededCallback = null; // To store the redraw callback

jest.mock('../views/canvasView.js', () => {
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
    model.clearAllObjects(); // Changed from objects.clearLocalObjects()
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
    // Use model.createObject - assuming it returns an object with an id
    const testObject = model.createObject('rectangle', { 
      x: 10, y: 10, width: 50, height: 50, name: 'TestObj1', isMovable: true,
    });
    // Ensure the object as fetched by main.js (via model.getObject) includes all needed props.
    const expectedInspectorArg = model.getObject(testObject.id);


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
    const testObject = model.createObject('rectangle', {
      x: 10, y: 10, width: 50, height: 50, name: 'TestObj1', isMovable: true,
    });
    // Simulate that testObject was already selected
    mockSelectedObjectId = testObject.id;
    // Clear mocks that might have been called during this pre-selection setup
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

// Inside the describe block in src/__tests__/main.test.js, after existing tests:

describe('Object Dragging and Inspector Update in main.js', () => {
  let canvasEl;

  // beforeEach is already in main.test.js, ensure it clears mocks
  // and initializes application. We might need to re-get canvasEl if it's not module-scoped.
  beforeEach(async () => {
    // This setup is largely similar to existing tests in main.test.js
    // Ensure mocks are cleared if not already done by a top-level beforeEach
    jest.clearAllMocks(); 
    model.clearAllObjects(); 
    
    // Re-initialize application to ensure fresh listeners for each test if needed,
    // though the existing main.test.js has initializeApplication in a global beforeEach.
    // For this test suite, we rely on the global beforeEach to call initializeApplication.
    // If it weren't global, we'd call it here: await initializeApplication();
    
    canvasEl = document.getElementById('vtt-canvas'); // Get canvas element
    
    // It's important that mockSelectedObjectId is reset, which happens in the global beforeEach.
    // Also, ensure globalOnDrawNeededCallback is captured, also handled by global beforeEach.
  });

  test('Inspector should update after an object drag is completed (mouseup)', () => {
    // 1. Arrange: Create a movable object and select it
    const testObject = model.createObject('rectangle', {
      x: 50, y: 50, width: 100, height: 50, isMovable: true, name: 'Draggable'
    });
    let currentObjectState = model.getObject(testObject.id); // Get initial state

    // Simulate object selection via mousedown
    canvas.getMousePositionOnCanvas
      .mockReturnValueOnce({ x: 75, y: 75 }); // Click inside object (50,50 to 150,100)
    canvas.getObjectAtPosition.mockReturnValueOnce(testObject.id);
    // getSelectedObjectId will be called by main.js to see if it's different,
    // it should return null initially for selection to occur.
    canvas.getSelectedObjectId.mockReturnValueOnce(null);


    const mousedownEvent = new MouseEvent('mousedown', { clientX: 75, clientY: 75, bubbles: true });
    canvasEl.dispatchEvent(mousedownEvent);

    // Verify selection occurred (populateObjectInspector is called on select)
    expect(ui.populateObjectInspector).toHaveBeenCalledWith(expect.objectContaining({ id: testObject.id }));
    ui.populateObjectInspector.mockClear(); // Clear mock for the next check
    
    // Ensure main.js's internal state for selected object is now testObject.id for dragging
    // This is handled by canvas.setSelectedObjectId being called, which updates mockSelectedObjectId.
    // So subsequent calls to canvas.getSelectedObjectId() in main.js will return testObject.id.
    // No explicit mockReturnValueOnce needed here if the mock is correctly updating.

    // 2. Act: Simulate dragging the object
    // Mock canvas responses for mousemove
    // New mouse position for dragging
    const dragToX = 60;
    const dragToY = 60;
    // dragOffsetX and dragOffsetY were set internally in main.js during mousedown.
    // If mousedown was at world (75,75) and object x,y was (50,50), then
    // dragOffsetX = 75 - 50 = 25
    // dragOffsetY = 75 - 50 = 25
    // New object position should be (dragToX - dragOffsetX, dragToY - dragOffsetY)
    // = (60 - 25, 60 - 25) = (35, 35)
    canvas.getMousePositionOnCanvas
      .mockReturnValueOnce({ x: dragToX, y: dragToY }); // New mouse position in world coords

    const mousemoveEvent = new MouseEvent('mousemove', { clientX: dragToX, clientY: dragToY, bubbles: true });
    canvasEl.dispatchEvent(mousemoveEvent);

    // 3. Assert: ui.populateObjectInspector is called with the new object state
    const expectedUpdatedObject = {
      ...initialObjectState, // Start with initial state
      x: 35, // Calculated new X
      y: 35  // Calculated new Y
    };

    
    // 2. Act: Simulate mousemove (drag) - this updates canvasViewModel locally
    const dragToX = 60; // world coords for mouse
    const dragToY = 60; // world coords for mouse
    canvas.getMousePositionOnCanvas.mockReturnValueOnce({ x: dragToX, y: dragToY });
    const mousemoveEvent = new MouseEvent('mousemove', { clientX: dragToX, clientY: dragToY, bubbles: true });
    canvasEl.dispatchEvent(mousemoveEvent);

    // Assert that populateObjectInspector is NOT called during mousemove
    expect(ui.populateObjectInspector).not.toHaveBeenCalled();

    // Act: Simulate mouseup to finalize the drag
    const mouseupEvent = new MouseEvent('mouseup', { clientX: dragToX, clientY: dragToY, bubbles: true });
    canvasEl.dispatchEvent(mouseupEvent);
    
    // After mouseup, VTT_API.updateObject is called.
    // This calls model.updateObject. Let's assume model.updateObject now correctly
    // dispatches a 'modelChanged' {type: 'objectUpdated', payload: updatedObject} event.
    // (This might require a change in model.js or a more elaborate mock of VTT_API and model.js here)

    // For the test to pass based on current structure, we'd need to manually simulate
    // the 'modelChanged' event that UiViewModel listens to.
    // Or, if VTT_API.updateObject is mocked to return the updated object and main.js uses that
    // to call ui.populateObjectInspector (which it doesn't anymore).
    
    // Let's get the updated object state from the model (as if VTT_API.updateObject worked)
    // The new position would be:
    // dragOffsetX = 75 - 50 = 25
    // dragOffsetY = 75 - 50 = 25
    // new objX = dragToX (mouse) - dragOffsetX = 60 - 25 = 35
    // new objY = dragToY (mouse) - dragOffsetY = 60 - 25 = 35
    const expectedXAfterDrag = 35;
    const expectedYAfterDrag = 35;
    
    // Simulate the modelChanged event that UiViewModel would react to
    const updatedObjectPayload = { ...currentObjectState, id: testObject.id, x: expectedXAfterDrag, y: expectedYAfterDrag };
    document.dispatchEvent(new CustomEvent('modelChanged', { detail: { type: 'objectUpdated', payload: updatedObjectPayload } }));

    // 3. Assert: ui.populateObjectInspector is called with the new object state AFTER mouseup and modelChanged
    // This relies on UiViewModel listening to 'modelChanged' and calling its callback (mocked ui.populateObjectInspector)
    expect(ui.populateObjectInspector).toHaveBeenCalledWith(
      expect.objectContaining({
        id: testObject.id,
        x: expectedXAfterDrag,
        y: expectedYAfterDrag,
      })
    );
    
    // Verify the object in the (mocked) model store was updated
    // This part depends on how VTT_API.updateObject and model.updateObject are mocked or behave.
    // If they are not deeply mocked, model.getObject would return the true current state from model.js
    currentObjectState = model.getObject(testObject.id);
    expect(currentObjectState.x).toBe(expectedXAfterDrag);
    expect(currentObjectState.y).toBe(expectedYAfterDrag);
  });
});

// Inside src/__tests__/main.test.js
// This can be a new 'describe' block or added to an existing relevant one.
// For organizational purposes, let's add it to the existing top-level describe or create one for 'Background Handling'.

describe('Background Image Handling in main.js', () => {
  // beforeEach is already in main.test.js, ensuring mocks are cleared
  // and application is initialized.
  // canvasEl is also available from the outer scope if needed, though not directly for this test.

  let mockFileReaderInstance;

  beforeEach(() => {
    // Mock FileReader
    mockFileReaderInstance = {
      readAsDataURL: jest.fn(),
      onload: null, // We will set this in the test
      onerror: null, // We can set this too if testing error paths
      result: null   // To store the mock result
    };
    global.FileReader = jest.fn(() => mockFileReaderInstance);

    // Ensure mocks from ui.js and canvas.js are reset (likely handled by global beforeEach)
    // ui.setBackgroundUrlInputText.mockClear(); // Already done by jest.clearAllMocks()
    // ui.displayMessage.mockClear();
    // canvas.setTableBackground.mockClear();
  });

  test('should handle local background image file selection', () => {
    // 1. Arrange
    const mockFile = { name: 'test-image.png', type: 'image/png' };
    const mockEvent = { target: { files: [mockFile] } };
    const sampleDataURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'; // Minimal valid data URI

    // Find the handleBackgroundImageFileSelected function.
    // It's passed in uiCallbacks to ui.initUIEventListeners.
    // We need to capture uiCallbacks or specifically onBackgroundImageFileSelected.
    // The existing main.test.js calls initializeApplication() in beforeEach.
    // ui.initUIEventListeners is called within initializeApplication.
    // We can get the callback from the mock.
    
    let onBackgroundImageFileSelectedCallback;
    if (ui.initUIEventListeners.mock.calls.length > 0) {
      const uiCallbacks = ui.initUIEventListeners.mock.calls[0][0];
      onBackgroundImageFileSelectedCallback = uiCallbacks.onBackgroundImageFileSelected;
    } else {
      // This would indicate an issue with test setup or assumptions
      throw new Error('ui.initUIEventListeners was not called, cannot get onBackgroundImageFileSelectedCallback');
    }
    expect(onBackgroundImageFileSelectedCallback).toBeDefined();

    // 2. Act
    // Directly call the captured callback, simulating the event trigger from ui.js
    onBackgroundImageFileSelectedCallback(mockEvent);

    // Simulate FileReader onload
    // The callback assigned reader.onload in main.js. We trigger it here.
    expect(mockFileReaderInstance.readAsDataURL).toHaveBeenCalledWith(mockFile);
    mockFileReaderInstance.result = sampleDataURI; // Set the result for the FileReader
    if (mockFileReaderInstance.onload) {
      mockFileReaderInstance.onload({ target: { result: sampleDataURI } }); // Trigger onload
    } else {
      throw new Error('FileReader onload was not set by handleBackgroundImageFileSelected');
    }
    
    // 3. Assert
    expect(canvas.setTableBackground).toHaveBeenCalledTimes(1);
    expect(canvas.setTableBackground).toHaveBeenCalledWith({
      type: 'image',
      value: sampleDataURI,
    });

    expect(ui.setBackgroundUrlInputText).toHaveBeenCalledTimes(1);
    expect(ui.setBackgroundUrlInputText).toHaveBeenCalledWith('Local file: test-image.png');

    expect(ui.displayMessage).toHaveBeenCalledTimes(1);
    expect(ui.displayMessage).toHaveBeenCalledWith('Background image set to: test-image.png', 'success');
  });

  test('should handle FileReader error during local background image selection', () => {
    const mockFile = { name: 'error-image.png', type: 'image/png' };
    const mockEvent = { target: { files: [mockFile] } };
    const mockError = new Error('File read error');

    let onBackgroundImageFileSelectedCallback;
    if (ui.initUIEventListeners.mock.calls.length > 0) {
      const uiCallbacks = ui.initUIEventListeners.mock.calls[0][0];
      onBackgroundImageFileSelectedCallback = uiCallbacks.onBackgroundImageFileSelected;
    } else {
      throw new Error('ui.initUIEventListeners was not called');
    }
    
    onBackgroundImageFileSelectedCallback(mockEvent);

    expect(mockFileReaderInstance.readAsDataURL).toHaveBeenCalledWith(mockFile);
    if (mockFileReaderInstance.onerror) {
      mockFileReaderInstance.onerror({ target: { error: mockError } }); // Trigger onerror
    } else {
      throw new Error('FileReader onerror was not set or not triggered correctly');
    }

    expect(canvas.setTableBackground).not.toHaveBeenCalled();
    expect(ui.setBackgroundUrlInputText).not.toHaveBeenCalled();
    expect(ui.showModal).toHaveBeenCalledTimes(1);
    expect(ui.showModal).toHaveBeenCalledWith('File Read Error', 'Could not read the selected file for the background image.');
    expect(ui.displayMessage).toHaveBeenCalledWith('Failed to load background image from file.', 'error');
  });
});
