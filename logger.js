const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf, json } = format;

const customFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level.toLocaleUpperCase()}: ${message}`;
});

const consoleLoggerParameters = {
  json: true,
  timestamp: true,
  colorize: true
};

if (process.env.NODE_ENV === 'production') {
  consoleLoggerParameters.level = 'info';
}

if (process.env.NODE_ENV === 'development') {
  consoleLoggerParameters.level = 'debug';
}

if (process.env.NODE_ENV === 'test') {
  consoleLoggerParameters.level = 'fatal';
}

const currentDate = new Date().toISOString().split('T')[0];
const fileLoggerParameters = {
  level: 'info', // Set the desired log level for the file
  filename: `logs/${currentDate}-app.log`, // Specify the file name and path
  maxsize: 5242880, // 5MB, adjust as needed
  maxFiles: 5, // Number of log files to keep
  format: combine(
    timestamp(),
    json()
  )
};

const logger = createLogger({
  transports: [
    new transports.Console(consoleLoggerParameters),
    new transports.File(fileLoggerParameters)
  ],
  format: combine(
    timestamp(),
    json()
  )
});

module.exports = logger;
