import { ShareLinkUidSchema } from "@/types/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

export function useValidateShareToken() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/share" });
	const token = (search as { token?: string }).token;
	const parsed = ShareLinkUidSchema.safeParse(token);

	useEffect(() => {
		if (!parsed.success) {
			navigate({ to: "/", replace: true });
		}
	}, [parsed.success, navigate]);

	return {
		isValidToken: parsed.success,
		validatedToken: parsed.success ? parsed.data : null,
	};
}
