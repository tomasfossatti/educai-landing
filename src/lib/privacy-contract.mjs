export const PRIVACY_CONTRACT = Object.freeze({
  version: "2026-09-22",
  title: "Este es tu espacio de estudio",
  summary: "Podés preguntar libremente. Tu docente no recibe un historial individual de tus conversaciones.",
  details: "Educai analiza señales de aprendizaje y muestra patrones agregados solo cuando existe evidencia suficiente entre varias personas. Si eliminás una conversación, también se eliminan las señales derivadas de ella."
});

export function hasAcceptedPrivacyContract(profile) {
  return Boolean(
    profile?.privacyNoticeAcceptedAt &&
    profile.privacyNoticeVersion === PRIVACY_CONTRACT.version
  );
}
