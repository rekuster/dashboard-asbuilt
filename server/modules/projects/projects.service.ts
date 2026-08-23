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

    const conditions = [eq(projects.ownerId, ownerId)];

    if (email) {
        conditions.push(
            exists(
                db
                    .select()
                    .from(projectMembers)
                    .where(
                        and(
                            eq(projectMembers.projectId, projects.id),
                            sql`LOWER(${projectMembers.email}) = LOWER(${email})`
                        )
                    )
            )
        );
    }

    return db
        .select()
        .from(projects)
        .where(or(...conditions))
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
