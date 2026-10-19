import { useAuth } from "@clerk/tanstack-react-start";
import { useCallback, useEffect, useRef } from "react";
import { useGhXmlClient } from "../providers/GhXmlCacheProvider";
import { cancelledGhRead, type GhXmlTarget } from "../lib/gh-xml-client";

export function useFetchGhXml() {
	const client = useGhXmlClient();
	const { userId } = useAuth();
	const currentUser = useRef(userId);
	currentUser.current = userId;
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const downloadData = useCallback(
		async (target: GhXmlTarget) => {
			const startedAs = currentUser.current;
			if (!startedAs) throw cancelledGhRead();
			const xml = await client.read(target, startedAs);
			if (!mounted.current || currentUser.current !== startedAs)
				throw cancelledGhRead();
			return xml;
		},
		[client]
	);
	return { downloadData };
}
