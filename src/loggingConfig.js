// src/loggingConfig.js
import log from "loglevel";

let intendedLogLevelString = "warn"; // Default for production or if mode is unknown

// Use Vite's built-in mode flags to determine log level for development
if (import.meta.env.DEV) {
  intendedLogLevelString = "info"; // As per user's latest request for dev
}

// VITE_APP_LOG_LEVEL from .env file can still override if it ever starts working
const logLevelFromEnv = import.meta.env.VITE_APP_LOG_LEVEL;
const validLevels = ["trace", "debug", "info", "warn", "error", "silent"];

if (logLevelFromEnv && validLevels.includes(logLevelFromEnv.toLowerCase())) {
  intendedLogLevelString = logLevelFromEnv.toLowerCase();
  console.log(`[LoggingConfig] Log level overridden by VITE_APP_LOG_LEVEL env var to: '${intendedLogLevelString}'`);
} else if (logLevelFromEnv) {
  console.warn(
    `[LoggingConfig] Invalid VITE_APP_LOG_LEVEL env var: '${logLevelFromEnv}'. Using default/mode-derived: '${intendedLogLevelString}'.`
  );
} else {
    // This message clarifies how the level was determined when .env is not used.
    console.log(`[LoggingConfig] VITE_APP_LOG_LEVEL env var not set. Using mode-derived level: '${intendedLogLevelString}' (DEV mode: ${import.meta.env.DEV}, PROD mode: ${import.meta.env.PROD}).`);
}

log.setLevel(intendedLogLevelString);

// Log the actual level that was set
const levelNumberToName = ["trace", "debug", "info", "warn", "error", "silent"];
const currentLevelNumber = log.getLevel(); // Returns a number
const currentLevelName = levelNumberToName[currentLevelNumber] || "unknown";

console.log(
  `[LoggingConfig] Loglevel initialized. Effective level: ${currentLevelName.toUpperCase()} (numeric: ${currentLevelNumber})`
);

export default log;
