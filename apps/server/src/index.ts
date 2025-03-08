import Fastify from 'fastify';
import { sayHello } from '@agentic/core';

const server = Fastify({ logger: true });

server.get('/', async (request, reply) => {
	return sayHello('Agentic User');
});

const start = async () => {
	try {
		await server.listen({ port: 3000, host: '0.0.0.0' });
		console.log('Server running at http://localhost:3000');
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

start();
