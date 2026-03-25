import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Atlas" }],
  }),
  beforeLoad: async () => {
    throw redirect({ to: "/patient-triage-demo" });
  },
});
