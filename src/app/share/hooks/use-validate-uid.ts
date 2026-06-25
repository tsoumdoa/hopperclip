import { ShareLinkUidSchema } from "@/types/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export function useValidateShareToken() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/share" });
	const token = search.token;
	const tokenRef = useRef(token);
	const [isValidToken, setIsValidToken] = useState(false);

	useEffect(() => {
		if (!token) {
			navigate({ to: "/" });
			return;
		}
		const isValid = ShareLinkUidSchema.safeParse(token);
		if (!isValid.success) {
			navigate({ to: "/" });
		} else {
			setIsValidToken(true);
			tokenRef.current = token;
		}
	}, [token, navigate]);

	return {
		isValidToken,
		tokenRef,
	};
}
