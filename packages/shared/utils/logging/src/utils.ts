export function formatArgs(args: any[]): string {
	if (!args || args.length === 0) return ''

	return args
		.map(arg => {
			if (typeof arg === 'object' && arg !== null) {
				try {
					const getCircularReplacer = () => {
						const seen = new WeakSet()
						return (key: string, value: any) => {
							if (typeof value === 'function') return '[Function]'
							if (value instanceof RegExp) return value.toString()
							if (typeof value === 'object' && value !== null) {
								if (seen.has(value)) return '[Circular]'
								seen.add(value)
							}
							if (
								key === 'body' &&
								typeof value === 'string' &&
								value.length > 100
							) {
								return `${value.substring(0, 100)}...`
							}
							return value
						}
					}
					return JSON.stringify(arg, getCircularReplacer(), 2)
				} catch (e) {
					return `{${Object.keys(arg)
						.map(key => {
							const value = (arg as any)[key]
							return `${key}: ${typeof value === 'object' ? '[Object]' : String(value)}`
						})
						.join(', ')}}`
				}
			}
			return String(arg)
		})
		.join(' ')
}
