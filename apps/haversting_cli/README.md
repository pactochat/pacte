# Harvesting CLI

A powerful command-line tool for website crawling and content scraping, built for the Aipacto platform.

## ✨ Features

- **🕷️ Website Crawling**: Map all links from a website with optional search filters
- **📄 Content Scraping**: Extract content from specific URLs in multiple formats
- **📁 Organized Output**: Results saved in structured JSON format and multiple file types
- **🎨 Beautiful CLI**: Interactive prompts with colored output and progress indicators
- **⚡ Fast & Reliable**: Built on Firecrawl API with Effect-based error handling

## 🚀 Quick Start

### Prerequisites

1. **Firecrawl API Key**: Get your API key from [Firecrawl](https://firecrawl.dev)
2. **Environment Setup**: Add your API key to `.env` file:

```bash
FIRECRAWL_API_KEY=your-api-key-here
```

### Installation

```bash
# Install dependencies
yarn install

# Run the CLI
yarn cli
```

## 📖 Usage

### Interactive Mode

The easiest way to use the CLI is in interactive mode:

```bash
yarn cli
```

This will present you with a beautiful interactive interface where you can choose your operation and configure options step by step.

### Command Line Mode

For automation and scripting, you can use direct commands:

```bash
# Crawl a website
yarn cli --crawl --url city-council.cat

# Scrape a specific page
yarn cli --scrape --url https://www.city-council.cat/news

# Get help
yarn cli --help
```

## 🕷️ Crawling

Crawling maps all links from a website and saves them in a structured JSON format.

### Features

- **Domain Mapping**: Discovers all internal links
- **Search Filtering**: Filter links by keywords
- **Limit Control**: Set maximum number of URLs to discover
- **Structured Output**: Results in JSON format matching your requirements

### Output Format

Crawl results are saved as JSON files with this structure:

```json
{
  "city-council.cat": [
    {
      "input": "https://city-council.cat",
      "children": [
        "https://city-council.cat/news",
        "https://city-council.cat/tourism",
        "https://city-council.cat/services"
      ]
    }
  ]
}
```

### Example

```bash
# Interactive crawl
yarn cli
# Choose "Crawl Website"
# Enter URL: city-council.cat
# Optional: Add search filter like "actualitat"
# Optional: Set max URLs limit

# Direct crawl
yarn cli --crawl --url city-council.cat
```

## 📄 Scraping

Scraping extracts content from specific URLs in multiple formats.

### Supported Formats

- **Markdown**: Clean, readable text format
- **HTML**: Full HTML structure
- **Links**: All links found on the page
- **Metadata**: Title, description, language detection

### Output Files

For each scrape operation, multiple files are created:

- `scrape-{domain}-{timestamp}.md` - Markdown content
- `scrape-{domain}-{timestamp}.html` - HTML content  
- `scrape-{domain}-{timestamp}.json` - Metadata and links

### Example

```bash
# Interactive scrape
yarn cli
# Choose "Scrape Content"
# Enter URL: https://www.city-council.cat/news
# Select output formats

# Direct scrape
yarn cli --scrape --url https://www.city-council.cat/news
```

## 📁 Output Structure

All results are saved in the `./harvesting-results/` directory:

```
harvesting-results/
├── crawl-city-council.cat-2024-01-15T10-30-00.json
├── scrape-city-council.cat-2024-01-15T10-35-00.md
├── scrape-city-council.cat-2024-01-15T10-35-00.html
└── scrape-city-council.cat-2024-01-15T10-35-00.json
```

## 🛠️ Development

### Architecture

The CLI follows clean architecture principles:

- **Domain Layer**: `@aipacto/harvesting-domain` - Core entities and types
- **Infrastructure Layer**: `@aipacto/harvesting-infra-pipeline` - Firecrawl integration
- **Application Layer**: CLI interface and orchestration

### Key Technologies

- **Effect**: Functional error handling and composition
- **TypeScript**: Type-safe development
- **Clack Prompts**: Beautiful CLI interactions
- **Firecrawl**: Robust web crawling and scraping
- **Clean Architecture**: Maintainable, testable code

### Project Structure

```
src/
├── index.ts          # Main CLI entry point
├── utils.ts          # CLI utilities and helpers
└── ...
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
FIRECRAWL_API_KEY=your-firecrawl-api-key

# Optional
NODE_ENV=development     # Enable debug output
```

### CLI Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--help` | `-h` | Show help information | `yarn cli -h` |
| `--crawl` | `-c` | Crawl mode | `yarn cli -c -u city-council.cat` |
| `--scrape` | `-s` | Scrape mode | `yarn cli -s -u https://example.com` |
| `--url` | `-u` | Target URL | `-u city-council.cat` |
| `--output` | `-o` | Output directory | `-o ./results` |

## 🎯 Examples

### City Council Website Crawling

```bash
# Crawl main city website
yarn cli --crawl --url city-council.cat

# Crawl news section with filter
yarn cli
# Interactive: Choose crawl, enter "city-council.cat/news", filter by "noticies"
```

### Content Extraction

```bash
# Extract news article
yarn cli --scrape --url https://www.city-council.cat/news/detail/1234

# Interactive mode for complex scraping
yarn cli
# Choose scrape, configure formats and options
```

## 🚨 Error Handling

The CLI includes comprehensive error handling:

- **API Errors**: Clear messages for Firecrawl API issues
- **Network Issues**: Retry logic and timeout handling
- **Invalid URLs**: Validation and helpful error messages
- **Rate Limiting**: Automatic backoff and retry

## 📈 Performance

- **Concurrent Processing**: Efficient parallel operations
- **Progress Indicators**: Real-time feedback during operations
- **Memory Efficient**: Streaming for large content processing
- **Rate Limit Aware**: Respects API limitations
