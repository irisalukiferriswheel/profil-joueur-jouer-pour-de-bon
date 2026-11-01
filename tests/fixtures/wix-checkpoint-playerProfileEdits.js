import { Permissions, webMethod } from '@wix/web-methods';
import { currentMember } from 'wix-members-backend';
import { getMyPlayerOnboardingForm, savePlayerOnboarding } from 'backend/playerOnboarding.web';

// Edit the same onboarding profile. Hidden eligibility and payout fields are
// reloaded from the authenticated server context, never taken from iframe claims.
export const saveMyPlayerProfileEdits = webMethod(Permissions.SiteMember, async (input) => {
  const owner = await currentMember.getMember();
  if (!owner?._id) return { success: false, code: 'LOGIN_REQUIRED' };
  const existing = await getMyPlayerOnboardingForm();
  if (!existing.profile || !existing.complete) return { success: false, code: 'PLAYER_PROFILE_INCOMPLETE' };
  const alias = typeof input?.alias === 'string' ? input.alias.trim() : '';
  const city = typeof input?.city === 'string' ? input.city.trim() : '';
  const games = Array.isArray(input?.games) ? [...new Set(input.games)] : [];
  if (!alias || alias.length > 100 || !city || city.length > 150 || !games.length || games.length > 50 || games.some(slug => typeof slug !== 'string' || !existing.games.some(game => game.slug === slug))) {
    return { success: false, code: 'INVALID_PROFILE_FIELDS' };
  }
  return savePlayerOnboarding({ ...existing.profile, alias, city, games, isPublic: input.isPublic === true }, owner._id);
});

