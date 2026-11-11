import { supabase } from '../../../shared/lib/supabase';
import { AppError, MESSAGES } from '../../../shared/errors/appError';

export async function callRoomRpc(name, args) {
  try {
    const { data, error } = args === undefined ? await supabase.rpc(name) : await supabase.rpc(name, args);
    if (error) throw error;
    return { data };
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    const message = cause?.message;
    const code = Object.hasOwn(MESSAGES, message) ? message
      : /fetch|network|load failed/i.test(message || '') ? 'NETWORK' : 'UNKNOWN';
    throw new AppError(code, cause);
  }
}
