"use client";

import { createFileRoute } from "@tanstack/react-router";
import { RagChunkExplorerPage } from "@/features/rag-chunk-explorer/RagChunkExplorerPage.tsx";

export const Route = createFileRoute("/rag-chunks")({
	head: () => ({
		meta: [{ title: "RAG chunk viewer · Atlas" }],
	}),
	component: RagChunkExplorerPage,
});
