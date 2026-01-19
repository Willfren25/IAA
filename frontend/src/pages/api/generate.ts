import type { APIRoute } from 'astro';

const BACKEND_URL = 'http://localhost:3000';

export const POST: APIRoute = async ({ request }: { request: Request }) => {
  try {
    const body = await request.json();

    // Proxy to backend
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en /api/generate:', error);
    return new Response(
      JSON.stringify({
        success: false,
        errors: ['No se pudo conectar con el servidor backend. Asegúrate de que esté ejecutándose con: npm run server'],
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
