import { Data } from 'effect'

/**
 * Error thrown when agent processing fails
 */
export class AgentProcessingError extends Data.TaggedError(
	'AgentProcessingError',
)<{
	readonly error?: unknown
	readonly message?: string
}> {}

/**
 * Error thrown when agent graph compilation fails
 */
export class AgentGraphError extends Data.TaggedError('AgentGraphError')<{
	readonly error?: unknown
	readonly message?: string
}> {}
