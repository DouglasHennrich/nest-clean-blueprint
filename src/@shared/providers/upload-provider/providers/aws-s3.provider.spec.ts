import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsS3StorageProvider } from './aws-s3.provider';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: sendMock,
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'fixed-uuid'),
}));

describe('AwsS3StorageProvider', () => {
  const options = {
    region: 'us-east-1',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    defaultBucket: 'my-app-bucket',
    signedUrlExpiresIn: 900,
  };

  let provider: AwsS3StorageProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMock.mockResolvedValue({});
    provider = new AwsS3StorageProvider(options);
  });

  describe('uploadFile', () => {
    it('should build a PutObjectCommand using the default bucket and a generated key', async () => {
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
      expect(sendMock).toHaveBeenCalledTimes(1);
      const commandArg = sendMock.mock.calls[0][0];
      expect(commandArg).toBeInstanceOf(PutObjectCommand);
      expect(commandArg.input).toEqual({
        Bucket: 'my-app-bucket',
        Key: 'avatars/fixed-uuid.png',
        Body: expect.any(Buffer),
        ContentType: 'image/png',
      });

      const value = result.getValue()!;
      expect(value.key).toBe('avatars/fixed-uuid.png');
      expect(value.storageId).toBe('my-app-bucket/avatars/fixed-uuid.png');
      expect(value.bucket).toBe('avatars');
      expect(value.fileId).toBe('fixed-uuid');
      expect(value.url).toBe(
        'https://my-app-bucket.s3.us-east-1.amazonaws.com/avatars/fixed-uuid.png',
      );
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
      sendMock.mockRejectedValue(new Error('S3 down'));

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
      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed.example.com/file');

      const result = await provider.getFileUrl({ storageId: 'my-app-bucket/avatars/file.png' });

      expect(result.error).toBeUndefined();
      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.any(GetObjectCommand), {
        expiresIn: 900,
      });
      const [, commandArg] = (getSignedUrl as jest.Mock).mock.calls[0];
      expect(commandArg.input).toEqual({ Bucket: 'my-app-bucket', Key: 'avatars/file.png' });
      expect(result.getValue()).toEqual({ url: 'https://signed.example.com/file', expiresIn: 900 });
    });

    it('should fall back to the default bucket when storageId has no slash', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed.example.com/file');

      await provider.getFileUrl({ storageId: 'plain-key' });

      const [, commandArg] = (getSignedUrl as jest.Mock).mock.calls[0];
      expect(commandArg.input).toEqual({ Bucket: 'my-app-bucket', Key: 'plain-key' });
    });

    it('should return a failed Result when signing fails', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('sign failed'));

      const result = await provider.getFileUrl({ storageId: 'bucket/key' });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to sign URL');
    });
  });

  describe('getFileBuffer', () => {
    it('should fetch metadata and stream the body into a buffer', async () => {
      async function* bodyGenerator() {
        await Promise.resolve();
        yield Buffer.from('hel');
        yield Buffer.from('lo');
      }

      sendMock.mockImplementation((command: unknown) => {
        if (command instanceof HeadObjectCommand) {
          return Promise.resolve({ ContentType: 'text/plain', ContentLength: 5 });
        }
        if (command instanceof GetObjectCommand) {
          return Promise.resolve({ Body: bodyGenerator() });
        }
        return Promise.resolve({});
      });

      const result = await provider.getFileBuffer({ storageId: 'my-app-bucket/key.txt' });

      expect(result.error).toBeUndefined();
      const value = result.getValue()!;
      expect(value.buffer.toString()).toBe('hello');
      expect(value.mimeType).toBe('text/plain');
      expect(value.size).toBe(5);
    });

    it('should default mimeType and size when head metadata is missing them', async () => {
      async function* bodyGenerator() {
        await Promise.resolve();
        yield Buffer.from('x');
      }

      sendMock.mockImplementation((command: unknown) => {
        if (command instanceof HeadObjectCommand) {
          return Promise.resolve({});
        }
        return Promise.resolve({ Body: bodyGenerator() });
      });

      const result = await provider.getFileBuffer({ storageId: 'my-app-bucket/key.txt' });

      const value = result.getValue()!;
      expect(value.mimeType).toBe('application/octet-stream');
      expect(value.size).toBe(0);
    });

    it('should return a failed Result when the client throws', async () => {
      sendMock.mockRejectedValue(new Error('read failed'));

      const result = await provider.getFileBuffer({ storageId: 'my-app-bucket/key.txt' });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to read file');
    });
  });

  describe('deleteFile', () => {
    it('should build a DeleteObjectCommand from the parsed storageId', async () => {
      const result = await provider.deleteFile({ storageId: 'my-app-bucket/key.txt' });

      expect(result.error).toBeUndefined();
      const commandArg = sendMock.mock.calls[0][0];
      expect(commandArg).toBeInstanceOf(DeleteObjectCommand);
      expect(commandArg.input).toEqual({ Bucket: 'my-app-bucket', Key: 'key.txt' });
    });

    it('should return a failed Result when the client throws', async () => {
      sendMock.mockRejectedValue(new Error('delete failed'));

      const result = await provider.deleteFile({ storageId: 'my-app-bucket/key.txt' });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to delete file');
    });
  });
});
