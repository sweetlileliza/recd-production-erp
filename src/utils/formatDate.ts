/**
 * Format timestamps in Eastern Standard/Daylight Time (EST/EDT - America/New_York)
 */
export const formatEST = (iso?: string | null): string => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(d)
  } catch (e) {
    return String(iso)
  }
}

export const formatDateOnlyEST = (iso?: string | null): string => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  } catch (e) {
    return String(iso)
  }
}
