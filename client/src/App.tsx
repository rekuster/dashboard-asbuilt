import { Toaster } from "sonner";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectSettings from "./pages/ProjectSettings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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

// Detecta token de recovery do Supabase na URL (hash #access_token=...&type=recovery)
// e redireciona para a página de redefinição de senha
function RecoveryRedirect() {
    const [, setLocation] = useLocation();

    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            setLocation('/reset-password');
        }
    }, [setLocation]);

    return null;
}

function Router() {
    return (
        <AppLayout>
            <RecoveryRedirect />
            <Switch>
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/forgot-password" component={ForgotPassword} />
                <Route path="/reset-password" component={ResetPassword} />
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
