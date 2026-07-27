import { getDb, projectMembers, users, projects } from './db';
import { eq, and } from 'drizzle-orm';
import postgres from 'postgres';

export interface InviteMemberInput {
    projectId: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer' | 'parceiro';
}

/**
 * Auxiliar para consultar usuários do Supabase auth.users diretamente via SQL (Postgres)
 */
async function getSupabaseAuthUsers() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return [];

    try {
        const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false }, prepare: false, max: 1 });
        const rows = await sql`
            SELECT 
                id, 
                email, 
                COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', '') as name
            FROM auth.users
        `;
        await sql.end();
        return rows;
    } catch (e: any) {
        console.error('[membersService] Erro ao buscar auth.users:', e.message);
        return [];
    }
}

/**
 * Converte um e-mail em um nome legível (ex: renata.vianna@stecla.com.br -> Renata Vianna)
 */
function nameFromEmail(email: string): string {
    if (!email) return 'Convidado';
    const prefix = email.split('@')[0];
    return prefix
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export async function listProjectMembers(projectId: string) {
    const db = await getDb();
    if (!db) return [];

    // 1. Obter informações do Projeto para saber o proprietário
    const projResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const project = projResult[0] || null;

    // 2. Buscar lista de projectMembers + tabela users local
    const dbMembers = await db.select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        email: projectMembers.email,
        role: projectMembers.role,
        invitedAt: projectMembers.invitedAt,
        acceptedAt: projectMembers.acceptedAt,
        name: users.name
    })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.openId))
    .where(eq(projectMembers.projectId, projectId));

    // 3. Buscar mapa de usuários do Supabase Auth para recuperar nomes e IDs completos
    const authUsers = await getSupabaseAuthUsers();
    const authUserMap = new Map<string, { id: string; email: string; name: string }>();
    const authUserByEmailMap = new Map<string, { id: string; email: string; name: string }>();

    for (const u of authUsers) {
        const entry = {
            id: u.id,
            email: (u.email || '').toLowerCase(),
            name: u.name || ''
        };
        authUserMap.set(u.id, entry);
        if (entry.email) {
            authUserByEmailMap.set(entry.email, entry);
        }
    }

    // Processar os membros trazidos da tabela projectMembers
    const resultList: any[] = [];
    const memberEmails = new Set<string>();
    const memberUserIds = new Set<string>();

    for (const m of dbMembers) {
        const emailNorm = (m.email || '').toLowerCase();
        memberEmails.add(emailNorm);
        if (m.userId) memberUserIds.add(m.userId);

        // Tentar resolver o nome do usuário
        let resolvedName = m.name;

        // Se não tiver nome na tabela local `users`, buscar do Supabase Auth
        const authUser = authUserMap.get(m.userId) || authUserByEmailMap.get(emailNorm);
        if (!resolvedName && authUser && authUser.name) {
            resolvedName = authUser.name;
        }

        // Se a conta já for ativa / registrada no Supabase mas sem nome preenchido, formatar nome do e-mail
        if (!resolvedName && (m.acceptedAt || authUser)) {
            resolvedName = nameFromEmail(m.email);
        }

        // Se o proprietário do projeto for este membro, ajustar role para 'owner' e aceito
        const isOwner = project && (project.ownerId === m.userId || (authUser && project.ownerId === authUser.id));

        resultList.push({
            id: m.id,
            projectId: m.projectId,
            userId: m.userId || (authUser ? authUser.id : ''),
            email: m.email,
            role: isOwner ? 'owner' : m.role,
            invitedAt: m.invitedAt,
            acceptedAt: m.acceptedAt || (authUser ? new Date() : null),
            name: resolvedName || null
        });
    }

    // 4. Se o proprietário do projeto ainda não estiver na lista de projectMembers, incluí-lo automaticamente!
    if (project && project.ownerId && !memberUserIds.has(project.ownerId)) {
        const ownerAuth = authUserMap.get(project.ownerId);
        if (ownerAuth) {
            const ownerEmailNorm = ownerAuth.email.toLowerCase();
            if (!memberEmails.has(ownerEmailNorm)) {
                resultList.unshift({
                    id: `owner-${project.id}`,
                    projectId: project.id,
                    userId: ownerAuth.id,
                    email: ownerAuth.email,
                    role: 'owner',
                    invitedAt: project.createdAt || new Date(),
                    acceptedAt: project.createdAt || new Date(),
                    name: ownerAuth.name || nameFromEmail(ownerAuth.email)
                });
            }
        }
    }

    return resultList;
}

export async function inviteProjectMember(data: InviteMemberInput) {
    const db = await getDb();
    if (!db) return null;

    const emailNorm = data.email.trim().toLowerCase();

    // 1. Verificar se usuário já é membro do projeto
    const existing = await db.select()
        .from(projectMembers)
        .where(
            and(
                eq(projectMembers.projectId, data.projectId),
                eq(projectMembers.email, emailNorm)
            )
        )
        .limit(1);

    if (existing.length > 0) {
        throw new Error("Este usuário já faz parte do projeto ou já possui convite pendente.");
    }

    // 2. Verificar se o e-mail é do proprietário do projeto
    const proj = await db.select().from(projects).where(eq(projects.id, data.projectId)).limit(1);
    const authUsers = await getSupabaseAuthUsers();
    const authUser = authUsers.find(u => (u.email || '').toLowerCase() === emailNorm);

    if (proj.length > 0 && proj[0].ownerId) {
        if (authUser && authUser.id === proj[0].ownerId) {
            throw new Error("Este e-mail pertence ao proprietário do projeto.");
        }
    }

    // 3. Tentar vincular imediatamente ao ID do Supabase Auth se cadastrado
    const userResult = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
    let userId = userResult.length > 0 ? userResult[0].openId : (authUser ? authUser.id : "");
    let isAccepted = !!(userResult.length > 0 || authUser);

    // Se encontramos no Supabase Auth mas não na tabela `users` local, criar a entrada local
    if (authUser && userResult.length === 0) {
        try {
            await db.insert(users).values({
                openId: authUser.id,
                email: emailNorm,
                name: authUser.name || nameFromEmail(emailNorm),
                role: 'user',
                lastSignedIn: new Date()
            }).onConflictDoNothing();
        } catch (e) {
            // Ignorar erro se o registro já existir
        }
    }

    const [newMember] = await db.insert(projectMembers).values({
        projectId: data.projectId,
        userId: userId,
        email: emailNorm,
        role: data.role,
        invitedAt: new Date(),
        acceptedAt: isAccepted ? new Date() : null // Auto-aceito se já cadastrado no Supabase
    }).returning();

    return newMember;
}

export async function updateProjectMemberRole(projectId: string, memberId: string, role: 'admin' | 'editor' | 'viewer' | 'parceiro') {
    const db = await getDb();
    if (!db) return null;

    const [updated] = await db.update(projectMembers)
        .set({ role })
        .where(
            and(
                eq(projectMembers.id, memberId),
                eq(projectMembers.projectId, projectId)
            )
        )
        .returning();

    return updated;
}

export async function removeProjectMember(projectId: string, memberId: string) {
    const db = await getDb();
    if (!db) return null;

    const [deleted] = await db.delete(projectMembers)
        .where(
            and(
                eq(projectMembers.id, memberId),
                eq(projectMembers.projectId, projectId)
            )
        )
        .returning();

    return deleted;
}

/**
 * Busca usuários cadastrados no Supabase Auth para autocompletar convites
 */
export async function searchRegisteredUsers(query: string) {
    const authUsers = await getSupabaseAuthUsers();
    const q = (query || '').trim().toLowerCase();

    return authUsers
        .filter(u => {
            const email = (u.email || '').toLowerCase();
            const name = (u.name || '').toLowerCase();
            return !q || email.includes(q) || name.includes(q);
        })
        .map(u => ({
            id: u.id,
            email: u.email,
            name: u.name || nameFromEmail(u.email)
        }));
}
