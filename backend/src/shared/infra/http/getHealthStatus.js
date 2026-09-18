// Mapeia mongoose.connection.readyState para um status de saúde legível.
// https://mongoosejs.com/docs/api/connection.html#Connection.prototype.readyState
const ESTADOS_MONGOOSE = {
  0: 'desconectado',
  1: 'conectado',
  2: 'conectando',
  3: 'desconectando',
};

/**
 * @param {number} readyState - mongoose.connection.readyState
 * @returns {{ httpStatus: number, body: object }}
 */
function getHealthStatus(readyState) {
  const dbStatus = ESTADOS_MONGOOSE[readyState] || 'desconhecido';
  const dbOk = readyState === 1;

  return {
    httpStatus: dbOk ? 200 : 503,
    body: {
      status: dbOk ? 'ok' : 'degraded',
      db: dbStatus,
    },
  };
}

module.exports = getHealthStatus;
