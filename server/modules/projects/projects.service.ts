import { eq, and, desc, or, exists, sql } from "drizzle-orm";
import { getDb, projects, projectMembers, users, type InsertProject, type Project } from "../../common/db";

export async function listProjects(ownerId: string, email?: string) {
    const db = await getDb();
    if (!db) return [];

    const emailNorm = (email || "").toLowerCase();
    const isSteclaOrAdmin =
        emailNorm === "renata.vianna@stecla.com.br" ||
        emailNorm.endsWith("@stecla.com.br");

    // Stecla Admins have universal access to all projects
    if (isSteclaOrAdmin) {
        return db.select().from(projects).orderBy(desc(projects.createdAt));
    }

    const userFilters: any[] = [];
    if (ownerId) {
        userFilters.push(eq(projects.ownerId, ownerId));
    }

    const memberFilters: any[] = [];
    if (ownerId) {
        memberFilters.push(eq(projectMembers.userId, ownerId));
    }
    if (emailNorm) {
        memberFilters.push(sql`LOWER(${projectMembers.email}) = ${emailNorm}`);
    }

    if (memberFilters.length > 0) {
        userFilters.push(
            exists(
                db
                    .select()
                    .from(projectMembers)
                    .where(
                        and(
                            eq(projectMembers.projectId, projects.id),
                            or(...memberFilters)
                        )
                    )
            )
        );
    }

    if (userFilters.length === 0) {
        return [];
    }

    return db
        .select()
        .from(projects)
        .where(or(...userFilters))
        .orderBy(desc(projects.createdAt));
}

export async function createProject(data: InsertProject) {
    const db = await getDb();
    if (!db) return null;

    const result = await db
        .insert(projects)
        .values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning();

    return result[0];
}

export async function getProjectById(id: string) {
    const db = await getDb();
    if (!db) return null;

    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
}

export async function updateProject(id: string, data: Partial<Project>) {
    const db = await getDb();
    if (!db) return null;

    const result = await db
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();

    return result[0];
}

export async function updateProjectBaseline(
    id: string,
    baselineTargetDate: Date | null,
    baselineRoomsPerWeek: number | null
) {
    const db = await getDb();
    if (!db) return null;

    const result = await db
        .update(projects)
        .set({
            baselineTargetDate,
            baselineRoomsPerWeek: baselineRoomsPerWeek !== null ? String(baselineRoomsPerWeek) : null,
            updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

    return result[0];
}
