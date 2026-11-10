import { supabase } from '../../../shared/lib/supabase';
import { AppError } from '../../../shared/errors/appError';
import { validateDisplayName } from '../domain/displayName';

const fields = 'user_id, display_name';

export async function getProfile(userId) {
  if (!userId) throw new AppError('AUTH_FAILED');
  try {
    const { data, error } = await supabase.from('profiles').select(fields).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return { data };
  } catch (cause) { throw new AppError('PROFILE_LOAD_FAILED', cause); }
}

export async function saveDisplayName(userId, name) {
  if (!userId) throw new AppError('AUTH_FAILED');
  const result = validateDisplayName(name);
  if (!result.ok) throw new AppError(result.error);
  try {
    // Excepción explícita de la spec: profiles permite INSERT/UPDATE propios por RLS.
    // No actualiza los snapshots de rooms ni participants.
    const { data, error } = await supabase.from('profiles').upsert({
      user_id: userId, display_name: result.value, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).select(fields).single();
    if (error) throw error;
    return { data };
  } catch (cause) { throw new AppError('PROFILE_SAVE_FAILED', cause); }
}
