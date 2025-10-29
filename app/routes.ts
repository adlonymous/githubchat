import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("chat/:repoUrl", "routes/chat.$repoUrl.tsx"),
	route("history", "routes/history.tsx"),
] satisfies RouteConfig;
