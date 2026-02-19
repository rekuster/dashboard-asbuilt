import { Sala } from "../drizzle/schema";

/**
 * Calculates the Status RA based on the room's conditions.
 * Rule: LIBERADO if augin=1 AND trackerPosicionado=1 AND qrCodePlastificado=1
 */
export function calculateStatusRA(sala: Partial<Sala>): string {
    const isLiberado =
        sala.augin === 1 &&
        sala.trackerPosicionado === 1 &&
        sala.qrCodePlastificado === 1;

    return isLiberado ? "LIBERADO PARA OBRA" : "PENDENTE";
}

/**
 * Assigns responsibility based on the discipline.
 * Rule: 
 * - Thá: HID, ARQ, EST, MET
 * - Ocle: CLI, ELE, ELEMT, PCI, LOG, SDAI, SPDA, UTI
 */
export function assignResponsavel(disciplina: string): string {
    const disc = disciplina.toUpperCase();

    const thaDisciplines = ["HID", "ARQ", "EST", "MET"];
    const ocleDisciplines = ["CLI", "ELE", "ELEMT", "PCI", "LOG", "SDAI", "SPDA", "UTI"];

    if (thaDisciplines.includes(disc)) return "Thá";
    if (ocleDisciplines.includes(disc)) return "Ocle";

    return "Não Definido";
}

/**
 * Determines room verification status based on observations.
 * Rule:
 * - Verificada: No observations (obs/revisar)
 * - Revisar: Has observations for second verification
 * - Pendente: Not verified yet
 */
export function calculateRoomStatus(sala: Partial<Sala>): string {
    if (sala.dataVerificacao2) {
        return "VERIFICADA";
    }
    if (sala.revisar || sala.obs || sala.obs2) {
        return "REVISAR";
    }
    if (sala.dataVerificada) {
        return "VERIFICADA";
    }
    return "PENDENTE";
}
