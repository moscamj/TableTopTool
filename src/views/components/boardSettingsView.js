// src/views/components/boardSettingsView.js
/**
 * @file Manages the UI and interactions for the board settings panel.
 * This includes displaying current board dimensions and scale,
 * and allowing users to modify and apply these settings.
 * It interacts with UiViewModel to get board properties and to apply changes.
 */

/** @type {UiViewModel | null} Instance of the UiViewModel. */
let uiViewModelInstance = null;

/**
 * @type {Object<string, HTMLElement|null>}
 * Stores references to DOM elements within the board settings panel.
 */
const domElements = {
    boardWidthInput: null,
    boardHeightInput: null,
    boardDimensionUnitInput: null,
    boardScaleInput: null,
    boardScaleUnitInput: null,
    effectiveBoardSizeDisplay: null,
    applyBoardPropertiesButton: null,
};

/**
 * Caches references to frequently used DOM elements within the board settings panel.
 */
const cacheDOMElements = () => {
    domElements.boardWidthInput = document.getElementById('board-width-input');
    domElements.boardHeightInput = document.getElementById('board-height-input');
    domElements.boardDimensionUnitInput = document.getElementById('board-dimension-unit-input');
    domElements.boardScaleInput = document.getElementById('board-scale-input');
    domElements.boardScaleUnitInput = document.getElementById('board-scale-unit-input');
    domElements.effectiveBoardSizeDisplay = document.getElementById('effective-board-size-display');
    domElements.applyBoardPropertiesButton = document.getElementById('apply-board-properties-button');
};

/**
 * Populates the board settings form fields with the provided board properties.
 * @param {object} boardProps - An object containing board properties (e.g., widthUser, heightUser, unitForDimensions, scaleRatio, unitForRatio, widthPx, heightPx).
 *                              Typically obtained from `UiViewModel.getBoardPropertiesForDisplay()`.
 */
const updateBoardSettingsDisplay = (boardProps) => {
    if (!boardProps) return;
    if (domElements.boardWidthInput) domElements.boardWidthInput.value = boardProps.widthUser ?? '';
    if (domElements.boardHeightInput) domElements.boardHeightInput.value = boardProps.heightUser ?? '';
    if (domElements.boardDimensionUnitInput) domElements.boardDimensionUnitInput.value = boardProps.unitForDimensions ?? 'in';
    if (domElements.boardScaleInput) domElements.boardScaleInput.value = boardProps.scaleRatio ?? 1;
    if (domElements.boardScaleUnitInput) domElements.boardScaleUnitInput.value = boardProps.unitForRatio ?? 'mm';

    if (domElements.effectiveBoardSizeDisplay) {
        if (boardProps.widthPx && boardProps.heightPx) {
            domElements.effectiveBoardSizeDisplay.textContent = `${Math.round(boardProps.widthPx)}px by ${Math.round(boardProps.heightPx)}px (mm)`;
        } else {
            domElements.effectiveBoardSizeDisplay.textContent = 'N/A';
        }
    }
};

/**
 * Handles the click event for the "Apply Board Properties" button.
 * Reads values from the form fields, performs basic validation,
 * and then calls `uiViewModelInstance.applyBoardSettings` to update the model.
 */
const handleApplyBoardProperties = () => {
    if (!domElements.boardWidthInput || !domElements.boardHeightInput || 
        !domElements.boardDimensionUnitInput || !domElements.boardScaleUnitInput || !domElements.boardScaleInput) {
        if (uiViewModelInstance) {
            uiViewModelInstance.displayMessage('Board property input elements not found in DOM.', 'error');
        } else {
            alert('Board property input elements not found in DOM.'); // Fallback
        }
        return;
    }

    const widthValue = parseFloat(domElements.boardWidthInput.value);
    const heightValue = parseFloat(domElements.boardHeightInput.value);
    const dimUnitValue = domElements.boardDimensionUnitInput.value;
    const scaleRatioValue = parseFloat(domElements.boardScaleInput.value);
    const scaleUnitValue = domElements.boardScaleUnitInput.value;

    let validationError = null;
    if (isNaN(widthValue) || widthValue <= 0 || isNaN(heightValue) || heightValue <= 0) {
        validationError = 'Board width and height must be positive numbers.';
    } else if (isNaN(scaleRatioValue) || scaleRatioValue < 0) {
        if (scaleRatioValue === 0 && domElements.boardScaleInput.value.trim() !== "0") {
            validationError = 'Scale ratio must be a positive number or zero. Non-numeric input for scale is invalid.';
        } else if (scaleRatioValue < 0) {
            validationError = 'Scale ratio cannot be negative.';
        } else if (isNaN(scaleRatioValue)) {
            validationError = 'Scale ratio must be a valid number or zero.';
        }
    }

    if (validationError) {
        if (uiViewModelInstance) {
            uiViewModelInstance.displayMessage(validationError, 'error');
        } else {
            alert(validationError); // Fallback
        }
        return;
    }

    if (uiViewModelInstance) {
        uiViewModelInstance.applyBoardSettings({
            widthUser: widthValue,
            heightUser: heightValue,
            unitForDimensions: dimUnitValue,
            scaleRatio: scaleRatioValue,
            unitForRatio: scaleUnitValue
        });
        // User feedback messages are handled by UiViewModel
    } else {
        console.error('[boardSettingsView.js] UiViewModel not initialized. Cannot apply board settings.');
        alert('Error: Cannot apply board settings. System not ready.'); // Fallback
    }
};

/**
 * Initializes the board settings view.
 * Stores the UiViewModel instance, caches DOM elements, sets up event listeners,
 * and registers a callback with UiViewModel to update the display when board settings change.
 * @param {UiViewModel} uiViewModel - The UiViewModel instance.
 */
export const init = (uiViewModel) => {
    uiViewModelInstance = uiViewModel;

    if (!uiViewModelInstance) {
        console.error('[boardSettingsView.js] UiViewModel not provided during init!');
        return;
    }

    cacheDOMElements();

    if (domElements.applyBoardPropertiesButton) {
        domElements.applyBoardPropertiesButton.addEventListener('click', handleApplyBoardProperties);
    }

    uiViewModelInstance.onBoardSettingsChanged(updateBoardSettingsDisplay);

    // Initial population
    updateBoardSettingsDisplay(uiViewModelInstance.getBoardPropertiesForDisplay());
    // console.log('[boardSettingsView.js] Initialized.'); // Removed for cleaner logs
};
