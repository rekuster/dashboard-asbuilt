import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectSettings from "./pages/ProjectSettings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

function AppLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    return (
        <>
            {user && <TopBar />}
            {children}
        </>
    );
}

function Router() {
    return (
        <AppLayout>
            <Switch>
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/">
                    <ProtectedRoute>
                        <Projects />
                    </ProtectedRoute>
                </Route>
                <Route path="/project/:id">
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                </Route>
                <Route path="/project/:id/settings">
                    <ProtectedRoute>
                        <ProjectSettings />
                    </ProtectedRoute>
                </Route>
                <Route component={NotFound} />
            </Switch>
        </AppLayout>
    );
}

function App() {
    return (
        <AuthProvider>
            <Toaster position="top-right" />
            <Router />
        </AuthProvider>
    );
}

export default App;

