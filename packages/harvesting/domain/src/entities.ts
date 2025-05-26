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
export class HarvestingJob extends S.Class<HarvestingJob>(
	'@aipacto/harvesting-domain/HarvestingJob',
)({
	...Entity.fields,
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
}) {}

/**
 * Crawl job specific entity
 */
export class CrawlJob extends S.Class<CrawlJob>(
	'@aipacto/harvesting-domain/CrawlJob',
)({
	...HarvestingJob.fields,
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
}) {}

/**
 * Scrape job specific entity
 */
export class ScrapeJob extends S.Class<ScrapeJob>(
	'@aipacto/harvesting-domain/ScrapeJob',
)({
	...HarvestingJob.fields,
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
}) {}
