import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { dark } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import NotesPage from "@/pages/notes";
import DocumentsPage from "@/pages/documents";
import TasksPage from "@/pages/tasks";
import ProjectsPage from "@/pages/projects";
import ChatPage from "@/pages/chat";
import DecisionsPage from "@/pages/decisions";
import ContradictionsPage from "@/pages/contradictions";
import KnowledgeGraphPage from "@/pages/knowledge-graph";
import ResearchPage from "@/pages/research";
import ReasoningPage from "@/pages/reasoning";
import MemoryPage from "@/pages/memory";
import SettingsPage from "@/pages/settings";
import AppShell from "@/components/layout/app-shell";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: dark,
  variables: {
    colorPrimary: "hsl(180 100% 50%)",
    colorForeground: "hsl(210 40% 98%)",
    colorMutedForeground: "hsl(240 5% 65%)",
    colorDanger: "hsl(350 100% 60%)",
    colorBackground: "hsl(240 10% 6%)",
    colorInput: "hsl(240 10% 12%)",
    colorInputForeground: "hsl(210 40% 98%)",
    colorNeutral: "hsl(240 10% 12%)",
    fontFamily: "'Space Mono', ui-monospace, monospace",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card/60 backdrop-blur-xl border border-white/10 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl neon-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold neon-text",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-muted-foreground font-semibold",
    footerActionLink: "text-primary hover:text-primary/80 transition-colors",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground bg-transparent px-2",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-400",
    alertText: "text-destructive",
    logoBox: "mb-6 flex justify-center",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "bg-background/40 border border-white/10 hover:bg-background/60 transition-colors",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.4)]",
    formFieldInput: "bg-input/50 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary",
    footerAction: "border-t border-white/10 pt-4 mt-6",
    dividerLine: "bg-white/10",
    alert: "bg-destructive/20 border border-destructive/50 text-destructive",
    otpCodeFieldInput: "bg-input/50 border border-white/10 text-foreground",
    formFieldRow: "mb-4",
    main: "w-full",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${basePath}/hero-bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/0 via-background/80 to-background pointer-events-none" />
      <div className="z-10 w-full flex justify-center">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${basePath}/hero-bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/0 via-background/80 to-background pointer-events-none" />
      <div className="z-10 w-full flex justify-center">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <AppShell>
          <Component />
        </AppShell>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      {...(clerkProxyUrl ? { proxyUrl: clerkProxyUrl } : {})}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Access Cortex",
            subtitle: "Initialize neural handshake",
          },
        },
        signUp: {
          start: {
            title: "Initialize System",
            subtitle: "Boot up your second brain",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/dashboard"><ProtectedRoute component={DashboardPage} /></Route>
            <Route path="/notes"><ProtectedRoute component={NotesPage} /></Route>
            <Route path="/documents"><ProtectedRoute component={DocumentsPage} /></Route>
            <Route path="/tasks"><ProtectedRoute component={TasksPage} /></Route>
            <Route path="/projects"><ProtectedRoute component={ProjectsPage} /></Route>
            <Route path="/chat"><ProtectedRoute component={ChatPage} /></Route>
            <Route path="/decisions"><ProtectedRoute component={DecisionsPage} /></Route>
            <Route path="/contradictions"><ProtectedRoute component={ContradictionsPage} /></Route>
            <Route path="/knowledge-graph"><ProtectedRoute component={KnowledgeGraphPage} /></Route>
            <Route path="/research"><ProtectedRoute component={ResearchPage} /></Route>
            <Route path="/reasoning"><ProtectedRoute component={ReasoningPage} /></Route>
            <Route path="/memory"><ProtectedRoute component={MemoryPage} /></Route>
            <Route path="/settings/*?"><ProtectedRoute component={SettingsPage} /></Route>

            <Route path="/:rest*">
              <Redirect to="/" />
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
