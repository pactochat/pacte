import { Data, Schema as S } from 'effect'

import { ListLanguageCodesLiteral } from '@aipacto/shared-domain'

/**
 * Firecrawl output formats
 */
export const FirecrawlFormat = S.Union(
	S.Literal('markdown'),
	S.Literal('html'),
	S.Literal('rawHtml'),
	S.Literal('screenshot'),
	S.Literal('screenshot@fullPage'),
	S.Literal('links'),
	S.Literal('json'),
)
export type FirecrawlFormat = typeof FirecrawlFormat.Type

/**
 * Firecrawl action types
 */
export const FirecrawlActionType = S.Union(
	S.Literal('wait'),
	S.Literal('click'),
	S.Literal('type'),
	S.Literal('scroll'),
	S.Literal('screenshot'),
)
export type FirecrawlActionType = typeof FirecrawlActionType.Type

/**
 * Firecrawl action definition
 */
export const FirecrawlAction = S.Struct({
	type: FirecrawlActionType,
	/**
	 * CSS selector for the action target
	 */
	selector: S.optional(S.String),
	/**
	 * Text to type (for 'type' actions)
	 */
	text: S.optional(S.String),
	/**
	 * Wait duration in milliseconds
	 */
	waitTime: S.optional(S.Number),
}).annotations({ identifier: '@aipacto/harvesting-domain/FirecrawlAction' })
export type FirecrawlAction = typeof FirecrawlAction.Type

/**
 * Location settings for requests
 */
export const LocationSettings = S.Struct({
	/**
	 * ISO 3166-1 alpha-2 country code
	 */
	country: S.optional(S.String),
	/**
	 * Preferred languages in order of priority
	 */
	languages: S.optional(S.Array(ListLanguageCodesLiteral)),
}).annotations({ identifier: '@aipacto/harvesting-domain/LocationSettings' })
export type LocationSettings = typeof LocationSettings.Type

export class ErrorPipelineApiKey extends Data.TaggedError(
	'ErrorPipelineApiKey',
) {}
