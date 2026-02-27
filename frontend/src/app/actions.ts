'use server';

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';

export async function getAiSuggestions(query: string): Promise<string[]> {
  if (!query) {
    return [];
  }

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.suggestions || []).slice(0, 5);
  } catch (error) {
    // Error is handled silently — fallback to no suggestions
    return [];
  }
}
