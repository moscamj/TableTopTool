# Developer Setup Guide

This guide will help you set up the project environment on your local machine for development and testing.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: This project uses Node.js for package management and running scripts. **v22.0.0 or newer** is recommended to align with project dependencies and features. You can download it from [nodejs.org](https://nodejs.org/).
- **npm**: npm (Node Package Manager) is included with Node.js. It's used to install project dependencies.

## Setup Steps

1. **Clone the Repository:**
   If you haven't already, clone the project repository to your local machine using Git:

      ```bash
      git clone <repository_url>
      cd <repository_directory_name>
      ```

      (Replace `<repository_url>` and `<repository_directory_name>` with the actual URL and project directory name.)

2. **Install Dependencies:**
   Navigate to the project's root directory in your terminal and install the required dependencies using npm:

      ```bash
      npm install
      ```

      This command will download all necessary packages defined in `package.json` and `package-lock.json`.

3. **Environment Variables (Optional for Offline Mode):**
   This project includes Firebase integration, which is currently configured to run in an "offline mode" by default, meaning it doesn't connect to live Firebase services. However, the code references environment variables for Firebase configuration.

      Environment variables are managed by Vite and loaded from `.env` files located in the `config/` directory (e.g., `config/.env.development`, `config/.env.production`). This is configured by `envDir: './config'` in `vite.config.js`.

      If you were to configure it for online Firebase use, you would need to create or modify the appropriate `.env` file (e.g., `config/.env.development`) in the `config/` directory with variables like:

      ```plaintext
      VITE_FIREBASE_CONFIG={"apiKey": "your_api_key", ...} # Your Firebase project config JSON
      VITE_APP_ID=your_app_id # A unique ID for your app instance
      ```

      For current development in offline mode, these variables are not strictly required to run the application if they are already stubbed or handled gracefully. However, `src/firebase.js` accesses them, and will log warnings indicating it's operating in offline mode if they are not fully configured for online use.

4. **Run the Development Server:**
   This project uses Vite for its development server. To start the server, run the following command from the project's root directory:

      ```bash
      npm run dev
      ```

      This will typically start the server on `http://localhost:5173` (Vite's default) or another port if 5173 is busy. The terminal output will display the correct URL; open this URL in your web browser to view the application.

      The development server provides Hot Module Replacement (HMR), so changes you make to the source code should reflect in the browser almost instantly without a full page reload.

## Logging

The application uses two primary libraries for logging: `loglevel` for general application event logging and `debug` for verbose, development-time diagnostic tracing.

### General Application Logging (`loglevel`)

`loglevel` is used for logging application events, warnings, and errors. Its logging level is configured per environment.

**Configuration:**

- The log level is controlled by the `VITE_APP_LOG_LEVEL` environment variable.
- This variable should be defined in environment-specific files located in the `config/` directory (e.g., `config/.env.development`, `config/.env.production`, `config/.env.test`).
- Valid levels are: `trace`, `debug`, `info`, `warn`, `error`, `silent`.
     - `trace`: Log everything.
     - `debug`: Detailed information for debugging.
     - `info`: General information about application flow.
     - `warn`: Potential issues or unexpected situations.
     - `error`: Errors that have occurred.
     - `silent`: No logs.
- The default level if the variable is not set or invalid is 'warn'.
- The configuration is handled in `src/loggingConfig.js`.

**Usage:**
Import `log` from `loglevel` in your module:

```javascript
import log from 'loglevel';

log.info('This is an informational message.');
log.warn('This is a warning.');
log.error('This is an error.');
log.debug('This is a debug message (visible if level is debug or trace).');
```

### Development Debug Logging (`debug`)

The `debug` library is used for detailed, namespaced diagnostic messages, primarily useful during development to trace specific modules or features. These logs are not enabled by default and do not output to the console unless explicitly enabled.

**Enabling Debug Logs:**
Debug logs are enabled by setting the `DEBUG` environment variable when running the application.

- **Via command line:**

     ```bash
     # Enable all logs under the 'app' namespace
     DEBUG=app:* npm run dev

     # Enable logs for specific modules
     DEBUG=app:api,app:vm:canvas npm run dev

     # Enable all debug logs (can be very verbose)
     DEBUG=* npm run dev
     ```

- **Via browser's developer console (localStorage):**
  You can also enable debug logs by setting `localStorage.debug` in your browser's developer console and then refreshing the page:
     ```javascript
     localStorage.debug = 'app:*'; // Enable all 'app' namespace logs
     // localStorage.debug = 'app:api'; // Enable only 'app:api'
     // localStorage.removeItem('debug'); // Disable
     ```

**Namespacing Convention:**
Debug logs are organized by namespaces. A recommended convention is `app:<module-type>:<module-name>` or `app:<specific-file-identifier>`. Examples reflecting the MVVM structure:

- `app:main` (for `src/main.js`)
- `app:api` (for `src/api.js`)
- `app:model:VTTObject` (for `src/model/VTTObject.js`)
- `app:model:Board` (for `src/model/Board.js`)
- `app:model:model` (for `src/model/model.js`)
- `app:vm:canvas` (for `src/viewmodels/canvasViewModel.js`)
- `app:vm:ui` (for `src/viewmodels/uiViewModel.js`)
- `app:view:canvas` (for `src/views/canvasView.js`)
- `app:view:ui` (for `src/views/uiView.js`)
- `app:view:components:inspector` (example for `src/views/components/inspectorView.js`)
- `app:session` (for `src/session_management.js`)
- `app:logging` (for `src/loggingConfig.js`)
- Add new, descriptive namespaces as needed when developing new features or modules.

**Usage:**
Import `debug` and create a namespaced logger:

```javascript
import debug from 'debug';

const d = debug('app:my-module'); // Or const dMyModule = debug('app:my-module');

d('My debug message with data: %o', { key: 'value' });
// These messages will only appear if 'app:my-module' (or a wildcard like 'app:*') is enabled.
```

### Vite Environment Variables

Vite handles environment variables loaded from `.env.[mode]` files (e.g., `config/.env.development`, `config/.env.production`) located in the `config/` directory (as specified by `envDir` in `vite.config.js`). Only variables prefixed with `VITE_` are exposed to the client-side bundle. This is why `VITE_APP_LOG_LEVEL` is used for `loglevel`. The `DEBUG` variable for the `debug` library is typically set in the shell environment or browser localStorage, as it's a common convention for that library and is not prefixed with `VITE_`.

## Next Steps

Once the development server is running, you can start exploring the codebase and making changes. Refer to the [Testing Guide](./testing_guide.md) for information on how to test the application.
