export const DISCIPLINA_LABELS: Record<string, string> = {
    ARQ: "ARQ - Arquitetura",
    FORRO: "FORRO",
    EST: "EST - Estrutura",
    HID: "HID - Hidráulica",
    PCI: "PCI - Incêndio",
    ELE: "ELE - Elétrica",
    CLI: "CLI - Climatização",
    MET: "MET - Metálica",
    LOG: "LOG - Lógica",
    ELEMT: "ELEMT - Barramento e Média Tensão",
    SDAI: "SDAI - Detecção e Alarme",
    SPDA: "SPDA - Para-raios",
    UTI: "UTI - Utilidades",
};

export function getTodayString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}
