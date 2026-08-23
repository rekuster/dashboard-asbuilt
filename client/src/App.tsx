import { Toaster } from "sonner";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { LayoutProvider } from "./contexts/LayoutContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectSettings from "./pages/ProjectSettings";
import ProfilePage from "./pages/ProfilePage";
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

function RecoveryRedirect() {
    const [, setLocation] = useLocation();

    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes("type=recovery")) {
            setLocation("/reset-password");
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
                <Route path="/profile">
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                </Route>
                <Route path="/platform-settings">
                    <ProtectedRoute>
                        <PlatformSettingsPage />
                    </ProtectedRoute>
                </Route>
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
            <LayoutProvider>
                <Toaster position="top-right" />
                <Router />
            </LayoutProvider>
        </AuthProvider>
    );
}

export default App;
