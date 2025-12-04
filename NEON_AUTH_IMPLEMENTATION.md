Neon Auth lets you add authentication to your app in seconds — user data is synced directly to your Neon Postgres database, so you can query and join it just like any other table.

Add Neon Auth to a project
Go to pg.new to create a new Neon project.

Once your project is ready, open your project's Auth page and click Enable Neon Auth to get started.

Neon Auth Console - Ready for users

Get your Neon Auth keys
On the Configuration tab, select your framework to get the Environment variables you need to integrate Neon Auth and connect to your database.

You can use these keys right away to get started, or skip ahead to try out user creation in the Neon Console.

# Neon Auth environment variables for React (Vite)
VITE_STACK_PROJECT_ID=YOUR_NEON_AUTH_PROJECT_ID
VITE_STACK_PUBLISHABLE_CLIENT_KEY=YOUR_NEON_AUTH_PUBLISHABLE_KEY
STACK_SECRET_SERVER_KEY=YOUR_NEON_AUTH_SECRET_KEY
# Your Neon connection string
DATABASE_URL=YOUR_NEON_CONNECTION_STRING
Are you a Vercel user?
If you're using the Vercel-Managed Integration, the integration automatically sets these environment variables for you in Vercel when you connect a Vercel project to a Neon database. Learn more.

Set up your app
Clone our template for the fastest way to see Neon Auth in action.

git clone https://github.com/neondatabase-labs/neon-auth-react-template.git
Or add Neon Auth to an existing project.

Install the React SDK
Make sure you have a React project set up. We show an example here of a Vite React project with React Router.

npm install @stackframe/react
Use your environment variables
Paste the Neon Auth environment variables from the Get your Neon Auth keys section into your .env.local file.

Configure Neon Auth client
A basic example of how to set up the Neon Auth client in stack.ts in your src directory:

import { StackClientApp } from '@stackframe/react';
import { useNavigate } from 'react-router-dom';
export const stackClientApp = new StackClientApp({
projectId: import.meta.env.VITE_STACK_PROJECT_ID,
publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
tokenStore: 'cookie',
redirectMethod: { useNavigate },
});
Update your app to use the provider and handler
In your src/App.tsx:

import { StackHandler, StackProvider, StackTheme } from '@stackframe/react';
import { Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { stackClientApp } from './stack';
function HandlerRoutes() {
const location = useLocation();
return (
<StackHandler app={stackClientApp} location={location.pathname} fullPage />
);
}
export default function App() {
return (
<Suspense fallback={null}>
<BrowserRouter>
<StackProvider app={stackClientApp}>
<StackTheme>
<Routes>
<Route path="/handler/*" element={<HandlerRoutes />} />
<Route path="/" element={<div>hello world</div>} />
</Routes>
</StackTheme>
</StackProvider>
</BrowserRouter>
</Suspense>
);
}
Start and test your app
npm start
Go to http://localhost:3000/handler/sign-up in your browser. Create a user or two, and you can see them show up immediately in the database.

Create users in the Console (optional)
You can create test users directly from the Neon Console — no app integration required. This is useful for development or testing.

Create user in Neon Console

Now you can see your users in the database.

See your users in the database
As users sign up or log in — through your app or by creating test users in the Console — their profiles are synced to your Neon database in the neon_auth.users_sync table.

Query your users table in the SQL Editor to see your new user:

SELECT * FROM neon_auth.users_sync;
id	name	email	created_at	updated_at	deleted_at	raw_json
51e491df...	Sam Patel	sam@startup.dev	2025-02-12 19:43...	2025-02-12 19:46...	null	{"id": "51e491df...", ...}
Next Steps