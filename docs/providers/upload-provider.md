# Upload provider (AWS S3)

File storage backed by AWS S3. Returns a `storageId` (string) that round-trips through your application — pass it back to fetch URL, buffer, or delete the file. The provider returns `Result<T>` for every operation.

## Module

```typescript
imports: [UploadProviderModule]
```

## Configuration (env)

| Var | Notes |
|---|---|
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | optional in EC2/ECS where IAM roles are attached |
| `AWS_SECRET_ACCESS_KEY` | optional |
| `AWS_S3_BUCKET` | default bucket used for all uploads |

## Inject

```typescript
constructor(private uploadProvider: TUploadProvider) {}
```

## Upload

```typescript
const result = await this.uploadProvider.uploadFile({
  bucket: 'invoices',                    // logical folder under defaultBucket
  file: {
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  },
});

if (result.error) return Result.fail(result.error);

const { storageId, url, fileId } = result.getValue()!;
// Store storageId on your entity; you'll need it to fetch/delete later.
```

## Get pre-signed URL

```typescript
const result = await this.uploadProvider.getFileUrl({ storageId });
const { url, expiresIn } = result.getValue()!;
```

Pre-signed URLs default to 1 hour. Adjust via the module factory if needed.

## Read as Buffer

```typescript
const result = await this.uploadProvider.getFileBuffer({ storageId });
const { buffer, mimeType, size } = result.getValue()!;
```

Use this for server-side processing (PDF generation, image resize) — never just to proxy the file to the client (use the pre-signed URL instead).

## Delete

```typescript
await this.uploadProvider.deleteFile({ storageId });
```

## storageId format

`<bucket>/<key>` — e.g. `app-default-bucket/invoices/abc-123.pdf`. Keep it as a single string in your entity. The provider parses it back into bucket + key on every operation.

## Buckets vs logical folders

The S3 bucket is fixed at the env level (`AWS_S3_BUCKET`). The `bucket` field on `IUploadFileDto` is a logical prefix (folder) inside that bucket — not a real S3 bucket. This avoids needing IAM policies per logical area.

If you genuinely need separate S3 buckets per domain, extend the provider:

1. Accept a `bucketMap` in `IUploadProviderOptions`: `{ invoices: 'company-invoices', avatars: 'company-avatars' }`.
2. Resolve `bucket` against the map in `uploadFile`.
3. The `storageId` remains `<bucket>/<key>`.

## Error handling

All operations return `Result<T>`. Failures are wrapped as `DefaultException` with the original error message. Custom exceptions (e.g. `UploadFileTooLargeException`) should validate at the controller / service layer before calling the provider.
