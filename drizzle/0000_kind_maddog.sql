CREATE TYPE "public"."tweet_type" AS ENUM('tweet', 'reply', 'retweet', 'quote');--> statement-breakpoint
CREATE TABLE "token_mentions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tweet_id" bigint,
	"symbol" varchar(20) NOT NULL,
	"cashtag" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "tweets" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"text" text,
	"full_text" text,
	"tweet_type" "tweet_type" DEFAULT 'tweet',
	"reply_to_id" bigint,
	"quote_of_id" bigint,
	"likes" integer DEFAULT 0,
	"retweets" integer DEFAULT 0,
	"replies" integer DEFAULT 0,
	"views" integer DEFAULT 0,
	"media_urls" jsonb DEFAULT '[]'::jsonb,
	"urls" jsonb DEFAULT '[]'::jsonb,
	"tweeted_at" timestamp with time zone,
	"search_vector" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(100),
	"bio" text,
	"followers_count" integer DEFAULT 0,
	"following_count" integer DEFAULT 0,
	"is_watched" boolean DEFAULT false,
	"priority" integer DEFAULT 5,
	"last_crawled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "token_mentions" ADD CONSTRAINT "token_mentions_tweet_id_tweets_id_fk" FOREIGN KEY ("tweet_id") REFERENCES "public"."tweets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tweets" ADD CONSTRAINT "tweets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "token_mentions_symbol_idx" ON "token_mentions" USING btree ("symbol","tweet_id");--> statement-breakpoint
CREATE INDEX "tweets_user_id_tweeted_at_idx" ON "tweets" USING btree ("user_id","tweeted_at");--> statement-breakpoint
CREATE INDEX "tweets_tweeted_at_idx" ON "tweets" USING btree ("tweeted_at");