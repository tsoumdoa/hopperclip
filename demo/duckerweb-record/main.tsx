import { createRoot } from "react-dom/client";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import DuckerWebPage from "@/app/duckerweb/page";
import "@/styles/app.css";

const rootRoute = createRootRoute({
	component: DuckerWebPage,
});

const router = createRouter({
	routeTree: rootRoute,
	history: createMemoryHistory({ initialEntries: ["/"] }),
});

const root = document.getElementById("root");
if (!root) {
	throw new Error("Missing #root element");
}

createRoot(root).render(<RouterProvider router={router} />);
