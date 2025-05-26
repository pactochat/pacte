import FirecrawlApp from '@mendable/firecrawl-js'
import { Context, Data, Effect, Layer, Schema as S } from 'effect'

import {
	BaseHarvestingInput,
	BaseHarvestingOutput,
} from '@aipacto/harvesting-domain'
import {
	type ZonedDateTimeString,
	currentIsoDateTimeString,
} from '@aipacto/shared-domain'
import {
	ErrorPipelineApiKey,
	FirecrawlAction,
	FirecrawlFormat,
	LocationSettings,
} from './types'
class ErrorScraperScrape extends Data.TaggedError('ErrorScraperScrape')<{
	readonly url?: string
	readonly error?: unknown
}> {}

export const ScrapeInput = S.extend(
	BaseHarvestingInput,
	S.Struct({
		/**
		 * Output formats to generate
		 */
		formats: S.optional(S.Array(FirecrawlFormat)),
		/**
		 * Actions to perform before scraping
		 */
		actions: S.optional(S.Array(FirecrawlAction)),
		/**
		 * Location settings for the request
		 */
		location: S.optional(LocationSettings),
		/**
		 * Whether to use stealth mode
		 */
		stealth: S.optional(S.Boolean),
		/**
		 * Custom headers to include
		 */
		headers: S.optional(S.Record({ key: S.String, value: S.String })),
		/**
		 * Timeout in milliseconds
		 */
		timeout: S.optional(S.Number),
		/**
		 * Extraction schema for structured data
		 */
		extractSchema: S.optional(S.Record({ key: S.String, value: S.Unknown })),
		/**
		 * System prompt for extraction
		 */
		extractSystemPrompt: S.optional(S.String),
		/**
		 * Prompt for schema-less extraction
		 */
		extractPrompt: S.optional(S.String),
	}),
).annotations({ identifier: '@aipacto/harvesting-infra-pipeline/ScrapeInput' })
export type ScrapeInput = typeof ScrapeInput.Type

/**
 * Scraped content in different formats
 */
export const ScrapedContent = S.Struct({
	/**
	 * Markdown content
	 */
	markdown: S.optional(S.String),
	/**
	 * HTML content
	 */
	html: S.optional(S.String),
	/**
	 * Raw HTML content
	 */
	rawHtml: S.optional(S.String),
	/**
	 * Screenshot as base64 string
	 */
	screenshot: S.optional(S.String),
	/**
	 * Extracted links
	 */
	links: S.optional(S.Array(S.String)),
	/**
	 * Structured JSON data
	 */
	json: S.optional(S.Record({ key: S.String, value: S.Unknown })),
}).annotations({
	identifier: '@aipacto/harvesting-infra-pipeline/ScrapedContent',
})
export type ScrapedContent = typeof ScrapedContent.Type

export const ScrapeOutput = S.extend(
	BaseHarvestingOutput,
	S.Struct({
		/**
		 * Scraped content in various formats
		 */
		content: ScrapedContent,
		/**
		 * Page title
		 */
		title: S.optional(S.String),
		/**
		 * Page description
		 */
		description: S.optional(S.String),
		/**
		 * Language detected on the page
		 */
		language: S.optional(S.String),
		/**
		 * Actions that were performed
		 */
		actionsPerformed: S.optional(S.Array(S.String)),
	}),
).annotations({ identifier: '@aipacto/harvesting-infra-pipeline/ScrapeOutput' })
export type ScrapeOutput = typeof ScrapeOutput.Type

/**
 * Batch scraping input
 */
export const BatchScrapeInput = S.Struct({
	/**
	 * List of URLs to scrape
	 */
	urls: S.Array(S.String),
	/**
	 * Shared scraping configuration
	 */
	config: S.optional(ScrapeInput),
	/**
	 * Whether to process synchronously
	 */
	sync: S.optional(S.Boolean),
}).annotations({
	identifier: '@aipacto/harvesting-infra-pipeline/BatchScrapeInput',
})
export type BatchScrapeInput = typeof BatchScrapeInput.Type

/**
 * Batch scraping output
 */
export const BatchScrapeOutput = S.Struct({
	/**
	 * Job ID for asynchronous processing
	 */
	jobId: S.optional(S.String),
	/**
	 * Results for synchronous processing
	 */
	results: S.optional(S.Array(ScrapeOutput)),
	/**
	 * Total URLs processed
	 */
	totalUrls: S.Number,
	/**
	 * Number of successful scrapes
	 */
	successCount: S.Number,
	/**
	 * Number of failed scrapes
	 */
	failureCount: S.Number,
}).annotations({ identifier: '@aipacto/harvesting-domain/BatchScrapeOutput' })
export type BatchScrapeOutput = typeof BatchScrapeOutput.Type

/**
 * Scraper service interface for scraping website content
 */
export interface IScraper {
	readonly scrape: (
		input: ScrapeInput,
	) => Effect.Effect<ScrapeOutput, ErrorScraperScrape, never>
}

/**
 * Creates the scraper service implementation
 */
const make = Effect.gen(function* () {
	const apiKey = process.env.FIRECRAWL_API_KEY
	if (!apiKey) {
		return yield* Effect.fail(new ErrorPipelineApiKey())
	}

	const app = new FirecrawlApp({ apiKey })

	const scrape = (input: ScrapeInput) =>
		Effect.tryPromise({
			try: async () => {
				// Prepare options for Firecrawl
				const options: any = {}
				if (input.formats) options.formats = input.formats
				if (input.actions) options.actions = input.actions
				if (input.location) options.location = input.location
				if (input.stealth !== undefined) options.stealth = input.stealth
				if (input.headers) options.headers = input.headers
				if (input.timeout) options.timeout = input.timeout
				if (input.extractSchema)
					options.extract = { schema: input.extractSchema }
				if (input.extractSystemPrompt)
					options.extract = {
						...options.extract,
						systemPrompt: input.extractSystemPrompt,
					}
				if (input.extractPrompt)
					options.extract = { ...options.extract, prompt: input.extractPrompt }

				// Call Firecrawl scrapeUrl
				const response = await app.scrapeUrl(input.url, options)

				if (!response.success)
					throw new ErrorScraperScrape({ url: input.url, error: response })

				return {
					url: input.url,
					success: true,
					content: {
						markdown: response.markdown,
						html: response.html,
						rawHtml: response.rawHtml,
						screenshot: response.screenshot,
						links: response.links,
						json: response.json,
					},
					title: response.title,
					description: response.description,
					// language: response.language,
					// actionsPerformed: response.actionsPerformed,
					timestamp: currentIsoDateTimeString() as ZonedDateTimeString,
					metadata: {},
				} satisfies ScrapeOutput
			},
			catch: error => new ErrorScraperScrape({ url: input.url, error }),
		})

	return { scrape } as const
})

export class Scraper extends Context.Tag('Scraper')<
	IScraper,
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(this, make)
}
