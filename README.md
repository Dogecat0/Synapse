# Synapse

Synapse is a web application designed to help you track, categorize, and analyze your daily activities. By leveraging a structured journal format and modern AI capabilities, this tool provides insights into how you spend your time, helping you optimize for productivity and work-life balance.

The application is built with Next.js, TypeScript, and Prisma, and it uses a local Large Language Model (LLM) for advanced data processing tasks like data extraction and natural language search.

## Core Features

- **Structured Journaling**: Log daily activities under customizable categories.
- **Dynamic Category Management**: Create, edit, and manage custom categories with descriptions, colors, and icons.
- **Detailed Activity Tracking**: For each activity, record a description, duration, detailed notes, and tags.
- **LLM-Powered Data Import**: A web-based feature uses an LLM to parse plain text journal entries, extract structured data, and populate the database, with real-time progress streaming.
- **Web Interface**: A clean, user-friendly interface to create, view, edit, and search journal entries.
- **Agentic Search**: Ask natural language questions about your journal and receive AI-generated summaries based on relevant entries.
- **AI-Generated Weekly Reports**: Get automated, AI-powered summaries of your weekly activities, time allocation, and key trends.
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
- A running local LLM server (e.g., [Ollama](https://ollama.com/)) that exposes an OpenAI-compatible API endpoint. Make sure you have a model downloaded (I am using `hf.co/unsloth/Qwen3-8B-128K-GGUF:Q4_K_XL` with `8b` parameters and `16k` context window).

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
    Copy the example environment file and configure your settings:

    ```bash
    cp .env.example .env
    ```

    Update the following variables in your `.env` file:

    - `DATABASE_URL`: Your PostgreSQL connection string. (e.g., `postgresql://user:password@localhost:5432/synapse`)
    - `LLM_API_URL`: Your local LLM API endpoint (e.g., `http://localhost:11434/v1` for Ollama)
    - `LLM_MODEL`: The model name to use (e.g., `gemma2`)

6.  **Run the application:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### Setting Up Categories

Before logging or importing activities, you must set up your categories:

1.  Navigate to the `/categories` page in the application.
2.  Create custom categories that match your workflow (e.g., "Deep Work", "Meetings", "Exercise", "Learning").
3.  **Crucially, provide a clear description for each custom category.** The AI relies on these descriptions to accurately classify imported activities.

### LLM-Powered Journal Import

Synapse offers a powerful way to import historical or bulk journal entries from plain text using its AI-powered import feature.

1.  **Prepare your journal text**: Ensure your text is formatted with each day's entry starting on a new line with a date (e.g., `2024-07-25`).
2.  **Verify categories**: Ensure you have created custom categories with descriptions for all activity types present in your journal text.
3.  **Navigate to the Import page**: Go to the `/import` page in the application.
4.  **Paste and Import**: Paste your journal text into the provided text area and click "Start Import". The application will stream the progress as the LLM processes and saves your entries.

## Database Schema

The application uses a PostgreSQL database with the following key models:

- **JournalEntry**: Daily journal entries with a unique date.
- **Activity**: Individual activities within a journal entry.
- **Category**: Customizable categories for organizing activities.
- **Tag**: Flexible tagging system for activities.
- **Report**: Stored weekly/monthly reports with AI-generated insights.

## API Endpoints

- `/api/journal`: CRUD for journal entries.
- `/api/journal/search`: AI-powered semantic search.
- `/api/categories`: CRUD for categories.
- `/api/reports`: Weekly report generation and retrieval.
- `/api/import`: AI-powered bulk import of journal entries.

## Project Roadmap

This project aims to evolve into a comprehensive personal analytics platform. Here are the key features planned for future development.

### ✅ Feature 1: LLM-Powered Semantic Search and Synthesis [Completed]

A standard keyword search is limited. This feature allows a user to ask a natural language question like, "Show me my progress on the API refactor." This is powered by an agentic RAG (Retrieval-Augmented Generation) pipeline.

- **Agentic Query Planning**: The user's query is first sent to an LLM "planner" agent that generates a set of relevant keywords for database searching.
- **Retrieval**: The generated keywords are used to perform a full-text search across all journal entries, finding a broad set of candidate activities.
- **Agentic Re-ranking**: The candidate activities are then passed to an LLM "re-ranker" agent. This agent analyzes the relevance of each activity to the original query and sorts them, ensuring only the most pertinent information is used for the final summary.
- **AI-Generated Summaries**: The top-ranked, most relevant entries are then fed to an LLM "synthesizer" agent to generate a concise, markdown-formatted summary of the progress, blockers, and time spent on that topic.

### ✅ Feature 2: Automated Weekly Reporting [Completed]

To provide regular insights with minimal effort, the application can now generate automated weekly reports. These reports summarize time allocation, highlight key activities, analyze tag usage, and provide AI-driven insights into trends and patterns for the week.

### ✅ Feature 3: Dynamic Categories & AI-Powered Import [Completed]

The application has moved beyond static categories to a fully dynamic system, which is crucial for the AI-powered import pipeline. Users can now:

- **Manage Categories**: Create, edit, and delete custom categories with descriptions and colors. These descriptions are essential for the AI to accurately classify activities.
- **LLM-Powered Bulk Import**: Instead of manual entry, users can paste unstructured, plain-text journal entries into the web UI. An LLM agent then parses the text, extracts activities, classifies them against the user-defined categories, and saves them to the database, providing a real-time log of the process.

### 🎤 Feature 4: Voice-to-Data Pipeline for Hands-Free Entry

Typing is a point of friction. The next major UX improvement will be voice input. The plan is to integrate a speech-to-text model (like a self-hosted Whisper instance or a cloud API). The transcribed text will be fed into the existing LLM data extraction endpoint, reusing core backend logic for an efficient new input method.

### 📊 Feature 5: Advanced Correlation Analysis and Dashboards

With a growing dataset, we can build interactive dashboards to find correlations. For example, does more time spent on "meetings" impact time allocated to "deep work" or "exercise"? This feature will expand on the weekly reports to provide visualizations and deeper, queryable analytics over longer time periods.

## Troubleshooting

### LLM Connection Issues

If you're experiencing issues with LLM integration:

1.  Ensure your local LLM server (e.g., Ollama) is running.
2.  Verify the `LLM_API_URL` in your `.env` file is correct.
3.  Check that your chosen model is downloaded and available.
4.  Test the connection by running a simple query through the Search or Reports interface.

### Database Issues

If you encounter database connection problems:

1.  Ensure Docker Compose is running: `docker-compose ps`.
2.  Check your `DATABASE_URL` environment variable.
3.  Try resetting the database schema: `npx prisma db push --force-reset` (Warning: this will delete all data).

### Import Feature Issues

If the AI-powered import fails:

1.  Verify your journal text format. Each day should start with a date on a new line (e.g., `YYYY-MM-DD`).
2.  Ensure all your **custom categories have descriptions**. The import will fail if any are missing, as the AI relies on them for classification. This is the most common cause of import failure.
3.  Check the import log in the UI for specific error messages from the LLM or database.
