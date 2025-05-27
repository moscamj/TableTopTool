import {
  createGenericObject,
  getLocalObject,
  clearLocalObjects,
  getAllLocalObjects,
  updateLocalObject, // Added import
  currentObjects, 
} from '../objects.js';

// Helper to validate UUID
const isUUID = (uuid) => {
  const s = "" + uuid;
  const pattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return pattern.test(s);
}

describe('objects.js', () => {
  beforeEach(() => {
    clearLocalObjects();
  });

  describe('createGenericObject', () => {
    test('should create a rectangle with default properties including default name', () => {
      const rect = createGenericObject('rectangle');
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
      const circle = createGenericObject('circle');
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
      const obj1 = createGenericObject('rectangle');
      expect(obj1.name).toBe('Object 1');
      const obj2 = createGenericObject('circle');
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
      const rect = createGenericObject('rectangle', customProps);
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
      const circle = createGenericObject('circle', customProps);
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
      const obj1 = createGenericObject('rectangle');
      const obj2 = createGenericObject('circle');
      expect(obj1.id).not.toBe(obj2.id);
      expect(isUUID(obj1.id)).toBe(true);
      expect(isUUID(obj2.id)).toBe(true);
    });
  });

  describe('getLocalObject and getAllLocalObjects', () => {
    test('getAllLocalObjects should return created objects', () => {
      const rect = createGenericObject('rectangle');
      const circle = createGenericObject('circle');
      const allObjects = getAllLocalObjects();
      expect(allObjects).toHaveLength(2);
      // Check if the objects are in the array (order might not be guaranteed)
      expect(allObjects.some(obj => obj.id === rect.id)).toBe(true);
      expect(allObjects.some(obj => obj.id === circle.id)).toBe(true);
    });

    test('getLocalObject should return the correct object by ID', () => {
      const rectProps = { name: 'TestRect' };
      const rect = createGenericObject('rectangle', rectProps);
      const retrievedRect = getLocalObject(rect.id);
      expect(retrievedRect).toEqual(expect.objectContaining(rectProps));
      expect(retrievedRect.id).toBe(rect.id);
    });

    test('getLocalObject should return undefined for a non-existent ID', () => {
      createGenericObject('rectangle'); // Create one to make sure store is not empty
      const retrieved = getLocalObject('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    test('getAllLocalObjects should return an empty array after clearLocalObjects', () => {
      createGenericObject('rectangle');
      clearLocalObjects();
      expect(getAllLocalObjects()).toEqual([]);
      expect(getAllLocalObjects().length).toBe(0); // Check via public API
    });
  });

  // New describe block for updateLocalObject
  describe('updateLocalObject', () => {
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
      const obj = createGenericObject('rectangle', initialProps);
      testObjId = obj.id;
    });

    test('should update only the name', () => {
      updateLocalObject(testObjId, { name: 'NewName' });
      const updated = getLocalObject(testObjId);
      expect(updated.name).toBe('NewName');
      expect(updated.x).toBe(initialProps.x);
      expect(updated.y).toBe(initialProps.y);
      expect(updated.width).toBe(initialProps.width);
      expect(updated.height).toBe(initialProps.height);
      expect(updated.appearance).toEqual(initialProps.appearance);
      expect(updated.zIndex).toBe(initialProps.zIndex);
    });

    test('should update only width and height', () => {
      updateLocalObject(testObjId, { width: 150, height: 75 });
      const updated = getLocalObject(testObjId);
      expect(updated.width).toBe(150);
      expect(updated.height).toBe(75);
      expect(updated.name).toBe(initialProps.name);
      expect(updated.x).toBe(initialProps.x);
      expect(updated.appearance).toEqual(initialProps.appearance);
    });

    test('should update name, width, and height simultaneously', () => {
      updateLocalObject(testObjId, { name: 'SimulName', width: 200, height: 120 });
      const updated = getLocalObject(testObjId);
      expect(updated.name).toBe('SimulName');
      expect(updated.width).toBe(200);
      expect(updated.height).toBe(120);
      expect(updated.x).toBe(initialProps.x);
    });

    test('should store 0, negative, or NaN dimensions if provided', () => {
      updateLocalObject(testObjId, { width: 0, height: -10 });
      let updated = getLocalObject(testObjId);
      expect(updated.width).toBe(0);
      expect(updated.height).toBe(-10);

      updateLocalObject(testObjId, { width: NaN });
      updated = getLocalObject(testObjId);
      expect(updated.width).toBeNaN(); // NaN is stored as is
    });
    
    test('should update other properties (x, y, appearance) along with name, width, or height', () => {
      const newAppearance = { backgroundColor: 'blue', text: 'World' };
      updateLocalObject(testObjId, {
        name: 'ComplexUpdate',
        width: 250,
        x: 100,
        appearance: newAppearance
      });
      const updated = getLocalObject(testObjId);
      expect(updated.name).toBe('ComplexUpdate');
      expect(updated.width).toBe(250);
      expect(updated.height).toBe(initialProps.height); // Height should remain unchanged
      expect(updated.x).toBe(100);
      expect(updated.y).toBe(initialProps.y); // Y should remain unchanged
      expect(updated.appearance).toEqual(newAppearance);
    });

    test('should deeply merge appearance properties', () => {
      updateLocalObject(testObjId, { appearance: { text: 'Updated Text' } });
      const updated = getLocalObject(testObjId);
      // Check that the original backgroundColor is preserved and text is updated.
      expect(updated.appearance.backgroundColor).toBe(initialProps.appearance.backgroundColor);
      expect(updated.appearance.text).toBe('Updated Text');
    });

    test('should not update if ID does not exist, and return undefined', () => {
      const result = updateLocalObject('non-existent-id', { name: 'Ghost' });
      expect(result).toBeUndefined();
      const originalObject = getLocalObject(testObjId); // Check original object is unchanged
      expect(originalObject.name).toBe(initialProps.name);
    });
  });
});
