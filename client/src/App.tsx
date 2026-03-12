import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectSettings from "./pages/ProjectSettings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

function Router() {
    return (
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
