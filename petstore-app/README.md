# Petstore App - MSW Widget Demo

Demo aplikacja React z operacjami CRUD dla Pet Store, zintegrowana z MSW Widget do zarządzania mockami w czasie rzeczywistym.

## Funkcjonalności

- **GET /pets** - Lista wszystkich zwierząt
- **POST /pets** - Tworzenie nowego zwierzęcia
- **GET /pets/{petId}** - Szczegóły konkretnego zwierzęcia

## Instalacja

```bash
cd petstore-app
npm install
```

## Uruchomienie

```bash
npm run dev
```

Aplikacja uruchomi się na `http://localhost:3000`

## MSW Widget

Aplikacja jest zintegrowana z MSW Widget, który pozwala na:

- Zarządzanie mockami w czasie rzeczywistym
- Nadpisywanie odpowiedzi API bez restartu
- Monitorowanie wywołań endpointów
- Tworzenie kolejek odpowiedzi

Widget jest widoczny jako floating button w prawym dolnym rogu.

## Struktura projektu

```
petstore-app/
├── src/
│   ├── api/          # API client functions
│   ├── components/   # React components
│   ├── mocks/        # MSW handlers
│   ├── types.ts      # TypeScript types
│   ├── App.tsx       # Main app component
│   └── main.tsx      # Entry point
├── public/
│   └── openapi.yaml  # OpenAPI specification
└── package.json
```

## Użycie

1. Uruchom aplikację
2. Kliknij floating button MSW Widget w prawym dolnym rogu
3. Zobacz wszystkie endpointy z OpenAPI spec
4. Kliknij na endpoint, aby go zamockować
5. Zmień odpowiedź i zobacz zmiany w aplikacji w czasie rzeczywistym
