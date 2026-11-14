import { AppError } from '../../../shared/errors/appError';

export function googleLinkError(cause) {
  return new AppError(cause?.code === 'identity_already_exists' ? 'AUTH_IDENTITY_EXISTS' : 'AUTH_LINK_FAILED', cause);
}
