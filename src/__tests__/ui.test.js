// Mock ui.js: provide original for displayCreateObjectModal, mock others.
jest.mock('../ui.js', () => {
  const originalModule = jest.requireActual('../ui.js');
  return {
    __esModule: true, // Important for ES Modules
    // List original functions we want to keep as actual implementations
    displayCreateObjectModal: originalModule.displayCreateObjectModal,
    populateObjectInspector: originalModule.populateObjectInspector,
    readObjectInspector: originalModule.readObjectInspector,
    cacheDOMElements: originalModule.cacheDOMElements, // Keep original
    displayMessage: jest.fn(), // Mock displayMessage as it's called on error
    getToolbarValues: originalModule.getToolbarValues,
    initUIEventListeners: originalModule.initUIEventListeners,
    // Add any other functions from ui.js that should remain original

    // Mock the specific functions we want to control for these tests
    showModal: jest.fn(),
    hideModal: jest.fn(),
  };
});

// Import the functions needed for the test AFTER the mock setup.
const { displayCreateObjectModal, showModal, hideModal, populateObjectInspector, readObjectInspector, cacheDOMElements } = require('../ui.js');

describe('ui.js', () => {
  // Tests for displayCreateObjectModal
  describe('displayCreateObjectModal', () => {
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
        <div id="inspector-content">
          <div id="inspector-fields">
            <p>Select an object to inspect.</p>
            <div><label class="block text-sm">ID: <span id="obj-id" class="font-mono text-xs"></span></label></div>
            <div><label for="obj-name" class="block text-sm">Name: <input type="text" id="obj-name" class="prop-input w-full p-1 border rounded bg-gray-700 border-gray-600 text-white"></label></div>
            <div><label for="obj-x" class="block text-sm">X: <input type="number" id="obj-x" class="w-full prop-input"></label></div>
            <div><label for="obj-y" class="block text-sm">Y: <input type="number" id="obj-y" class="w-full prop-input"></label></div>
            <div><label for="obj-width" class="block text-sm">Width: <input type="number" id="obj-width" class="w-full prop-input"></label></div>
            <div><label for="obj-height" class="block text-sm">Height: <input type="number" id="obj-height" class="w-full prop-input"></label></div>
            <div><label for="obj-rotation" class="block text-sm">Rotation: <input type="number" id="obj-rotation" class="w-full prop-input" step="1"></label></div>
            <div><label for="obj-bg-color" class="block text-sm">Background Color: <input type="color" id="obj-bg-color" class="w-full h-8 prop-input"></label></div>
            <div><label for="obj-image-url" class="block text-sm">Image URL: <input type="text" id="obj-image-url" class="w-full prop-input"></label></div>
            <div><label for="obj-z-index" class="block text-sm">Z-Index: <input type="number" id="obj-z-index" class="w-full prop-input"></label></div>
            <div>
                <label for="obj-is-movable" class="block text-sm">Is Movable:
                    <input type="checkbox" id="obj-is-movable" class="prop-input align-middle">
                </label>
            </div>
            <div>
                <label for="obj-shape" class="block text-sm">Shape:
                    <select id="obj-shape" class="w-full prop-input bg-gray-600 border border-gray-500 rounded p-1 text-sm">
                        <option value="rectangle">Rectangle</option>
                        <option value="circle">Circle</option>
                    </select>
                </label>
            </div>
            <hr class="border-gray-600">
            <div>
                <label for="obj-data" class="block text-sm">Custom Data (JSON):</label>
                <textarea id="obj-data" rows="3" class="w-full prop-input text-xs"></textarea>
            </div>
            <div>
                <label for="obj-script-onclick" class="block text-sm">Script - onClick:</label>
                <textarea id="obj-script-onclick" rows="3" class="w-full prop-input text-xs"></textarea>
            </div>
          </div>
          <div id="inspector-actions" class="hidden"></div>
        </div>
      `;
    });

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

  // New tests for Inspector Fields Logic
  describe('Inspector Fields Logic', () => {
    let objId, objName, objX, objY, objWidth, objHeight, objRotation, objBgColor, objImageUrl, objZIndex, objIsMovable, objShape, objData, objScriptOnClick;

    beforeEach(() => {
      // Ensure the inspector DOM is fully set up for these tests
      document.body.innerHTML = `
        <div id="inspector-content">
            <!-- The first div child is used to show/hide the "Select an object" message -->
            <div><p>Select an object to inspect.</p></div>
            <div><label class="block text-sm">ID: <span id="obj-id"></span></label></div>
            <div><label for="obj-name">Name: <input type="text" id="obj-name" class="prop-input"></label></div>
            <div><label for="obj-x">X: <input type="number" id="obj-x" class="prop-input"></label></div>
            <div><label for="obj-y">Y: <input type="number" id="obj-y" class="prop-input"></label></div>
            <div><label for="obj-width">Width: <input type="number" id="obj-width" class="prop-input"></label></div>
            <div><label for="obj-height">Height: <input type="number" id="obj-height" class="prop-input"></label></div>
            <div><label for="obj-rotation">Rotation: <input type="number" id="obj-rotation" class="prop-input"></label></div>
            <div><label for="obj-bg-color">Background Color: <input type="color" id="obj-bg-color" class="prop-input"></label></div>
            <div><label for="obj-image-url">Image URL: <input type="text" id="obj-image-url" class="prop-input"></label></div>
            <div><label for="obj-z-index">Z-Index: <input type="number" id="obj-z-index" class="prop-input"></label></div>
            <div><label for="obj-is-movable">Is Movable: <input type="checkbox" id="obj-is-movable" class="prop-input"></label></div>
            <div>
                <label for="obj-shape">Shape:
                    <select id="obj-shape" class="prop-input">
                        <option value="rectangle">Rectangle</option>
                        <option value="circle">Circle</option>
                    </select>
                </label>
            </div>
            <div><label for="obj-data">Custom Data (JSON): <textarea id="obj-data" class="prop-input"></textarea></label></div>
            <div><label for="obj-script-onclick">Script - onClick: <textarea id="obj-script-onclick" class="prop-input"></textarea></label></div>
        </div>
        <div id="inspector-actions" class="hidden"></div>
      `;
      cacheDOMElements(); // Cache the newly created DOM elements

      // Assign references to the input elements for easier use in tests
      objId = document.getElementById('obj-id');
      objName = document.getElementById('obj-name');
      objX = document.getElementById('obj-x');
      objY = document.getElementById('obj-y');
      objWidth = document.getElementById('obj-width');
      objHeight = document.getElementById('obj-height');
      objRotation = document.getElementById('obj-rotation');
      objBgColor = document.getElementById('obj-bg-color');
      objImageUrl = document.getElementById('obj-image-url');
      objZIndex = document.getElementById('obj-z-index');
      objIsMovable = document.getElementById('obj-is-movable');
      objShape = document.getElementById('obj-shape');
      objData = document.getElementById('obj-data');
      objScriptOnClick = document.getElementById('obj-script-onclick');
    });

    describe('populateObjectInspector', () => {
      test('should populate name, width, and height fields correctly', () => {
        const objectData = {
          id: 'obj1',
          name: 'Test Object',
          x: 10, y: 20, width: 100, height: 50, rotation: 0, zIndex: 1,
          isMovable: true, shape: 'rectangle',
          appearance: { backgroundColor: '#ff0000', imageUrl: '' },
          data: {}, scripts: { onClick: '' }
        };
        populateObjectInspector(objectData);
        expect(objName.value).toBe('Test Object');
        expect(objWidth.value).toBe("100");
        expect(objHeight.value).toBe("50");
      });

      test('should set objName.value to empty string if objectData.name is null', () => {
        const objectData = { name: null, width: 10, height: 10 };
        populateObjectInspector(objectData);
        expect(objName.value).toBe('');
      });

      test('should set objName.value to empty string if objectData.name is empty', () => {
        const objectData = { name: '', width: 10, height: 10 };
        populateObjectInspector(objectData);
        expect(objName.value).toBe('');
      });

      test('should clear fields when called with null', () => {
        // First populate with some data
        populateObjectInspector({ name: 'Test', width: 100, height: 50, id: '1' });
        // Then clear
        populateObjectInspector(null);
        expect(objName.value).toBe('');
        // Default values for numbers might be empty string or "0" depending on browser/input type handling
        // For this test, we'll assume they become empty or 0. The readObjectInspector tests are more critical for default values.
        expect(objWidth.value === '' || objWidth.value === '0').toBeTruthy();
        expect(objHeight.value === '' || objHeight.value === '0').toBeTruthy();
        expect(objId.textContent).toBe(''); // ID is usually cleared
      });
    });

    describe('readObjectInspector', () => {
      beforeEach(() => {
        // Set objId as it's required by readObjectInspector
        objId.textContent = 'test-id-123';
        // Initialize all other fields read by readObjectInspector to prevent type errors on .value or .checked
        objX.value = '0';
        objY.value = '0';
        objRotation.value = '0';
        objBgColor.value = '#CCCCCC';
        objImageUrl.value = '';
        objZIndex.value = '0';
        objIsMovable.checked = true;
        objShape.value = 'rectangle';
        objData.value = '{}';
        objScriptOnClick.value = '';
      });

      test('should correctly read name, width, and height', () => {
        objName.value = 'My Object';
        objWidth.value = '150';
        objHeight.value = '75';
        const result = readObjectInspector();
        expect(result.name).toBe('My Object');
        expect(result.width).toBe(150);
        expect(result.height).toBe(75);
      });

      test('should trim objName value', () => {
        objName.value = '  Spaced Name  ';
        objWidth.value = '10'; objHeight.value = '10'; // Need valid dimensions
        const result = readObjectInspector();
        expect(result.name).toBe('Spaced Name');
      });

      // Width clamping tests
      ['0', '-5', 'abc', NaN, null, undefined].forEach(invalidValue => {
        test(`should clamp width to 1 if objWidth.value is "${invalidValue}"`, () => {
          objWidth.value = invalidValue;
          objHeight.value = '10'; // Valid height
          const result = readObjectInspector();
          expect(result.width).toBe(1);
        });
      });
      
      // Height clamping tests
      ['0', '-5', 'abc', NaN, null, undefined].forEach(invalidValue => {
        test(`should clamp height to 1 if objHeight.value is "${invalidValue}"`, () => {
          objHeight.value = invalidValue;
          objWidth.value = '10'; // Valid width
          const result = readObjectInspector();
          expect(result.height).toBe(1);
        });
      });

      test('should parse valid positive width and height correctly', () => {
        objWidth.value = '200.5';
        objHeight.value = '75.25';
        const result = readObjectInspector();
        expect(result.width).toBe(200.5);
        expect(result.height).toBe(75.25);
      });
    });
  });
});
