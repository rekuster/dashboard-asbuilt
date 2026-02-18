import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

function Router() {
    return (
        <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route component={NotFound} />
        </Switch>
    );
}

function App() {
    return (
        <>
            <Toaster position="top-right" />
            <Router />
        </>
    );
}

export default App;
