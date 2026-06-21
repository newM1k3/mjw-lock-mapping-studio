import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'https://immersive-kit.pockethost.io');

// Concurrent reads on mount otherwise abort each other and surface as "persistence errors".
pb.autoCancellation(false);

export default pb;
