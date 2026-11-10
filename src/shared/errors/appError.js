export class AppError extends Error {
  constructor(code = 'UNKNOWN', cause) {
    super(code, { cause });
    this.name = 'AppError';
    this.code = code;
  }
}

export const MESSAGES = Object.freeze({
  ROOM_NOT_FOUND: 'Ese código no existe. Revísalo e intenta de nuevo.',
  ROOM_DRAWN: 'Esta sala ya hizo su sorteo, así que no entran más personas.',
  ROOM_CANCELLED: 'Esta sala fue cancelada.',
  ROOM_FULL: 'La sala llegó a su máximo de participantes.',
  PARTICIPANTS_CHANGED: 'Alguien entró o salió de la sala. Vuelve a sortear.',
  DRAW_FAILED: 'No pudimos anunciar el sorteo. Tu borrador sigue aquí; intenta de nuevo.',
  NETWORK: 'Sin conexión. Te mostramos lo último que vimos.',
  UNKNOWN: 'Algo salió mal. Intenta de nuevo.',
  PROFILE_REQUIRED: 'Guarda tu nombre antes de crear una sala o unirte.',
  INVALID_INPUT: 'Revisa los datos e intenta de nuevo.',
  CODE_GENERATION_FAILED: 'No pudimos crear un código de sala. Intenta de nuevo.',
  NOT_HOST: 'Solo el anfitrión puede hacer esto.',
  ROOM_NOT_WAITING: 'La sala ya no está en espera. Revisa su estado.',
  CANNOT_REMOVE_HOST: 'No puedes eliminar al anfitrión de la sala.',
  NOT_ENOUGH_PARTICIPANTS: 'Necesitas al menos 2 participantes para sortear.',
});

export function getErrorMessage(error) {
  return Object.hasOwn(MESSAGES, error?.code) ? MESSAGES[error.code] : MESSAGES.UNKNOWN;
}
