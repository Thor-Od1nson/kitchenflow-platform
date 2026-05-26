const requiredEnv = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;

export function validateEnv(config: Record<string, unknown>) {
  for (const key of requiredEnv) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const corsOrigin = typeof config.CORS_ORIGIN === 'string' ? config.CORS_ORIGIN : '';
  if (process.env.NODE_ENV === 'production' && corsOrigin.includes('*')) {
    throw new Error('CORS_ORIGIN must be explicit in production.');
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (config.JWT_ACCESS_SECRET === 'replace-me' || config.JWT_REFRESH_SECRET === 'replace-me')
  ) {
    throw new Error('Production JWT secrets must be rotated from placeholder values.');
  }

  return config;
}
