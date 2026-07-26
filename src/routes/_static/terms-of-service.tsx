import { createFileRoute } from "@tanstack/react-router";
import Header from "@/app/components/header";

export const Route = createFileRoute("/_static/terms-of-service")({
	head: () => ({
		meta: [{ title: "Terms of Service | Hopper Clip" }],
	}),
	component: TermsOfService,
});

function TermsOfService() {
	return (
		<div className="min-h-screen bg-black font-sans text-white [&_h2]:text-neutral-200 [&_h3]:text-neutral-200 [&_li]:text-neutral-300 [&_p]:text-neutral-300">
			<div className="mx-auto max-w-[100rem] p-4 md:px-6 md:pt-6 md:pb-2">
				<Header />
				<div className="font-sans text-neutral-800 antialiased">
					<div className="mx-auto max-w-4xl px-4 py-2 sm:px-6 lg:px-8">
						<h1 className="pb-6 text-center text-2xl font-extrabold text-neutral-100 sm:text-3xl">
							Hopper Clip Terms and Conditions
						</h1>

						<p className="pb-8 text-center text-sm text-neutral-600">
							Effective Date: June 30, 2025
						</p>

						<p className="pb-6 leading-relaxed">
							Welcome to Hopper Clip! These Terms and Conditions
							(&quot;Terms&quot;) govern your use of the Hopper Clip web
							application (the &quot;Service&quot;). By accessing or using the
							Service, you agree to be bound by these Terms. If you do not agree
							to these Terms, please do not use the Service.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							1. Acceptance of Terms
						</h2>
						<p className="pb-6 leading-relaxed">
							By creating an account and using Hopper Clip, you affirm that you
							are of legal age to form a binding contract and that you accept
							and agree to be bound by these Terms. If you are using the Service
							on behalf of an organization, you are agreeing to these Terms for
							that organization and promising that you have the authority to
							bind that organization to these Terms. In that case,
							&quot;you&quot; and &quot;your&quot; will refer to that
							organization.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							2. Description of Service
						</h2>
						<p className="pb-6 leading-relaxed">
							Hopper Clip is an open-source web application developed and
							maintained by Tomo Suda. The Service allows users to create,
							store, and manage &quot;snippets&quot; of your Grasshopper
							scripts. As an open-source project, you have the option to host
							your own version of HopperClip. The GitHub repository for this
							project is available{" "}
							<a
								className="underline"
								href="https://github.com/tsoumdoa/hopperclip"
							>
								here
							</a>
							.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							3. User Accounts
						</h2>

						<h3 className="pb-3 text-2xl font-semibold text-neutral-800">
							a. Account Creation:
						</h3>
						<ul className="list-disc pb-6 pl-5 leading-relaxed">
							<li className="pb-2">
								To use certain features of the Service, you must create an
								account. We use Clerk as our authentication provider.
							</li>
							<li className="pb-2">
								You agree to provide accurate, current, and complete information
								during the registration process and to update such information
								to keep it accurate, current, and complete.
							</li>
						</ul>

						<h3 className="pb-3 text-2xl font-semibold text-neutral-800">
							b. Account Security:
						</h3>
						<ul className="list-disc pb-6 pl-5 leading-relaxed">
							<li className="pb-2">
								You are responsible for maintaining the confidentiality of your
								account credentials and for all activities that occur under your
								account.
							</li>
							<li className="pb-2">
								You agree to notify us immediately of any unauthorized use of
								your account or any other breach of security.
							</li>
							<li className="pb-2">
								We will not be liable for any loss or damage arising from your
								failure to comply with this section.
							</li>
						</ul>

						<h3 className="pb-3 text-2xl font-semibold text-neutral-800">
							c. Third-Party Authentication:
						</h3>
						<p className="pb-6 leading-relaxed">
							If you choose to log in using a third-party service like Google or
							GitHub via Clerk, you are subject to the terms and conditions of
							those third-party services. We only receive necessary
							authentication information (e.g., user ID, email address) to
							create and secure your Hopper Clip account.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							4. User Content and Conduct
						</h2>

						<h3 className="pb-3 text-2xl font-semibold text-neutral-800">
							a. Your Snippets:
						</h3>
						<p className="pb-6 leading-relaxed">
							The core functionality of Hopper Clip involves you creating and
							managing &quot;snippets&quot; of scripts. You retain all rights to
							the content you create and store on Hopper Clip.
						</p>

						<h3 className="pb-3 text-2xl font-semibold text-neutral-800">
							b. Prohibited Conduct:
						</h3>
						<p className="pb-6 leading-relaxed">
							You agree not to use the Service to:
						</p>
						<ul className="list-disc pb-6 pl-5 leading-relaxed">
							<li className="pb-2">
								Upload, post, transmit, or otherwise make available any content
								that is unlawful, harmful, threatening, abusive, harassing,
								tortious, defamatory, vulgar, obscene, libelous, invasive of
								another&apos;s privacy, hateful, or racially, ethnically, or
								otherwise objectionable.
							</li>
							<li className="pb-2">Harm minors in any way.</li>
							<li className="pb-2">
								Impersonate any person or entity, or falsely state or otherwise
								misrepresent your affiliation with a person or entity.
							</li>
							<li className="pb-2">
								Forge headers or otherwise manipulate identifiers in order to
								disguise the origin of any content transmitted through the
								Service.
							</li>
							<li className="pb-2">
								Upload, post, transmit, or otherwise make available any content
								that you do not have a right to make available under any law or
								under contractual or fiduciary relationships.
							</li>
							<li className="pb-2">
								Upload, post, transmit, or otherwise make available any content
								that infringes any patent, trademark, trade secret, copyright,
								or other proprietary rights of any party.
							</li>
							<li className="pb-2">
								Upload, post, transmit, or otherwise make available any
								unsolicited or unauthorized advertising, promotional materials,
								&quot;junk mail,&quot; &quot;spam,&quot; &quot;chain
								letters,&quot; &quot;pyramid schemes,&quot; or any other form of
								solicitation.
							</li>
							<li className="pb-2">
								Upload, post, transmit, or otherwise make available any material
								that contains software viruses or any other computer code,
								files, or programs designed to interrupt, destroy, or limit the
								functionality of any computer software or hardware or
								telecommunications equipment.
							</li>
							<li className="pb-2">
								Interfere with or disrupt the Service or servers or networks
								connected to the Service, or disobey any requirements,
								procedures, policies, or regulations of networks connected to
								the Service.
							</li>
							<li className="pb-2">
								Intentionally or unintentionally violate any applicable local,
								state, national, or international law.
							</li>
						</ul>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							5. Intellectual Property
						</h2>
						<p className="pb-6 leading-relaxed">
							Hopper Clip is an open-source project. The code for the Service is
							available under an open-source license. However, these Terms do
							not transfer from us to you any Hopper Clip or third-party
							intellectual property, and all right, title, and interest in and
							to such property will remain solely with Hopper Clip. Your use of
							the Service grants you no right or license to reproduce or
							otherwise use any Hopper Clip or third-party trademarks.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							6. Privacy Policy
						</h2>
						<p className="pb-6 leading-relaxed">
							Your use of the Service is also governed by our Privacy Policy,
							which is incorporated into these Terms by this reference. Please
							review our Privacy Policy to understand our practices regarding
							the collection, use, and disclosure of your personal information.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							7. Data Storage
						</h2>
						<p className="pb-6 leading-relaxed">
							Metadata associated with each script snippet is stored in Convex,
							our backend platform that provides the database and serverless
							functions for the Service. The actual script content is
							gzip-compressed and stored in Cloudflare R2 blob storage. We
							implement reasonable security measures to protect your data. As
							site administrators, we have access to this data for the purpose
							of operating, maintaining, and supporting the Service.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							8. Third-Party Services
						</h2>
						<p className="pb-6 leading-relaxed">
							We use third-party service providers to help us operate and
							provide the Service, including:
						</p>
						<ul className="list-disc pb-6 pl-5 leading-relaxed">
							<li className="pb-2">
								Clerk (for authentication and user management)
							</li>
							<li className="pb-2">
								Convex (for database, serverless functions, and real-time data
								sync)
							</li>
							<li className="pb-2">
								Cloudflare R2 (for blob storage - script content)
							</li>
							<li className="pb-2">
								PostHog (for web analytics and error tracking)
							</li>
							<li className="pb-2">
								Vercel (for application hosting and deployment)
							</li>
						</ul>
						<p className="pb-6 leading-relaxed">
							These providers are contractually obligated to protect your
							information and only use it for the purposes of providing their
							services to us.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							9. Termination and Account Deletion
						</h2>

						<h3 className="pb-3 text-2xl font-semibold text-neutral-800">
							a. Termination by You:
						</h3>
						<p className="pb-6 leading-relaxed">
							You may delete your Hopper Clip account at any time through your
							account settings or by contacting us. Upon account deletion, all
							your associated data, including your account information, script
							snippets, and any associated metadata, will be destroyed.
						</p>

						<h3 className="pb-3 text-2xl font-semibold text-neutral-800">
							b. Termination by Us:
						</h3>
						<p className="pb-6 leading-relaxed">
							We may terminate or suspend your access to all or part of the
							Service, without prior notice or liability, for any reason
							whatsoever, including without limitation if you breach these
							Terms. All provisions of these Terms which by their nature should
							survive termination shall survive termination, including, without
							limitation, ownership provisions, warranty disclaimers, indemnity,
							and limitations of liability.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							10. Disclaimers
						</h2>
						<p className="pb-6 leading-relaxed">
							THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS
							AVAILABLE&quot; BASIS. HOPPER CLIP EXPRESSLY DISCLAIMS ALL
							WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING, BUT
							NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
							FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. HOPPER CLIP MAKES
							NO WARRANTY THAT (I) THE SERVICE WILL MEET YOUR REQUIREMENTS; (II)
							THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE;
							(III) THE RESULTS THAT MAY BE OBTAINED FROM THE USE OF THE SERVICE
							WILL BE ACCURATE OR RELIABLE; OR (IV) THE QUALITY OF ANY PRODUCTS,
							SERVICES, INFORMATION, OR OTHER MATERIAL PURCHASED OR OBTAINED BY
							YOU THROUGH THE SERVICE WILL MEET YOUR EXPECTATIONS.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							11. Limitation of Liability
						</h2>
						<p className="pb-6 leading-relaxed">
							YOU EXPRESSLY UNDERSTAND AND AGREE THAT HOPPER CLIP SHALL NOT BE
							LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
							CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO,
							DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER
							INTANGIBLE LOSSES (EVEN IF HOPPER CLIP HAS BEEN ADVISED OF THE
							POSSIBILITY OF SUCH DAMAGES), RESULTING FROM: (I) THE USE OR THE
							INABILITY TO USE THE SERVICE; (II) THE COST OF PROCUREMENT OF
							SUBSTITUTE GOODS AND SERVICES RESULTING FROM ANY GOODS, DATA,
							INFORMATION, OR SERVICES PURCHASED OR OBTAINED OR MESSAGES
							RECEIVED OR TRANSACTIONS ENTERED INTO THROUGH OR FROM THE SERVICE;
							(III) UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR TRANSMISSIONS
							OR DATA; (IV) STATEMENTS OR CONDUCT OF ANY THIRD PARTY ON THE
							SERVICE; OR (V) ANY OTHER MATTER RELATING TO THE SERVICE.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							12. Indemnification
						</h2>
						<p className="pb-6 leading-relaxed">
							You agree to indemnify, defend, and hold harmless Hopper Clip and
							its developer, Tomo Suda, from and against any and all claims,
							liabilities, damages, losses, costs, expenses, or fees (including
							reasonable attorneys&apos; fees) arising from your use of the
							Service or your violation of these Terms.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							13. Governing Law
						</h2>
						<p className="pb-6 leading-relaxed">
							These Terms shall be governed by and construed in accordance with
							the laws of HKSAR, without regard to its conflict of law
							principles.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							14. Changes to Terms and Conditions
						</h2>
						<p className="pb-6 leading-relaxed">
							We reserve the right to modify these Terms at any time. We will
							notify you of any changes by sending an email to the email address
							associated with your account. The &quot;Effective Date&quot; at
							the top of these Terms will also be updated. Your continued use of
							the Service after any such modifications constitutes your
							acceptance of the new Terms.
						</p>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							15. Miscellaneous
						</h2>
						<ul className="list-disc pb-6 pl-5 leading-relaxed">
							<li className="pb-2">
								<strong className="font-semibold">Entire Agreement:</strong>{" "}
								These Terms constitute the entire agreement between you and
								Hopper Clip regarding the use of the Service.
							</li>
							<li className="pb-2">
								<strong className="font-semibold">
									Waiver and Severability:
								</strong>{" "}
								Our failure to exercise or enforce any right or provision of
								these Terms shall not constitute a waiver of such right or
								provision. If any provision of these Terms is found by a court
								of competent jurisdiction to be invalid, the parties
								nevertheless agree that the court should endeavor to give effect
								to the parties&apos; intentions as reflected in the provision,
								and the other provisions of these Terms remain in full force and
								effect.
							</li>
							<li className="pb-2">
								<strong className="font-semibold">
									Children&apos;s Privacy:
								</strong>{" "}
								Hopper Clip is not intended for use by children under the age of
								13. If we learn that we have collected personal information from
								a child under 13 without verifiable parental consent, we will
								take steps to delete that information promptly.
							</li>
						</ul>

						<h2 className="pb-4 text-3xl font-bold text-neutral-900">
							16. Contact Us
						</h2>
						<p className="pb-6 leading-relaxed">
							If you have any questions about these Terms and Conditions, please
							contact us at:
						</p>
						<p className="pb-8 text-center text-lg font-semibold text-blue-600">
							support@hopperclip.com
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
