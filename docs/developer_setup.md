# Developer Setup Guide

This guide will help you set up the project environment on your local machine for development and testing.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: This project uses Node.js for package management and running scripts. We recommend using the latest LTS (Long-Term Support) version. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm**: npm (Node Package Manager) is included with Node.js. It's used to install project dependencies.

## Setup Steps

1.  **Clone the Repository:**
    If you haven't already, clone the project repository to your local machine using Git:
    ```bash
    git clone <repository_url>
    cd <repository_directory_name>
    ```
    (Replace `<repository_url>` and `<repository_directory_name>` with the actual URL and project directory name.)

2.  **Install Dependencies:**
    Navigate to the project's root directory in your terminal and install the required dependencies using npm:
    ```bash
    npm install
    ```
    This command will download all necessary packages defined in `package.json` and `package-lock.json`.

3.  **Environment Variables (Optional for Offline Mode):**
    This project includes Firebase integration, which is currently configured to run in an "offline mode" by default, meaning it doesn't connect to live Firebase services. However, the code references environment variables for Firebase configuration.

    If you were to configure it for online Firebase use, you would need a `.env` file in the project root with the following variables:
    ```plaintext
    VITE_FIREBASE_CONFIG={"apiKey": "your_api_key", ...} # Your Firebase project config JSON
    VITE_APP_ID=your_app_id # A unique ID for your app instance
    ```
    For current development in offline mode, these variables are not strictly required to run the application. However, they are accessed in `src/firebase.js`, which will log warnings indicating it's operating in offline mode.

4.  **Run the Development Server:**
    This project uses Vite for its development server. To start the server, run the following command from the project's root directory:
    ```bash
    npm run dev
    ```
    This will typically start the server on `http://localhost:5173` (Vite's default) or another port if 5173 is busy. The terminal output will display the correct URL; open this URL in your web browser to view the application.

    The development server provides Hot Module Replacement (HMR), so changes you make to the source code should reflect in the browser almost instantly without a full page reload.

## Next Steps

Once the development server is running, you can start exploring the codebase and making changes. Refer to the [Testing Guide](./testing_guide.md) for information on how to test the application.
