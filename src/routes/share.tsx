import { createFileRoute } from "@tanstack/react-router";
import Header from "@/app/components/header";
import ShareView from "@/app/share/components/share-view";
import ShareError from "@/app/share/error";
import { ShareLinkUidSchema } from "@/types/types";

export const Route = createFileRoute("/share")({
	ssr: false,
	validateSearch: (search) => ({
		token: ShareLinkUidSchema.optional().parse(search.token),
	}),
	errorComponent: ShareError,
	component: SharePage,
});

function SharePage() {
	return (
		<div className="flex min-h-screen flex-col bg-black p-4 font-sans text-white md:p-6">
			<div className="mx-auto w-full max-w-[100rem]">
				<Header />
			</div>
			<div className="flex h-full w-full flex-grow flex-col items-center justify-center p-4 pb-[72px]">
				<ShareView />
			</div>
		</div>
	);
}
