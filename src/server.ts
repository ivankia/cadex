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
    const { user_id: userId, seat_id: seatId } = request.body;
    const seatKey = `seat:${seatId}`;

    try {
      app.log.info(`Booking attempt: seat ${seatId}, user ${userId}`);

      // Race condition via lua script
      const reserved = await redis.eval(reserveLua, { keys: [seatKey], arguments: [String(userId)] });
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

  app.addHook('onClose', async () => {
    await redis.close();
  });

  return app;
}

if (require.main === module) {
  console.log('Starting application...');
  build()
    .then((app) => app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' }))
    .then((address) => console.log(`Server listening at ${address}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default build;
