import { http, HttpResponse } from 'msw';
import { Pet } from '../types';

// Mock data store
let pets: Pet[] = [
  { id: 1, name: 'Fluffy', tag: 'cat' },
  { id: 2, name: 'Rex', tag: 'dog' },
  { id: 3, name: 'Tweety', tag: 'bird' },
];

let nextId = 4;

export const handlers = [
  // GET /pets - List all pets
  http.get('http://petstore.swagger.io/v1/pets', ({ request }) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');

    let result = pets;
    if (limit) {
      const limitNum = parseInt(limit, 10);
      result = pets.slice(0, limitNum);
    }

    return HttpResponse.json(result, {
      headers: {
        'x-next': result.length < pets.length ? 'true' : '',
      },
    });
  }),

  // POST /pets - Create a pet
  http.post('http://petstore.swagger.io/v1/pets', async ({ request }) => {
    const body = (await request.json()) as { name: string; tag?: string };

    if (!body.name || !body.tag) {
      return HttpResponse.json(
        { code: 400, message: 'Name and tag are required' },
        { status: 400 }
      );
    }

    const newPet: Pet = {
      id: nextId++,
      name: body.name,
      tag: body.tag,
    };

    pets.push(newPet);

    return HttpResponse.json(null, { status: 201 });
  }),

  // GET /pets/{petId} - Get pet by ID
  // Note: OpenAPI has both petId and testId in path, but we'll use petId
  http.get('http://petstore.swagger.io/v1/pets/:petId', ({ params }) => {
    const petId = parseInt(params.petId as string, 10);
    const pet = pets.find((p) => p.id === petId);

    if (!pet) {
      return HttpResponse.json(
        { code: 404, message: 'Pet not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(pet);
  }),
];
