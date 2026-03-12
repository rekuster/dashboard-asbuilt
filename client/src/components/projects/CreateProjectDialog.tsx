import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface CreateProjectDialogProps {
    children: React.ReactNode;
}

export default function CreateProjectDialog({ children }: CreateProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [client, setClient] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const utils = trpc.useUtils();
    const createProject = trpc.projects.create.useMutation({
        onSuccess: () => {
            toast.success('Projeto criado com sucesso!');
            utils.projects.list.invalidate();
            setOpen(false);
            resetForm();
        },
        onError: (err) => {
            toast.error('Erro ao criar projeto', { description: err.message });
            setIsLoading(false);
        },
    });

    const resetForm = () => {
        setCode('');
        setName('');
        setClient('');
        setDescription('');
        setLocation('');
        setStartDate('');
        setEndDate('');
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        createProject.mutate({
            code: code.trim(),
            name: name.trim(),
            client: client.trim() || undefined,
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        });
    };

    const inputClass = `w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                        transition-all placeholder:text-muted-foreground`;

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Novo Projeto</DialogTitle>
                    <DialogDescription>
                        Preencha as informações para criar um novo projeto de verificação As-Built.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    {/* Code + Name row */}
                    <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Código *
                            </label>
                            <input
                                type="text"
                                placeholder="NEO-23001"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                className={inputClass}
                            />
                        </div>
                        <div className="col-span-3 space-y-1.5">
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Nome do Projeto *
                            </label>
                            <input
                                type="text"
                                placeholder="SuperNova"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Client */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Cliente *
                        </label>
                        <input
                            type="text"
                            placeholder="Nome do cliente"
                            value={client}
                            onChange={(e) => setClient(e.target.value)}
                            required
                            className={inputClass}
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Localização
                        </label>
                        <input
                            type="text"
                            placeholder="Curitiba, PR"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Dates row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Data de Início
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Previsão de Término
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Descrição
                        </label>
                        <textarea
                            placeholder="Descrição do projeto..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    {/* Info */}
                    <p className="text-[11px] text-muted-foreground bg-slate-50 p-2.5 rounded-lg">
                        O administrador do projeto será você automaticamente. Após criar, você poderá configurar a lista mestra de salas nas configurações do projeto.
                    </p>

                    {/* Submit */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Projeto'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
