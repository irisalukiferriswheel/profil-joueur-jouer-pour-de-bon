import { Permissions, webMethod } from '@wix/web-methods';
import { currentMember } from 'wix-members-backend';
import { getSecret } from 'wix-secrets-backend';
import { fetch } from 'wix-fetch';

function cleanText(value, maxLength = 200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeIntegrationKey(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/^WIX_INTEGRATION_KEY\s*=\s*/i, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function getMemberEmail(member) {
  if (typeof member?.loginEmail === 'string') return cleanText(member.loginEmail, 320);
  const emails = member?.contactDetails?.emails;
  if (!Array.isArray(emails) || emails.length === 0) return '';
  const firstEmail = emails[0];
  if (typeof firstEmail === 'string') return cleanText(firstEmail, 320);
  return cleanText(firstEmail?.email, 320);
}

function normalizeGame(game) {
  if (!game || typeof game !== 'object') return null;
  const slug = cleanText(game.slug, 100);
  if (!slug) return null;
  return {
    slug,
    nameFr: cleanText(game.nameFr || game.name_fr, 200),
    nameEn: cleanText(game.nameEn || game.name_en, 200),
    category: cleanText(game.category, 100)
  };
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;
  return {
    firstName: cleanText(profile.firstName, 100),
    lastName: cleanText(profile.lastName, 100),
    alias: cleanText(profile.alias, 100),
    email: cleanText(profile.email, 320),
    phone: cleanText(profile.phone, 50),
    birthDate: cleanText(profile.birthDate, 10),
    streetAddress: cleanText(profile.streetAddress, 250),
    city: cleanText(profile.city, 150),
    regionCode: cleanText(profile.regionCode, 20),
    regionName: cleanText(profile.regionName, 150),
    postalCode: cleanText(profile.postalCode, 30),
    countryCode: cleanText(profile.countryCode, 2).toUpperCase(),
    payoutContactPreference: ['email', 'phone'].includes(profile.payoutContactPreference)
      ? profile.payoutContactPreference
      : '',
    emergencyContactName: cleanText(profile.emergencyContactName, 150),
    emergencyContactPhone: cleanText(profile.emergencyContactPhone, 50),
    legalGuardianName: cleanText(profile.legalGuardianName, 150),
    legalGuardianPhone: cleanText(profile.legalGuardianPhone, 50),
    wantsToOrganize: Boolean(profile.wantsToOrganize),
    interestedInVolunteering: Boolean(profile.interestedInVolunteering),
    isPublic: Boolean(profile.isPublic),
    games: Array.isArray(profile.games)
      ? profile.games.map((game) => typeof game === 'string'
          ? { slug: cleanText(game, 100), nameFr: '', nameEn: '', category: '' }
          : normalizeGame(game))
          .filter(Boolean)
          .slice(0, 50)
      : []
  };
}

async function getApiConfiguration() {
  const [apiBaseUrlSecret, integrationKeySecret] = await Promise.all([
    getSecret('JPDB_API_BASE_URL'),
    getSecret('JPDB_WIX_INTEGRATION_KEY')
  ]);
  const apiBaseUrl = cleanText(apiBaseUrlSecret, 1000).replace(/\/+$/, '');
  const integrationKey = normalizeIntegrationKey(integrationKeySecret);
  if (!apiBaseUrl || !integrationKey) throw new Error('Configuration JPDB incomplète.');
  return { apiBaseUrl, integrationKey };
}

async function callJpdbApi(path, method, body) {
  const { apiBaseUrl, integrationKey } = await getApiConfiguration();
  const options = {
    method,
    headers: {
      Accept: 'application/json',
      'x-jpdb-integration-key': integrationKey
    }
  };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(apiBaseUrl + path, options);
  const text = await response.text();
  let responseBody = {};
  try { responseBody = text ? JSON.parse(text) : {}; } catch { responseBody = { error: text }; }
  return { response, responseBody };
}

async function getLoggedInMember() {
  const member = await currentMember.getMember({ fieldsets: ['FULL'] });
  if (!member?._id) throw new Error('Vous devez être connecté.');
  return member;
}

export const getMyPlayerOnboardingForm = webMethod(
  Permissions.SiteMember,
  async () => {
    const member = await getLoggedInMember();
    const [profileCall, gamesCall] = await Promise.all([
      callJpdbApi(`/v1/players/onboarding?wixMemberId=${encodeURIComponent(member._id)}`, 'GET'),
      callJpdbApi('/v1/players/games', 'GET')
    ]);
    if (!profileCall.response.ok || !gamesCall.response.ok) {
      console.error('JPDB ONBOARDING LOAD API ERROR', {
        profileStatus: profileCall.response.status,
        gamesStatus: gamesCall.response.status
      });
      throw new Error('Impossible de charger votre profil joueur pour le moment.');
    }
    const onboarding = profileCall.responseBody?.data || {};
    return {
      member: {
        firstName: cleanText(member.contactDetails?.firstName, 100),
        lastName: cleanText(member.contactDetails?.lastName, 100),
        email: getMemberEmail(member),
        nickname: cleanText(member.profile?.nickname, 100)
      },
      profile: normalizeProfile(onboarding.profile),
      complete: Boolean(onboarding.complete),
      missing: Array.isArray(onboarding.missing) ? onboarding.missing.slice(0, 30) : [],
      games: Array.isArray(gamesCall.responseBody?.data)
        ? gamesCall.responseBody.data.map(normalizeGame).filter(Boolean).slice(0, 250)
        : []
    };
  }
);

export const savePlayerOnboarding = webMethod(
  Permissions.SiteMember,
  async (profile) => {
    try {
      const member = await getLoggedInMember();
      const payload = {
        wixMemberId: member._id,
        email: cleanText(profile?.email, 320) || getMemberEmail(member),
        firstName: cleanText(profile?.firstName, 100),
        lastName: cleanText(profile?.lastName, 100),
        alias: cleanText(profile?.alias, 100),
        phone: cleanText(profile?.phone, 50),
        birthDate: cleanText(profile?.birthDate, 10),
        streetAddress: cleanText(profile?.streetAddress, 250),
        city: cleanText(profile?.city, 150),
        regionCode: cleanText(profile?.regionCode, 20),
        regionName: cleanText(profile?.regionName, 150),
        postalCode: cleanText(profile?.postalCode, 30),
        countryCode: cleanText(profile?.countryCode, 2).toUpperCase(),
        payoutContactPreference: ['email', 'phone'].includes(profile?.payoutContactPreference)
          ? profile.payoutContactPreference
          : '',
        emergencyContactName: cleanText(profile?.emergencyContactName, 150),
        emergencyContactPhone: cleanText(profile?.emergencyContactPhone, 50),
        legalGuardianName: cleanText(profile?.legalGuardianName, 150),
        legalGuardianPhone: cleanText(profile?.legalGuardianPhone, 50),
        games: Array.isArray(profile?.games)
          ? Array.from(new Set(profile.games.map((game) => cleanText(game, 100)).filter(Boolean))).slice(0, 50)
          : [],
        newGame: cleanText(profile?.newGame, 150),
        wantsToOrganize: Boolean(profile?.wantsToOrganize),
        interestedInVolunteering: Boolean(profile?.interestedInVolunteering),
        isPublic: Boolean(profile?.isPublic)
      };

      const required = [
        ['firstName', 'Veuillez entrer votre prénom.'],
        ['lastName', 'Veuillez entrer votre nom de famille.'],
        ['alias', 'Veuillez entrer un alias.'],
        ['email', 'Veuillez entrer votre courriel.'],
        ['phone', 'Veuillez entrer votre numéro de téléphone.'],
        ['birthDate', 'Veuillez entrer votre date de naissance.'],
        ['streetAddress', 'Veuillez entrer votre adresse.'],
        ['city', 'Veuillez entrer votre ville.'],
        ['postalCode', 'Veuillez entrer votre code postal.'],
        ['countryCode', 'Veuillez choisir votre pays.'],
        ['payoutContactPreference', 'Veuillez choisir votre préférence de paiement.'],
        ['emergencyContactName', 'Veuillez entrer un contact en cas d’accident.'],
        ['emergencyContactPhone', 'Veuillez entrer le téléphone du contact en cas d’accident.']
      ];
      for (const [key, message] of required) {
        if (!payload[key]) return { success: false, message };
      }
      if (!payload.regionCode && !payload.regionName) {
        return { success: false, message: 'Veuillez choisir votre province, état ou région.' };
      }
      if (payload.games.length === 0) {
        return { success: false, message: 'Veuillez choisir au moins un jeu.' };
      }

      const { response, responseBody } = await callJpdbApi('/v1/players/onboarding', 'POST', payload);

      if (!response.ok) {
        console.error('JPDB ONBOARDING API ERROR', {
          status: response.status,
          code: cleanText(responseBody?.code, 100),
          missing: Array.isArray(responseBody?.missing) ? responseBody.missing.slice(0, 30) : []
        });
        return {
          success: false,
          message: cleanText(responseBody?.error, 300) || 'Le profil n’a pas pu être enregistré pour le moment.'
        };
      }

      return { success: true, message: 'Votre profil joueur a été enregistré.', complete: true };
    } catch (error) {
      console.error('SAVE PLAYER ONBOARDING ERROR:', error);
      return { success: false, message: 'Impossible d’enregistrer le profil pour le moment.' };
    }
  }
);
