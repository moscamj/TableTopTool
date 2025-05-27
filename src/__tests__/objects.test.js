import {
  createGenericObject,
  getLocalObject,
  clearLocalObjects,
  getAllLocalObjects,
  currentObjects, // Import for direct inspection if necessary
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
    test('should create a rectangle with default properties', () => {
      const rect = createGenericObject('rectangle');
      expect(rect.shape).toBe('rectangle');
      expect(rect.x).toBe(50); // Default x
      expect(rect.y).toBe(50); // Default y
      expect(rect.width).toBe(100); // Default width for rectangle
      expect(rect.height).toBe(100); // Default height for rectangle
      expect(rect.appearance.backgroundColor).toBe('#CCCCCC'); // Default color
      expect(isUUID(rect.id)).toBe(true);
    });

    test('should create a circle with default properties', () => {
      const circle = createGenericObject('circle');
      expect(circle.shape).toBe('circle');
      expect(circle.x).toBe(50); // Default x
      expect(circle.y).toBe(50); // Default y
      expect(circle.width).toBe(50); // Default width/diameter for circle
      expect(circle.height).toBe(50); // Default height/diameter for circle
      expect(circle.appearance.backgroundColor).toBe('#CCCCCC');
      expect(isUUID(circle.id)).toBe(true);
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
});
