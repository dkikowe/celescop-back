export function getDeadline(
	deadline: '3_MONTHS' | '6_MONTHS' | '1_YEAR'
): Date {
	const now = new Date()
	switch (deadline) {
		case '3_MONTHS':
			return new Date(now.setMonth(now.getMonth() + 3))
		case '6_MONTHS':
			return new Date(now.setMonth(now.getMonth() + 6))
		case '1_YEAR':
			return new Date(now.setFullYear(now.getFullYear() + 1))
		default:
			throw new Error('Invalid deadline option')
	}
}
