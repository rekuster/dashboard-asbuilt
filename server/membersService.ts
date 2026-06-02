import { getDb, projectMembers, users, projects } from './db';
import { eq, and } from 'drizzle-orm';

export interface InviteMemberInput {
    projectId: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer' | 'parceiro';
}

export async function listProjectMembers(projectId: string) {
    const db = await getDb();
    if (!db) return [];

    // Select member details, joining with users table if userId matches openId
    // to get the user's name if they have logged in.
    const members = await db.select({
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

    return members;
}

export async function inviteProjectMember(data: InviteMemberInput) {
    const db = await getDb();
    if (!db) return null;

    // Normalize email
    const emailNorm = data.email.trim().toLowerCase();

    // Check if user is already a member
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

    // Check if they are the owner of the project (cannot invite the owner)
    const proj = await db.select().from(projects).where(eq(projects.id, data.projectId)).limit(1);
    if (proj.length > 0 && proj[0].ownerId) {
        // Find user by email in users table to check if their openId matches ownerId
        const user = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
        if (user.length > 0 && user[0].openId === proj[0].ownerId) {
            throw new Error("Este e-mail pertence ao proprietário do projeto.");
        }
    }

    // Try to find if user already exists in `users` table to link their `userId` directly
    const userResult = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
    const userId = userResult.length > 0 ? userResult[0].openId : null;

    const [newMember] = await db.insert(projectMembers).values({
        projectId: data.projectId,
        userId: userId || "", // placeholder or linked userId
        email: emailNorm,
        role: data.role,
        invitedAt: new Date(),
        acceptedAt: userId ? new Date() : null // Auto-accepted if user already registered
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
