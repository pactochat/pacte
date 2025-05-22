import { Schema as S } from 'effect'

import {
	ListLanguageCodesLiteral,
	ZonedDateTimeString,
} from '@aipacto/shared-domain'

/**
 * Base input for harvesting operations
 */
export const BaseHarvestingInput = S.Struct({
	/**
	 * The URL to process
	 */
	url: S.String,
	/**
	 * Additional context for processing
	 */
	context: S.optional(S.Record({ key: S.String, value: S.Unknown })),
	/**
	 * Language preference for processing
	 */
	language: S.optional(ListLanguageCodesLiteral),
	/**
	 * Timestamp of the request
	 */
	timestamp: S.optional(ZonedDateTimeString),
}).annotations({ identifier: '@aipacto/harvesting-domain/BaseHarvestingInput' })
export type BaseHarvestingInput = typeof BaseHarvestingInput.Type

/**
 * Base output for harvesting operations
 */
export const BaseHarvestingOutput = S.Struct({
	/**
	 * The processed URL
	 */
	url: S.String,
	/**
	 * Success status of the operation
	 */
	success: S.Boolean,
	/**
	 * Processing metadata
	 */
	metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
	/**
	 * When the processing completed
	 */
	timestamp: S.optional(ZonedDateTimeString),
	/**
	 * Error message if operation failed
	 */
	error: S.optional(S.String),
}).annotations({
	identifier: '@aipacto/harvesting-domain/BaseHarvestingOutput',
})
export type BaseHarvestingOutput = typeof BaseHarvestingOutput.Type
