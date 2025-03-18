import log from 'loglevel';

// Configurar nivel según el ambiente
if (process.env.NODE_ENV === 'production') {
    log.setLevel('warn'); // Solo warnings y errores en producción
} else {
    log.setLevel('debug'); // Verbose en desarrollo
}

export default log;