import { hc } from "hono/client";
import type { AppType } from "@atlas/api/app";

const SERVER_URL =
  process.env.SERVER_URL || "http://localhost:4111";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
  }
  return headers;
}

export const api = hc<AppType>(SERVER_URL, {
  headers: getHeaders(),
});

export const chatUrl = `${SERVER_URL}/chat`;
