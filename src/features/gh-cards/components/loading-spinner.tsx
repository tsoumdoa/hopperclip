import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const loadingSpinnerVariants = cva(["regular", "small"], {
	variants: {
		variant: {
			regular: "h-6 py-[2px] text-sm",
			small: "h-5 py-[1px] text-sm",
		},
	},
});

export function LoadingSpinner({
	variant,
}: React.ComponentProps<"p"> & VariantProps<typeof loadingSpinnerVariants>) {
	return (
		<p
			className={cn(loadingSpinnerVariants({ variant }))}
			role="status"
			aria-label="Loading"
		>
			<svg
				aria-hidden
				className="my-auto size-5 animate-spin text-white"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle
					className="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					strokeWidth="4"
				></circle>
				<path
					className="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		</p>
	);
}
