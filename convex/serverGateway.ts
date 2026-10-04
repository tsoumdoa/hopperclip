/** Only the trusted web server may provide client identities or finalize uploads. */
export function requireServerGateway(supplied: string): void {
	const expected = process.env.SERVER_GATEWAY_SECRET;
	if (!expected || expected.length < 32) {
		throw new Error("Server gateway is not configured");
	}
	// Do not short circuit on the first mismatched character.
	let difference = expected.length ^ supplied.length;
	for (let i = 0; i < expected.length; i++) {
		difference |= expected.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0);
	}
	if (difference !== 0) throw new Error("Not authorized");
}
