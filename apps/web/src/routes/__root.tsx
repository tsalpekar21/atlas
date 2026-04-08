import interLatinExtWoff2 from "@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?url";
import interLatinWoff2 from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import appCss from "../styles.css?url";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Atlas Health",
			},
		],
		links: [
			{
				rel: "preload",
				href: interLatinWoff2,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
			{
				rel: "preload",
				href: interLatinExtWoff2,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: function NotFound() {
		return (
			<div style={{ padding: "3rem", textAlign: "center" }}>
				<h1
					style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}
				>
					404 – Page Not Found
				</h1>
				<p style={{ color: "#666" }}>
					Sorry, the page you’re looking for doesn’t exist.
				</p>
			</div>
		);
	},
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="antialiased">
				<TanStackQueryProvider>
					{children}
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				</TanStackQueryProvider>
				<Scripts />
			</body>
		</html>
	);
}
