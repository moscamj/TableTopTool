// src/loggingConfig.js
import log from "loglevel";

const logLevelFromEnv = import.meta.env.VITE_APP_LOG_LEVEL;
const validLevels = ["trace", "debug", "info", "warn", "error", "silent"];
let intendedLogLevelString = "warn"; // Default log level string

if (logLevelFromEnv && validLevels.includes(logLevelFromEnv.toLowerCase())) {
  intendedLogLevelString = logLevelFromEnv.toLowerCase();
} else if (logLevelFromEnv) {
  // This console.warn is for when the env var is set but to an invalid value
  console.warn(
    `[LoggingConfig] Invalid VITE_APP_LOG_LEVEL: '${logLevelFromEnv}'. Defaulting to '${intendedLogLevelString}'. Valid levels are: ${validLevels.join(", ")}.`
  );
} else {
  // This console.log is for when the env var is not set at all, using default
  // It's less of a warning and more of an informational message.
  console.log(
    `[LoggingConfig] VITE_APP_LOG_LEVEL is not set. Defaulting to '${intendedLogLevelString}'.`
  );
}

log.setLevel(intendedLogLevelString);

// Log the actual level that was set, by getting it and converting back to string if necessary
// log.getLevel() returns a number. We want to show the name.
const levelNumberToName = ["trace", "debug", "info", "warn", "error", "silent"];
const currentLevelNumber = log.getLevel();
const currentLevelName = levelNumberToName[currentLevelNumber] || "unknown";

console.log(
  `[LoggingConfig] Loglevel initialized. Effective level: ${currentLevelName.toUpperCase()} (numeric: ${currentLevelNumber})`
);

export default log;
