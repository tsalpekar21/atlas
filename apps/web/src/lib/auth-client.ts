import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "@/env";

const baseURL = `${env.VITE_API_URL}/api/auth`;

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [anonymousClient()],
});
