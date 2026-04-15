# Study Helper AI

Modern React app for Supabase-grounded chat, note summarization, and quiz generation.

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase and Gemini values.
2. Run the SQL in `supabase/schema.sql` inside the Supabase SQL editor.
3. Install dependencies and start the app with `npm install` and `npm run dev`.

## Ground-truth behavior

- Chat answers are retrieved from Supabase first.
- Gemini 2.5 Flash only explains or formats the retrieved database context.
- If no matching database content exists, the app replies politely instead of inventing an answer.
