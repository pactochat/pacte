import { Schema } from 'effect'

import { ZonedDateTimeString } from './datetime'

export const Entity = Schema.Struct({
	id: Schema.UUID,
	createdAt: ZonedDateTimeString,
	updatedAt: Schema.optional(ZonedDateTimeString),
}).annotations({ identifier: '@pacto-chat/shared-domain/Entity' })
export type Entity = typeof Entity.Type
