import { supabase } from '../../../shared/lib/supabase';
import { AppError } from '../../../shared/errors/appError';

// list_my_rooms omite cancelaciones antiguas; aquí importa cualquier participación.
export async function hasRoomMembership(userId) {
  if (!userId) throw new AppError('AUTH_FAILED');
  try {
    const { data, error } = await supabase.from('participants').select('id')
      .eq('user_id', userId).limit(1).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } catch (cause) { throw new AppError('NETWORK', cause); }
}
