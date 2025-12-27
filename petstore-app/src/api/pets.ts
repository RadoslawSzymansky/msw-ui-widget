import { Pet, ApiError } from '../types';

const API_BASE = 'http://petstore.swagger.io/v1';

export async function getPets(limit?: number): Promise<Pet[]> {
  const url = new URL(`${API_BASE}/pets`);
  if (limit) {
    url.searchParams.set('limit', limit.toString());
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to fetch pets');
  }

  return response.json();
}

export async function createPet(name: string, tag: string): Promise<void> {
  const response = await fetch(`${API_BASE}/pets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, tag }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to create pet');
  }
}

export async function getPetById(petId: number): Promise<Pet> {
  const response = await fetch(`${API_BASE}/pets/${petId}`);

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to fetch pet');
  }

  return response.json();
}
