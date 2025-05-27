// Mock ui.js: provide original for displayCreateObjectModal, mock others.
jest.mock('../ui.js', () => {
  const originalModule = jest.requireActual('../ui.js');
  console.log('In ui.test.js mock factory, typeof originalModule.displayCreateObjectModal:', typeof originalModule.displayCreateObjectModal);
  console.log('In ui.test.js mock factory, typeof originalModule.showModal:', typeof originalModule.showModal);
  return {
    __esModule: true, // Important for ES Modules
    // List original functions we want to keep as actual implementations
    displayCreateObjectModal: originalModule.displayCreateObjectModal,
    populateObjectInspector: originalModule.populateObjectInspector, // If needed by other tests or setup
    readObjectInspector: originalModule.readObjectInspector,     // If needed
    displayMessage: originalModule.displayMessage,                 // If needed
    getToolbarValues: originalModule.getToolbarValues,             // If needed
    initUIEventListeners: originalModule.initUIEventListeners,       // If needed
    // Add any other functions from ui.js that should remain original

    // Mock the specific functions we want to control for these tests
    showModal: jest.fn(),
    hideModal: jest.fn(),
  };
});

// Import the functions needed for the test AFTER the mock setup.
const { displayCreateObjectModal, showModal, hideModal } = require('../ui.js');

describe('ui.js', () => {
  beforeEach(() => {
    // Reset mocks before each test
    showModal.mockClear();
    hideModal.mockClear();

    // Set up the basic DOM structure needed for the modal's inputs
    document.body.innerHTML = `
      <div id="modal-container"></div>
      <div id="modal-title"></div>
      <div id="modal-content">
        <select id="create-obj-shape">
          <option value="rectangle" selected>Rectangle</option>
          <option value="circle">Circle</option>
        </select>
        <input type="number" id="create-obj-x" value="10" />
        <input type="number" id="create-obj-y" value="20" />
        <input type="number" id="create-obj-width" value="80" />
        <input type="number" id="create-obj-height" value="90" />
        <input type="color" id="create-obj-bgcolor" value="#FF0000" />
      </div>
      <div id="modal-buttons"></div>
    `;
  });

  describe('displayCreateObjectModal', () => {
    test('should call showModal with correct title', () => {
      const mockCreateCallback = jest.fn();
      displayCreateObjectModal(mockCreateCallback);

      expect(showModal).toHaveBeenCalledTimes(1);
      expect(showModal.mock.calls[0][0]).toBe('Create New Object');
      expect(typeof showModal.mock.calls[0][1]).toBe('string');
      expect(Array.isArray(showModal.mock.calls[0][2])).toBe(true);
    });

    test('Create button callback should call createCallback with values from DOM', () => {
      const mockCreateCb = jest.fn();
      displayCreateObjectModal(mockCreateCb);

      expect(showModal).toHaveBeenCalledTimes(1);
      const showModalArgs = showModal.mock.calls[0];
      const buttonsArray = showModalArgs[2];
      const createButtonConfig = buttonsArray.find(b => b.text === 'Create');

      expect(createButtonConfig).toBeDefined();
      expect(typeof createButtonConfig.onClickCallback).toBe('function');

      document.getElementById('create-obj-shape').value = 'circle';
      document.getElementById('create-obj-x').value = '11';
      document.getElementById('create-obj-y').value = '22';
      document.getElementById('create-obj-width').value = '88';
      document.getElementById('create-obj-height').value = '99';
      document.getElementById('create-obj-bgcolor').value = '#00FF00';

      createButtonConfig.onClickCallback();

      expect(mockCreateCb).toHaveBeenCalledTimes(1);
      expect(mockCreateCb).toHaveBeenCalledWith('circle', {
        x: 11,
        y: 22,
        width: 88,
        height: 99,
        appearance: { backgroundColor: '#00FF00' },
      });
    });

    test('Cancel button should exist', () => {
      const mockCreateCb = jest.fn();
      displayCreateObjectModal(mockCreateCb);

      expect(showModal).toHaveBeenCalledTimes(1);
      const showModalArgs = showModal.mock.calls[0];
      const buttonsArray = showModalArgs[2];
      const cancelButtonConfig = buttonsArray.find(b => b.text === 'Cancel');

      expect(cancelButtonConfig).toBeDefined();
    });
  });
});
