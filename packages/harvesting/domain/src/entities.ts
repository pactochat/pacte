import { Schema as S } from 'effect'

import { Entity, ZonedDateTimeString } from '@aipacto/shared-domain'

/**
 * Status of a harvesting job
 */
export const HarvestingJobStatus = S.Union(
	S.Literal('pending'),
	S.Literal('running'),
	S.Literal('completed'),
	S.Literal('failed'),
	S.Literal('cancelled'),
)
export type HarvestingJobStatus = typeof HarvestingJobStatus.Type

/**
 * Type of harvesting operation
 */
export const HarvestingOperationType = S.Union(
	S.Literal('crawl'),
	S.Literal('scrape'),
	S.Literal('batch_scrape'),
)
export type HarvestingOperationType = typeof HarvestingOperationType.Type

/**
 * Base harvesting job entity
 */
export const HarvestingJob = S.extend(
	Entity,
	S.Struct({
		/**
		 * Type of harvesting operation
		 */
		type: HarvestingOperationType,
		/**
		 * Current status of the job
		 */
		status: HarvestingJobStatus,
		/**
		 * The URL being processed
		 */
		url: S.String,
		/**
		 * Additional configuration for the job
		 */
		config: S.optional(S.Record({ key: S.String, value: S.Unknown })),
		/**
		 * When the job started processing
		 */
		startedAt: S.optional(ZonedDateTimeString),
		/**
		 * When the job completed
		 */
		completedAt: S.optional(ZonedDateTimeString),
		/**
		 * Error message if job failed
		 */
		errorMessage: S.optional(S.String),
		/**
		 * Processing metadata
		 */
		metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
	}),
).annotations({ identifier: '@aipacto/harvesting-domain/HarvestingJob' })
export type HarvestingJob = typeof HarvestingJob.Type

/**
 * Crawl job specific entity
 */
export const CrawlJob = S.extend(
	HarvestingJob,
	S.Struct({
		type: S.Literal('crawl'),
		/**
		 * Search parameter for filtering URLs
		 */
		searchQuery: S.optional(S.String),
		/**
		 * Maximum number of URLs to discover
		 */
		maxUrls: S.optional(S.Number),
		/**
		 * Discovered URLs from crawling
		 */
		discoveredUrls: S.optional(S.Array(S.String)),
		/**
		 * Number of URLs discovered
		 */
		urlCount: S.optional(S.Number),
	}),
).annotations({ identifier: '@aipacto/harvesting-domain/CrawlJob' })
export type CrawlJob = typeof CrawlJob.Type

/**
 * Scrape job specific entity
 */
export const ScrapeJob = S.extend(
	HarvestingJob,
	S.Struct({
		type: S.Union(S.Literal('scrape'), S.Literal('batch_scrape')),
		/**
		 * Output formats requested
		 */
		formats: S.optional(S.Array(S.String)),
		/**
		 * Whether to include screenshots
		 */
		includeScreenshot: S.optional(S.Boolean),
		/**
		 * Actions to perform before scraping
		 */
		actions: S.optional(S.Array(S.Record({ key: S.String, value: S.Unknown }))),
		/**
		 * Scraped content
		 */
		content: S.optional(S.Record({ key: S.String, value: S.Unknown })),
		/**
		 * Size of scraped content in bytes
		 */
		contentSize: S.optional(S.Number),
	}),
).annotations({ identifier: '@aipacto/harvesting-domain/ScrapeJob' })
export type ScrapeJob = typeof ScrapeJob.Type
