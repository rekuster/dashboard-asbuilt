import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';
import { Loader2, Eye, EyeOff, Building2, CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ResetPassword() {
    const [, setLocation] = useLocation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        // Supabase injeta o token de recovery via hash na URL e dispara PASSWORD_RECOVERY
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setIsReady(true);
            }
        });

        // Se já tiver sessão ativa (token já processado), também habilita o form
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setIsReady(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }

        setIsLoading(true);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            toast.error('Erro ao redefinir senha', { description: error.message });
            setIsLoading(false);
        } else {
            setIsSuccess(true);
            toast.success('Senha redefinida com sucesso!');
            setTimeout(() => setLocation('/'), 2000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50/30 p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                        {isSuccess ? (
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        ) : (
                            <KeyRound className="w-8 h-8 text-primary" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        {isSuccess ? 'Senha redefinida!' : 'Criar nova senha'}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {isSuccess
                            ? 'Você será redirecionado em instantes...'
                            : 'Insira e confirme sua nova senha'}
                    </p>
                </div>

                {!isSuccess && (
                    <Card className="shadow-xl border-0 shadow-primary/5">
                        <CardHeader className="pb-4">
                            <h2 className="text-lg font-semibold text-center">Redefinir Senha</h2>
                        </CardHeader>
                        <CardContent>
                            {!isReady ? (
                                <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <p className="text-sm">Validando o link de redefinição...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-sm font-medium text-foreground">
                                            Nova Senha
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Mínimo 6 caracteres"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm
                                                         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                                                         transition-all placeholder:text-muted-foreground pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                                            Confirmar Nova Senha
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="confirmPassword"
                                                type={showConfirm ? 'text' : 'password'}
                                                placeholder="Repita a senha"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm
                                                         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                                                         transition-all placeholder:text-muted-foreground pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-11 text-sm font-semibold"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            'Salvar nova senha'
                                        )}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                )}

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Stecla Engenharia © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
