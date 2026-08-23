import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

export default function Login() {
    const { signIn, user } = useAuth();
    const [, setLocation] = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    if (user) {
        setLocation("/");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { error } = await signIn(email, password);

        if (error) {
            toast.error("Erro ao fazer login", {
                description:
                    error.message === "Invalid login credentials"
                        ? "E-mail ou senha incorretos."
                        : error.message,
            });
            setIsLoading(false);
        } else {
            toast.success("Login realizado com sucesso!");
            setLocation("/");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
            {/* Background ambient accents */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#940707] rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-slate-800 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10 space-y-6">
                {/* Logo area */}
                <div className="text-center space-y-2">
                    <img
                        src="/logos_stecla/versao_horizontal_branca@4x.png"
                        alt="Stecla Engenharia"
                        className="h-10 mx-auto object-contain"
                    />
                    <p className="text-slate-400 text-xs font-medium tracking-wide uppercase">
                        Plataforma As-Built & Gestão BIM
                    </p>
                </div>

                <Card className="shadow-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl rounded-3xl text-white">
                    <CardHeader className="pb-2 pt-6 text-center">
                        <h2 className="text-base font-bold text-white">Acesse sua conta</h2>
                        <p className="text-xs text-slate-400">
                            Informe suas credenciais para acessar os projetos
                        </p>
                    </CardHeader>
                    <CardContent className="p-6 pt-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label
                                    htmlFor="email"
                                    className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5"
                                >
                                    E-mail
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="seu.email@empresa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs
                                             focus:outline-none focus:ring-2 focus:ring-[#940707]/30 focus:border-[#940707]
                                             transition-all placeholder:text-slate-600"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-0.5"
                                    >
                                        Senha
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-[10px] text-[#940707] hover:text-red-400 font-bold hover:underline"
                                    >
                                        Esqueceu a senha?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs
                                                 focus:outline-none focus:ring-2 focus:ring-[#940707]/30 focus:border-[#940707]
                                                 transition-all placeholder:text-slate-600 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-11 rounded-xl bg-[#940707] hover:bg-[#7a0606] text-white text-xs font-bold shadow-lg shadow-[#940707]/30 transition-all mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Entrando...
                                    </>
                                ) : (
                                    "Entrar na Plataforma"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-[11px] text-slate-500">
                    Não tem uma conta?{" "}
                    <Link
                        href="/register"
                        className="text-white hover:text-[#940707] font-bold transition-colors"
                    >
                        Solicitar acesso
                    </Link>
                </p>
            </div>
        </div>
    );
}
