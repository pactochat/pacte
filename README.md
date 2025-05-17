# Pacte Xat

**Español**: For the Spanish version of this README, see [`README`](./docs/README_es.md).

## Vision & Mission

Pacte Xat is an open-source, AI-powered chat platform designed to revolutionize decision-making and transparency in local and regional governments. Our vision is to set a new global standard for AI in politics and governance, starting with Catalan-speaking regions and expanding internationally. By leveraging advanced language models (like Aina Kit's Salamandra-7b-instruct), we empower public administrations and citizens with data-driven insights and accessible civic engagement tools.

### Why Pacte Xat?

- **Empower Local Decision-Making**: Provide local governments with tools to analyze regional data and plan effectively, outperforming centralized systems by focusing on hyper-local context.
- **Enhance Transparency & Access**: Make complex information accessible and actionable for citizens, fostering trust and participation.
- **Scalable & Sustainable**: Designed for international adaptation, with a free self-hosted version and a paid cloud subscription for long-term viability.

### Example Use Cases

**For Citizens:**

- "What did the city council decide about the new equality plan in the last meeting?"
- "Where can I find information on local cultural events and their economic impact?"
- "How do I report a broken streetlamp in my neighborhood?"
- "Explain the Municipal Action Plan in simple terms."
- "What is the city doing to address the perception that 'nothing ever happens here'?"

**For Government Officials & Staff:**

- "Generate a draft social media thread summarizing the last council meeting."
- "Identify strengths and weaknesses in the opposition's arguments."
- "Summarize citizen complaints about street cleaning."
- "Analyze a large planning document and extract the 5 most relevant points."
- "Identify mentions of 'economic impact' and 'sustainability' in festival reports."

### Economic & Social Impact

- **Catalonia**: 900+ municipalities, €8B+ annual budget. Even 5% adoption could support €400M+ in managed resources.
- **Efficiency Gains**: 2-5% savings in operational budgets, potentially €8-20M optimized annually in early stages.
- **Scalability**: Designed for Spain (8,000+ municipalities, €60B budget) and beyond, with plans for multilingual support.

## Architecture & Tech Stack

Pacte Xat is built with a modern, robust architecture:

- **Clean Architecture & DDD**: The codebase is organized into bounded contexts, following Clean Architecture and Domain-Driven Design principles for maintainability and scalability.
- **TypeScript Everywhere**: Full stack, cross-platform development in TypeScript for consistency and safety.
- **Frontend**: React, React Native, Expo, Tamagui (Material Design 3, custom tokens for theming).
- **Backend**: Fastify (Node.js), Effect, containerized for secure computation.
- **AI Orchestration**: LangChain, LangGraph for multi-agent workflows.
- **Semantic Search**: Qdrant.
- **Core LLMs**: Aina Kit's Salamandra models, with support for OpenAI, DeepSeek, Grok, etc.
- **Data Storage**: PostgreSQL, Databricks.
- **Other Tools**: Mass data processing, internet search, GitHub for open-source collaboration.

## Core Components

1. **Chat Interface**: Cross-platform (web/mobile) chat UI for users to query data, generate insights, or request actions.
2. **Data Crawlers**: Scripts to collect and structure regional data for analysis.
3. **Agentic Workflows**: Multi-agent system orchestrated via LangChain and LangGraph.
4. **Backend APIs**: Fastify server managing chat sessions, data processing, and agent tasks.

## Getting Involved

We are actively developing the core web and mobile interfaces and the AI agent orchestrator. If you're interested in making a significant impact at the intersection of AI, governance, and open source, we'd love to have you contribute!

Before you start, please read our [Contributing Guide](./CONTRIBUTING.md) for setup instructions, coding standards, and contribution workflow.

## License

Licensed under the MIT License with a visible attribution clause.

Any public use must display the text "Powered by AIPacto.com".

See [LICENSE](./LICENSE) for full details.
