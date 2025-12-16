import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "693a98c31d0729f805dd02ce", 
  requiresAuth: true // Ensure authentication is required for all operations
});
