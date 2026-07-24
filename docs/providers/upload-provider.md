# Upload provider (AWS S3 default, GCS opt-in)

File storage backed by AWS S3 (default) or Google Cloud Storage (opt-in via the
`UPLOAD_PROVIDER` env var). Both providers implement the same `TUploadProvider` token and
return a `storageId` (string) that round-trips through your application — pass it back to
fetch URL, buffer, or delete the file. Every operation returns `Result<T>`.

See `src/@shared/providers/upload-provider/upload-provider.module.ts`,
`src/@shared/providers/upload-provider/providers/aws-s3.provider.ts` and
`src/@shared/providers/upload-provider/providers/gcs.provider.ts`.

## Module

```typescript
imports: [UploadProviderModule]
```

`UploadProviderModule` picks the concrete implementation at runtime via a factory:

```typescript
providers: [
  {
    provide: TUploadProvider,
    useFactory: (options: IUploadProviderOptionsModel, env: TEnvService): TUploadProvider =>
      env.get('UPLOAD_PROVIDER') === 'gcs'
        ? new GcsStorageProvider(options)
        : new AwsS3StorageProvider(options),
    inject: [UPLOAD_PROVIDER_OPTIONS, TEnvService],
  },
],
```

Always inject the `TUploadProvider` token — never a concrete provider class directly.

## Configuration (env)

| Var | Notes |
|---|---|
| `UPLOAD_PROVIDER` | `s3` (default) or `gcs` — selects which concrete provider is bound to `TUploadProvider` |
| `EXTERNAL_AWS_S3_REGION` | e.g. `us-east-1` |
| `EXTERNAL_AWS_ACCESS_KEY_ID` | optional in EC2/ECS where IAM roles are attached |
| `EXTERNAL_AWS_SECRET_ACCESS_KEY` | optional |
| `EXTERNAL_AWS_S3_BUCKET` | default bucket used for S3 uploads |
| `EXTERNAL_GCS_BUCKET` | default bucket used for GCS uploads (falls back to `EXTERNAL_AWS_S3_BUCKET`, then `app-default-bucket`) |
| `EXTERNAL_GCS_PROJECT_ID` | GCS project id — only used by `GcsStorageProvider` |
| `EXTERNAL_GCS_KEY_FILE` | path to a GCS service-account JSON key file — only used by `GcsStorageProvider` |

S3 remains the default provider — `UPLOAD_PROVIDER` must be explicitly set to `gcs` to
switch. Both providers share the same `IUploadProviderOptionsModel` shape and the same
`<bucket>/<key>` `storageId` encoding, so switching providers doesn't change any calling
code.

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

The default bucket is fixed at the env level (`EXTERNAL_AWS_S3_BUCKET` / `EXTERNAL_GCS_BUCKET`). The `bucket` field on `IUploadFileDtoModel` is a logical prefix (folder) inside that bucket — not a real S3/GCS bucket. This avoids needing IAM/IAM-equivalent policies per logical area.

If you genuinely need separate S3 buckets per domain, extend the provider:

1. Accept a `bucketMap` in `IUploadProviderOptionsModel`: `{ invoices: 'company-invoices', avatars: 'company-avatars' }`.
2. Resolve `bucket` against the map in `uploadFile`.
3. The `storageId` remains `<bucket>/<key>`.

## Error handling

All operations return `Result<T>`. Failures are wrapped as `DefaultException` with the original error message. Custom exceptions (e.g. `UploadFileTooLargeException`) should validate at the controller / service layer before calling the provider.

## Choosing S3 vs GCS

- **Default to S3** unless the deployment target is GCP — no code change needed, only env vars.
- Set `UPLOAD_PROVIDER=gcs` and the `EXTERNAL_GCS_*` vars to switch; `AwsS3StorageProvider` and `GcsStorageProvider` implement the identical `TUploadProvider` contract, so controllers/services never branch on which provider is active.
- Both providers are `@Injectable()` classes constructed with the same `IUploadProviderOptionsModel`, keeping the two implementations trivially swappable in tests via `{ provide: TUploadProvider, useValue: mockProvider }`.
