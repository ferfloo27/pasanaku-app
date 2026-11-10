export function suggestedDisplayName(profile, user) {
  if (typeof profile?.display_name === 'string' && profile.display_name.trim()) return profile.display_name;
  const metadata = user?.user_metadata;
  for (const name of [metadata?.full_name, metadata?.name]) {
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return '';
}
