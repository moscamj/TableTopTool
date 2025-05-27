// Mock dependencies - these are hoisted above imports by Jest
jest.mock('../firebase.js', () => ({
  initializeAppFirebase: jest.fn(() => ({ auth: {}, db: {}, appIdString: 'mock-app-id' })),
  signInUserAnonymously: jest.fn(() => Promise.resolve('mock-user-id')),
}));
jest.mock('../objects.js', () => ({
  createGenericObject: jest.fn(() => ({ id: 'mock-id-123', shape: 'rectangle', x: 10, y: 10 })),
  getAllLocalObjects: jest.fn(() => []),
  clearLocalObjects: jest.fn(),
  updateLocalObject: jest.fn(),
  deleteLocalObject: jest.fn(),
  currentObjects: new Map(),
  getLocalObject: jest.fn(),
}));
jest.mock('../ui.js', () => ({
  displayCreateObjectModal: jest.fn(),
  initUIEventListeners: jest.fn(),
  displayMessage: jest.fn(),
  populateObjectInspector: jest.fn(),
  getToolbarValues: jest.fn(() => ({ backgroundUrl: '', backgroundColor: '#cccccc' })),
  showModal: jest.fn(),
  readObjectInspector: jest.fn(() => ({})),
}));
jest.mock('../canvas.js', () => ({
  drawVTT: jest.fn(),
  getPanZoomState: jest.fn(() => ({ panX: 0, panY: 0, zoom: 1 })),
  getTableBackground: jest.fn(() => ({ type: 'color', value: '#cccccc' })),
  getSelectedObjectId: jest.fn(() => null),
  initCanvas: jest.fn(),
  setPanZoomState: jest.fn(),
  getMousePositionOnCanvas: jest.fn(() => ({x:0, y:0})),
  getObjectAtPosition: jest.fn(() => null),
  setSelectedObjectId: jest.fn(),
  loadImage: jest.fn(),
}));

// Declare variables that will hold the functions from main.js
let handleObjectCreationSubmit, handleCreateObjectRequested;
// Declare variables for accessing mocks (needed for mockClear in beforeEach)
let mockCreateGenericObject, mockDisplayCreateObjectModal, mockDrawVTT;


describe('main.js object creation handlers', () => {
  beforeAll(() => {
    // Set up necessary DOM elements FIRST, as main.js executes code on load.
    document.body.innerHTML = `
      <canvas id="vtt-canvas"></canvas>
      <div id="message-area"></div>
      <h1 id="header-title"></h1><span id="user-id-display"></span><span id="session-id-display"></span>
      <input type="text" id="session-load-input" /><button id="session-load-button"></button><button id="session-save-button"></button>
      <aside id="tools-sidebar"></aside><button id="create-object-button"></button>
      <input type="text" id="background-url-input" /><input type="color" id="background-color-input" /><button id="set-background-button"></button>
      <section id="canvas-container"></section>
      <aside id="inspector-sidebar"></aside><div id="inspector-content"><p></p><div></div></div><div id="inspector-actions"></div>
      <span id="obj-id"></span><input type="number" id="obj-x" /><input type="number" id="obj-y" />
      <input type="number" id="obj-width" /><input type="number" id="obj-height" /><input type="number" id="obj-rotation" />
      <input type="color" id="obj-bg-color" /><input type="text" id="obj-image-url" /><input type="number" id="obj-z-index" />
      <input type="checkbox" id="obj-is-movable" /><select id="obj-shape"></select>
      <textarea id="obj-data"></textarea><textarea id="obj-script-onclick"></textarea>
      <button id="update-object-button"></button><button id="delete-object-button"></button>
      <div id="modal-container"></div><div id="modal-title"></div><div id="modal-content"></div><div id="modal-buttons"></div>
    `;

    // Dynamically require main.js after DOM and mocks are set up.
    const mainModule = require('../main.js');
    handleObjectCreationSubmit = mainModule.handleObjectCreationSubmit;
    handleCreateObjectRequested = mainModule.handleCreateObjectRequested;

    // Assign mocks for easy access in beforeEach
    mockCreateGenericObject = require('../objects.js').createGenericObject;
    mockDisplayCreateObjectModal = require('../ui.js').displayCreateObjectModal;
    mockDrawVTT = require('../canvas.js').drawVTT;
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockCreateGenericObject.mockClear();
    mockDisplayCreateObjectModal.mockClear();
    mockDrawVTT.mockClear();
  });

  describe('handleObjectCreationSubmit', () => {
    test('should call createGenericObject with correct parameters and request redraw', () => {
      const shape = 'rectangle';
      const props = {
        x: 10,
        y: 20,
        width: 150,
        height: 75,
        appearance: { backgroundColor: '#FF0000' },
      };

      handleObjectCreationSubmit(shape, props);

      expect(mockCreateGenericObject).toHaveBeenCalledTimes(1);
      expect(mockCreateGenericObject).toHaveBeenCalledWith(shape, props);
      expect(mockDrawVTT).toHaveBeenCalledTimes(1);
    });

     test('should handle different shapes and props correctly', () => {
      const shape = 'circle';
      const props = {
        x: 30,
        y: 40,
        width: 60,
        height: 60,
        appearance: { backgroundColor: '#00FF00' },
      };
      handleObjectCreationSubmit(shape, props);
      expect(mockCreateGenericObject).toHaveBeenCalledWith(shape, props);
      expect(mockDrawVTT).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleCreateObjectRequested', () => {
    test('should call displayCreateObjectModal with handleObjectCreationSubmit as callback', () => {
      handleCreateObjectRequested();

      expect(mockDisplayCreateObjectModal).toHaveBeenCalledTimes(1);
      expect(mockDisplayCreateObjectModal.mock.calls[0][0]).toBe(handleObjectCreationSubmit);
    });
  });
});
