CREATE TYPE "public"."estado_endoso" AS ENUM('pendiente', 'procesado', 'anulado');--> statement-breakpoint
CREATE TYPE "public"."tipo_endoso" AS ENUM('inclusion', 'exclusion');--> statement-breakpoint
CREATE TYPE "public"."user_provider" AS ENUM('local', 'google');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'operador', 'auditor', 'soporte');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "endoso" (
	"id" serial PRIMARY KEY NOT NULL,
	"nro_poliza" varchar(30) NOT NULL,
	"tipo_endoso" "tipo_endoso" NOT NULL,
	"fecha_inicio" date NOT NULL,
	"broker_id" integer NOT NULL,
	"estado" "estado_endoso" DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(160) NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"role" "user_role" DEFAULT 'operador' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"provider" "user_provider" DEFAULT 'local' NOT NULL,
	"google_sub" varchar(160),
	"password_hash" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" varchar(40) NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"descripcion" text,
	"precio" numeric(12, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_sub_unique" ON "users" USING btree ("google_sub");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_unique" ON "products" USING btree ("sku");