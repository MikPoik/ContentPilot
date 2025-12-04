StackClientAppbeta
Reference for the StackClientApp object

This is a detailed reference for the client-side StackApp object in the React SDK. If you're looking for a more high-level overview, please read the respective page in the Concepts section.

StackClientApp
The main object for interacting with Stack Auth on the client. It provides methods for authentication, user management, and team management.

Most commonly you get an instance of StackClientApp by calling useStackApp() in a Client Component.

Table of Contents
type StackClientApp = {
new(options): StackClientApp;

getUser([options]): Promise<User>;
⤷ useUser([options]): User;
getProject(): Promise<Project>;
⤷ useProject(): Project;

signInWithOAuth(provider): void;
signInWithCredential([options]): Promise<...>;
signUpWithCredential([options]): Promise<...>;
sendForgotPasswordEmail(email): Promise<...>;
sendMagicLinkEmail(email): Promise<...>;
};
Constructor
Creates a new StackClientApp instance.

Because each app creates a new connection to Stack Auth's backend, you should re-use existing instances wherever possible.

note
This object is not usually constructed directly. More commonly, you would construct a StackServerApp instead, pass it into a StackProvider, and then use useStackApp() hook to obtain a StackClientApp.

The setup wizard does these steps for you, so you don't need to worry about it unless you are manually setting up Stack Auth.

If you're building a client-only app and don't have a SECRET_SERVER_KEY, you can construct a StackClientApp directly.

Parameters
options (object)

An object containing multiple properties.

Show properties
Signature
declare new(options: {
  tokenStore: "nextjs-cookie" | "cookie" | { accessToken: string, refreshToken: string } | Request;
  baseUrl?: string;
  projectId?: string;
  publishableClientKey?: string;
  urls: {
    ...
  };
  noAutomaticPrefetch?: boolean;
}): StackClientApp;
Examples
const stackClientApp = new StackClientApp({
  tokenStore: 'nextjs-cookie',
  baseUrl: 'https://api.stack-auth.com',
  projectId: '123',
  publishableClientKey: '123',
  urls: {
    home: '/',
  },
});
'use client';
function MyReactComponent() {
  const stackClientApp = useStackApp();
}
stackClientApp.getUser([options]) 
Gets the current user.

Parameters 
options: An object containing multiple properties:
or: What to do if the user is not found:
"return-null": Return null (default)
"redirect": Redirect to the sign-in page
"throw": Throw an error
Returns 
Promise<CurrentUser | null>: The current user, or null if not signed in. If or is "redirect" or "throw", never returns null.

Signature 
declare function getUser(options: {
  or?: 'return-null' | 'redirect' | 'throw';
}): Promise<CurrentUser | null>;
Examples 
// Getting the current user
const userOrNull = await stackClientApp.getUser();
console.log(userOrNull); // null if not signed in
const user = await stackClientApp.getUser({ or: 'redirect' });
console.log(user); // always defined; redirects to sign-in page if not signed in
stackClientApp.useUser([options]) 
Functionally equivalent to getUser(), but as a React hook.

Equivalent to the useUser() standalone hook (which is an alias for useStackApp().useUser()).

Parameters 
options: An object containing multiple properties:
or: What to do if the user is not found:
"return-null": Return null (default)
"redirect": Redirect to the sign-in page
"throw": Throw an error
Returns 
CurrentUser | null: The current user, or null if not signed in. If or is "redirect" or "throw", never returns null.

Signature 
declare function useUser(options: {
  or?: 'return-null' | 'redirect' | 'throw';
}): CurrentUser | null;
Examples 
// Displaying the current user's username
'use client';
function MyReactComponent() {
  // useUser(...) is an alias for useStackApp().useUser(...)
  const user = useUser();
  return user ? <div>Hello, {user.name}</div> : <div>Not signed in</div>;
}
// Redirecting vs. not redirecting
('use client');
function MyReactComponent() {
  const user = useUser();
  console.log(user); // null if not signed in
  const user = useUser({ or: 'redirect' }); // redirects to sign-in page if necessary
  console.log(user); // always defined
  const user = useUser({ or: 'throw' }); // throws an error if not signed in
  console.log(user); // always defined
}
// Protecting a page client-side
('use client');
function MyProtectedComponent() {
  // Note: This component is protected on the client-side.
  // It does not protect against malicious users, since
  // they can just comment out the `useUser` call in their
  // browser's developer console.
  //
  // The purpose of client-side protection is to redirect
  // unauthenticated users to the sign-in page, not to
  // hide secret information from them.
  //
  // For more information on protecting pages and how to
  // protect a page server-side or in the middleware, see
  // the Stack Auth documentation:
  // https://docs.stack-auth.com/getting-started/users#protecting-a-page
  useUser({ or: 'redirect' });
  return <div>You can only see this if you are authenticated</div>;
}
stackClientApp.getProject() 
Get the current project.

Returns 
Promise<Project>: The current project.

Signature 
declare function getProject(): Promise<Project>;
Examples 
const project = await stackClientApp.getProject();
console.log(project);
stackClientApp.useProject()
Functionally equivalent to getProject(), but as a React hook.

stackClientApp.signInWithOAuth(provider) 
Sign in with an OAuth provider.

Parameters 
provider: The OAuth provider to use.
Returns 
Promise<Result<undefined, KnownErrors["RedirectUrlNotWhitelisted"]>>: A promise that resolves to a Result object.

Signature 
declare function signInWithOAuth(
  provider: string
): Promise<Result<undefined, KnownErrors['RedirectUrlNotWhitelisted']>>;
Examples 
const result = await stackClientApp.signInWithOAuth('google');
if (result.status === 'error') {
  console.error('Sign in failed', result.error.message);
}
stackClientApp.signInWithCredential(options) 
Sign in with email and password.

Parameters 
options: An object containing multiple properties:
email: The email of the user to sign in as
password: The password of the user to sign in as
Returns 
Promise<Result<undefined, KnownErrors["InvalidCredentials"]>>: A promise that resolves to a Result object.

Signature 
declare function signInWithCredential(options: {
  email: string;
  password: string;
}): Promise<Result<undefined, KnownErrors['InvalidCredentials']>>;
Examples 
const result = await stackClientApp.signInWithCredential({
  email: 'test@example.com',
  password: 'password',
});
if (result.status === 'error') {
  console.error('Sign in failed', result.error.message);
}
stackClientApp.signUpWithCredential(options) 
Sign up with email and password.

Parameters 
options: An object containing multiple properties:
email: The email of the user to sign up as
password: The password of the user to sign up as
Returns 
Promise<Result<undefined, KnownErrors["UserWithEmailAlreadyExists"] | KnownErrors["PasswordRequirementsNotMet"]>>: A promise that resolves to a Result object.

Signature 
declare function signUpWithCredential(options: {
  email: string;
  password: string;
}): Promise<
  Result<
    undefined,
    KnownErrors['UserWithEmailAlreadyExists'] | KnownErrors['PasswordRequirementsNotMet']
  >
>;
Examples 
const result = await stackClientApp.signUpWithCredential({
  email: 'test@example.com',
  password: 'password',
});
if (result.status === 'error') {
  console.error('Sign up failed', result.error.message);
}
stackClientApp.sendForgotPasswordEmail(email) 
Send a forgot password email to an email address.

Parameters 
email: The email of the user to send the forgot password email to.
Returns 
Promise<Result<undefined, KnownErrors["UserNotFound"]>>: A promise that resolves to a Result object.

Signature 
declare function sendForgotPasswordEmail(
  email: string
): Promise<Result<undefined, KnownErrors['UserNotFound']>>;
Examples 
const result = await stackClientApp.sendForgotPasswordEmail('test@example.com');
if (result.status === 'success') {
  console.log('Forgot password email sent');
} else {
  console.error('Failed to send forgot password email', result.error.message);
}
stackClientApp.sendMagicLinkEmail(email) 
Send a magic link/OTP sign-in email to an email address.

Parameters 
email: The email of the user to send the magic link email to.
Returns 
Promise<Result<{ nonce: string }, KnownErrors["RedirectUrlNotWhitelisted"]>>: A promise that resolves to a Result object.

Signature 
declare function sendMagicLinkEmail(
  email: string
): Promise<Result<{ nonce: string }, KnownErrors['RedirectUrlNotWhitelisted']>>;
Examples 
const result = await stackClientApp.sendMagicLinkEmail('test@example.com')