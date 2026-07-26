import { useEffect, useState } from "react";

export function useModifierKeyLabel(): "⌘" | "Ctrl" {
	const [modifier, setModifier] = useState<"⌘" | "Ctrl">("Ctrl");

	useEffect(() => {
		setModifier(window.navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl");
	}, []);

	return modifier;
}
