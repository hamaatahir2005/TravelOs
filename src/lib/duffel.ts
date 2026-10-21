// Manual ticket entry is always available. No API call occurs unless explicitly enabled.
export async function searchDuffelOffers(payload: unknown) {
  if (process.env.DUFFEL_ENABLED !== 'true' || !process.env.DUFFEL_ACCESS_TOKEN)
    throw new Error('Duffel is disabled. Configure DUFFEL_ENABLED and DUFFEL_ACCESS_TOKEN.');
  const response = await fetch('https://api.duffel.com/air/offer_requests', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DUFFEL_ACCESS_TOKEN}`,
      'Duffel-Version': 'v2',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: payload }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Duffel offer search failed');
  return response.json();
}
