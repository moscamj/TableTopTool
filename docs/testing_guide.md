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
     - [ ] (Optional) Inspect the JSON file: does it include `objects`, `background`, `viewState`, and `boardProperties`?
- **Load from File:**
     - [ ] Clear the canvas or make significant changes from a saved state.
     - [ ] Can you load a previously saved session file?
     - [ ] Is the canvas state (objects, background, pan/zoom settings, board properties) correctly restored?
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

## Running Automated End-to-End Tests (Cypress)

This project uses Cypress for automated end-to-end (E2E) testing. E2E tests simulate real user scenarios by interacting with the application in a browser environment, verifying overall application flow and functionality from the user's perspective.

### Prerequisites

1.  **Node.js and npm:** Ensure Node.js (v22.0.0 or newer) and npm are installed. This is covered in the [Developer Setup Guide](./developer_setup.md).
2.  **Project Dependencies:** If you haven't already, navigate to the project's root directory in your terminal and install all necessary dependencies (including Cypress):
    ```bash
    npm install
    ```

### Configuration

Cypress is configured via the `config/cypress.config.js` file. This file contains settings for the Cypress environment, such as base URLs, viewport sizes, and potentially custom commands.

### Running Tests

There are two main ways to run Cypress tests:

1.  **Interactive Mode (Cypress Test Runner):**
    This mode is recommended when writing or debugging tests. It opens a dedicated Cypress window where you can see your application, the test commands as they execute, and detailed information about each step.

    To open the Cypress Test Runner, run the following command from the project's root directory:
    ```bash
    npx cypress open
    ```
    This will launch the Cypress application. You'll typically see a list of your E2E test files. Clicking on a file will run the tests within it in a browser instance controlled by Cypress.

2.  **Headless Mode (Command Line):**
    This mode runs tests without launching a visible browser window. It's suitable for running tests in CI/CD pipelines or for quick checks from the command line.

    To run all Cypress tests headlessly, use:
    ```bash
    npx cypress run
    ```
    Test results, including pass/fail status and any errors, will be output to the terminal. Videos and screenshots are often automatically saved for failing tests (check Cypress configuration).

### Test File Location

Cypress end-to-end test files are typically located in the `cypress/e2e/` directory at the project root. Test files usually follow a naming convention like `*.cy.js` or `*.cy.ts`.

*As of the current documentation update, Cypress is set up, but end-to-end test files (e.g., in a `cypress/e2e/` directory) still need to be created.*

### Purpose of E2E Tests

E2E tests are designed to:
- Verify that different parts of the application work together correctly.
- Simulate user workflows and critical paths through the application.
- Catch regressions that might not be caught by unit or integration tests.
- Provide confidence in the overall stability of the application before deployment.
