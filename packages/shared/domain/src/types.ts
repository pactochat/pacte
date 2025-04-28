import { Schema as S } from 'effect'

export const Email = S.String.pipe(
	S.pattern(
		/^(?!\.)(?!.*\.\.)([A-Z0-9_+-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i,
	),
	S.brand('Email'),
).annotations({
	identifier: '@pacto-chat/shared-domain/Email',
})
export type Email = typeof Email.Type
