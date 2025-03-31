// utils/logger.ts
import { LogLevel } from './logLevel';

const currentLogLevel: LogLevel = import.meta.env.VITE_LOG_LEVEL || LogLevel.DEBUG;

const logOrder = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.NONE]: 4,
};

const logger = {
    debug: (...args: any[]) => {
        if (logOrder[currentLogLevel] <= logOrder[LogLevel.DEBUG]) {
            console.debug('[DEBUG]:', ...args);
        }
    },
    info: (...args: any[]) => {
        if (logOrder[currentLogLevel] <= logOrder[LogLevel.INFO]) {
            console.info('[INFO]:', ...args);
        }
    },
    warn: (...args: any[]) => {
        if (logOrder[currentLogLevel] <= logOrder[LogLevel.WARN]) {
            console.warn('[WARN]:', ...args);
        }
    },
    error: (...args: any[]) => {
        if (logOrder[currentLogLevel] <= logOrder[LogLevel.ERROR]) {
            console.error('[ERROR]:', ...args);
        }
    },
};

export default logger;
