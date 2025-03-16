import { Schema as S } from 'effect'

import { ZonedDateTimeString } from './datetime.js'

export const Entity = S.Struct({
	id: S.UUID,
	createdAt: ZonedDateTimeString,
	updatedAt: S.optional(ZonedDateTimeString),
}).annotations({ identifier: '@pacto-chat/agents-domain/Entity' })
export type Entity = S.Schema.Type<typeof Entity>

// // Helper to make fields optional with null/undefined
// export function Nullish<A, I, C>(schema: S.Schema<A, I, C>) {
// 	return S.optional(
// 		S.NullOr(schema).pipe(
// 			S.transform(schema.pipe(S.UndefinedOr), {
// 				decode: (_, fromI) => fromI ?? undefined,
// 				encode: (_, toI) => toI ?? null,
// 			}),
// 		),
// 	)
// }
