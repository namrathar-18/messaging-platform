const DEFAULT_CLIENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function parseAllowedOrigins() {
  const configured = [process.env.CLIENT_URL, process.env.CLIENT_ORIGINS]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...configured, ...DEFAULT_CLIENT_ORIGINS])];
}

module.exports = { parseAllowedOrigins };
