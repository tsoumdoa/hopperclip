"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
	return (
		<Sonner
			theme="system"
			position="bottom-center"
			closeButton
			toastOptions={{
				classNames: {
					toast: "!bg-background !text-foreground !border-border",
					description: "!text-muted-foreground",
				},
			}}
			{...props}
		/>
	);
}
