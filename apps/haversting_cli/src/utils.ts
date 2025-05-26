import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import * as p from '@clack/prompts'
import color from 'picocolors'

/**
 * CLI Utilities for the Harvesting CLI
 */

/**
 * Ensure output directory exists
 */
export function ensureOutputDir(): string {
	const outputDir = join(process.cwd(), 'harvesting-results')

	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true })
	}

	return outputDir
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): string | undefined {
	if (!url) return 'URL is required'

	try {
		// Normalize URL first
		const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
		new URL(normalizedUrl)
		return undefined
	} catch {
		return 'Please enter a valid URL'
	}
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
	const units = ['B', 'KB', 'MB', 'GB']
	let size = bytes
	let unitIndex = 0

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024
		unitIndex++
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000)
	if (seconds < 60) return `${seconds}s`

	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60
	return `${minutes}m ${remainingSeconds}s`
}

/**
 * Display a success box with results
 */
export function displaySuccessBox(
	title: string,
	items: Record<string, string>,
) {
	const maxKeyLength = Math.max(...Object.keys(items).map(k => k.length))

	const content = Object.entries(items)
		.map(([key, value]) => `${key.padEnd(maxKeyLength)}: ${color.cyan(value)}`)
		.join('\n')

	p.note(content, color.green(title))
}

/**
 * Confirm before proceeding with potentially long operations
 */
export async function confirmOperation(
	operation: string,
	url: string,
	estimatedTime?: string,
): Promise<boolean> {
	const message = `${operation} ${color.cyan(url)}${estimatedTime ? ` (estimated: ${estimatedTime})` : ''}`

	const confirm = await p.confirm({
		message: `Proceed with: ${message}?`,
		initialValue: true,
	})

	if (p.isCancel(confirm)) {
		p.cancel('Operation cancelled.')
		process.exit(0)
	}

	return confirm
}

/**
 * Handle CLI errors gracefully
 */
export function handleCliError(error: unknown, operation: string): never {
	console.error(`\n${color.red('Error during')} ${operation}:`)

	if (error instanceof Error) {
		console.error(color.dim(error.message))
		if (error.stack && process.env.NODE_ENV === 'development') {
			console.error(color.dim(error.stack))
		}
	} else {
		console.error(color.dim(String(error)))
	}

	p.outro(color.red('❌ Operation failed'))
	process.exit(1)
}

/**
 * Display CLI banner with ASCII art
 */
export function displayBanner() {
	console.log(
		color.cyan(`
  ╔═══════════════════════════════════════╗
  ║           🕷️  AIPACTO HARVESTING      ║
  ║         Website Crawler & Scraper     ║
  ╚═══════════════════════════════════════╝
`),
	)
}

/**
 * Command line argument parser for direct operations
 */
export function parseCliArgs(): {
	operation?: 'crawl' | 'scrape'
	url?: string
	output?: string
	help?: boolean
} {
	const args = process.argv.slice(2)
	const result: any = {}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]

		switch (arg) {
			case '--help':
			case '-h':
				result.help = true
				break
			case '--crawl':
			case '-c':
				result.operation = 'crawl'
				break
			case '--scrape':
			case '-s':
				result.operation = 'scrape'
				break
			case '--url':
			case '-u':
				result.url = args[++i]
				break
			case '--output':
			case '-o':
				result.output = args[++i]
				break
		}
	}

	return result
}

/**
 * Display help information
 */
export function displayHelp() {
	console.log(`
${color.cyan('Aipacto Harvesting CLI')}

${color.yellow('Usage:')}
  ${color.green('yarn cli')}                    # Interactive mode
  ${color.green('yarn cli --crawl -u <url>')}   # Direct crawl mode
  ${color.green('yarn cli --scrape -u <url>')}  # Direct scrape mode

${color.yellow('Options:')}
  ${color.green('-c, --crawl')}      Crawl website for links
  ${color.green('-s, --scrape')}     Scrape content from URL
  ${color.green('-u, --url <url>')}  Target URL
  ${color.green('-o, --output <dir>')} Output directory
  ${color.green('-h, --help')}       Show this help

${color.yellow('Examples:')}
  ${color.dim('# Interactive mode')}
  ${color.green('yarn cli')}
  
  ${color.dim('# Crawl a website')}
  ${color.green('yarn cli --crawl --url figueres.cat')}
  
  ${color.dim('# Scrape a specific page')}
  ${color.green('yarn cli --scrape --url https://www.figueres.cat/actualitat')}

${color.yellow('Environment:')}
  Make sure ${color.cyan('FIRECRAWL_API_KEY')} is set in your ${color.dim('.env')} file
`)
}
