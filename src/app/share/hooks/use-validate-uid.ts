import { ShareLinkUidSchema } from "@/types/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function useValidateShareToken() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/share" });
	const token = search.token;
	const [validatedToken, setValidatedToken] = useState<string | null>(null);
	const [isValidToken, setIsValidToken] = useState(false);

	useEffect(() => {
		if (!token) {
			navigate({ to: "/", replace: true });
			return;
		}
		const isValid = ShareLinkUidSchema.safeParse(token);
		if (!isValid.success) {
			navigate({ to: "/", replace: true });
		} else {
			setIsValidToken(true);
			setValidatedToken(token);
		}
	}, [token, navigate]);

	return {
		isValidToken,
		validatedToken,
	};
}
