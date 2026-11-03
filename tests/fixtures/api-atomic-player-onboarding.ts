import type { FastifyInstance } from "fastify";

import { hasValidWixIntegrationKey } from "../wix-identity.js";

type OnboardingQuery = {
  wixMemberId?: string;
};

type OnboardingBody = {
  wixMemberId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  alias?: string;
  phone?: string;
  birthDate?: string | null;
  streetAddress?: string;
  city?: string;
  regionCode?: string;
  regionName?: string;
  postalCode?: string;
  countryCode?: string;
  payoutContactPreference?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  legalGuardianName?: string;
  legalGuardianPhone?: string;
  games?: string[];
  newGame?: string;
  wantsToOrganize?: boolean;
  interestedInVolunteering?: boolean;
  isPublic?: boolean;
};

type GameRow = { id: string; slug: string };

type PlayerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  alias: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  street_address: string | null;
  city: string | null;
  region_code: string | null;
  region_name: string | null;
  postal_code: string | null;
  country_code: string | null;
  payout_contact_preference: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  legal_guardian_name: string | null;
  legal_guardian_phone: string | null;
  wants_to_organize: boolean | null;
  interested_in_volunteering: boolean | null;
  is_public: boolean | null;
  player_games?: Array<{ games?: { slug?: string } | Array<{ slug?: string }> | null }> | null;
};

function cleanText(value: unknown, maxLength = 200): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeBirthDate(value: unknown): string | null {
  const text = cleanText(value, 10);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;

  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== text) return null;
  if (date > new Date()) return null;
  return text;
}

function ageOnDate(birthDate: string, referenceDate = new Date()): number | null {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;

  let age = referenceDate.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = referenceDate.getUTCMonth() - birth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && referenceDate.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

function validEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function profileGameSlugs(player: PlayerRow | null): string[] {
  if (!player?.player_games) return [];

  return player.player_games
    .map((relation) => {
      const game = relation.games;
      if (Array.isArray(game)) return cleanText(game[0]?.slug, 100);
      return cleanText(game?.slug, 100);
    })
    .filter(Boolean);
}

function profileCompletion(player: PlayerRow | null, games: string[]) {
  const firstName = cleanText(player?.first_name, 100);
  const lastName = cleanText(player?.last_name, 100);
  const alias = cleanText(player?.alias, 100);
  const email = cleanText(player?.email, 320);
  const phone = cleanText(player?.phone, 50);
  const birthDate = cleanText(player?.birth_date, 10);
  const streetAddress = cleanText(player?.street_address, 250);
  const city = cleanText(player?.city, 150);
  const regionCode = cleanText(player?.region_code, 20);
  const regionName = cleanText(player?.region_name, 150);
  const postalCode = cleanText(player?.postal_code, 30);
  const countryCode = cleanText(player?.country_code, 2).toUpperCase();
  const payoutContactPreference = cleanText(player?.payout_contact_preference, 20);
  const emergencyContactName = cleanText(player?.emergency_contact_name, 150);
  const emergencyContactPhone = cleanText(player?.emergency_contact_phone, 50);
  const legalGuardianName = cleanText(player?.legal_guardian_name, 150);
  const legalGuardianPhone = cleanText(player?.legal_guardian_phone, 50);
  const age = birthDate ? ageOnDate(birthDate) : null;
  const minor = age !== null && age < 18;

  const missing = [
    ...(!firstName ? ["firstName"] : []),
    ...(!lastName ? ["lastName"] : []),
    ...(!alias ? ["alias"] : []),
    ...(!email ? ["email"] : []),
    ...(!phone ? ["phone"] : []),
    ...(!birthDate ? ["birthDate"] : []),
    ...(!streetAddress ? ["streetAddress"] : []),
    ...(!city ? ["city"] : []),
    ...(!regionCode && !regionName ? ["region"] : []),
    ...(!postalCode ? ["postalCode"] : []),
    ...(!countryCode ? ["countryCode"] : []),
    ...(!["email", "phone"].includes(payoutContactPreference) ? ["payoutContactPreference"] : []),
    ...(!emergencyContactName ? ["emergencyContactName"] : []),
    ...(!emergencyContactPhone ? ["emergencyContactPhone"] : []),
    ...(minor && !legalGuardianName ? ["legalGuardianName"] : []),
    ...(minor && !legalGuardianPhone ? ["legalGuardianPhone"] : []),
    ...(games.length === 0 ? ["games"] : [])
  ];

  return {
    complete: missing.length === 0,
    missing,
    privateAgeCategory: age === null ? "unknown" : age < 16 ? "under_16" : age < 18 ? "under_18" : "adult"
  };
}

function serialize(player: PlayerRow | null) {
  const games = profileGameSlugs(player);
  const completion = profileCompletion(player, games);

  return {
    profile: player
      ? {
          firstName: cleanText(player.first_name, 100),
          lastName: cleanText(player.last_name, 100),
          alias: cleanText(player.alias, 100),
          email: cleanText(player.email, 320),
          phone: cleanText(player.phone, 50),
          birthDate: cleanText(player.birth_date, 10),
          streetAddress: cleanText(player.street_address, 250),
          city: cleanText(player.city, 150),
          regionCode: cleanText(player.region_code, 20),
          regionName: cleanText(player.region_name, 150),
          postalCode: cleanText(player.postal_code, 30),
          countryCode: cleanText(player.country_code, 2).toUpperCase(),
          payoutContactPreference: cleanText(player.payout_contact_preference, 20),
          emergencyContactName: cleanText(player.emergency_contact_name, 150),
          emergencyContactPhone: cleanText(player.emergency_contact_phone, 50),
          legalGuardianName: cleanText(player.legal_guardian_name, 150),
          legalGuardianPhone: cleanText(player.legal_guardian_phone, 50),
          games,
          wantsToOrganize: Boolean(player.wants_to_organize),
          interestedInVolunteering: Boolean(player.interested_in_volunteering),
          isPublic: Boolean(player.is_public)
        }
      : null,
    complete: completion.complete,
    missing: completion.missing
  };
}

export async function registerPlayerOnboardingRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: OnboardingQuery }>("/players/onboarding", async (request, reply) => {
    if (!hasValidWixIntegrationKey(request.headers["x-jpdb-integration-key"])) {
      return reply.code(401).send({ success: false, error: "Unauthorized integration" });
    }

    const wixMemberId = cleanText(request.query?.wixMemberId, 200);
    if (!wixMemberId) {
      return reply.code(400).send({ success: false, error: "wixMemberId is required" });
    }

    const { data, error } = await app.supabase
      .from("players")
      .select("id, first_name, last_name, alias, email, phone, birth_date, street_address, city, region_code, region_name, postal_code, country_code, payout_contact_preference, emergency_contact_name, emergency_contact_phone, legal_guardian_name, legal_guardian_phone, wants_to_organize, interested_in_volunteering, is_public, player_games(games(slug))")
      .eq("wix_member_id", wixMemberId)
      .maybeSingle();

    if (error) {
      request.log.error({ error }, "Failed to load player onboarding profile");
      return reply.code(500).send({ success: false, error: "Failed to load onboarding profile" });
    }

    reply.header("Cache-Control", "private, no-store");
    return reply.send({ success: true, data: serialize((data as PlayerRow | null) ?? null) });
  });

  app.post<{ Body: OnboardingBody }>("/players/onboarding", async (request, reply) => {
    if (!hasValidWixIntegrationKey(request.headers["x-jpdb-integration-key"])) {
      return reply.code(401).send({ success: false, error: "Unauthorized integration" });
    }

    const wixMemberId = cleanText(request.body?.wixMemberId, 200);
    const firstName = cleanText(request.body?.firstName, 100);
    const lastName = cleanText(request.body?.lastName, 100);
    const alias = cleanText(request.body?.alias, 100);
    const email = cleanText(request.body?.email, 320).toLowerCase();
    const phone = cleanText(request.body?.phone, 50);
    const rawBirthDate = cleanText(request.body?.birthDate, 10);
    const birthDate = normalizeBirthDate(rawBirthDate);
    const streetAddress = cleanText(request.body?.streetAddress, 250);
    const city = cleanText(request.body?.city, 150);
    const regionCode = cleanText(request.body?.regionCode, 20);
    const regionName = cleanText(request.body?.regionName, 150);
    const postalCode = cleanText(request.body?.postalCode, 30);
    const countryCode = cleanText(request.body?.countryCode, 2).toUpperCase();
    const payoutContactPreference = cleanText(request.body?.payoutContactPreference, 20);
    const emergencyContactName = cleanText(request.body?.emergencyContactName, 150);
    const emergencyContactPhone = cleanText(request.body?.emergencyContactPhone, 50);
    const legalGuardianName = cleanText(request.body?.legalGuardianName, 150);
    const legalGuardianPhone = cleanText(request.body?.legalGuardianPhone, 50);
    const suggestedGame = cleanText(request.body?.newGame, 150);
    const selectedSlugs = Array.from(new Set(
      (Array.isArray(request.body?.games) ? request.body.games : [])
        .map((value) => cleanText(value, 100))
        .filter(Boolean)
    )).slice(0, 50);

    if (!wixMemberId) {
      return reply.code(400).send({ success: false, error: "wixMemberId is required" });
    }
    if (!birthDate) {
      return reply.code(400).send({ success: false, error: "birthDate is invalid or required", code: "PLAYER_PROFILE_INCOMPLETE" });
    }
    if (!validEmail(email)) {
      return reply.code(400).send({ success: false, error: "email is invalid or required", code: "PLAYER_PROFILE_INCOMPLETE" });
    }
    if (!["email", "phone"].includes(payoutContactPreference)) {
      return reply.code(400).send({ success: false, error: "payoutContactPreference must be email or phone", code: "PLAYER_PROFILE_INCOMPLETE" });
    }

    const age = ageOnDate(birthDate);
    if (age === null) {
      return reply.code(400).send({ success: false, error: "birthDate is invalid", code: "PLAYER_PROFILE_INCOMPLETE" });
    }
    const minor = age < 18;

    const missing = [
      ...(!firstName ? ["firstName"] : []),
      ...(!lastName ? ["lastName"] : []),
      ...(!alias ? ["alias"] : []),
      ...(!phone ? ["phone"] : []),
      ...(!streetAddress ? ["streetAddress"] : []),
      ...(!city ? ["city"] : []),
      ...(!regionCode && !regionName ? ["region"] : []),
      ...(!postalCode ? ["postalCode"] : []),
      ...(!countryCode ? ["countryCode"] : []),
      ...(!emergencyContactName ? ["emergencyContactName"] : []),
      ...(!emergencyContactPhone ? ["emergencyContactPhone"] : []),
      ...(minor && !legalGuardianName ? ["legalGuardianName"] : []),
      ...(minor && !legalGuardianPhone ? ["legalGuardianPhone"] : []),
      ...(selectedSlugs.length === 0 ? ["games"] : [])
    ];

    if (missing.length > 0) {
      return reply.code(400).send({
        success: false,
        error: `Missing required profile fields: ${missing.join(", ")}`,
        code: "PLAYER_PROFILE_INCOMPLETE",
        missing
      });
    }

    const { data: games, error: gamesError } = await app.supabase
      .from("games")
      .select("id, slug")
      .in("slug", selectedSlugs)
      .eq("active", true);

    if (gamesError || !games || games.length !== selectedSlugs.length) {
      return reply.code(400).send({ success: false, error: "One or more selected games are invalid" });
    }

    // Disabled until the reviewed RPC is installed in staging and verified.
    // Fail closed: never fall back to the non-atomic delete/insert sequence.
    if (process.env.JPDB_ATOMIC_ONBOARDING_ENABLED !== "true") {
      return reply.code(503).send({ success: false, code: "ONBOARDING_SAVE_DISABLED", error: "Profile saving is not enabled" });
    }
    const { data: player, error: playerError } = await app.supabase.rpc("save_player_onboarding_atomic", {
      p_profile: {
        wix_member_id: wixMemberId,
        email,
        first_name: firstName,
        last_name: lastName,
        alias,
        phone,
        birth_date: birthDate,
        street_address: streetAddress,
        city,
        region_code: regionCode || null,
        region_name: regionName || null,
        postal_code: postalCode,
        country_code: countryCode,
        payout_contact_preference: payoutContactPreference,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        legal_guardian_name: minor ? legalGuardianName : null,
        legal_guardian_phone: minor ? legalGuardianPhone : null,
        wants_to_organize: Boolean(request.body?.wantsToOrganize),
        interested_in_volunteering: Boolean(request.body?.interestedInVolunteering),
        is_public: Boolean(request.body?.isPublic)

      },
      p_game_slugs: selectedSlugs,
      p_suggested_game: suggestedGame || null
    });
    if (playerError || !player?.id) {
      // Response loss can occur after commit. Inspect authoritative state before
      // deciding whether to retry; do not automatically overwrite newer edits.
      request.log.error({ code: playerError?.code }, "Atomic onboarding save failed or outcome unknown");
      return reply.code(503).send({ success: false, code: "ONBOARDING_SAVE_UNCONFIRMED", error: "Profile save could not be confirmed" });
    }

    reply.header("Cache-Control", "private, no-store");
    return reply.send({
      success: true,
      data: {
        profile: {
          firstName,
          lastName,
          alias,
          email,
          phone,
          birthDate,
          streetAddress,
          city,
          regionCode,
          regionName,
          postalCode,
          countryCode,
          payoutContactPreference,
          emergencyContactName,
          emergencyContactPhone,
          legalGuardianName: minor ? legalGuardianName : "",
          legalGuardianPhone: minor ? legalGuardianPhone : "",
          games: (games as GameRow[]).map((game) => game.slug),
          wantsToOrganize: Boolean(request.body?.wantsToOrganize),
          interestedInVolunteering: Boolean(request.body?.interestedInVolunteering),
          isPublic: Boolean(request.body?.isPublic)
        },
        complete: true,
        missing: [],
        privateAgeCategory: age < 16 ? "under_16" : age < 18 ? "under_18" : "adult",
        gameSuggestion: suggestedGame || null
      }
    });
  });
}
