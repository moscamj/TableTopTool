# TableTopTool - Offline MVP

A web-based, generic, and extensible virtual tabletop (VTT) designed to support a wide array of tabletop games. This MVP version operates in an **offline-first, in-memory mode**, with all state managed locally and saved/loaded via JSON files. Firebase integration is stubbed for potential future use. The codebase has been recently updated to use modern ES6+ JavaScript syntax and features, enhancing readability and maintainability.

## Prerequisites

*   **Node.js**: LTS version (e.g., v20.x.x or newer recommended). Download from [nodejs.org](https://nodejs.org/).
*   **npm**: Usually comes with Node.js.

## Setup

For detailed setup instructions, including cloning, dependency installation, environment variables, and running the development server, please see the [Developer Setup Guide](./docs/developer_setup.md).

## Available Scripts

*   **Run the Development Server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server (usually on `http://localhost:5173` or the next available port) and automatically open the application in your default web browser. Hot module replacement is enabled.

*   **Build for Production:**
    ```bash
    npm run build
    ```
    This command bundles the application for production. The output files will be placed in the `dist/` directory.

*   **Linting:**
    ```bash
    npm run lint
    ```
    This will run ESLint to check for code quality and style issues in JavaScript files and `index.html`.

## Project Structure

*   `src/`: Contains all the JavaScript source code for the application.
    *   `main.js`: Main entry point, event handling, and application initialization.
    *   `api.js`: Defines the `VTT_API` for object scripting.
    *   `canvas.js`: Handles all canvas rendering, pan/zoom, and object picking.
    *   `firebase.js`: Firebase integration (currently in offline/stubbed mode).
    *   `objects.js`: Manages VTT object creation, storage, and manipulation logic.
    *   `ui.js`: Controls the user interface elements, inspector panel, modals, and messages.
*   `docs/`: Contains documentation files.
*   `index.html`: The main HTML file.
*   `package.json`: Defines project dependencies and scripts.
*   `vite.config.js`: Configuration for the Vite development server and build process.
*   `.eslintrc.json`: Configuration for ESLint.
*   `.prettierrc.json`: Configuration for Prettier.

## Developer Guide

This project includes resources to help developers get started and test the application:

*   **[Developer Setup Guide](./docs/developer_setup.md):** Instructions on how to set up your local development environment.
*   **[Testing Guide](./docs/testing_guide.md):** A checklist and guide for manually testing the application's features.

## Core Features (Offline MVP)

*   **Object Creation & Manipulation**: Create and modify objects (rectangles, circles) on a 2D canvas.
*   **Inspector Panel**: View and edit properties of selected objects (e.g., position, size, rotation, color, image URL, custom data, scripts).
*   **Canvas Controls**: Pan and zoom the canvas for easy navigation.
*   **Customizable Background**: Set the table background to a solid color or an image URL.
*   **Local Save/Load**:
    *   Save the entire table state (including all objects, their properties, background settings, and view state) to a `.ttt.json` file on your local machine.
    *   Load a previously saved table state from a `.ttt.json` file.
*   **Basic Scripting**: Attach `onClick` scripts to objects. These scripts can use the `VTT_API` to:
    *   Log messages to the console (`VTT.log()`).
    *   Read other object data (`VTT.getObject()`).
    *   Update an object's custom data (`VTT.updateObjectState()`).

---
