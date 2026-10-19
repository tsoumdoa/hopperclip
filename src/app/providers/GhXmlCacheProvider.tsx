import { useAuth } from "@clerk/tanstack-react-start";
import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { env } from "@/env";
import { resolveOwnedGhDownload } from "@/server/gh-download";
import { GhXmlClient } from "../lib/gh-xml-client";

const Context = createContext<GhXmlClient | null>(null);

export function GhXmlCacheProvider({ children }: { children: ReactNode }) {
	const { isLoaded, userId } = useAuth();
	const [client] = useState(
		() =>
			new GhXmlClient(env.VITE_CONVEX_URL, (postId, signal) =>
				resolveOwnedGhDownload({ data: postId, signal })
			)
	);
	useEffect(() => client.connect(), [client]);
	useEffect(() => {
		if (isLoaded) client.setUser(userId ?? null);
	}, [client, isLoaded, userId]);
	return <Context.Provider value={client}>{children}</Context.Provider>;
}

export function useGhXmlClient(): GhXmlClient {
	const client = useContext(Context);
	if (!client) throw new Error("GhXmlCacheProvider is required");
	return client;
}
