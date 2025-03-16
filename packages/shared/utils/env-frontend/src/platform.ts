export const isWeb = (): boolean => {
	try {
		return typeof window !== 'undefined' && window.document !== undefined
	} catch {
		return false
	}
}
