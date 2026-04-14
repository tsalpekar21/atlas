export function formatRelativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	const diffMs = Date.now() - then;
	const min = Math.floor(diffMs / 60_000);
	if (min < 1) return "Just now";
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.floor(hr / 24);
	if (day === 1) return "Yesterday";
	if (day < 7) return `${day} days ago`;
	return new Date(iso).toLocaleDateString();
}
