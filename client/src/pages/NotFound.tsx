export default function NotFound() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
                <p className="text-xl text-muted-foreground mb-8">Página não encontrada</p>
                <a
                    href="/"
                    className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                    Voltar ao Dashboard
                </a>
            </div>
        </div>
    );
}
