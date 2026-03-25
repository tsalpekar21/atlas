"use client";

import { NpiPhysicianLookupPage } from "@/features/npi-lookup/NpiPhysicianLookupPage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/npi-physician-lookup")({
	head: () => ({
		meta: [{ title: "NPI provider database · Atlas" }],
	}),
	component: NpiPhysicianLookupPage,
});
