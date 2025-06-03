// src/views/components/boardSettingsView.js

let uiViewModelInstance = null;

const domElements = {
    boardWidthInput: null,
    boardHeightInput: null,
    boardDimensionUnitInput: null,
    boardScaleInput: null,
    boardScaleUnitInput: null,
    effectiveBoardSizeDisplay: null,
    applyBoardPropertiesButton: null,
};

const cacheDOMElements = () => {
    domElements.boardWidthInput = document.getElementById('board-width-input');
    domElements.boardHeightInput = document.getElementById('board-height-input');
    domElements.boardDimensionUnitInput = document.getElementById('board-dimension-unit-input');
    domElements.boardScaleInput = document.getElementById('board-scale-input');
    domElements.boardScaleUnitInput = document.getElementById('board-scale-unit-input');
    domElements.effectiveBoardSizeDisplay = document.getElementById('effective-board-size-display');
    domElements.applyBoardPropertiesButton = document.getElementById('apply-board-properties-button');
    // console.log('[boardSettingsView.js] Board Settings DOM elements cached.');
};

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

const handleApplyBoardProperties = () => {
    if (!domElements.boardWidthInput || !domElements.boardHeightInput || 
        !domElements.boardDimensionUnitInput || !domElements.boardScaleUnitInput || !domElements.boardScaleInput) {
        if (uiViewModelInstance && uiViewModelInstance.onDisplayMessage) {
            uiViewModelInstance.onDisplayMessage('Board property input elements not found in DOM.', 'error');
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
        if (uiViewModelInstance && uiViewModelInstance.onDisplayMessage) {
            uiViewModelInstance.onDisplayMessage(validationError, 'error');
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
    console.log('[boardSettingsView.js] Initialized.');
};
