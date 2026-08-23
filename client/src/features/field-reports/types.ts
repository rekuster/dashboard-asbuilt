export interface QueuedApontamento {
    id: string; // Temp local ID
    projectId?: string; // Project scope
    salaId: number;
    edificacao: string;
    pavimento: string;
    setor: string;
    sala: string;
    disciplina: string;
    divergencia: string;
    fotoRABase64?: string; // For offline storage
    fotoRealBase64?: string; // For offline storage
    fotoUrl?: string; // For syncing
    fotoReferenciaUrl?: string; // For syncing reference photo
    data: string;
}

export interface ApontamentoItem {
    id: string;
    disciplina: string;
    disciplinaLabel: string;
    divergencia: string;
    fotoRA: File | null;
    fotoRAPreview: string | null;
    fotoReal: File | null;
    fotoRealPreview: string | null;
}
