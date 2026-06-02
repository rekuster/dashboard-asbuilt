import { trpc } from '@/lib/trpc';

export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'parceiro';

export interface UseProjectRoleResult {
    role: ProjectRole | null;
    isAdmin: boolean;       // owner or admin
    isEditor: boolean;      // owner, admin, or editor
    isParceiro: boolean;    // parceiro (third-party)
    isViewer: boolean;      // viewer or above
    isLoading: boolean;
    error: any;
}

export function useProjectRole(projectId?: string): UseProjectRoleResult {
    const { data, isLoading, error } = trpc.projects.getUserRole.useQuery(
        { projectId: projectId! },
        { 
            enabled: !!projectId,
            retry: false,
            refetchOnWindowFocus: false,
        }
    );

    const role = (data?.role as ProjectRole) || null;

    const isAdmin = role === 'owner' || role === 'admin';
    const isEditor = isAdmin || role === 'editor';
    const isParceiro = role === 'parceiro';
    const isViewer = role !== null; // anyone who has a role can view at least

    return {
        role,
        isAdmin,
        isEditor,
        isParceiro,
        isViewer,
        isLoading,
        error
    };
}
