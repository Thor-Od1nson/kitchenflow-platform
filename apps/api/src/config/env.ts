const requiredEnv = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;

export function validateEnv(config: Record<string, unknown>) {
  for (const key of requiredEnv) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const corsOrigin = typeof config.CORS_ORIGIN === 'string' ? config.CORS_ORIGIN : '';
  if (process.env.NODE_ENV === 'production' && (!corsOrigin || corsOrigin.includes('*'))) {
    throw new Error('CORS_ORIGIN must be explicit in production.');
  }

  return config;
}
