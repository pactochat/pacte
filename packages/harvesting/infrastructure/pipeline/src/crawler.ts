import FirecrawlApp, {
	type ErrorResponse as FirecrawlErrorResponse,
	type MapResponse,
} from '@mendable/firecrawl-js'
import { Context, Data, Effect, Layer, Schema as S } from 'effect'

import {
	BaseHarvestingInput,
	BaseHarvestingOutput,
} from '@aipacto/harvesting-domain'
import {
	type ZonedDateTimeString,
	currentIsoDateTimeString,
} from '@aipacto/shared-domain'
import { ErrorPipelineApiKey } from './types'

const CrawlInput = S.extend(
	BaseHarvestingInput,
	S.Struct({
		/**
		 * Search parameter to filter discovered URLs
		 */
		search: S.optional(S.String),
		/**
		 * Maximum number of URLs to discover
		 */
		limit: S.optional(S.Number),
		/**
		 * Include subdomains in crawling
		 */
		includeSubdomains: S.optional(S.Boolean),
	}),
).annotations({
	identifier: '@aipacto/harvesting-infra-pipeline/CrawlInput',
})
type CrawlInput = typeof CrawlInput.Type

const CrawlOutput = S.extend(
	BaseHarvestingOutput,
	S.Struct({
		/**
		 * List of discovered URLs
		 */
		links: S.optional(S.Array(S.String)),
		/**
		 * Total number of URLs discovered
		 */
		totalLinks: S.Number,
		/**
		 * Whether the crawl was truncated due to limits
		 */
		truncated: S.optional(S.Boolean),
		/**
		 * Search query used (if any)
		 */
		searchQuery: S.optional(S.String),
	}),
).annotations({
	identifier: '@aipacto/harvesting-infra-pipeline/CrawlOutput',
})
export type CrawlOutput = typeof CrawlOutput.Type

class ErrorCrawlerCrawl extends Data.TaggedError('ErrorCrawlerCrawl')<{
	readonly url?: string
	readonly error?: unknown
}> {}

export interface ICrawler {
	readonly crawl: (
		input: CrawlInput,
	) => Effect.Effect<CrawlOutput, ErrorCrawlerCrawl, never>
}

const make = Effect.gen(function* () {
	const apiKey = process.env.FIRECRAWL_API_KEY
	if (!apiKey) {
		return yield* Effect.fail(new ErrorPipelineApiKey())
	}

	const app = new FirecrawlApp({ apiKey })

	/**
	 * Crawl a all website URLs
	 */
	const crawl = (input: CrawlInput) =>
		Effect.tryPromise({
			try: async () => {
				let result: MapResponse | FirecrawlErrorResponse
				if (input.search) {
					result = await app.mapUrl(input.url, {
						search: input.search,
					})
				} else {
					result = await app.mapUrl(input.url)
				}

				if (!result.success)
					throw new ErrorCrawlerCrawl({ url: input.url, error: result })

				return result
			},
			catch: error => new ErrorCrawlerCrawl({ url: input.url, error }),
		}).pipe(
			Effect.map(
				(response): CrawlOutput => ({
					url: input.url,
					success: true,
					links: response.links,
					totalLinks: response.links?.length ?? 0,
					truncated: false,
					searchQuery: input.search,
					timestamp: currentIsoDateTimeString() as ZonedDateTimeString,
					metadata: {},
				}),
			),
		)

	return { crawl } as const
})

export class Crawler extends Context.Tag('Crawler')<
	ICrawler,
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(this, make)
}
