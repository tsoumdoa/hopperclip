import { generatePresigneDownloadUrl } from "@/server/r2-storage";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { decompress } from "../utils/gzip";

export function useFetchGhXml() {
	const decodedRef = useRef<string | undefined>(undefined);
	const { mutateAsync: downloadData } = useMutation({
		mutationFn: async (bucketId: string) => {
			const presignedUrl = await generatePresigneDownloadUrl({ data: bucketId });
			const res = await fetch(presignedUrl, {
				cache: "no-store",
				headers: {
					"Content-Encoding": "gzip",
					"Content-Type": "application/gzip",
				},
			});
			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}
			const blob = await res.blob();
			const uncompressed = await decompress(await blob.arrayBuffer());
			const decoded = new TextDecoder().decode(uncompressed);
			return decoded;
		},
	});
	return { downloadData, decodedRef };
}
