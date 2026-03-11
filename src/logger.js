const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;

function fmt(level, msg, meta) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${msg}`;
  return meta !== undefined ? `${base} ${JSON.stringify(meta)}` : base;
}

const logger = {
  debug: (msg, meta) => { if (currentLevel <= LEVELS.debug) console.log(fmt('debug', msg, meta)); },
  info:  (msg, meta) => { if (currentLevel <= LEVELS.info)  console.log(fmt('info', msg, meta)); },
  warn:  (msg, meta) => { if (currentLevel <= LEVELS.warn)  console.warn(fmt('warn', msg, meta)); },
  error: (msg, meta) => { if (currentLevel <= LEVELS.error) console.error(fmt('error', msg, meta)); },
};

module.exports = logger;
