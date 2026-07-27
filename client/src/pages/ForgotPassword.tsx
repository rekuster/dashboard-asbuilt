import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'wouter';
import { Loader2, Building2, ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setIsLoading(false);

        if (error) {
            if (error.message.includes('rate limit')) {
                toast.error('Limite de solicitações atingido', {
                    description: 'Muitos e-mails foram solicitados recentemente. Aguarde alguns minutos e tente novamente.',
                });
            } else {
                toast.error('Erro ao enviar e-mail', { description: error.message });
            }
        } else {
            setIsSent(true);
            toast.success('E-mail de recuperação enviado!');
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
                        {isSent ? (
                            <MailCheck className="w-8 h-8 text-primary" />
                        ) : (
                            <Building2 className="w-8 h-8 text-primary" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        {isSent ? 'Verifique seu e-mail' : 'Recuperar Senha'}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {isSent
                            ? `Enviamos as instruções de recuperação para ${email}`
                            : 'Digite seu e-mail para receber o link de redefinição'}
                    </p>
                </div>

                <Card className="shadow-xl border-0 shadow-primary/5">
                    <CardHeader className="pb-4">
                        <h2 className="text-lg font-semibold text-center">
                            {isSent ? 'E-mail enviado' : 'Esqueceu a senha?'}
                        </h2>
                    </CardHeader>
                    <CardContent>
                        {isSent ? (
                            <div className="space-y-4 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Clique no link enviado no seu e-mail para criar uma nova senha.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsSent(false)}
                                    className="w-full text-sm font-medium mt-2"
                                >
                                    Enviar novamente
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-foreground">
                                        E-mail cadastrado
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

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-11 text-sm font-semibold"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar link de recuperação'
                                    )}
                                </Button>
                            </form>
                        )}

                        <div className="mt-6 text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1.5" />
                                Voltar para o login
                            </Link>
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
