// to be made into a package for easier sharing shortly
import rTracer from 'cls-rtracer';
import winston from 'winston';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  graphql: 4,
  debug: 5,
};

const env = process.env.NODE_ENV || 'development';
const isDevelopment = env === 'development';
const isLocal = env === 'local';
const level = () => {
  // dev & local environments run at debug, prod runs at info
  return isDevelopment || isLocal ? 'debug' : 'info';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// may replace, but this hopefully will be 1 step into having multiline messages be 1 log
const replaceNewlines = winston.format((info, _opts) => {
  info[Symbol.for('message')] = info[Symbol.for('message')].replace(
    /\n/g,
    '\r'
  );
  return info;
});

// insert a service-specific identifier per thread
// this will shortly be replaced by embedding distributed tracing ids
// for inter-system & intra-system coordination
const rTracerFormat = winston.format.printf((info) => {
  const rid = rTracer.id();
  return rid
    ? `${info.timestamp} [request-id:${rid}]: ${info.message}`
    : `${info.timestamp}: ${info.message}`;
});

winston.addColors(colors);
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  ),
  replaceNewlines(),
  rTracerFormat
);

const fileLoggingTransports = [
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({ filename: 'logs/all.log' }),
];

const transports = [
  new winston.transports.Console(),
  ...(isLocal ? fileLoggingTransports : []),
];

const Logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

export default Logger;
