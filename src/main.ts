import { startServer } from './express';

(async () => {
  const { adminUrl, publicUrl } = await startServer(4029);
  console.log(`🚀 Public server ready at http://localhost:4029${publicUrl}`);
  console.log(`🚀 Public server ready at http://localhost:4029${adminUrl}`);
})();
