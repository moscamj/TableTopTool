// src/model/Board.js
import debug from "debug";

const dBoard = debug("app:model:Board");

/**
 * @const {Object<string, number>} MM_PER_UNIT
 * Conversion factors from various units to millimeters.
 * Used for calculating board dimensions in a consistent internal unit (mm, interpreted as pixels for rendering at 1:1).
 */
export const MM_PER_UNIT = {
  in: 25.4, // Inches to millimeters
  ft: 304.8, // Feet to millimeters
  m: 1000,
  cm: 10, // Centimeters to millimeters
  mm: 1, // Millimeters to millimeters
};

class Board {
  /** @type {{panX: number, panY: number, zoom: number}} Current pan and zoom state of the canvas. */
  panZoomState;
  /** @type {{type: 'color' | 'image', value: string}} Current table background configuration. */
  tableBackground;
  /**
   * @type {{widthUser: number, heightUser: number, unitForDimensions: string, widthPx: number, heightPx: number}}
   * Physical dimensions of the board.
   */
  boardPhysical;
  /**
   * @type {{ratio: number, unitForRatio: string}}
   * Map scale interpretation properties.
   */
  mapInterpretationScale;

  constructor() {
    dBoard("Constructing Board");
    this.panZoomState = { panX: 0, panY: 0, zoom: 1.0 };
    this.tableBackground = { type: "color", value: "#cccccc" }; // Default background
    this.boardPhysical = {
      widthUser: 36,
      heightUser: 24,
      unitForDimensions: "in",
      widthPx: 36 * MM_PER_UNIT["in"],
      heightPx: 24 * MM_PER_UNIT["in"],
    };
    this.mapInterpretationScale = {
      ratio: 1,
      unitForRatio: "mm",
    };
    dBoard("Board constructed with initial state: %o", this);
  }

  /**
   * Retrieves a copy of the current pan and zoom state of the canvas.
   * @returns {{panX: number, panY: number, zoom: number}} The current pan and zoom state.
   */
  getPanZoomState() {
    dBoard("getPanZoomState called, returning: %o", this.panZoomState);
    return { ...this.panZoomState };
  }

  /**
   * Updates the pan and/or zoom state of the canvas.
   * Zoom is clamped between 0.1 and 10.
   * @param {{panX?: number, panY?: number, zoom?: number}} newState - An object containing new panX, panY, or zoom values.
   * @returns {boolean} True if the state changed, false otherwise.
   */
  setPanZoomState(newState) {
    dBoard("setPanZoomState called with newState: %o", newState);
    const { panX: newPanX, panY: newPanY, zoom: newZoom } = newState;
    let changed = false;

    if (newPanX !== undefined && newPanX !== this.panZoomState.panX) {
      dBoard("panX changed from %d to %d", this.panZoomState.panX, newPanX);
      this.panZoomState.panX = newPanX;
      changed = true;
    }
    if (newPanY !== undefined && newPanY !== this.panZoomState.panY) {
      dBoard("panY changed from %d to %d", this.panZoomState.panY, newPanY);
      this.panZoomState.panY = newPanY;
      changed = true;
    }
    if (newZoom !== undefined && newZoom !== this.panZoomState.zoom) {
      const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
      if (clampedZoom !== this.panZoomState.zoom) {
        dBoard(
          "zoom changed from %f to %f (clamped from %f)",
          this.panZoomState.zoom,
          clampedZoom,
          newZoom,
        );
        this.panZoomState.zoom = clampedZoom;
        changed = true;
      } else {
        dBoard(
          "zoom change from %f to %f ignored due to clamping resulting in same value.",
          this.panZoomState.zoom,
          newZoom,
        );
      }
    }

    if (changed) {
      dBoard("PanZoom state changed. New state: %o", this.panZoomState);
    } else {
      dBoard("PanZoom state did not change.");
    }
    return changed;
  }

  /**
   * Retrieves a copy of the current table background configuration.
   * @returns {{type: 'color' | 'image', value: string}} The current background configuration.
   */
  getTableBackground() {
    dBoard("getTableBackground called, returning: %o", this.tableBackground);
    return { ...this.tableBackground };
  }

  /**
   * Sets the table background.
   * @param {{type: 'color' | 'image', value: string}} newBackground - The new background configuration object.
   * @returns {boolean} True if the background changed, false otherwise.
   */
  setTableBackground(newBackground) {
    dBoard("setTableBackground called with newBackground: %o", newBackground);
    let changed = false;
    if (newBackground && typeof newBackground === "object") {
      const { type: newType, value: newValue } = newBackground;

      if (
        this.tableBackground.type !== newType ||
        this.tableBackground.value !== newValue
      ) {
        dBoard(
          'Table background changed from type %s, value "%s" to type %s, value "%s"',
          this.tableBackground.type,
          this.tableBackground.value,
          newType,
          newValue,
        );
        this.tableBackground.type = newType;
        this.tableBackground.value = newValue;
        changed = true;
      }

      if (changed) {
        dBoard(
          "Table background changed. New background: %o",
          this.tableBackground,
        );
      } else {
        dBoard("Table background did not change.");
      }
    } else {
      dBoard("setTableBackground: newBackground is invalid or not an object.");
    }
    return changed;
  }

  /**
   * Retrieves a consolidated object of current board properties.
   * @returns {{widthUser: number, heightUser: number, unitForDimensions: string, widthPx: number, heightPx: number, scaleRatio: number, unitForRatio: string}}
   */
  getBoardProperties() {
    dBoard("getBoardProperties called");
    return {
      widthUser: this.boardPhysical.widthUser,
      heightUser: this.boardPhysical.heightUser,
      unitForDimensions: this.boardPhysical.unitForDimensions,
      widthPx: this.boardPhysical.widthPx,
      heightPx: this.boardPhysical.heightPx,
      scaleRatio: this.mapInterpretationScale.ratio,
      unitForRatio: this.mapInterpretationScale.unitForRatio,
    };
  }

  /**
   * Updates various board properties such as user-defined dimensions, units, and map scale.
   * Recalculates pixel dimensions based on user inputs.
   * @param {object} newProps - An object containing new board properties to apply.
   * @param {number} [newProps.widthUser] - New user-defined width.
   * @param {number} [newProps.heightUser] - New user-defined height.
   * @param {string} [newProps.unitForDimensions] - New unit for user-defined dimensions (e.g., 'in', 'ft', 'mm').
   * @param {number} [newProps.scaleRatio] - New map scale ratio.
   * @param {string} [newProps.unitForRatio] - New unit for the map scale ratio.
   * @returns {{ changed: boolean, newProperties: object }} An object indicating if properties changed and the new consolidated board properties.
   */
  updateBoardProperties(newProps) {
    dBoard("updateBoardProperties called with newProps: %o", newProps);
    let anyPropertyChanged = false;

    const oldWidthPx = this.boardPhysical.widthPx;
    const oldHeightPx = this.boardPhysical.heightPx;
    dBoard(
      "Old board pixel dimensions: widthPx=%f, heightPx=%f",
      oldWidthPx,
      oldHeightPx,
    );

    const newWidthUser =
      newProps.widthUser !== undefined
        ? parseFloat(newProps.widthUser)
        : this.boardPhysical.widthUser;
    if (
      !isNaN(newWidthUser) &&
      this.boardPhysical.widthUser !== newWidthUser &&
      newWidthUser > 0
    ) {
      dBoard(
        "boardPhysical.widthUser changed from %f to %f",
        this.boardPhysical.widthUser,
        newWidthUser,
      );
      this.boardPhysical.widthUser = newWidthUser;
      anyPropertyChanged = true;
    }

    const newHeightUser =
      newProps.heightUser !== undefined
        ? parseFloat(newProps.heightUser)
        : this.boardPhysical.heightUser;
    if (
      !isNaN(newHeightUser) &&
      this.boardPhysical.heightUser !== newHeightUser &&
      newHeightUser > 0
    ) {
      dBoard(
        "boardPhysical.heightUser changed from %f to %f",
        this.boardPhysical.heightUser,
        newHeightUser,
      );
      this.boardPhysical.heightUser = newHeightUser;
      anyPropertyChanged = true;
    }

    if (
      newProps.unitForDimensions &&
      MM_PER_UNIT[newProps.unitForDimensions] &&
      this.boardPhysical.unitForDimensions !== newProps.unitForDimensions
    ) {
      dBoard(
        "boardPhysical.unitForDimensions changed from %s to %s",
        this.boardPhysical.unitForDimensions,
        newProps.unitForDimensions,
      );
      this.boardPhysical.unitForDimensions = newProps.unitForDimensions;
      anyPropertyChanged = true;
    }

    const newScaleRatio =
      newProps.scaleRatio !== undefined
        ? parseFloat(newProps.scaleRatio)
        : this.mapInterpretationScale.ratio;
    if (
      !isNaN(newScaleRatio) &&
      this.mapInterpretationScale.ratio !== newScaleRatio &&
      newScaleRatio >= 0
    ) {
      dBoard(
        "mapInterpretationScale.ratio changed from %f to %f",
        this.mapInterpretationScale.ratio,
        newScaleRatio,
      );
      this.mapInterpretationScale.ratio = newScaleRatio;
      anyPropertyChanged = true;
    }

    if (
      newProps.unitForRatio &&
      MM_PER_UNIT[newProps.unitForRatio] &&
      this.mapInterpretationScale.unitForRatio !== newProps.unitForRatio
    ) {
      dBoard(
        "mapInterpretationScale.unitForRatio changed from %s to %s",
        this.mapInterpretationScale.unitForRatio,
        newProps.unitForRatio,
      );
      this.mapInterpretationScale.unitForRatio = newProps.unitForRatio;
      anyPropertyChanged = true;
    }

    const unitMultiplier =
      MM_PER_UNIT[this.boardPhysical.unitForDimensions] || MM_PER_UNIT["in"];
    this.boardPhysical.widthPx = this.boardPhysical.widthUser * unitMultiplier;
    this.boardPhysical.heightPx =
      this.boardPhysical.heightUser * unitMultiplier;
    dBoard(
      "Recalculated board pixel dimensions: widthPx=%f, heightPx=%f (multiplier: %f)",
      this.boardPhysical.widthPx,
      this.boardPhysical.heightPx,
      unitMultiplier,
    );

    const pixelDimensionsChanged =
      this.boardPhysical.widthPx !== oldWidthPx ||
      this.boardPhysical.heightPx !== oldHeightPx;
    if (pixelDimensionsChanged) dBoard("Pixel dimensions changed.");

    const overallChange = anyPropertyChanged || pixelDimensionsChanged;

    if (overallChange) {
      dBoard("Board properties or pixel dimensions changed.");
    } else {
      dBoard(
        "No user-facing board properties or calculated pixel dimensions changed.",
      );
    }

    const finalBoardProps = this.getBoardProperties();
    dBoard("updateBoardProperties returning: %o", finalBoardProps);
    return { changed: overallChange, newProperties: finalBoardProps };
  }
}

export default Board;
