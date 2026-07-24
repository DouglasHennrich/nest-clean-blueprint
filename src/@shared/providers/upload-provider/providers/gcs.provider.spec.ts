import { GcsStorageProvider } from './gcs.provider';

const saveMock = jest.fn();
const getSignedUrlMock = jest.fn();
const getMetadataMock = jest.fn();
const downloadMock = jest.fn();
const deleteMock = jest.fn();
const fileMock = jest.fn(() => ({
  save: saveMock,
  getSignedUrl: getSignedUrlMock,
  getMetadata: getMetadataMock,
  download: downloadMock,
  delete: deleteMock,
}));
const bucketMock = jest.fn(() => ({ file: fileMock }));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: bucketMock,
  })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'fixed-uuid'),
}));

describe('GcsStorageProvider', () => {
  const options = {
    region: 'us-east-1',
    defaultBucket: 'my-app-bucket',
    signedUrlExpiresIn: 900,
    gcsProjectId: 'my-project',
    gcsKeyFile: '/path/to/key.json',
  };

  let provider: GcsStorageProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
    provider = new GcsStorageProvider(options);
  });

  describe('uploadFile', () => {
    it('should save the file under the default bucket using a generated key', async () => {
      const result = await provider.uploadFile({
        bucket: 'avatars',
        file: {
          buffer: Buffer.from('data'),
          originalname: 'photo.png',
          mimetype: 'image/png',
          size: 4,
        },
      });

      expect(result.error).toBeUndefined();
      expect(bucketMock).toHaveBeenCalledWith('my-app-bucket');
      expect(fileMock).toHaveBeenCalledWith('avatars/fixed-uuid.png');
      expect(saveMock).toHaveBeenCalledWith(expect.any(Buffer), {
        contentType: 'image/png',
      });

      const value = result.getValue()!;
      expect(value.key).toBe('avatars/fixed-uuid.png');
      expect(value.storageId).toBe('my-app-bucket/avatars/fixed-uuid.png');
      expect(value.bucket).toBe('avatars');
      expect(value.fileId).toBe('fixed-uuid');
      expect(value.url).toBe('https://storage.googleapis.com/my-app-bucket/avatars/fixed-uuid.png');
    });

    it('should build a key without extension when the filename has none', async () => {
      const result = await provider.uploadFile({
        bucket: 'docs',
        file: {
          buffer: Buffer.from('data'),
          originalname: 'noextension',
          mimetype: 'application/octet-stream',
          size: 4,
        },
      });

      expect(result.getValue()!.key).toBe('docs/fixed-uuid');
    });

    it('should return a failed Result when the client throws', async () => {
      saveMock.mockRejectedValue(new Error('GCS down'));

      const result = await provider.uploadFile({
        bucket: 'avatars',
        file: { buffer: Buffer.from('x'), originalname: 'a.png', mimetype: 'image/png', size: 1 },
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to upload file');
    });
  });

  describe('getFileUrl', () => {
    it('should parse the storageId and return a signed url', async () => {
      getSignedUrlMock.mockResolvedValue(['https://signed.example.com/file']);

      const result = await provider.getFileUrl({ storageId: 'my-app-bucket/avatars/file.png' });

      expect(result.error).toBeUndefined();
      expect(bucketMock).toHaveBeenCalledWith('my-app-bucket');
      expect(fileMock).toHaveBeenCalledWith('avatars/file.png');
      expect(getSignedUrlMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'read', expires: expect.any(Number) }),
      );
      expect(result.getValue()).toEqual({ url: 'https://signed.example.com/file', expiresIn: 900 });
    });

    it('should fall back to the default bucket when storageId has no slash', async () => {
      getSignedUrlMock.mockResolvedValue(['https://signed.example.com/file']);

      await provider.getFileUrl({ storageId: 'plain-key' });

      expect(bucketMock).toHaveBeenCalledWith('my-app-bucket');
      expect(fileMock).toHaveBeenCalledWith('plain-key');
    });

    it('should return a failed Result when signing fails', async () => {
      getSignedUrlMock.mockRejectedValue(new Error('sign failed'));

      const result = await provider.getFileUrl({ storageId: 'bucket/key' });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to sign URL');
    });
  });

  describe('getFileBuffer', () => {
    it('should fetch metadata and download the file', async () => {
      getMetadataMock.mockResolvedValue([{ contentType: 'text/plain', size: '5' }]);
      downloadMock.mockResolvedValue([Buffer.from('hello')]);

      const result = await provider.getFileBuffer({ storageId: 'my-app-bucket/key.txt' });

      expect(result.error).toBeUndefined();
      const value = result.getValue()!;
      expect(value.buffer.toString()).toBe('hello');
      expect(value.mimeType).toBe('text/plain');
      expect(value.size).toBe(5);
    });

    it('should default mimeType and size when metadata is missing them', async () => {
      getMetadataMock.mockResolvedValue([{}]);
      downloadMock.mockResolvedValue([Buffer.from('x')]);

      const result = await provider.getFileBuffer({ storageId: 'my-app-bucket/key.txt' });

      const value = result.getValue()!;
      expect(value.mimeType).toBe('application/octet-stream');
      expect(value.size).toBe(0);
    });

    it('should return a failed Result when the client throws', async () => {
      getMetadataMock.mockRejectedValue(new Error('read failed'));

      const result = await provider.getFileBuffer({ storageId: 'my-app-bucket/key.txt' });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to read file');
    });
  });

  describe('deleteFile', () => {
    it('should delete the parsed file from its bucket', async () => {
      deleteMock.mockResolvedValue(undefined);

      const result = await provider.deleteFile({ storageId: 'my-app-bucket/key.txt' });

      expect(result.error).toBeUndefined();
      expect(bucketMock).toHaveBeenCalledWith('my-app-bucket');
      expect(fileMock).toHaveBeenCalledWith('key.txt');
      expect(deleteMock).toHaveBeenCalled();
    });

    it('should return a failed Result when the client throws', async () => {
      deleteMock.mockRejectedValue(new Error('delete failed'));

      const result = await provider.deleteFile({ storageId: 'my-app-bucket/key.txt' });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to delete file');
    });
  });
});
