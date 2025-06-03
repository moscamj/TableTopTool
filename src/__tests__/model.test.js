import {
  createObject,
  getObject,
  clearAllObjects,
  getAllObjects,
  updateObject, // Added import
  currentObjects, 
} from '../model.js';

// Helper to validate UUID
const isUUID = (uuid) => {
  const s = "" + uuid;
  const pattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return pattern.test(s);
}

describe('model.js', () => {
  beforeEach(() => {
    clearAllObjects();
  });

  describe('createObject', () => {
    test('should create a rectangle with default properties including default name', () => {
      const rect = createObject('rectangle');
      expect(rect.shape).toBe('rectangle');
      expect(rect.x).toBe(50); // Default x
      expect(rect.y).toBe(50); // Default y
      expect(rect.width).toBe(100); // Default width for rectangle
      expect(rect.height).toBe(100); // Default height for rectangle
      expect(rect.appearance.backgroundColor).toBe('#CCCCCC'); // Default color
      expect(isUUID(rect.id)).toBe(true);
      expect(rect.name).toBe(`Object ${currentObjects.size}`);
    });

    test('should create a circle with default properties including default name', () => {
      const circle = createObject('circle');
      expect(circle.shape).toBe('circle');
      expect(circle.x).toBe(50); // Default x
      expect(circle.y).toBe(50); // Default y
      expect(circle.width).toBe(50); // Default width/diameter for circle
      expect(circle.height).toBe(50); // Default height/diameter for circle
      expect(circle.appearance.backgroundColor).toBe('#CCCCCC');
      expect(isUUID(circle.id)).toBe(true);
      expect(circle.name).toBe(`Object ${currentObjects.size}`);
    });
    
    test('should correctly assign default names sequentially', () => {
      const obj1 = createObject('rectangle');
      expect(obj1.name).toBe('Object 1');
      const obj2 = createObject('circle');
      expect(obj2.name).toBe('Object 2');
    });

    test('should create a rectangle with custom initial properties', () => {
      const customProps = {
        x: 10,
        y: 20,
        width: 150,
        height: 75,
        appearance: { backgroundColor: '#FF0000' },
        name: 'CustomRect',
      };
      const rect = createObject('rectangle', customProps);
      expect(rect.shape).toBe('rectangle');
      expect(rect.x).toBe(10);
      expect(rect.y).toBe(20);
      expect(rect.width).toBe(150);
      expect(rect.height).toBe(75);
      expect(rect.appearance.backgroundColor).toBe('#FF0000');
      expect(rect.name).toBe('CustomRect');
      expect(isUUID(rect.id)).toBe(true);
    });

    test('should create a circle with custom initial properties', () => {
      const customProps = {
        x: 30,
        y: 40,
        width: 60, // Diameter
        height: 60, // Diameter
        appearance: { backgroundColor: '#00FF00' },
        name: 'CustomCircle',
      };
      const circle = createObject('circle', customProps);
      expect(circle.shape).toBe('circle');
      expect(circle.x).toBe(30);
      expect(circle.y).toBe(40);
      expect(circle.width).toBe(60);
      expect(circle.height).toBe(60);
      expect(circle.appearance.backgroundColor).toBe('#00FF00');
      expect(circle.name).toBe('CustomCircle');
      expect(isUUID(circle.id)).toBe(true);
    });

    test('two objects created consecutively should have different IDs', () => {
      const obj1 = createObject('rectangle');
      const obj2 = createObject('circle');
      expect(obj1.id).not.toBe(obj2.id);
      expect(isUUID(obj1.id)).toBe(true);
      expect(isUUID(obj2.id)).toBe(true);
    });
  });

  describe('getObject and getAllObjects', () => {
    test('getAllObjects should return created objects', () => {
      const rect = createObject('rectangle');
      const circle = createObject('circle');
      const allObjects = getAllObjects();
      expect(allObjects).toHaveLength(2);
      // Check if the objects are in the array (order might not be guaranteed)
      expect(allObjects.some(obj => obj.id === rect.id)).toBe(true);
      expect(allObjects.some(obj => obj.id === circle.id)).toBe(true);
    });

    test('getObject should return the correct object by ID', () => {
      const rectProps = { name: 'TestRect' };
      const rect = createObject('rectangle', rectProps);
      const retrievedRect = getObject(rect.id);
      expect(retrievedRect).toEqual(expect.objectContaining(rectProps));
      expect(retrievedRect.id).toBe(rect.id);
    });

    test('getObject should return undefined for a non-existent ID', () => {
      createObject('rectangle'); // Create one to make sure store is not empty
      const retrieved = getObject('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    test('getAllObjects should return an empty array after clearAllObjects', () => {
      createObject('rectangle');
      clearAllObjects();
      expect(getAllObjects()).toEqual([]);
      expect(getAllObjects().length).toBe(0); // Check via public API
    });
  });

  // New describe block for updateObject
  describe('updateObject', () => {
    let testObjId;
    const initialProps = {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      name: 'InitialName',
      appearance: { backgroundColor: 'red', text: 'Hello' },
      zIndex: 1,
      isMovable: true,
      shape: 'rectangle',
      scripts: { onClick: 'console.log("clicked")'},
      data: { custom: 'value' }
    };

    beforeEach(() => {
      const obj = createObject('rectangle', initialProps);
      testObjId = obj.id;
    });

    test('should update only the name', () => {
      updateObject(testObjId, { name: 'NewName' });
      const updated = getObject(testObjId);
      expect(updated.name).toBe('NewName');
      expect(updated.x).toBe(initialProps.x);
      expect(updated.y).toBe(initialProps.y);
      expect(updated.width).toBe(initialProps.width);
      expect(updated.height).toBe(initialProps.height);
      // Check initialProps.appearance values
      expect(updated.appearance.backgroundColor).toBe(initialProps.appearance.backgroundColor); // 'red'
      expect(updated.appearance.text).toBe(initialProps.appearance.text); // 'Hello'
      // Check default appearance values for other properties
      expect(updated.appearance.borderColor).toBe('#333333');
      expect(updated.appearance.borderWidth).toBe(1);
      expect(updated.appearance.textColor).toBe('#000000');
      expect(updated.appearance.fontFamily).toBe('Arial');
      expect(updated.appearance.fontSize).toBe(14);
      expect(updated.appearance.showLabel).toBe(false);
      expect(updated.zIndex).toBe(initialProps.zIndex);
    });

    test('should update only width and height', () => {
      updateObject(testObjId, { width: 150, height: 75 });
      const updated = getObject(testObjId);
      expect(updated.width).toBe(150);
      expect(updated.height).toBe(75);
      expect(updated.name).toBe(initialProps.name);
      expect(updated.x).toBe(initialProps.x);
      // Check initialProps.appearance values
      expect(updated.appearance.backgroundColor).toBe(initialProps.appearance.backgroundColor); // 'red'
      expect(updated.appearance.text).toBe(initialProps.appearance.text); // 'Hello'
      // Check default appearance values for other properties
      expect(updated.appearance.borderColor).toBe('#333333');
      expect(updated.appearance.borderWidth).toBe(1);
      expect(updated.appearance.textColor).toBe('#000000');
      expect(updated.appearance.fontFamily).toBe('Arial');
      expect(updated.appearance.fontSize).toBe(14);
      expect(updated.appearance.showLabel).toBe(false);
    });

    test('should update name, width, and height simultaneously', () => {
      updateObject(testObjId, { name: 'SimulName', width: 200, height: 120 });
      const updated = getObject(testObjId);
      expect(updated.name).toBe('SimulName');
      expect(updated.width).toBe(200);
      expect(updated.height).toBe(120);
      expect(updated.x).toBe(initialProps.x);
    });

    test('should store 0, negative, or NaN dimensions if provided', () => {
      updateObject(testObjId, { width: 0, height: -10 });
      let updated = getObject(testObjId);
      expect(updated.width).toBe(0);
      expect(updated.height).toBe(-10);

      updateObject(testObjId, { width: NaN });
      updated = getObject(testObjId);
      expect(updated.width).toBeNaN(); // NaN is stored as is
    });
    
    test('should update other properties (x, y, appearance) along with name, width, or height', () => {
      const newAppearanceProps = { backgroundColor: 'blue', text: 'World' };
      updateObject(testObjId, {
        name: 'ComplexUpdate',
        width: 250,
        x: 100,
        appearance: newAppearanceProps
      });
      const updated = getObject(testObjId);
      expect(updated.name).toBe('ComplexUpdate');
      expect(updated.width).toBe(250);
      expect(updated.height).toBe(initialProps.height); // Height should remain unchanged
      expect(updated.x).toBe(100);
      expect(updated.y).toBe(initialProps.y); // Y should remain unchanged
      // Check updated appearance properties
      expect(updated.appearance.backgroundColor).toBe(newAppearanceProps.backgroundColor); // 'blue'
      expect(updated.appearance.text).toBe(newAppearanceProps.text); // 'World'
      // Check that other appearance properties retain their values from the existing object's appearance (which includes defaults)
      expect(updated.appearance.borderColor).toBe('#333333'); // Default, as initialProps.appearance didn't define it
      expect(updated.appearance.borderWidth).toBe(1); // Default
      expect(updated.appearance.textColor).toBe('#000000'); // Default
      expect(updated.appearance.fontFamily).toBe('Arial'); // Default
      expect(updated.appearance.fontSize).toBe(14); // Default
      expect(updated.appearance.showLabel).toBe(false); // Default
    });

    test('should deeply merge appearance properties', () => {
      updateObject(testObjId, { appearance: { text: 'Updated Text' } });
      const updated = getObject(testObjId);
      // Check that the original backgroundColor is preserved and text is updated.
      expect(updated.appearance.backgroundColor).toBe(initialProps.appearance.backgroundColor); // 'red'
      expect(updated.appearance.text).toBe('Updated Text');
      // Check that other appearance properties still hold their default values (or initial if they were set)
      expect(updated.appearance.borderColor).toBe('#333333');
      expect(updated.appearance.borderWidth).toBe(1);
      expect(updated.appearance.textColor).toBe('#000000');
      expect(updated.appearance.fontFamily).toBe('Arial');
      expect(updated.appearance.fontSize).toBe(14);
      expect(updated.appearance.showLabel).toBe(false);
    });

    test('should not update if ID does not exist, and return undefined', () => {
      const result = updateObject('non-existent-id', { name: 'Ghost' });
      expect(result).toBeNull(); // In model.js, updateObject returns null for non-existent ID
      const originalObject = getObject(testObjId); // Check original object is unchanged
      expect(originalObject.name).toBe(initialProps.name);
    });
  });
});
