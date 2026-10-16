-- Use Unicode case conversion regardless of the database's default libc locale.
-- The C collation remains for stable pagination; final ranking uses JavaScript.
alter table public.game_scores drop constraint game_scores_check;
alter table public.game_scores add constraint game_scores_check
  check (normalized_nickname = lower(normalize(display_nickname, NFKC) collate "und-x-icu"));
