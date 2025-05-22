import { Data } from 'effect'

/**
 * Base error for harvesting operations
 */
export class HarvestingError extends Data.TaggedError('HarvestingError')<{
	message: string
	cause?: unknown
}> {}

/**
 * Error when URL is invalid or inaccessible
 */
export class InvalidUrlError extends Data.TaggedError('InvalidUrlError')<{
	url: string
	cause?: unknown
}> {}

/**
 * Error when crawling operation fails
 */
export class CrawlError extends Data.TaggedError('CrawlError')<{
	url: string
	message: string
	cause?: unknown
}> {}

/**
 * Error when scraping operation fails
 */
export class ScrapeError extends Data.TaggedError('ScrapeError')<{
	url: string
	message: string
	cause?: unknown
}> {}

/**
 * Error when Firecrawl API returns an error
 */
export class FirecrawlApiError extends Data.TaggedError('FirecrawlApiError')<{
	status: number
	message: string
	cause?: unknown
}> {}

/**
 * Error when API rate limit is exceeded
 */
export class RateLimitError extends Data.TaggedError('RateLimitError')<{
	retryAfter?: number
	message: string
}> {}

/**
 * Error when operation times out
 */
export class TimeoutError extends Data.TaggedError('TimeoutError')<{
	timeout: number
	operation: string
}> {}

/**
 * Error when authentication fails
 */
export class AuthenticationError extends Data.TaggedError(
	'AuthenticationError',
)<{
	message: string
}> {}
