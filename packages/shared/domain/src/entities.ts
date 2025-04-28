import { Schema as S } from 'effect'

import { ZonedDateTimeString } from './datetime'

export const Entity = S.Struct({
	id: S.UUID,
	createdAt: ZonedDateTimeString,
	updatedAt: S.optional(ZonedDateTimeString),
}).annotations({ identifier: '@pacto-chat/shared-domain/Entity' })
export type Entity = typeof Entity.Type
