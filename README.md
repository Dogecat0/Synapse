# Synapse

Synapse is a web application designed to help you track, categorize, and analyze your daily activities. By leveraging a structured journal format and modern AI capabilities, this tool provides insights into how you spend your time, helping you optimize for productivity and work-life balance.

The application is built with Next.js, TypeScript, and Prisma, and it uses a local Large Language Model (LLM) for advanced data processing tasks like data extraction and natural language search.

## Core Features

- **Structured Journaling**: Log daily activities under "Work" and "Life" categories.
- **Detailed Activity Tracking**: For each activity, record a description, duration, detailed notes, and tags.
- **LLM-Powered Data Import**: An import script uses an LLM to parse plain text journal entries, extract structured data, and populate the database.
- **Web Interface**: A clean, user-friendly interface to create, view, edit, and search journal entries.
- **Agentic Search**: Ask natural language questions about your journal and receive AI-generated summaries based on relevant entries.
- **Data Persistence**: Journal entries are stored in a PostgreSQL database via Prisma ORM.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **AI/LLM**: Local LLM server (e.g., Ollama) with the [OpenAI Node.js client](https://github.com/openai/openai-node).
- **Schema Validation**: [Zod](https://zod.dev/)
- **Markdown Rendering**: [React Markdown](https://github.com/remarkjs/react-markdown)

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Docker and Docker Compose (for the database)
- A running local LLM server (e.g., [Ollama](https://ollama.com/)) that exposes an OpenAI-compatible API endpoint. Make sure you have a model like `gemma3n` downloaded.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd synapse
    ```

2.  **Start the database:**
    The project uses Docker Compose to run a PostgreSQL database.

    ```bash
    docker-compose up -d
    ```

3.  **Install dependencies:**

    ```bash
    npm install
    ```

4.  **Set up the database schema:**
    Apply the schema to your newly created database and generate the Prisma Client.

    ```bash
    npx prisma db push
    ```

5.  **Configure environment variables:**
    The import script (`scripts/import-journal.mjs`) and the application are configured to connect to a local LLM. If your LLM server runs on a different URL, update the `LLM_API_URL` constant in `scripts/import-journal.mjs` and `src/lib/searchAgent.ts`.

6.  **Run the application:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### Importing Journal Entries

The project includes a powerful script to import historical journal entries from a text file.

1.  Place your journal history in a text file (e.g., `scripts/journal-history-june.txt`). The file should contain entries with date headers in `YYYY-MM-DD` format.
2.  Run the import script:
    ```bash
    node scripts/import-journal.mjs
    ```
    The script will process each entry, use the configured LLM to extract structured data, and send it to the application's API to be stored in the database.

## Project Roadmap

This project aims to evolve into a comprehensive personal analytics platform. Here are the key features planned for future development.

### ✅ Feature 1: LLM-Powered Semantic Search and Progress Synthesis [COMPLETE]

A standard keyword search is limited. We have implemented a feature where a user can ask a natural language question like, "Show me my progress on the API refactor." This is powered by an agentic RAG (Retrieval-Augmented Generation) pipeline.

- **Agentic Query Planning**: The user's query is first sent to an LLM "planner" agent that generates a set of relevant keywords for database searching.
- **Retrieval**: The generated keywords are used to perform a full-text search across all journal entries, finding relevant activities.
- **AI-Generated Summaries**: The retrieved entries are then fed to an LLM "synthesizer" agent to generate a concise, markdown-formatted summary of the progress, blockers, and time spent on that topic.

### 🎤 Feature 2: Voice-to-Data Pipeline for Hands-Free Entry

Typing is a point of friction. The next major UX improvement will be voice input. The plan is to integrate a speech-to-text model (like a self-hosted Whisper instance or a cloud API).

The pipeline will be simple and modular:

1.  User records their journal entry via microphone.
2.  The audio is transcribed to raw text.
3.  This raw text is fed into the exact same LLM data extraction endpoint we've already built.

This reuses the core backend logic, making it an efficient way to add a powerful new input method.

### 📊 Feature 3: Correlation Analysis and Reporting

With a growing dataset, we can build dashboards to find correlations. For example, does more time spent on "meetings" impact time allocated to "deep work" or "exercise"? A model could also generate automated weekly reports summarizing time allocation and highlighting trends.
