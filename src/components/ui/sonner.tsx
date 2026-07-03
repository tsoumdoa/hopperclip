"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
	return (
		<Sonner
			theme="dark"
			position="bottom-center"
			richColors
			closeButton
			{...props}
		/>
	);
}
