import { buildServer } from './server.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const server = buildServer();

  try {
    const address = await server.listen({ port: PORT, host: HOST });
    console.log(`🚀 Postty Cloud API is running at: ${address}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

main();
