CREATE TABLE "auth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"jti" varchar(64) NOT NULL,
	"family_id" varchar(64) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" varchar(32),
	"replaced_by_jti" varchar(64),
	"user_agent" varchar(255),
	"ip_address" inet,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(160) NOT NULL,
	"ip_address" inet,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_jti_unique" ON "auth_sessions" USING btree ("jti");--> statement-breakpoint
CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_login_attempts_email_attempted_at_idx" ON "auth_login_attempts" USING btree ("email","attempted_at");--> statement-breakpoint
CREATE INDEX "auth_login_attempts_ip_attempted_at_idx" ON "auth_login_attempts" USING btree ("ip_address","attempted_at");
