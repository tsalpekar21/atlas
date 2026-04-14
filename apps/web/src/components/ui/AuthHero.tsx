import { FeatherBrain, FeatherShield, FeatherUsers } from "@subframe/core";
import { BrandMark } from "./BrandMark";

interface AuthHeroProps {
	headline?: string;
	subhead?: string;
}

const DEFAULT_HEADLINE = "Deeper root causes. Better outcomes.";
const DEFAULT_SUBHEAD =
	"AI that works with your doctor, not without them. Get evidence-based insights that empower your care team to make better decisions, faster.";

export function AuthHero({
	headline = DEFAULT_HEADLINE,
	subhead = DEFAULT_SUBHEAD,
}: AuthHeroProps) {
	return (
		<div className="relative flex w-1/2 flex-col items-start justify-between overflow-hidden bg-neutral-900 px-12 py-12 mobile:hidden">
			<div className="absolute -top-32 -left-32 flex h-96 w-96 flex-none items-start rounded-full bg-brand-600 opacity-10 blur-[100px]" />
			<div className="absolute bottom-0 right-0 flex h-80 w-80 flex-none items-start rounded-full bg-brand-400 opacity-10 blur-[80px]" />

			<div className="z-10">
				<BrandMark size="md" tone="light" />
			</div>

			<div className="z-10 flex w-full max-w-[448px] flex-col items-start gap-8">
				<div className="flex flex-col items-start gap-6">
					<span className="font-heading-1 text-[40px] font-semibold leading-[44px] text-white -tracking-[0.03em]">
						{headline}
					</span>
					<span className="font-body text-[20px] font-normal leading-[28px] text-neutral-400 -tracking-[0.01em]">
						{subhead}
					</span>
				</div>
				<div className="flex flex-col items-start gap-4">
					<TrustBullet
						icon={
							<FeatherShield className="text-body font-body text-brand-300" />
						}
						label="HIPAA compliant and 256-bit encrypted"
					/>
					<TrustBullet
						icon={
							<FeatherBrain className="text-body font-body text-brand-300" />
						}
						label="AI-powered triage backed by peer-reviewed research"
					/>
					<TrustBullet
						icon={
							<FeatherUsers className="text-body font-body text-brand-300" />
						}
						label="Trusted by 50,000+ patients and 2,000+ physicians"
					/>
				</div>
			</div>

			<div className="z-10 flex w-full max-w-[448px] flex-col items-start gap-4">
				<div className="flex h-px w-full flex-none items-start bg-neutral-700" />
				<span className="font-body text-[16px] font-normal italic leading-[24px] text-neutral-400">
					&ldquo;Atlas Health helped me understand my symptoms before my
					appointment. My doctor was impressed with how prepared I was.&rdquo;
				</span>
				<div className="flex items-center gap-3">
					<img
						className="h-10 w-10 flex-none rounded-full object-cover"
						src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
						alt=""
					/>
					<div className="flex flex-col items-start">
						<span className="text-body-bold font-body-bold text-white">
							Sarah Mitchell
						</span>
						<span className="text-caption font-caption text-neutral-400">
							Patient since 2024
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function TrustBullet({
	icon,
	label,
}: {
	icon: React.ReactNode;
	label: string;
}) {
	return (
		<div className="flex items-center gap-3">
			<div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-800">
				{icon}
			</div>
			<span className="text-body font-body text-neutral-300">{label}</span>
		</div>
	);
}
