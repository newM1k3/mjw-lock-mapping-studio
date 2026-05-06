import { Handler } from '@netlify/functions';

// TODO: Replace mock response with a real AI provider call.
// Suggested flow:
//   1. Parse the incoming LockMapProject from the request body.
//   2. Build a structured prompt combining the project theme, zone timeline,
//      lock inventory, puzzle matrix, and detected conflicts.
//   3. Call the Anthropic Claude API (or OpenAI / other provider).
//      API key should be stored as a Netlify environment variable, never
//      returned to the client.
//   4. Parse the model response into LockMappingConflict[] and ImplementationCard[].
//   5. Return the structured JSON below.

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // TODO: Parse project from body
  // const project = JSON.parse(event.body ?? '{}');

  // TODO: Call AI provider here using process.env.ANTHROPIC_API_KEY (never expose to client)

  const mockResponse = {
    summary:
      'Mocked audit summary. Replace this response by wiring the Netlify function to an AI provider.',
    conflicts: [],
    implementationCards: [],
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(mockResponse),
  };
};
