// src/loggingConfig.js
// This module configures the 'loglevel' library for the entire application.
// Loglevel provides hierarchical logging and is controlled by the VITE_APP_LOG_LEVEL environment variable.
// It is distinct from the 'debug' library, which is used for more verbose, development-time debugging
// and is controlled by the DEBUG environment variable.
import log from "loglevel";

const logLevelFromEnv = import.meta.env.VITE_APP_LOG_LEVEL;
const validLevels = ["trace", "debug", "info", "warn", "error", "silent"];
let effectiveLogLevel = "warn"; // Default log level

if (logLevelFromEnv && validLevels.includes(logLevelFromEnv.toLowerCase())) {
        effectiveLogLevel = logLevelFromEnv.toLowerCase();
} else if (logLevelFromEnv) {
        console.warn(
                `[LoggingConfig] Invalid VITE_APP_LOG_LEVEL: '${logLevelFromEnv}'. Defaulting to '${effectiveLogLevel}'.`,
        );
}

log.setLevel(effectiveLogLevel);

// Optional: Log the effective log level using loglevel itself.
// This specific console.log is intentional for initial setup verification.
// It helps confirm that the logging configuration is loaded and what level is active,
// especially before loglevel itself might be fully applied or if there are issues with its configuration.
// It will only be visible if the browser's console level includes 'log'.
console.log(
        `[LoggingConfig] Loglevel initialized. Effective level: ${log.getLevel()}`,
);

export default log;
