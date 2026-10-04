export const bucketUrl = (userId: string, bucketKey: string) => {
	const base = process.env.R2_URL;
	if (!base) throw new Error("Storage is not configured");
	return `${base.replace(/\/+$/, "")}/${encodeURIComponent(userId)}/${encodeURIComponent(bucketKey)}`;
};
