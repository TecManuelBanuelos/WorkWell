# WorkWell

## About

In the Human Resources department of many industries, the process decision-making if a person is granted a sick leave is very slow, making this process more agile is an important factor for resource optimization. A survey found that 70% of HR decision makers feel increased responsibility for employee health due to longer NHS waiting times affecting care access.

WorkWell is a web application designed to streamline the sick leave request process, making it faster and more efficient for both employees and HR departments. The platform integrates an AI-powered assistant to help guide users through the process and automate decision-making workflows.

## Features

- View and manage leave requests
- Upload medical prescriptions (PDF)
- AI-powered chatbot assistance (IBM Watson Orchestrate)
- Real-time status tracking
- Modern, responsive user interface

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd WorkWell
```

2. Install dependencies:
```bash
npm install
```

3. Configure Supabase:
   - Open `src/supabaseClient.ts`
   - The credential for the Supabase are on supabaseClient.ts file:
   ```typescript
   const supabaseUrl = 'https://project-id.supabase.co'
   const supabaseKey = 'anon-key'
   ```

### Running the Application

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

However, the application is now hosted on: 'https://work-well-v2.vercel.app'

## Technologies

- React + TypeScript
- Vite
- Supabase (Database + Storage)
- IBM Watson Orchestrate

