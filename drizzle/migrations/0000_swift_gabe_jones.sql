CREATE TABLE "apontamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"numeroApontamento" integer NOT NULL,
	"data" timestamp NOT NULL,
	"edificacao" text NOT NULL,
	"pavimento" text NOT NULL,
	"setor" text NOT NULL,
	"sala" text NOT NULL,
	"disciplina" text NOT NULL,
	"divergencia" text,
	"fotoUrl" text,
	"fotoReferenciaUrl" text,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"responsavel" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entregasAsBuilt" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomeDocumento" text NOT NULL,
	"tipoDocumento" text NOT NULL,
	"edificacao" text NOT NULL,
	"disciplina" text NOT NULL,
	"empresaResponsavel" text NOT NULL,
	"dataPrevista" timestamp NOT NULL,
	"dataRecebimento" timestamp,
	"status" text DEFAULT 'AGUARDANDO' NOT NULL,
	"descricao" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entregasHistorico" (
	"id" serial PRIMARY KEY NOT NULL,
	"entregaId" integer NOT NULL,
	"acao" text NOT NULL,
	"descricao" text NOT NULL,
	"usuario" text DEFAULT 'Sistema' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ifcFiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"fileName" text NOT NULL,
	"filePath" text NOT NULL,
	"edificacao" text,
	"uploadedBy" integer NOT NULL,
	"fileSize" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salas" (
	"id" serial PRIMARY KEY NOT NULL,
	"edificacao" text NOT NULL,
	"pavimento" text NOT NULL,
	"setor" text NOT NULL,
	"nome" text NOT NULL,
	"numeroSala" text NOT NULL,
	"augin" integer DEFAULT 0,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"statusRA" text,
	"dataVerificada" timestamp,
	"faltouDisciplina" text,
	"revisar" text,
	"obs" text,
	"dataVerificacao2" timestamp,
	"obs2" text,
	"trackerPosicionado" integer DEFAULT 0,
	"plantaImpressa" integer DEFAULT 0,
	"qrCodePlastificado" integer DEFAULT 0,
	"ifcExpressId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"fileName" text NOT NULL,
	"fileSize" integer NOT NULL,
	"uploadedBy" integer NOT NULL,
	"totalSalas" integer DEFAULT 0,
	"totalApontamentos" integer DEFAULT 0,
	"status" text DEFAULT 'PROCESSADO' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" text NOT NULL,
	"name" text,
	"email" text,
	"loginMethod" text,
	"role" text DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "entregasHistorico" ADD CONSTRAINT "entregasHistorico_entregaId_entregasAsBuilt_id_fk" FOREIGN KEY ("entregaId") REFERENCES "public"."entregasAsBuilt"("id") ON DELETE cascade ON UPDATE no action;