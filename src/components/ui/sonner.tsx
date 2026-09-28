import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
	return (
		<Sonner
			theme="dark"
			position="bottom-center"
			closeButton
			toastOptions={{
				classNames: {
					toast: "!bg-popover !text-popover-foreground !border-border",
					description: "!text-muted-foreground",
				},
			}}
			{...props}
		/>
	);
}
