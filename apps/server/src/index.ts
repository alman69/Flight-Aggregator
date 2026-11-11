import { createApp } from './app';

// Bind to the loopback interface only: this API is for this Mac, not the network.
const HOST = '127.0.0.1';
// API_PORT (not PORT) so tools that set PORT for the web dev server do not move the API.
const PORT = Number(process.env.API_PORT ?? 5174);

createApp().listen(PORT, HOST, () => {
  console.log(`Flight Aggregator API listening on http://${HOST}:${PORT}`);
});
