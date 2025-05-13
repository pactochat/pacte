# Pacte Xat

**Español**: For the Spanish version of this README, see [`README`](./docs/README_es.md).

## Overview

This repository defines **Pacte**, a full-stack AI-driven chat platform built to empower **local governments and institutions** with secure, data-driven decision-making capabilities. Using regional data, Pacte enables planning and decisions as good as—or better than—central governments and supranational organizations like the WHO or UN. The system is powered by a **Node.js Fastify server**, a **cross-platform chat interface** (web and native mobile via Expo), a **LangChain orchestrator** for multi-agent workflows, and **data crawlers** to gather and process regional information.

Key components include:

1. **Chat Interface**: A ChatGPT-like experience for users to query data, generate insights, or request actions. Ask questions like "What’s the health trend in my region?" or "Plan a flood response."
2. **Data Crawlers**: Collect and structure regional data for analysis.
3. **Agentic Workflows**: Multi-agent system (e.g., Data Agent, Analysis Agent, Planning Agent) orchestrated via LangChain.

## Primary Goals

1. **Empower Local Decision-Making**  
   - Provide local governments with tools to analyze regional data and plan effectively.  
   - Outperform centralized systems by focusing on hyper-local context.

2. **Multi-Agent Coordination**  
   - Leverage LangChain to orchestrate agents for tasks like data crawling, summarization, and decision support.  
   - Central **Planning Agent** coordinates sub-tasks; specialized agents handle data and analysis.

## Core Components

1. **Fastify/Node.js Backend**  
   - TypeScript-based server with APIs to manage chat sessions, process data, and execute agent tasks.  
   - Integrates with containerized environments for secure computation.  
   - Serves the chat interface and mobile app backend.

2. **Cross-Platform Chat (Expo)**  
   - Built with Expo for web and native mobile (iOS/Android) compatibility.  
   - Provides a ChatGPT-like UI for querying data and interacting with agents.

3. **LangChain.js Orchestrator**  
   - Manages multi-agent workflows (e.g., crawling data, generating reports, suggesting plans).  
   - Powers LLM-driven responses and task delegation.

4. **Data Crawlers**  
   - Custom scripts to scrape, aggregate, and clean regional data from various sources.  
   - Feeds structured data into the system for agent analysis.

## ToDo

- [ ] Bare minimum web and app working on Expo
- [ ] Add LangChain agents to the server
- [ ] Add UI for à la ChatGPT
- [ ] Scrape data from some local government websites and regions
- [ ] Put scraped data into a database

## License

Licensed under the MIT License with a visible attribution clause.

Any public use must display the text "Powered by AIPacto.com".

See [LICENSE](./LICENSE) for full details.
