import { config } from 'dotenv';
import Fastify from 'fastify';
import { createClient } from 'redis';
import { BookingRequest, BookingResponse, ErrorResponse } from './interfaces';
import { opts } from './schema';
import { reserveLua } from './scripts';

config();

async function build() {
  const app = Fastify({ logger: true });

  const redisUrl = `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
  const redis = createClient({ url: redisUrl });

  redis.on('error', (err) => app.log.error(err));
  await redis.connect();
  app.log.info(`Connected to Redis ${redisUrl}`);

  app.post<{ Body: BookingRequest }>('/reserve', opts, async (request, reply) => {
    const booking: BookingRequest = request.body;
    app.log.info(`Received booking request: ${JSON.stringify(booking)}`);
    try {
      app.log.info(`Booking attempt: seat ${booking.seat_id}, user ${booking.user_id}`);

      // Race condition via lua script
      const reserved = await redis.eval(reserveLua, { keys: [booking.seat_id], arguments: [booking.user_id] });
      const isReserved = reserved === 1;
      const response: BookingResponse = {
        success: Boolean(isReserved),
        message: isReserved ? 'Место забронировано успешно' : 'Место уже занято',
      };

      return response;
    } catch (err) {
      app.log.error(err);
      const response: ErrorResponse = {
        success: false,
        message: 'Internal Server Error',
        error: err instanceof Error ? err.message : String(err),
      };
      return reply.status(500).send(response);
    }
  });

  app.addHook('onClose', async (instance) => {
    instance.log.info('Closing Redis connection...');
    await redis.close();
    console.log('Redis connection closed.');
  });

  return app;
}

async function startServer() {
  const app = await build();

  const address = await app.listen({
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0'
  });

  console.log(`Server listening at ${address}`);

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, starting graceful shutdown...`);

    try {
      await app.close();
      console.log('Server closed successfully');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

if (require.main === module) {
  console.log('Starting application...');
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default build;
