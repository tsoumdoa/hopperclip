const R2_URL = process.env.R2_URL!;

export const bucketUrl = (userId: string, bucketKey: string) =>
	`${R2_URL}/${userId}/${bucketKey}`;
