// Next's standalone server reads HOSTNAME. Use an application-specific override.
process.env.HOSTNAME = process.env.APP_HOST ?? '0.0.0.0';
await import('../.next/standalone/server.js');
