import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as p from '@clack/prompts'
import { Effect, pipe } from 'effect'
import color from 'picocolors'

import { Crawler } from '@aipacto/harvesting-infra-pipeline'
import { Scraper } from '@aipacto/harvesting-infra-pipeline'
import type {
	CrawlOutput,
	ScrapeOutput,
} from '@aipacto/harvesting-infra-pipeline'

import {
	confirmOperation,
	displayBanner,
	displayHelp,
	displaySuccessBox,
	ensureOutputDir,
	formatFileSize,
	handleCliError,
	parseCliArgs,
	validateUrl,
} from './utils'

/**
/**
 * CLI App for website crawling and content scraping
 * 
 * Features:
 * - Crawl: Map all links of a website and store in JSON format
 * - Scrape: Extract content from a specific URL
 */

interface CrawlResult {
	[rootDomain: string]: Array<{
		input: string
		children: string[]
	}>
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
	try {
		const urlObj = new URL(url)
		return urlObj.hostname.replace('www.', '')
	} catch {
		return url
	}
}

/**
 * Normalize URL to ensure it has protocol
 */
function normalizeUrl(url: string): string {
	if (url.startsWith('http://') || url.startsWith('https://')) {
		return url
	}
	return `https://${url}`
}

/**
 * Crawl operation - maps all links of a website
 */
const crawlWebsite = (url: string, searchQuery?: string, maxUrls?: number) =>
	Effect.gen(function* () {
		const crawler = yield* Crawler

		const result = yield* crawler.crawl({
			url: normalizeUrl(url),
			search: searchQuery,
			limit: maxUrls,
		})

		return result
	})

/**
 * Scrape operation - extracts content from a URL
 */
const scrapeUrl = (url: string, formats?: string[]) =>
	Effect.gen(function* () {
		const scraper = yield* Scraper

		const result = yield* scraper.scrape({
			url: normalizeUrl(url),
			formats: (formats as any[]) || ['markdown', 'html'],
		})

		return result
	})

/**
 * Save crawl results to JSON file
 */
function saveCrawlResults(
	crawlOutput: CrawlOutput,
	originalUrl: string,
): string {
	const outputDir = ensureOutputDir()
	const domain = extractDomain(originalUrl)
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
	const filename = join(outputDir, `crawl-${domain}-${timestamp}.json`)

	const crawlResult: CrawlResult = {
		[domain]: [
			{
				input: originalUrl,
				children: [...(crawlOutput.links || [])],
			},
		],
	}

	writeFileSync(filename, JSON.stringify(crawlResult, null, 2))
	return filename
}

/**
 * Save scrape results to files
 */
function saveScrapeResults(
	scrapeOutput: ScrapeOutput,
	originalUrl: string,
): string[] {
	const outputDir = ensureOutputDir()
	const domain = extractDomain(originalUrl)
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
	const savedFiles: string[] = []

	// Save markdown content
	if (scrapeOutput.content.markdown) {
		const markdownFile = join(outputDir, `scrape-${domain}-${timestamp}.md`)
		writeFileSync(markdownFile, scrapeOutput.content.markdown)
		savedFiles.push(markdownFile)
	}

	// Save HTML content
	if (scrapeOutput.content.html) {
		const htmlFile = join(outputDir, `scrape-${domain}-${timestamp}.html`)
		writeFileSync(htmlFile, scrapeOutput.content.html)
		savedFiles.push(htmlFile)
	}

	// Save JSON metadata
	const jsonFile = join(outputDir, `scrape-${domain}-${timestamp}.json`)
	const metadata = {
		url: scrapeOutput.url,
		title: scrapeOutput.title,
		description: scrapeOutput.description,
		language: scrapeOutput.language,
		timestamp: scrapeOutput.timestamp,
		links: scrapeOutput.content.links,
		contentSizes: {
			markdown: scrapeOutput.content.markdown?.length || 0,
			html: scrapeOutput.content.html?.length || 0,
		},
	}
	writeFileSync(jsonFile, JSON.stringify(metadata, null, 2))
	savedFiles.push(jsonFile)

	return savedFiles
}

/**
 * Main CLI application
 */
async function main() {
	const cliArgs = parseCliArgs()

	// Handle help flag
	if (cliArgs.help) {
		displayHelp()
		process.exit(0)
	}

	// Check for API key
	if (!process.env.FIRECRAWL_API_KEY) {
		console.error(
			color.red('❌ FIRECRAWL_API_KEY not found in environment variables'),
		)
		console.error(
			color.dim('Please add your Firecrawl API key to the .env file'),
		)
		process.exit(1)
	}

	// Handle direct CLI arguments
	if (cliArgs.operation && cliArgs.url) {
		return handleDirectOperation(cliArgs.operation, cliArgs.url)
	}

	// Interactive mode
	console.clear()
	displayBanner()

	p.intro(`${color.bgCyan(color.black(' 🕷️  Aipacto Harvesting CLI '))}`)

	p.note(
		`
${color.cyan('Website Crawling & Content Scraping Tool')}

${color.yellow('Available operations:')}
• ${color.green('Crawl')} - Map all links from a website
• ${color.green('Scrape')} - Extract content from a specific URL

${color.dim('Results will be saved in the ./harvesting-results/ directory')}
`,
		'Welcome',
	)

	try {
		// Get operation type
		const operation = await p.select({
			message: 'What would you like to do?',
			options: [
				{
					value: 'crawl',
					label: '🕷️  Crawl Website',
					hint: 'Map all links from a website',
				},
				{
					value: 'scrape',
					label: '📄 Scrape Content',
					hint: 'Extract content from a specific URL',
				},
			],
		})

		if (p.isCancel(operation)) {
			p.cancel('Operation cancelled.')
			process.exit(0)
		}

		if (operation === 'crawl') {
			await handleCrawlOperation()
		} else if (operation === 'scrape') {
			await handleScrapeOperation()
		}
	} catch (error) {
		handleCliError(error, 'interactive mode')
	}
}

/**
 * Handle direct CLI operations (non-interactive)
 */
async function handleDirectOperation(
	operation: 'crawl' | 'scrape',
	url: string,
) {
	console.log(
		`${color.cyan('🚀 Starting')} ${operation} operation for ${color.yellow(url)}`,
	)

	try {
		if (operation === 'crawl') {
			const startTime = Date.now()
			const spinner = p.spinner()
			spinner.start('🕷️ Crawling website...')

			const crawlProgram = pipe(crawlWebsite(url), Effect.provide(Crawler.Live))

			const result = await Effect.runPromise(crawlProgram)
			const duration = Date.now() - startTime

			spinner.stop('✅ Crawl completed')

			const filename = saveCrawlResults(result, url)

			displaySuccessBox('Crawl Results', {
				URL: result.url,
				'Links found': result.totalLinks.toString(),
				Duration: `${(duration / 1000).toFixed(1)}s`,
				'File saved': filename.split('/').pop() || filename,
			})
		} else if (operation === 'scrape') {
			const startTime = Date.now()
			const spinner = p.spinner()
			spinner.start('📄 Scraping content...')

			const scrapeProgram = pipe(
				scrapeUrl(url, ['markdown', 'html']),
				Effect.provide(Scraper.Live),
			)

			const result = await Effect.runPromise(scrapeProgram)
			const duration = Date.now() - startTime

			spinner.stop('✅ Scrape completed')

			const savedFiles = saveScrapeResults(result, url)

			displaySuccessBox('Scrape Results', {
				URL: result.url,
				Title: result.title || 'No title',
				'Content size': formatFileSize(result.content.markdown?.length || 0),
				Duration: `${(duration / 1000).toFixed(1)}s`,
				'Files saved': savedFiles.length.toString(),
			})
		}

		console.log(color.green('\n✅ Operation completed successfully!'))
	} catch (error) {
		handleCliError(error, operation)
	}
}

/**
 * Handle crawl operation workflow
 */
async function handleCrawlOperation() {
	p.note('🕷️ Starting crawl operation...', 'Crawl Mode')

	// Get URL to crawl
	const url = await p.text({
		message: 'Enter the website URL to crawl:',
		placeholder:
			'e.g., figueres.cat or https://www.figueres.cat/actualitat/noticies',
		validate: validateUrl,
	})

	if (p.isCancel(url)) {
		p.cancel('Operation cancelled.')
		process.exit(0)
	}

	// Optional search filter
	const searchQuery = await p.text({
		message: 'Enter search filter (optional):',
		placeholder: 'e.g., "news" or "actualitat" (press Enter to skip)',
	})

	if (p.isCancel(searchQuery)) {
		p.cancel('Operation cancelled.')
		process.exit(0)
	}

	// Max URLs limit
	const maxUrls = await p.text({
		message: 'Maximum number of URLs to discover (optional):',
		placeholder: 'e.g., 100 (press Enter for no limit)',
		validate: value => {
			if (value && Number.isNaN(Number(value)))
				return 'Please enter a valid number'
		},
	})

	if (p.isCancel(maxUrls)) {
		p.cancel('Operation cancelled.')
		process.exit(0)
	}

	// Execute crawl
	const spinner = p.spinner()
	spinner.start('🕷️ Crawling website...')

	const crawlProgram = pipe(
		crawlWebsite(
			url,
			searchQuery || undefined,
			maxUrls ? Number(maxUrls) : undefined,
		),
		Effect.provide(Crawler.Live),
	)

	const result = await Effect.runPromise(crawlProgram).catch(error => {
		spinner.stop('❌ Crawl failed')
		throw error
	})

	spinner.stop('✅ Crawl completed')

	// Save results
	const filename = saveCrawlResults(result, url)

	p.note(
		`
${color.green('Crawl Results:')}
• URL: ${color.cyan(result.url)}
• Links found: ${color.yellow(result.totalLinks.toString())}
• Search query: ${color.dim(result.searchQuery || 'none')}
• File saved: ${color.cyan(filename)}

${color.dim('Links discovered:')}
${
	result.links
		?.slice(0, 10)
		.map(link => `  • ${link}`)
		.join('\n') || 'No links found'
}
${result.links && result.links.length > 10 ? `  ${color.dim(`... and ${result.links.length - 10} more`)}` : ''}
`,
		'Success',
	)

	p.outro(`🎉 Crawl completed! Results saved to ${color.cyan(filename)}`)
}

/**
 * Handle scrape operation workflow
 */
async function handleScrapeOperation() {
	p.note('📄 Starting scrape operation...', 'Scrape Mode')

	// Get URL to scrape
	const url = await p.text({
		message: 'Enter the URL to scrape:',
		placeholder:
			'e.g., https://www.figueres.cat/actualitat/noticies/detail/1234',
		validate: validateUrl,
	})

	if (p.isCancel(url)) {
		p.cancel('Operation cancelled.')
		process.exit(0)
	}

	// Choose output formats
	const formats = await p.multiselect({
		message: 'Select output formats:',
		options: [
			{ value: 'markdown', label: 'Markdown', hint: 'Clean text format' },
			{ value: 'html', label: 'HTML', hint: 'Structured markup' },
			{ value: 'links', label: 'Links', hint: 'Extract all links' },
		],
		initialValues: ['markdown', 'html'],
		required: true,
	})

	if (p.isCancel(formats)) {
		p.cancel('Operation cancelled.')
		process.exit(0)
	}

	// Execute scrape
	const spinner = p.spinner()
	spinner.start('📄 Scraping content...')

	const scrapeProgram = pipe(
		scrapeUrl(url, formats),
		Effect.provide(Scraper.Live),
	)

	const result = await Effect.runPromise(scrapeProgram).catch(error => {
		spinner.stop('❌ Scrape failed')
		throw error
	})

	spinner.stop('✅ Scrape completed')

	// Save results
	const savedFiles = saveScrapeResults(result, url)

	p.note(
		`
${color.green('Scrape Results:')}
• URL: ${color.cyan(result.url)}
• Title: ${color.yellow(result.title || 'No title')}
• Description: ${color.dim(result.description || 'No description')}

${color.green('Content extracted:')}
${result.content.markdown ? `• Markdown: ${color.yellow((result.content.markdown.length / 1024).toFixed(1))} KB` : ''}
${result.content.html ? `• HTML: ${color.yellow((result.content.html.length / 1024).toFixed(1))} KB` : ''}
${result.content.links ? `• Links found: ${color.yellow(result.content.links.length.toString())}` : ''}

${color.green('Files saved:')}
${savedFiles.map(file => `• ${color.cyan(file)}`).join('\n')}
`,
		'Success',
	)

	p.outro(
		`🎉 Scrape completed! Files saved: ${savedFiles.map(f => color.cyan(f)).join(', ')}`,
	)
}

// Run the CLI
main().catch(error => {
	console.error('Fatal error:', error)
	process.exit(1)
})
