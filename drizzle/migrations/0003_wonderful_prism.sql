CREATE TABLE "projectMembers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"userId" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"invitedAt" timestamp DEFAULT now() NOT NULL,
	"acceptedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"client" text,
	"location" text,
	"ownerId" text NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"imageUrl" text,
	"status" text DEFAULT 'ativo' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "apontamentos" ADD COLUMN "projectId" uuid;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD COLUMN "projectId" uuid;--> statement-breakpoint
ALTER TABLE "escopoAsBuilt" ADD COLUMN "projectId" uuid;--> statement-breakpoint
ALTER TABLE "ifcFiles" ADD COLUMN "projectId" uuid;--> statement-breakpoint
ALTER TABLE "salas" ADD COLUMN "projectId" uuid;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "projectId" uuid;--> statement-breakpoint
ALTER TABLE "projectMembers" ADD CONSTRAINT "projectMembers_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apontamentos" ADD CONSTRAINT "apontamentos_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entregasAsBuilt" ADD CONSTRAINT "entregasAsBuilt_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escopoAsBuilt" ADD CONSTRAINT "escopoAsBuilt_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ifcFiles" ADD CONSTRAINT "ifcFiles_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salas" ADD CONSTRAINT "salas_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;