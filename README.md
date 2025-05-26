# TableTopTool - Offline MVP

A web-based, generic, and extensible virtual tabletop (VTT) designed to support a wide array of tabletop games. This MVP version operates in an **offline-first, in-memory mode**, with all state managed locally and saved/loaded via JSON files. Firebase integration is stubbed for potential future use.

## Prerequisites

*   **Node.js**: LTS version (e.g., v20.x.x or newer recommended). Download from [nodejs.org](https://nodejs.org/).
*   **npm**: Usually comes with Node.js.

## Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/moscamj/TableTopTool.git
    # Example: git clone https://github.com/your-username/TableTopTool.git
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd TableTopTool
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Environment File (`.env`):**
    This project uses Vite, which supports environment variables loaded from a `.env` file in the project root. For the current offline MVP, Firebase configuration is not actively used, but the structure is present for future development.
    If you were to re-enable Firebase features, you would need to create a `.env` file with your Firebase project configuration:

    ```plaintext
    # .env (Example for future Firebase use - NOT REQUIRED FOR OFFLINE MVP)
    VITE_FIREBASE_CONFIG='{"apiKey": "AIza...", "authDomain": "your-project.firebaseapp.com", "projectId": "your-project-id", ...}'
    VITE_APP_ID='tabletoptool-v1'
    ```
    For now, you can proceed without creating a `.env` file, or create an empty one.

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
