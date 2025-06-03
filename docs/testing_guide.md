# Manual Testing Guide

This guide provides a checklist for manually testing the application's functionalities. Thorough manual testing is crucial, especially after significant code changes, to ensure everything behaves as expected.

## Preparation

- **Run the Application**: Ensure you have the application running locally using the development server (`npm run dev`). See the [Developer Setup Guide](./developer_setup.md) for instructions.
- **Open Developer Console**: Open your web browser's developer console (usually by pressing F12 or right-clicking and selecting "Inspect" -> "Console"). Keep an eye on the console for any errors or warnings that might appear during testing.

## Testing Checklist

### Core Object Manipulation

- **Create Objects:**
     - [ ] Can you create rectangles?
     - [ ] Can you create circles?
     - [ ] Do they appear on the canvas at an expected default position?
- **Select Objects:**
     - [ ] Can you click on an object to select it?
     - [ ] Does the inspector panel populate with the selected object's details?
     - [ ] Does a visual selection highlight appear around the object on the canvas?
- **Deselect Objects:**
     - [ ] Clicking on the canvas background deselects the current object.
     - [ ] Does the inspector clear or show a "no object selected" message?
     - [ ] Is the selection highlight removed from the previously selected object?
- **Move Objects:**
     - [ ] Can you click and drag a movable object on the canvas?
     - [ ] Does the object move smoothly?
     - [ ] Does its position update in the inspector (live or after applying changes, depending on implementation)?
- **Update Object Properties (via Inspector Panel):**
     - [ ] Change position (X, Y).
     - [ ] Change dimensions (Width, Height).
     - [ ] Change rotation.
     - [ ] Change Z-index (stacking order).
     - [ ] Toggle the "Is Movable" property.
     - [ ] Change background color.
     - [ ] Change image URL (test with a valid image URL).
     - [ ] Change image URL (test with an invalid/broken image URL - observe handling).
     - [ ] Modify custom data (JSON format).
     - [ ] Add/edit an `onClick` script (e.g., `VTT.log('Test click script executed!')`).
     - [ ] After applying changes, are they correctly reflected on the canvas and when the object is re-selected?
- **Delete Objects:**
     - [ ] Can you select an object and click the delete button?
     - [ ] If a confirmation modal appears, does it work as expected?
     - [ ] Is the object removed from the canvas?
     - [ ] Can the deleted object no longer be selected or interacted with?

### Canvas Functionality

- **Pan:**
     - [ ] Can you click and drag on an empty part of the canvas to pan the view?
     - [ ] Does the canvas view move correctly?
- **Zoom:**
     - [ ] Can you use the mouse wheel over the canvas to zoom in and out?
     - [ ] Is the zoom centered on the mouse cursor's position?
     - [ ] Are there reasonable zoom limits (not zooming in/out infinitely)?
- **Background Customization:**
     - [ ] Can you set a solid background color for the canvas?
     - [ ] Can you set a background image using a URL?
     - [ ] Does the background update correctly after changes?
     - [ ] How does it handle an invalid background image URL?

### Session/State Management (Local Save/Load)

- **Save to File:**
     - [ ] After arranging objects and customizing the canvas, can you save the state to a file?
     - [ ] Is a JSON file downloaded?
- **Load from File:**
     - [ ] Clear the canvas or make significant changes from a saved state.
     - [ ] Can you load a previously saved session file?
     - [ ] Is the canvas state (objects, background, pan/zoom settings) correctly restored?
     - [ ] Are images on objects (if any) reloaded correctly?

### Scripting

- **`onClick` Script Execution:**
     - [ ] If an `onClick` script was added to an object, does it execute when the object is clicked?
     - [ ] (Check browser console for `VTT.log` messages or other script outputs).
     - [ ] If the script is supposed to modify the object's state via `VTT.updateObjectState`, are these changes reflected?

### UI General

- **Responsiveness:**
     - [ ] Does the canvas and UI layout adapt reasonably when resizing the browser window?
- **Messages/Modals:**
     - [ ] Do informational messages or error messages appear when expected (e.g., after saving, on load error)?
     - [ ] Do confirmation modals (e.g., for delete) work correctly?
- **Inspector Panel Behavior:**
     - [ ] Does the inspector correctly show "Select an object to inspect" (or similar) when no object is selected?
     - [ ] Are inspector fields correctly populated when an object is selected?
     - [ ] Are inspector fields disabled or hidden appropriately if no object is selected?

## Reporting Issues

If you encounter any bugs or unexpected behavior:

1. Note the steps you took to produce the issue.
2. Check the browser's developer console for any error messages. Copy them.
3. Take a screenshot if it helps illustrate the problem.
4. Report the issue with as much detail as possible.

Happy Testing!

## Running Automated Unit Tests (Jest)

In addition to manual testing, this project uses Jest for automated unit tests. These tests help ensure individual components and functions are working correctly.

### Prerequisites

1. **Node.js and npm:** Ensure you have Node.js installed, which includes npm (Node Package Manager). You can download it from [nodejs.org](https://nodejs.org/).
2. **Project Dependencies:** Open your terminal, navigate to the project's root directory, and run the following command to install all necessary dependencies (including Jest):
      ```bash
      npm install
      ```

### Running Tests

- **Run all tests:**
  To execute all Jest unit tests, run the following command in your terminal from the project's root directory:

     ```bash
     npm test
     ```

     The test results will be displayed in your terminal.

- **Run tests in watch mode (recommended during development):**
  To have Jest watch for file changes and re-run tests automatically, use:

     ```bash
     npm test -- --watch
     ```

     _(Note: The first `--` is to pass the `--watch` flag directly to the `jest` command executed by `npm test`.)_

- **Run tests for a specific file:**
  To run tests only for a particular file, specify the path to the test file:

     ```bash
     npm test -- <path_to_your_test_file.js>
     ```

     For example:

     ```bash
     npm test -- src/__tests__/objects.test.js
     ```

- **Run tests with coverage report:**
  If Jest is configured to generate a coverage report (check `jest.config.js`), you can usually generate it by adding the `--coverage` flag:
     ```bash
     npm test -- --coverage
     ```
     This will create a `coverage/` directory with an HTML report you can open in your browser.
