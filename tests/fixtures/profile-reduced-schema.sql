-- Contract fixture inferred from routes; NOT a production schema snapshot.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE public.players(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wix_member_id text UNIQUE NOT NULL, email text, first_name text, last_name text, alias text, phone text, birth_date date, street_address text, city text, region_code text, region_name text, postal_code text, country_code text, payout_contact_preference text, emergency_contact_name text, emergency_contact_phone text, legal_guardian_name text, legal_guardian_phone text, wants_to_organize boolean, interested_in_volunteering boolean, is_public boolean);
CREATE TABLE public.games(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE NOT NULL,active boolean NOT NULL);
CREATE TABLE public.player_games(player_id uuid REFERENCES public.players(id),game_id uuid REFERENCES public.games(id),interested_in_playing boolean,interested_in_competing boolean,interested_in_organizing boolean,PRIMARY KEY(player_id,game_id));
CREATE TABLE public.game_suggestions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),suggested_name text,suggested_by_player_id uuid REFERENCES public.players(id),status text);
ALTER TABLE public.players ADD COLUMN supabase_user_id uuid;
INSERT INTO public.games(slug,active) VALUES ('chess',true),('basketball',true),('retired',false);
