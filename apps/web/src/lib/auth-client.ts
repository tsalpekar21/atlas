import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = `${import.meta.env.VITE_API_URL}/api/auth`;

console.log('baseURL', import.meta.env.VITE_API_URL, process.env.VITE_API_URL);

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [anonymousClient()],
});
