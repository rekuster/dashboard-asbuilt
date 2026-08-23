import { getDb, projectMembers, users, projects } from '../../common/db';
import { eq, and } from 'drizzle-orm';
import postgres from 'postgres';

export interface InviteMemberInput {
    projectId: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer' | 'parceiro';
    empresa?: string;
}

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

    const projResult = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const project = projResult[0] || null;

    const dbMembers = await db.select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        email: projectMembers.email,
        role: projectMembers.role,
        empresa: projectMembers.empresa,
        invitedAt: projectMembers.invitedAt,
        acceptedAt: projectMembers.acceptedAt,
        name: users.name,
        avatarUrl: users.avatarUrl,
    })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.openId))
    .where(eq(projectMembers.projectId, projectId));

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

    const resultList: any[] = [];
    const memberEmails = new Set<string>();
    const memberUserIds = new Set<string>();

    for (const m of dbMembers) {
        const emailNorm = (m.email || '').toLowerCase();
        memberEmails.add(emailNorm);
        if (m.userId) memberUserIds.add(m.userId);

        let resolvedName = m.name;

        const authUser = authUserMap.get(m.userId) || authUserByEmailMap.get(emailNorm);
        if (!resolvedName && authUser && authUser.name) {
            resolvedName = authUser.name;
        }

        if (!resolvedName && (m.acceptedAt || authUser)) {
            resolvedName = nameFromEmail(m.email);
        }

        const isOwner = project && (project.ownerId === m.userId || (authUser && project.ownerId === authUser.id));

        resultList.push({
            id: m.id,
            projectId: m.projectId,
            userId: m.userId || (authUser ? authUser.id : ''),
            email: m.email,
            role: isOwner ? 'owner' : m.role,
            empresa: m.empresa || (isOwner ? 'Stecla' : 'Stecla'),
            invitedAt: m.invitedAt,
            acceptedAt: m.acceptedAt || (authUser ? new Date() : null),
            name: resolvedName || null,
            avatarUrl: m.avatarUrl || null,
        });
    }

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
                    empresa: 'Stecla',
                    invitedAt: project.createdAt || new Date(),
                    acceptedAt: project.createdAt || new Date(),
                    name: ownerAuth.name || nameFromEmail(ownerAuth.email),
                    avatarUrl: null,
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

    const proj = await db.select().from(projects).where(eq(projects.id, data.projectId)).limit(1);
    const authUsers = await getSupabaseAuthUsers();
    const authUser = authUsers.find(u => (u.email || '').toLowerCase() === emailNorm);

    if (proj.length > 0 && proj[0].ownerId) {
        if (authUser && authUser.id === proj[0].ownerId) {
            throw new Error("Este e-mail pertence ao proprietário do projeto.");
        }
    }

    const userResult = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
    let userId = userResult.length > 0 ? userResult[0].openId : (authUser ? authUser.id : "");
    let isAccepted = !!(userResult.length > 0 || authUser);

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
            // ignore conflict
        }
    }

    const [newMember] = await db.insert(projectMembers).values({
        projectId: data.projectId,
        userId: userId,
        email: emailNorm,
        role: data.role,
        empresa: data.empresa || 'Stecla',
        invitedAt: new Date(),
        acceptedAt: isAccepted ? new Date() : null
    }).returning();

    return newMember;
}

export async function updateProjectMember(
    projectId: string,
    memberId: string,
    data: { role?: 'admin' | 'editor' | 'viewer' | 'parceiro'; empresa?: string }
) {
    const db = await getDb();
    if (!db) return null;

    const [updated] = await db.update(projectMembers)
        .set({
            ...(data.role ? { role: data.role } : {}),
            ...(data.empresa ? { empresa: data.empresa } : {}),
        })
        .where(
            and(
                eq(projectMembers.id, memberId),
                eq(projectMembers.projectId, projectId)
            )
        )
        .returning();

    return updated;
}

export async function updateProjectMemberRole(projectId: string, memberId: string, role: 'admin' | 'editor' | 'viewer' | 'parceiro') {
    return updateProjectMember(projectId, memberId, { role });
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

export async function getUserProfile(userId: string) {
    const db = await getDb();
    if (!db) return null;

    const userRows = await db.select().from(users).where(eq(users.openId, userId)).limit(1);
    if (userRows.length > 0) return userRows[0];

    const authUsers = await getSupabaseAuthUsers();
    const authUser = authUsers.find(u => u.id === userId);
    if (authUser) {
        return {
            openId: authUser.id,
            email: authUser.email,
            name: authUser.name || nameFromEmail(authUser.email),
            avatarUrl: null,
            role: 'user',
        };
    }
    return null;
}

export async function updateUserProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
    const db = await getDb();
    if (!db) return null;

    const existing = await db.select().from(users).where(eq(users.openId, userId)).limit(1);
    if (existing.length > 0) {
        const [updated] = await db
            .update(users)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(users.openId, userId))
            .returning();
        return updated;
    } else {
        const [created] = await db
            .insert(users)
            .values({
                openId: userId,
                name: data.name,
                avatarUrl: data.avatarUrl,
                role: 'user',
            })
            .returning();
        return created;
    }
}

export async function listAllPlatformUsers() {
    const db = await getDb();
    if (!db) return [];

    const authUsers = await getSupabaseAuthUsers();
    const dbUsers = await db.select().from(users);
    const allProjects = await db.select().from(projects);
    const allMembers = await db.select().from(projectMembers);

    const userMap = new Map<string, any>();

    // 1. Inicia com auth.users
    for (const au of authUsers) {
        const email = (au.email || "").toLowerCase();
        const isStecla = email.endsWith("@stecla.com.br") || email === "renata.vianna@stecla.com.br";
        userMap.set(email, {
            id: au.id,
            openId: au.id,
            email: email,
            name: au.name || nameFromEmail(email),
            role: isStecla ? "admin" : "parceiro",
            empresa: isStecla ? "Stecla" : "Outra",
            avatarUrl: null,
            projects: [] as any[],
        });
    }

    // 2. Mescla com public.users (respeita 100% o que está no banco de dados)
    for (const du of dbUsers) {
        const email = (du.email || "").toLowerCase();
        if (email) {
            const isStecla = email.endsWith("@stecla.com.br") || email === "renata.vianna@stecla.com.br";
            const existing = userMap.get(email) || {
                id: String(du.id),
                openId: du.openId,
                email: email,
                name: du.name || nameFromEmail(email),
                role: du.role || (isStecla ? "admin" : "parceiro"),
                empresa: isStecla ? "Stecla" : "Outra",
                avatarUrl: du.avatarUrl || null,
                projects: [] as any[],
            };
            if (du.name) existing.name = du.name;
            if (du.role) existing.role = du.role;
            if (du.avatarUrl) existing.avatarUrl = du.avatarUrl;
            userMap.set(email, existing);
        }
    }

    // 3. Mapeia projetos vinculados
    const projectsById = new Map(allProjects.map((p: any) => [p.id, p]));

    for (const m of allMembers) {
        const email = (m.email || "").toLowerCase();
        const userObj = userMap.get(email);
        const proj = projectsById.get(m.projectId);
        if (userObj && proj) {
            if (!userObj.projects.some((pr: any) => pr.projectId === proj.id)) {
                userObj.projects.push({
                    projectId: proj.id,
                    projectName: proj.name,
                    projectCode: proj.code,
                    role: m.role,
                    empresa: m.empresa || userObj.empresa || "Stecla",
                });
            }
            if (m.empresa) userObj.empresa = m.empresa;
        }
    }

    // Também verifica owners dos projetos
    for (const p of allProjects) {
        for (const u of userMap.values()) {
            const isMasterOwner = (u.email || "").toLowerCase() === "renata.vianna@stecla.com.br";
            if (p.ownerId === u.openId || p.ownerId === u.id || isMasterOwner) {
                if (!u.projects.some((pr: any) => pr.projectId === p.id)) {
                    u.projects.push({
                        projectId: p.id,
                        projectName: p.name,
                        projectCode: p.code,
                        role: "admin",
                        empresa: u.empresa || "Stecla",
                    });
                }
            }
        }
    }

    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateUserProjectMemberships(data: {
    email: string;
    name?: string;
    role: string;
    empresa?: string;
    projectIds: string[];
}) {
    const db = await getDb();
    if (!db) return null;

    const emailNorm = data.email.trim().toLowerCase();
    const isMasterOwner = emailNorm === "renata.vianna@stecla.com.br";
    const roleToSave = isMasterOwner ? "admin" : data.role;

    // 1. Atualiza ou cria na tabela users
    const existingUser = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
    let userOpenId = "";

    if (existingUser.length > 0) {
        userOpenId = existingUser[0].openId;
        await db
            .update(users)
            .set({
                name: data.name || existingUser[0].name,
                role: roleToSave,
                updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser[0].id));
    } else {
        const authUsers = await getSupabaseAuthUsers();
        const authUser = authUsers.find((u) => (u.email || "").toLowerCase() === emailNorm);
        userOpenId = authUser ? authUser.id : emailNorm;

        await db.insert(users).values({
            openId: userOpenId,
            email: emailNorm,
            name: data.name || (authUser ? authUser.name : nameFromEmail(emailNorm)),
            role: roleToSave,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
        });
    }

    // 2. Busca todos os projectMembers atuais do usuário
    const currentMembers = await db
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.email, emailNorm));

    const targetProjectIds = new Set(data.projectIds);

    // Projetos a adicionar ou atualizar
    for (const pId of data.projectIds) {
        const existing = currentMembers.find((m: any) => m.projectId === pId);
        if (existing) {
            await db
                .update(projectMembers)
                .set({
                    role: roleToSave,
                    empresa: data.empresa || "Stecla",
                })
                .where(eq(projectMembers.id, existing.id));
        } else {
            await db.insert(projectMembers).values({
                projectId: pId,
                userId: userOpenId,
                email: emailNorm,
                role: roleToSave,
                empresa: data.empresa || "Stecla",
                invitedAt: new Date(),
                acceptedAt: new Date(),
            });
        }
    }

    // Projetos a remover
    if (!isMasterOwner) {
        for (const m of currentMembers) {
            if (!targetProjectIds.has(m.projectId)) {
                await db.delete(projectMembers).where(eq(projectMembers.id, m.id));
            }
        }
    }

    return { success: true };
}
