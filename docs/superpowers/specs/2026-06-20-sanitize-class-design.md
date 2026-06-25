# Design: Sanitize Utility Class

Create a centralized `Sanitize` utility class in `@shared/utils/sanitize.ts` to handle data masking and metadata extraction for logging purposes.

## Architecture

The utility will be implemented as a class with static methods to follow the existing `@shared/utils` patterns (like `Normalize`). It will consolidate logic for sanitizing request bodies, headers, and file uploads.

## Components

### Sanitize Class
- **Purpose**: Provide a uniform API for masking sensitive data before it reaches logs or persistent storage.
- **Location**: `src/@shared/utils/sanitize.ts`

### Methods

#### `Sanitize.data(data: any): string | undefined`
- Maps input data through a recursive masker using `SENSITIVE_KEYS`.
- Returns a JSON string of the sanitized object.
- Returns `undefined` for empty inputs or empty objects.

#### `Sanitize.headers(headers: any): string | undefined`
- Specifically masks sensitive headers (Authorization, Cookies).
- Returns a JSON string.

#### `Sanitize.file(file: any): string | undefined`
- Extracts metadata (`fieldname`, `originalname`, `mimetype`, `size`) from a single file object (Multer).
- Returns a JSON string.

#### `Sanitize.files(files: any): string | undefined`
- Handles both arrays and keyed object structures of files.
- Returns a JSON string of an array of metadata objects.

## Data Flow

1. Middleware/Service receives raw request data.
2. `Sanitize` static methods are called with the data.
3. Sensitive keys are matched against `SENSITIVE_KEYS` (case-insensitive).
4. Values are replaced with `[REDACTED]`.
5. Sanitized data is stringified and returned safely.

## Error Handling

- All methods include `try-catch` blocks to prevent logging failures from impacting the main application flow.
- Failures result in `undefined` returned to the caller, effectively skipping logging of that specific field.

## Testing

- Unit tests should verify that:
  - All keys in `SENSITIVE_KEYS` are masked.
  - Nested objects and arrays are correctly traversed.
  - File metadata is extracted while binary data is excluded.
  - Empty objects/null values return `undefined`.
