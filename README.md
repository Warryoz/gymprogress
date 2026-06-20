# Gym Progress

Minimal Angular app for reading a tab-separated workout CSV and showing progress by workout session.

## CSV format

Each workout starts when the first column has a workout name. Blank lines separate workouts.

```tsv
legs	squat		7x100kg
	isquio		10x50kg

chest	incline bench press		5x80kg	3x80kg	4x75kg	3x75kg
	peck deck		10x70kg
```

Rules:

- Columns after the exercise are set markers.
- Every exercise is expanded to 4 sets.
- A single marker such as `7x100kg` becomes `7x100kg`, `6x100kg`, `5x100kg`, `4x100kg`.
- If only some sets are written, the missing sets continue from the last marker with one fewer rep.
- `kg`, `lb`, and `20kg al fallo-19` are supported.
- Progress is grouped by workout order only. No week or month is inferred.

## Run

```bash
npm install
npm start
```

Open `http://localhost:4200/`.

## Test and build

```bash
npm test -- --watch=false
npm run build
```
