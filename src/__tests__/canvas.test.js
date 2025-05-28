// src/__tests__/canvas.test.js
import {
  initCanvas,
  drawVTT,
  // setSelectedObjectId, // Removed, was moved to model.js
  // getSelectedObjectId, // Removed, was moved to model.js
  // setPanZoomState,  // Removed, was moved to model.js
  // getPanZoomState, // Removed, was moved to model.js
  // getTableBackground, // Removed, was moved to model.js
  getObjectAtPosition, 
} from '../canvas.js';

// Mock the global Image constructor
global.Image = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this._src = '';
    // Simulate image loading quickly for tests if needed
    setTimeout(() => {
      if (this.src && this.onload) {
        this.width = 100; // Mock natural width
        this.height = 100; // Mock natural height
        this.onload();
      } else if (this.src && this.onerror) {
        // Allow specific tests to trigger onerror if they set a src that would cause error
        if (this.src.includes('error')) {
          this.onerror(new Error('Mock image load error'));
        } else {
          // default to onload for other cases if src is set
          this.width = 100; this.height = 100; this.onload();
        }
      }
    }, 0);
  }
  set src(val) { 
    this._src = val; 
    // Trigger async load behavior when src is set
    if (this._src.includes('error') && this.onerror) {
        setTimeout(() => this.onerror(new Error('Mock image load error')), 0);
    } else if (this.onload) {
        setTimeout(() => { this.width = 100; this.height = 100; this.onload(); }, 0);
    }
  }
  get src() { return this._src; }
};


// Mock canvas element and 2D rendering context
const mockCtx = {
  save: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  drawImage: jest.fn(),
  fillText: jest.fn(), 
  restore: jest.fn(),
  // Properties that might be set
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: '',
  textBaseline: '',
  measureText: jest.fn(() => ({ width: 50 })),
  clearRect: jest.fn(),
  getLineDash: jest.fn(() => []),
  setLineDash: jest.fn(),
};

const mockCanvasEl = {
  getContext: jest.fn(() => mockCtx),
  getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0, width: 800, height: 600 })),
  width: 800 * (window.devicePixelRatio || 1),
  height: 600 * (window.devicePixelRatio || 1),
  style: { width: '800px', height: '600px' },
  parentElement: { 
    clientWidth: 800,
    clientHeight: 600,
  },
};

describe('Canvas Rendering Logic', () => {
  let fillTextCallsWithContext; // Declare here to be accessible in all nested describes

  beforeEach(() => {
    jest.clearAllMocks(); 

    mockCtx.fillStyle = '';
    mockCtx.strokeStyle = '';
    mockCtx.lineWidth = 0;
    mockCtx.font = '';
    mockCtx.textAlign = '';
    mockCtx.textBaseline = '';
    
    mockCanvasEl.parentElement.clientWidth = 800;
    mockCanvasEl.parentElement.clientHeight = 600;
    
    initCanvas(mockCanvasEl, jest.fn());
    // setSelectedObjectId(null); // Moved to model.js, state handled via drawVTT args
    // setPanZoomState({ panX:0, panY:0, zoom: 1.0}); // Moved to model.js, state handled via drawVTT args

    // Enhance fillText mock for all tests within this describe block
    fillTextCallsWithContext = []; 
    mockCtx.fillText = jest.fn((text, x, y) => {
      fillTextCallsWithContext.push({
        text, x, y,
        font: mockCtx.font,
        fillStyle: mockCtx.fillStyle,
        textAlign: mockCtx.textAlign,
        textBaseline: mockCtx.textBaseline,
      });
    });
  });

  // ... (Existing tests for highlight, etc. would be here) ...

  describe('drawVTT Object Name Rendering', () => {
    // These tests use the fillTextCallsWithContext from the parent describe's beforeEach
    test('should render valid object names with correct style and position, and skip invalid/empty names', () => {
      const objectsMap = new Map();
      const objWithName = { id: 'objWName', name: 'TestName', x: 10, y: 10, width: 100, height: 50, shape: 'rectangle', appearance: {}, zIndex: 1, rotation: 0 };
      const objWithoutNameProp = { id: 'objNoName', x: 10, y: 70, width: 60, height: 60, shape: 'circle', appearance: { text: 'InternalTextOnly', showLabel: true }, zIndex: 2, rotation: 0 }; 
      const objWithEmptyName = { id: 'objEmptyName', name: '', x: 10, y: 130, width: 70, height: 70, shape: 'rectangle', appearance: {}, zIndex: 3, rotation: 0 };
      const objWithWhitespaceName = { id: 'objSpaceName', name: '   ', x: 10, y: 200, width: 80, height: 80, shape: 'circle', appearance: {}, zIndex: 4, rotation: 0 };

      objectsMap.set(objWithName.id, objWithName);
      objectsMap.set(objWithoutNameProp.id, objWithoutNameProp); // This object now also has internal text
      objectsMap.set(objWithEmptyName.id, objWithEmptyName);
      objectsMap.set(objWithWhitespaceName.id, objWithWhitespaceName);
      
      const mockPZS = { panX: 0, panY: 0, zoom: 1.0 };
      const mockTblBg = { type: 'color', value: '#DDDDDD' };
      const mockSelectedId = null;
      const mockBoardProps = { widthUser: 30, heightUser: 20, unitForDimensions: 'in', widthPx: 762, heightPx: 508, scaleRatio: 1, unitForRatio: 'mm' };
      drawVTT(objectsMap, mockPZS, mockTblBg, mockSelectedId, mockBoardProps);

      const nameRenderCall = fillTextCallsWithContext.find(call => call.text === 'TestName');
      expect(nameRenderCall).toBeDefined();
      if (nameRenderCall) {
        expect(nameRenderCall.x).toBe(objWithName.width / 2);
        expect(nameRenderCall.y).toBe(-5); 
        expect(nameRenderCall.font).toBe('12px Arial');
        expect(nameRenderCall.fillStyle).toBe('#000000');
        expect(nameRenderCall.textAlign).toBe('center');
        expect(nameRenderCall.textBaseline).toBe('bottom');
      }
      
      const internalTextRenderCall = fillTextCallsWithContext.find(call => call.text === 'InternalTextOnly');
      expect(internalTextRenderCall).toBeDefined(); // This should be rendered as showLabel is true

      expect(mockCtx.fillText).toHaveBeenCalledTimes(2); // TestName + InternalTextOnly

      fillTextCallsWithContext.forEach(call => {
        if (call.y === -5) { 
          expect(call.text).not.toBe('');
          expect(call.text.trim()).not.toBe(''); 
        }
      });
    });
  });

  describe('drawVTT Internal Label (appearance.text) Rendering', () => {
    // This block also uses the fillTextCallsWithContext from the parent describe's beforeEach
    const defaultObjectProps = { id: 'testObj', x: 10, y: 10, width: 100, height: 50, shape: 'rectangle', zIndex: 0, rotation: 0 };

    test('should NOT render internal label if showLabel is false', () => {
      const objectsMap = new Map([[defaultObjectProps.id, { ...defaultObjectProps, appearance: { text: 'HiddenLabelText', showLabel: false } }]]);
      const mockPZS = { panX: 0, panY: 0, zoom: 1.0 };
      const mockTblBg = { type: 'color', value: '#DDDDDD' };
      const mockBoardProps = { widthUser: 30, heightUser: 20, unitForDimensions: 'in', widthPx: 762, heightPx: 508, scaleRatio: 1, unitForRatio: 'mm' };
      drawVTT(objectsMap, mockPZS, mockTblBg, null, mockBoardProps);
      const labelCall = fillTextCallsWithContext.find(call => call.text === 'HiddenLabelText');
      expect(labelCall).toBeUndefined();
    });

    test('should render internal label if showLabel is true and text is valid', () => {
      const appearance = { text: 'VisibleLabelText', showLabel: true, textColor: '#00FF00', fontSize: 16, fontFamily: 'Verdana' };
      const testObj = { ...defaultObjectProps, appearance };
      const objectsMap = new Map([[testObj.id, testObj]]);
      const mockPZS = { panX: 0, panY: 0, zoom: 1.0 };
      const mockTblBg = { type: 'color', value: '#DDDDDD' };
      const mockBoardProps = { widthUser: 30, heightUser: 20, unitForDimensions: 'in', widthPx: 762, heightPx: 508, scaleRatio: 1, unitForRatio: 'mm' };
      drawVTT(objectsMap, mockPZS, mockTblBg, null, mockBoardProps);

      const labelCall = fillTextCallsWithContext.find(call => call.text === 'VisibleLabelText');
      expect(labelCall).toBeDefined();
      if (labelCall) {
        expect(labelCall.x).toBe(testObj.width / 2);
        expect(labelCall.y).toBe(testObj.height / 2);
        expect(labelCall.font).toBe(`${appearance.fontSize}px ${appearance.fontFamily}`);
        expect(labelCall.fillStyle).toBe(appearance.textColor);
        expect(labelCall.textAlign).toBe('center');
        expect(labelCall.textBaseline).toBe('middle');
      }
    });

    test('should NOT render internal label if text is empty, even if showLabel is true', () => {
      const objectsMap = new Map([[defaultObjectProps.id, { ...defaultObjectProps, appearance: { text: '', showLabel: true } }]]);
      const mockPZS = { panX: 0, panY: 0, zoom: 1.0 };
      const mockTblBg = { type: 'color', value: '#DDDDDD' };
      const mockBoardProps = { widthUser: 30, heightUser: 20, unitForDimensions: 'in', widthPx: 762, heightPx: 508, scaleRatio: 1, unitForRatio: 'mm' };
      drawVTT(objectsMap, mockPZS, mockTblBg, null, mockBoardProps);
      // Check that no fillText call was made for the internal label (y position height/2)
      const internalLabelCall = fillTextCallsWithContext.find(call => call.y === defaultObjectProps.height / 2);
      expect(internalLabelCall).toBeUndefined();
    });

    test('should NOT render internal label if text is only whitespace, even if showLabel is true', () => {
      const objectsMap = new Map([[defaultObjectProps.id, { ...defaultObjectProps, appearance: { text: '   ', showLabel: true } }]]);
      const mockPZS = { panX: 0, panY: 0, zoom: 1.0 };
      const mockTblBg = { type: 'color', value: '#DDDDDD' };
      const mockBoardProps = { widthUser: 30, heightUser: 20, unitForDimensions: 'in', widthPx: 762, heightPx: 508, scaleRatio: 1, unitForRatio: 'mm' };
      drawVTT(objectsMap, mockPZS, mockTblBg, null, mockBoardProps);
      const internalLabelCall = fillTextCallsWithContext.find(call => call.text.trim() === '' && call.y === defaultObjectProps.height / 2);
      expect(internalLabelCall).toBeUndefined(); // No call should have text that's only whitespace for internal label
    });

    test('should render both obj.name and internal label if showLabel is true', () => {
      const objWithBoth = {
        ...defaultObjectProps,
        id: 'objBoth',
        name: 'ObjectName',
        appearance: { text: 'LabelText', showLabel: true, textColor: '#FF0000', fontSize: 10, fontFamily: 'Impact' }
      };
      const objectsMap = new Map([[objWithBoth.id, objWithBoth]]);
      const mockPZS = { panX: 0, panY: 0, zoom: 1.0 };
      const mockTblBg = { type: 'color', value: '#DDDDDD' };
      const mockBoardProps = { widthUser: 30, heightUser: 20, unitForDimensions: 'in', widthPx: 762, heightPx: 508, scaleRatio: 1, unitForRatio: 'mm' };
      drawVTT(objectsMap, mockPZS, mockTblBg, null, mockBoardProps);

      const nameCall = fillTextCallsWithContext.find(call => call.text === 'ObjectName');
      expect(nameCall).toBeDefined();
      if (nameCall) {
        expect(nameCall.y).toBe(-5); // Name position
        expect(nameCall.font).toBe('12px Arial');
        expect(nameCall.fillStyle).toBe('#000000');
      }

      const labelCall = fillTextCallsWithContext.find(call => call.text === 'LabelText');
      expect(labelCall).toBeDefined();
      if (labelCall) {
        expect(labelCall.y).toBe(objWithBoth.height / 2); // Internal label position
        expect(labelCall.font).toBe('10px Impact');
        expect(labelCall.fillStyle).toBe('#FF0000');
      }
      expect(mockCtx.fillText).toHaveBeenCalledTimes(2);
    });

    test('should render only obj.name if showLabel is false for internal label', () => {
      const objNameOnly = {
        ...defaultObjectProps,
        id: 'objNameOnly',
        name: 'ObjectNameOnly',
        appearance: { text: 'ShouldBeHidden', showLabel: false, textColor: '#FF0000' }
      };
      const objectsMap = new Map([[objNameOnly.id, objNameOnly]]);
      const mockPZS = { panX: 0, panY: 0, zoom: 1.0 };
      const mockTblBg = { type: 'color', value: '#DDDDDD' };
      const mockBoardProps = { widthUser: 30, heightUser: 20, unitForDimensions: 'in', widthPx: 762, heightPx: 508, scaleRatio: 1, unitForRatio: 'mm' };
      drawVTT(objectsMap, mockPZS, mockTblBg, null, mockBoardProps);

      const nameCall = fillTextCallsWithContext.find(call => call.text === 'ObjectNameOnly');
      expect(nameCall).toBeDefined();

      const labelCall = fillTextCallsWithContext.find(call => call.text === 'ShouldBeHidden');
      expect(labelCall).toBeUndefined();
      
      expect(mockCtx.fillText).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('getObjectAtPosition Logic', () => {
    let consoleWarnSpy;
    let consoleErrorSpy;
  
    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
  
    afterEach(() => {
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  
    const createObjectsMap = (objectsArray) => {
      const map = new Map();
      objectsArray.forEach(obj => map.set(obj.id, obj));
      return map;
    };
  
    test('Valid Hit: Non-rotated rectangle center', () => {
      const rect = { id: 'rect1', shape: 'rectangle', x: 10, y: 10, width: 100, height: 50, rotation: 0, zIndex: 0 };
      const objectsMap = createObjectsMap([rect]);
      const result = getObjectAtPosition(60, 35, objectsMap); 
      expect(result).toBe('rect1');
    });
  
    // ... (other getObjectAtPosition tests) ...
  });
});
