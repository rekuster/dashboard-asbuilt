import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'parceiro';

export interface UseProjectRoleResult {
    role: ProjectRole | null;
    empresa: string | null;
    isAdmin: boolean;       // owner or admin
    isEditor: boolean;      // owner, admin, or editor
    isParceiro: boolean;    // parceiro (third-party)
    isViewer: boolean;      // viewer or above
    isLoading: boolean;
    error: any;
}

export function useProjectRole(projectId?: string): UseProjectRoleResult {
    const { user } = useAuth();
    const userEmail = (user?.email || "").toLowerCase();
    const isSteclaAdmin =
        userEmail === "renata.vianna@stecla.com.br" ||
        userEmail.endsWith("@stecla.com.br") ||
        userEmail.startsWith("admin@");

    const { data, isLoading, error } = trpc.projects.getUserRole.useQuery(
        { projectId: projectId! },
        { 
            enabled: !!projectId,
            retry: false,
            refetchOnWindowFocus: false,
        }
    );

    const role = (data?.role as ProjectRole) || (isSteclaAdmin ? 'owner' : null);
    const empresa = data?.empresa || (isSteclaAdmin ? 'Stecla' : null);

    const isAdmin = isSteclaAdmin || role === 'owner' || role === 'admin';
    const isEditor = isAdmin || role === 'editor';
    const isParceiro = !isSteclaAdmin && role === 'parceiro';
    const isViewer = isSteclaAdmin || role !== null; // anyone who has a role can view at least

    return {
        role,
        empresa,
        isAdmin,
        isEditor,
        isParceiro,
        isViewer,
        isLoading,
        error
    };
}
