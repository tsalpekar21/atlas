import { initialize } from "@atlas/logger";

initialize({
	applicationEnvironment:
		process.env.NODE_ENV === "production" ? "production" : "development",
});
