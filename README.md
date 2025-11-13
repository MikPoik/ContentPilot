
# ContentCraft AI

An AI-powered social media content strategist delivered as a full-stack web application. ContentCraft AI helps marketers and content creators enhance their social media presence through intelligent content brainstorming, platform-specific advice, and strategic planning.

## Features

### 🤖 AI-Powered Content Strategy
- **Intent Analysis**: Advanced AI models determine user intent and trigger appropriate workflows
- **Content Generation**: GPT-4o powered chat responses, conversation titles, and content creation
- **Memory Management**: AI-driven context awareness and personalized interactions
- **Brand Voice AI**: Learn and replicate your unique brand voice for consistent messaging

### 🔍 Platform-Specific Insights
- **X (Twitter) Analysis**: Deep-dive into trending topics, hashtags, and engagement patterns
- **Instagram Insights**: Analyze top-performing posts, reels, and stories
- **Web Research**: Real-time search for latest trends, news, and insights
- **Blog Analysis**: Extract insights from blog content for content strategy

### 💎 Subscription Management
- Free tier with basic features
- Pro tier with advanced AI capabilities
- Enterprise tier for teams
- Stripe integration for payment processing

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **UI Library**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Animations**: Framer Motion

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES Modules)
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: Replit OIDC
- **Session Storage**: PostgreSQL-backed sessions (connect-pg-simple)

### AI Services
- **Primary Model**: OpenAI GPT-4o
- **Secondary Model**: xAI (Grok)
- **Search**: Perplexity API for web research
- **Instagram**: HikerAPI integration

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (or Neon serverless account)
- OpenAI API key
- Stripe account (for subscription features)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Perplexity (optional)
PERPLEXITY_API_KEY=your_perplexity_api_key

# xAI Grok (optional)
XAI_API_KEY=your_xai_api_key

# HikerAPI (optional)
HIKERAPI_KEY=your_hikerapi_key

# Server
PORT=5000
NODE_ENV=development
```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd contentcraft-ai
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database:
```bash
npm run db:push
```

4. Seed subscription plans (optional):
```bash
npm run seed:plans
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://0.0.0.0:5000`

### Building for Production

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── contexts/      # React contexts
├── server/                # Backend Express application
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic and AI services
│   │   └── ai/           # AI-specific services
│   └── scripts/          # Database scripts
├── shared/                # Shared code between client and server
│   ├── schema.ts         # Database schema and types
│   └── seo-config.ts     # SEO configuration
└── package.json          # Project dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes

## Deployment

### Deploying on Replit

1. Import your repository to Replit
2. Set environment variables in Replit Secrets
3. The project will automatically build and deploy

The application is configured to deploy on Replit's infrastructure with autoscaling support.

## SEO Features

- Pre-rendered pages for search engine crawlers
- Dynamic sitemap.xml generation
- Robots.txt configuration
- Server-side rendering for critical pages

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Guidelines

- Follow the existing code patterns and conventions
- Use TypeScript for type safety
- Write mobile-first responsive UI
- Prefer dynamic solutions over hardcoded patterns
- Keep components modular and reusable

## License

MIT

## Support

For support, please open an issue in the repository or contact the development team.

## Acknowledgments

- Built with React and Express.js
- UI components from shadcn/ui and Radix UI
- AI capabilities powered by OpenAI
- Database hosting by Neon
- Payment processing by Stripe
