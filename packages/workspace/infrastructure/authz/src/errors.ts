import { Data } from 'effect'

export class OpenFGAError extends Data.TaggedError('OpenFGAError')<{
	operation: string
	error: unknown
}> {}

export class AuthorizationCheckError extends Data.TaggedError(
	'AuthorizationCheckError',
)<{
	message: string
	userId: string
	action: string
	resource: string
}> {}

export class TupleWriteError extends Data.TaggedError('TupleWriteError')<{
	operation: string
	tuples: unknown[]
	error: unknown
}> {}
