import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link } from 'wouter';
import { Loader2, Eye, EyeOff, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Register() {
    const { signUp, user } = useAuth();
    const [, setLocation] = useLocation();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // If already logged in, redirect
    if (user) {
        setLocation('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem');
            return;
        }

        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setIsLoading(true);

        const { error } = await signUp(email, password, name);

        if (error) {
            toast.error('Erro ao criar conta', {
                description: error.message,
            });
            setIsLoading(false);
        } else {
            toast.success('Conta criada com sucesso!', {
                description: 'Verifique seu e-mail para confirmar o cadastro.',
            });
            setLocation('/login');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50/30 p-4">
            {/* Background pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative">
                {/* Logo area */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                        <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        Dashboard As-Built
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Crie sua conta para acessar a plataforma
                    </p>
                </div>

                <Card className="shadow-xl border-0 shadow-primary/5">
                    <CardHeader className="pb-4">
                        <h2 className="text-lg font-semibold text-center">Criar conta</h2>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium text-foreground">
                                    Nome completo
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Seu nome"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm
                                             focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                                             transition-all placeholder:text-muted-foreground"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-foreground">
                                    E-mail
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm
                                             focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                                             transition-all placeholder:text-muted-foreground"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-foreground">
                                    Senha
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Mínimo 6 caracteres"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm
                                                 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                                                 transition-all placeholder:text-muted-foreground pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                                    Confirmar senha
                                </label>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Repita a senha"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm
                                             focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                                             transition-all placeholder:text-muted-foreground"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-11 text-sm font-semibold"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Criando conta...
                                    </>
                                ) : (
                                    'Criar conta'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Já tem uma conta?{' '}
                                <Link
                                    href="/login"
                                    className="text-primary font-semibold hover:underline"
                                >
                                    Faça login
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Stecla Engenharia © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
