interface QdrantFilter {
	must: {
		key: string
		match: {
			value: unknown
		}
	}[]
}

/**
 * Helper to build a Qdrant filter from metadata
 * @param metadata Optional metadata for building the filter.
 *                 Keys are metadata fields, values are the values to match.
 * @returns Qdrant Filter object or undefined if no metadata is provided.
 */
export function buildQdrantFilter(
	metadata?: Record<string, unknown>,
): QdrantFilter | undefined {
	const must = []
	if (metadata) {
		for (const [key, value] of Object.entries(metadata)) {
			if (
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean'
			) {
				must.push({
					key: `metadata.${key}`, // Assumes metadata is stored under a 'metadata' field in Qdrant points
					match: { value },
				})
			}
		}
	}
	return must.length > 0 ? { must } : undefined
}
