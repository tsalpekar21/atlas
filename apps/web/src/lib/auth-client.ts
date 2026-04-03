import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = `${import.meta.env.VITE_API_URL ?? "http://localhost:4111"}/api/auth`;

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [anonymousClient()],
});
