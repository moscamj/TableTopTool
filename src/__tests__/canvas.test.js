// src/__tests__/canvas.test.js
import {
  initCanvas,
  drawVTT,
  setSelectedObjectId,
  getSelectedObjectId,
  setPanZoomState, // Import if needed to set zoom for lineWidth calculation
  // getPanZoomState, // Not strictly needed if we pass PZS to drawVTT directly
} from '../canvas.js';

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
  // Mock measureText for text rendering if any object has text
  measureText: jest.fn(() => ({ width: 50 })),
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

describe('Canvas drawVTT Highlight Logic', () => {
  beforeEach(() => {
    // Reset all mock functions and properties on mockCtx
    jest.clearAllMocks(); // Clears call counts and recorded calls for ALL mocks

    // Reset properties on mockCtx
    mockCtx.fillStyle = '';
    mockCtx.strokeStyle = '';
    mockCtx.lineWidth = 0;
    mockCtx.font = '';
    mockCtx.textAlign = '';
    mockCtx.textBaseline = '';

    // Initialize the canvas module with the mock canvas and a dummy redraw callback
    initCanvas(mockCanvasEl, jest.fn());
    // Explicitly reset selectedObjectId in the module before each test
    setSelectedObjectId(null);
    // Reset panZoomState to default for predictable lineWidth calculation
    setPanZoomState({ panX:0, panY:0, zoom: 1.0});
  });

  const testObjRect = {
    id: 'obj1',
    x: 50,
    y: 50,
    width: 100,
    height: 50,
    shape: 'rectangle',
    appearance: { borderWidth: 1, borderColor: '#000000', backgroundColor: '#DDDDDD' },
    rotation: 0,
    zIndex: 0,
  };

  const testObjCircle = {
    id: 'obj2',
    x: 200,
    y: 50,
    width: 80, // diameter
    height: 80, // diameter
    shape: 'circle',
    appearance: { borderWidth: 2, borderColor: '#111111', backgroundColor: '#EEEEEE' },
    rotation: 0,
    zIndex: 1,
  };


  const pzsDefault = { panX: 0, panY: 0, zoom: 1.0 };
  const bgDefault = { type: 'color', value: '#FFFFFF' };

  test('Test Case 1: Highlight is drawn for a selected RECTANGULAR object', () => {
    // Arrange
    const objectsToDraw = new Map([[testObjRect.id, testObjRect]]);
    setSelectedObjectId(testObjRect.id); // Mark object as selected in canvas module

    // Act
    drawVTT(objectsToDraw, pzsDefault, bgDefault, testObjRect.id);

    // Assert
    // 1. Object's own fill and border
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(1); // For background and 1 for object
    expect(mockCtx.fillRect).toHaveBeenLastCalledWith(0, 0, testObjRect.width, testObjRect.height);
    expect(mockCtx.strokeStyle).toBe(testObjRect.appearance.borderColor); // Set for border
    expect(mockCtx.lineWidth).toBe(testObjRect.appearance.borderWidth);   // Set for border
    expect(mockCtx.strokeRect).toHaveBeenCalledTimes(2); // Once for border, once for highlight
    expect(mockCtx.strokeRect).toHaveBeenNthCalledWith(1, 0, 0, testObjRect.width, testObjRect.height);


    // 2. Highlight properties and call
    // The state of ctx *after* object drawing but *before* highlight drawing
    // The mock framework captures arguments at call time. We look at the calls.
    // The last call to strokeStyle and lineWidth before the *second* strokeRect should be for the highlight.

    // To check this precisely, we can look at the sequence of calls or the arguments to the calls.
    // The drawVTT function sets these properties then calls strokeRect.
    // So, the properties for the highlight are set right before the *last* strokeRect call.
    
    // Find the properties set for the highlight strokeRect call.
    // The actual implementation sets strokeStyle, then lineWidth, then calls strokeRect.
    // So, the values of mockCtx.strokeStyle and mockCtx.lineWidth *at the time of the second call* are what we need.
    // Jest's toHaveBeenLastCalledWith or toHaveBeenNthCalledWith checks args, not context state over time.
    // A more robust way for this mock structure is to check the properties *were set to* the highlight values
    // and *then* strokeRect was called again.

    // The last `strokeStyle` assignment before the final `strokeRect` should be the highlight.
    // The last `lineWidth` assignment before the final `strokeRect` should be the highlight.
    // This is tricky with simple jest.fn() for property setters.
    // A more direct check: query the calls to the property setters if they were spies,
    // or check the state of the mockCtx *properties* which get updated by the function.

    // After all drawing operations for the object are done, and before restoring context,
    // these properties should be set for the highlight.
    // In drawVTT, the order is roughly:
    // ... draw object body ...
    // ... draw object border ...
    // IF selected:
    //   ctx.strokeStyle = highlight_color;
    //   ctx.lineWidth = highlight_width;
    //   ctx.strokeRect(...highlight_dims...);
    // ctx.restore()

    // So, the values of these properties on mockCtx when the *last* strokeRect was called should be the highlight ones.
    // We can infer this by checking the *final values* that were assigned to these properties
    // that were then *used* by the final strokeRect.
    // The test structure implies mockCtx properties are updated by the function being tested.

    const highlightStrokeStyle = 'rgba(0, 150, 255, 0.9)';
    const expectedHighlightLineWidth = Math.max(0.5, Math.min(4, 2 / pzsDefault.zoom));
    
    // Check the arguments of the second (highlight) strokeRect call
    const highlightCallArgs = mockCtx.strokeRect.mock.calls[1];
    // Example: const offset = testObjRect.appearance.borderWidth / 2 + expectedHighlightLineWidth / 2;
    // expect(highlightCallArgs[0]).toBeCloseTo(-offset); // etc. for x,y,w,h

    // More simply, verify the properties were set to highlight values before a strokeRect
    // This requires knowing the sequence or trusting the mockCtx properties reflect the "current" state.
    // Given our mockCtx, its properties are updated. So, after drawVTT, if highlight was drawn,
    // those properties should reflect the *last values set for the highlight*.
    expect(mockCtx.strokeStyle).toEqual(highlightStrokeStyle); // Check the final value after all ops for this obj
    expect(mockCtx.lineWidth).toEqual(expectedHighlightLineWidth); // Check the final value

    // And that the second call to strokeRect occurred
    expect(mockCtx.strokeRect).toHaveBeenCalledTimes(2);
    const offset = testObjRect.appearance.borderWidth / 2 + expectedHighlightLineWidth / 2;
    expect(mockCtx.strokeRect).toHaveBeenLastCalledWith(
        -offset,
        -offset,
        testObjRect.width + 2 * offset,
        testObjRect.height + 2 * offset
    );
  });
  
  test('Test Case 1b: Highlight is drawn for a selected CIRCULAR object', () => {
    // Arrange
    const objectsToDraw = new Map([[testObjCircle.id, testObjCircle]]);
    setSelectedObjectId(testObjCircle.id);

    // Act
    drawVTT(objectsToDraw, pzsDefault, bgDefault, testObjCircle.id);
    
    // Assert
    // Circle drawing involves beginPath, arc, fill, and then for border: beginPath, arc, stroke
    expect(mockCtx.fill).toHaveBeenCalledTimes(1); // Circle fill
    expect(mockCtx.stroke).toHaveBeenCalledTimes(1); // Circle border

    // Highlight for circle also uses strokeRect around it.
    const highlightStrokeStyle = 'rgba(0, 150, 255, 0.9)';
    const expectedHighlightLineWidth = Math.max(0.5, Math.min(4, 2 / pzsDefault.zoom));

    expect(mockCtx.strokeStyle).toEqual(highlightStrokeStyle);
    expect(mockCtx.lineWidth).toEqual(expectedHighlightLineWidth);
    expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1); // Only one strokeRect for circle highlight

    const offset = testObjCircle.appearance.borderWidth / 2 + expectedHighlightLineWidth / 2;
    expect(mockCtx.strokeRect).toHaveBeenLastCalledWith(
        -offset,
        -offset,
        testObjCircle.width + 2 * offset, // Using width for circle highlight box
        testObjCircle.height + 2 * offset // Using height for circle highlight box
    );
  });


  test('Test Case 2: Highlight is NOT drawn for a non-selected RECTANGULAR object', () => {
    // Arrange
    const objectsToDraw = new Map([[testObjRect.id, testObjRect]]);
    setSelectedObjectId('someOtherObjId'); // Object is not selected

    // Act
    drawVTT(objectsToDraw, pzsDefault, bgDefault, 'someOtherObjId');

    // Assert
    // 1. Object's own fill and border
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(1); // Background + 1 for object
    expect(mockCtx.fillRect).toHaveBeenLastCalledWith(0, 0, testObjRect.width, testObjRect.height);
    
    // Check properties for the object's own border
    expect(mockCtx.strokeStyle).toBe(testObjRect.appearance.borderColor);
    expect(mockCtx.lineWidth).toBe(testObjRect.appearance.borderWidth);
    expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1); // Only for its own border
    expect(mockCtx.strokeRect).toHaveBeenLastCalledWith(0, 0, testObjRect.width, testObjRect.height);

    // 2. No highlight properties or call
    // Ensure strokeStyle was not changed to highlight color *after* the initial border was drawn,
    // and no second strokeRect call was made for this object.
    // The final values of strokeStyle and lineWidth should be those of the object's own border.
    // (This holds true because there's only one object being drawn)
    // If there were multiple objects, this check would be more complex.
    // For a single object, if highlight is NOT drawn, the last style set is for its own border.
    expect(mockCtx.strokeStyle).toEqual(testObjRect.appearance.borderColor);
    expect(mockCtx.lineWidth).toEqual(testObjRect.appearance.borderWidth);
  });

  test('Test Case 2b: Highlight is NOT drawn for a non-selected CIRCULAR object', () => {
    // Arrange
    const objectsToDraw = new Map([[testObjCircle.id, testObjCircle]]);
    setSelectedObjectId(null); // Object is not selected

    // Act
    drawVTT(objectsToDraw, pzsDefault, bgDefault, null);

    // Assert
    expect(mockCtx.fill).toHaveBeenCalledTimes(1);
    expect(mockCtx.stroke).toHaveBeenCalledTimes(1); // Only for its own border

    // Ensure no strokeRect was called (as it's only used for highlight for circles)
    expect(mockCtx.strokeRect).not.toHaveBeenCalled();

    // The final values of strokeStyle and lineWidth should be those of the object's own border.
    expect(mockCtx.strokeStyle).toEqual(testObjCircle.appearance.borderColor);
    expect(mockCtx.lineWidth).toEqual(testObjCircle.appearance.borderWidth);
  });

  test('Highlight lineWidth adjusts with zoom', () => {
    // Arrange
    const objectsToDraw = new Map([[testObjRect.id, testObjRect]]);
    setSelectedObjectId(testObjRect.id);
    const zoomedPzs = { panX: 0, panY: 0, zoom: 2.0 };
    setPanZoomState(zoomedPzs); // Update the module's PZS state

    // Act
    drawVTT(objectsToDraw, zoomedPzs, bgDefault, testObjRect.id);

    // Assert
    const expectedHighlightLineWidth = Math.max(0.5, Math.min(4, 2 / zoomedPzs.zoom)); // Recalculate for zoom = 2.0
    expect(mockCtx.lineWidth).toEqual(expectedHighlightLineWidth); // Check the final lineWidth for highlight
    expect(mockCtx.strokeRect).toHaveBeenCalledTimes(2); // Border + Highlight
  });

  test('Object with no border, when selected, still gets a highlight', () => {
    // Arrange
    const noBorderObj = { 
        ...testObjRect, 
        id: 'objNoBorder', 
        appearance: { ...testObjRect.appearance, borderWidth: 0 } 
    };
    const objectsToDraw = new Map([[noBorderObj.id, noBorderObj]]);
    setSelectedObjectId(noBorderObj.id);

    // Act
    drawVTT(objectsToDraw, pzsDefault, bgDefault, noBorderObj.id);

    // Assert
    // Object's own fill
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(1); // Background and 1 for object
    // No border strokeRect for the object itself
    expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1); // Only for the highlight

    // Highlight properties and call
    const highlightStrokeStyle = 'rgba(0, 150, 255, 0.9)';
    const expectedHighlightLineWidth = Math.max(0.5, Math.min(4, 2 / pzsDefault.zoom));
    
    expect(mockCtx.strokeStyle).toEqual(highlightStrokeStyle);
    expect(mockCtx.lineWidth).toEqual(expectedHighlightLineWidth);

    const offset = 0 / 2 + expectedHighlightLineWidth / 2; // borderWidth is 0
    expect(mockCtx.strokeRect).toHaveBeenLastCalledWith(
        -offset,
        -offset,
        noBorderObj.width + 2 * offset,
        noBorderObj.height + 2 * offset
    );
  });
});

// --- Tests for getObjectAtPosition ---
describe('getObjectAtPosition Logic', () => {
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Suppress console output for these tests and spy on calls
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // No canvas.js internal state needs resetting for getObjectAtPosition usually,
    // as it's a pure function with respect to canvas module state.
  });

  afterEach(() => {
    // Restore console functions
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Helper to create an objectsMap
  const createObjectsMap = (objectsArray) => {
    const map = new Map();
    objectsArray.forEach(obj => map.set(obj.id, obj));
    return map;
  };

  // 1. Valid Hits
  test('Valid Hit: Non-rotated rectangle center', () => {
    const rect = { id: 'rect1', shape: 'rectangle', x: 10, y: 10, width: 100, height: 50, rotation: 0, zIndex: 0 };
    const objectsMap = createObjectsMap([rect]);
    const result = getObjectAtPosition(60, 35, objectsMap); // Center: 10+100/2=60, 10+50/2=35
    expect(result).toBe('rect1');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('Valid Hit: Rotated rectangle (45deg) - hitting original center', () => {
    // For a rectangle 100x100 at (0,0) rotated 45deg, its original center (50,50) is still the point of rotation.
    // The new getObjectAtPosition logic transforms the click point, not the object.
    // So, clicking the world-space (50,50) should still be a hit if it's the center of rotation.
    const rect = { id: 'rectR', shape: 'rectangle', x: 0, y: 0, width: 100, height: 100, rotation: 45, zIndex: 0 };
    const objectsMap = createObjectsMap([rect]);
    // Center of the rectangle is (0 + 100/2, 0 + 100/2) = (50, 50)
    // This point remains the center of the object's bounding box for hit detection after rotation.
    const result = getObjectAtPosition(50, 50, objectsMap);
    expect(result).toBe('rectR');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
  
  test('Valid Hit: Rotated rectangle (90deg) - hitting a known internal point', () => {
    // Rectangle at (10,10), size 100x50, rotated 90 degrees.
    // Original corners: (10,10), (110,10), (10,60), (110,60)
    // Center of rotation: (10+50, 10+25) = (60, 35)
    // After 90deg rotation, it effectively becomes a 50x100 rectangle.
    // Its new world-space bounding box would be tricky to calculate by hand quickly,
    // but a click on its center of rotation (60,35) should always be a hit.
    const rect = { id: 'rectR90', shape: 'rectangle', x: 10, y: 10, width: 100, height: 50, rotation: 90, zIndex: 0 };
    const objectsMap = createObjectsMap([rect]);
    const result = getObjectAtPosition(60, 35, objectsMap); // Click its center of rotation
    expect(result).toBe('rectR90');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });


  test('Valid Hit: Circle center', () => {
    const circ = { id: 'circ1', shape: 'circle', x: 10, y: 10, width: 50, height: 50, rotation: 0, zIndex: 0 }; // width/height is diameter
    const objectsMap = createObjectsMap([circ]);
    const result = getObjectAtPosition(35, 35, objectsMap); // Center: 10+50/4=22.5 (radius) -> 10+25 = 35
    expect(result).toBe('circ1');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test('Valid Hit: Overlapping objects, higher zIndex wins', () => {
    const rectLowZ = { id: 'rectLow', shape: 'rectangle', x: 10, y: 10, width: 100, height: 50, rotation: 0, zIndex: 0 };
    const rectHighZ = { id: 'rectHigh', shape: 'rectangle', x: 15, y: 15, width: 100, height: 50, rotation: 0, zIndex: 1 };
    const objectsMap = createObjectsMap([rectLowZ, rectHighZ]);
    const result = getObjectAtPosition(60, 35, objectsMap); // Point within both, e.g., center of rectLowZ
    expect(result).toBe('rectHigh');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  // 2. Misses
  test('Miss: Clicking far from any object', () => {
    const rect = { id: 'rect1', shape: 'rectangle', x: 10, y: 10, width: 100, height: 50, rotation: 0, zIndex: 0 };
    const objectsMap = createObjectsMap([rect]);
    const result = getObjectAtPosition(500, 500, objectsMap);
    expect(result).toBeNull();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  // 3. Input Validation Tests
  test('Input Validation: worldX is NaN', () => {
    const objectsMap = createObjectsMap([]);
    const result = getObjectAtPosition(NaN, 10, objectsMap);
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid worldX or worldY input'), expect.anything());
  });

  test('Input Validation: worldY is NaN', () => {
    const objectsMap = createObjectsMap([]);
    const result = getObjectAtPosition(10, NaN, objectsMap);
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid worldX or worldY input'), expect.anything());
  });

  test('Input Validation: objectsMap is null', () => {
    const result = getObjectAtPosition(10, 10, null);
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('objectsMap is not a Map'), null);
  });
  
  test('Input Validation: objectsMap is an array', () => {
    const result = getObjectAtPosition(10, 10, []);
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('objectsMap is not a Map'), []);
  });

  // 4. Object Property Validation Tests
  test('Object Validation: x is NaN', () => {
    const badRect = { id: 'badRect', shape: 'rectangle', x: NaN, y: 10, width: 100, height: 50, rotation: 0, zIndex: 0 };
    const objectsMap = createObjectsMap([badRect]);
    const result = getObjectAtPosition(60, 35, objectsMap); // Try to click where center would be if x=10
    expect(result).toBeNull(); // Should be skipped
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid x,y,width,or height'), expect.anything());
  });

  test('Object Validation: width is 0', () => {
    const badRect = { id: 'badRectW0', shape: 'rectangle', x: 10, y: 10, width: 0, height: 50, rotation: 0, zIndex: 0 };
    const objectsMap = createObjectsMap([badRect]);
    const result = getObjectAtPosition(10, 35, objectsMap);
    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('non-positive width or height'), expect.anything());
  });

  test('Object Validation: height is -10', () => {
    const badRect = { id: 'badRectHNeg', shape: 'rectangle', x: 10, y: 10, width: 50, height: -10, rotation: 0, zIndex: 0 };
    const objectsMap = createObjectsMap([badRect]);
    const result = getObjectAtPosition(35, 10, objectsMap);
    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('non-positive width or height'), expect.anything());
  });
  
  test('Object Validation: rotation is NaN (should default to 0 and find object)', () => {
    const rectRotNaN = { id: 'rectRotNaN', shape: 'rectangle', x: 10, y: 10, width: 100, height: 50, rotation: NaN, zIndex: 0 };
    const objectsMap = createObjectsMap([rectRotNaN]);
    // Click its center, assuming rotation defaults to 0 for hit detection
    const result = getObjectAtPosition(60, 35, objectsMap);
    expect(result).toBe('rectRotNaN'); // Found because rotation defaults to 0
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('has NaN rotation. Defaulting to 0'), expect.anything());
  });

  test('Object Validation: Invalid item (null) in objectsMap values', () => {
    const validRect = { id: 'valid', shape: 'rectangle', x: 10, y: 10, width: 20, height: 20, rotation: 0, zIndex: 0 };
    const mapWithInvalid = new Map([
        ['valid', validRect],
        ['invalidKey', null]
    ]);
    // Click on the valid rectangle
    const result = getObjectAtPosition(15, 15, mapWithInvalid);
    expect(result).toBe('valid'); // Should still find the valid one
    // A warning should be logged for the null object when iterating
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Encountered invalid object in sortedObjects'), null);
  });
  
   test('Object Validation: Item in objectsMap is not an object (string)', () => {
    const mapWithInvalid = new Map([
        ['invalidKey', "i-am-a-string"]
    ]);
    const result = getObjectAtPosition(15, 15, mapWithInvalid);
    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Encountered invalid object in sortedObjects'), "i-am-a-string");
  });

  test('Object with valid string numbers for dimensions/position', () => {
    const rectStr = { id: 'rectStr', shape: 'rectangle', x: "10", y: "10", width: "100", height: "50", rotation: "0", zIndex: 0 };
    const objectsMap = createObjectsMap([rectStr]);
    const result = getObjectAtPosition(60, 35, objectsMap);
    expect(result).toBe('rectStr');
    expect(consoleWarnSpy).not.toHaveBeenCalled(); // parseFloat should handle these
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
