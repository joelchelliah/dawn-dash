# Contributing to Dawn Dash

This guide will help you get your local development environment set up.

## 🤝 How to contribute

1. 🍴 Fork the repository
2. 🛠️ Add your awesome changes
3. 🔄 Push your changes to your fork and open a Pull Request

## 📖 Development Guidelines

- 💅 Follow the existing code style
- 📝 Write meaningful commit messages
- 📚 Update documentation as needed
- 🧪 Test your changes thoroughly

## 🛒 Prerequisites

- **Node.js** (v18 or higher)
- **Docker** (for local Supabase instance)
  - macOS: [Docker Desktop](https://docs.docker.com/desktop/install/mac-install/) or [Colima](https://github.com/abiosoft/colima)
  - Windows: [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/)
  - Linux: [Docker Engine](https://docs.docker.com/engine/install/)
- **psql** (for populating local database)
  - **macOS**: `brew install postgresql@15`
  - **Linux**: `sudo apt-get install postgresql-client`
  - **Windows**: Install from [postgresql.org](https://www.postgresql.org/download/windows/)

## 🛠 Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Local Supabase

This will start a local Supabase instance with PostgreSQL, Auth, and all necessary services:

```bash
npx supabase start
```

**ℹ️ Note:** The first time you run this, it will download Docker images (may take a few minutes).

**ℹ️ Note:** Only **Skilldex** reads from Supabase (the `Talents` table). Cardex, Eventmaps, Speedruns and Scoring don't — Cardex and Speedruns fetch live from the Blightbane API and Eventmaps reads a static JSON file, so those four work without a local Supabase running.

### 3. Import Database Schema and Data

Import the database schema and sample data using psql:

```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/seed-data.sql
```

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

**ℹ️ Note:** This is the standard anon key for all local Supabase instances.

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.


## 🏭 Database Management

Visit the local Supabase Studio at [http://localhost:54323](http://localhost:54323) to browse tables and run queries.

The database seed (`supabase/seed-data.sql`) contains all the sample data you need to have the app running locally.

If you need to refresh your local database:

```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/seed-data.sql
```

This will reimport the schema and data.
