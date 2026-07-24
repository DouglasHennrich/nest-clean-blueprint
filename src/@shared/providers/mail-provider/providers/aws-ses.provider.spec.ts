import * as path from 'node:path';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import { AwsSesMailProvider } from './aws-ses.provider';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-ses', () => {
  const actual = jest.requireActual<typeof import('@aws-sdk/client-ses')>('@aws-sdk/client-ses');
  return {
    ...actual,
    SESClient: jest.fn().mockImplementation(() => ({
      send: sendMock,
    })),
  };
});

describe('AwsSesMailProvider', () => {
  const options = {
    region: 'us-east-1',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    defaultFrom: 'noreply@example.com',
  };

  const templatePath = path.resolve(__dirname, '../templates/welcome.ejs');
  const partialsDir = path.resolve(__dirname, '../templates');

  let provider: AwsSesMailProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMock.mockResolvedValue({});
    provider = new AwsSesMailProvider(options);
  });

  describe('compileTemplate', () => {
    it('should render the ejs template with partials and template data', async () => {
      const result = await provider.compileTemplate({
        templatePath,
        templateData: {
          userName: 'Jane',
          activationUrl: 'https://example.com/activate',
          appName: 'MyApp',
        },
        partialsDir,
      });

      expect(result.error).toBeUndefined();
      const html = result.getValue()!;
      expect(html).toContain('Jane');
      expect(html).toContain('https://example.com/activate');
    });

    it('should fall back to the default app name when templateData omits appName entirely', async () => {
      const result = await provider.compileTemplate({
        templatePath,
        templateData: {
          userName: 'Jane',
          activationUrl: 'https://example.com/activate',
          // appName intentionally omitted entirely (not set to undefined)
        },
        partialsDir,
      });

      expect(result.error).toBeUndefined();
      const html = result.getValue()!;
      expect(html).toContain('My App');
    });

    it('should return a failed Result when the template file does not exist', async () => {
      const result = await provider.compileTemplate({
        templatePath: path.resolve(__dirname, '../templates/does-not-exist.ejs'),
        templateData: {},
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to compile email template');
    });
  });

  describe('sendRawEmail', () => {
    it('should build a SendEmailCommand with normalized recipients and send it', async () => {
      const result = await provider.sendRawEmail({
        to: 'a@example.com',
        subject: 'Subject',
        html: '<p>Hi</p>',
      });

      expect(result.error).toBeUndefined();
      expect(sendMock).toHaveBeenCalledTimes(1);
      const commandArg = sendMock.mock.calls[0][0];
      expect(commandArg).toBeInstanceOf(SendEmailCommand);
      expect(commandArg.input).toEqual({
        Source: 'noreply@example.com',
        Destination: {
          ToAddresses: ['a@example.com'],
          CcAddresses: undefined,
          BccAddresses: undefined,
        },
        Message: {
          Subject: { Data: 'Subject', Charset: 'UTF-8' },
          Body: {
            Html: { Data: '<p>Hi</p>', Charset: 'UTF-8' },
          },
        },
      });
    });

    it('should accept arrays for to/cc/bcc and use the explicit from over the default', async () => {
      await provider.sendRawEmail({
        to: ['a@example.com', 'b@example.com'],
        cc: ['c@example.com'],
        bcc: 'd@example.com',
        subject: 'Subject',
        html: '<p>Hi</p>',
        from: 'custom@example.com',
      });

      const commandArg = sendMock.mock.calls[0][0];
      expect(commandArg.input.Source).toBe('custom@example.com');
      expect(commandArg.input.Destination).toEqual({
        ToAddresses: ['a@example.com', 'b@example.com'],
        CcAddresses: ['c@example.com'],
        BccAddresses: ['d@example.com'],
      });
    });

    it('should return a failed Result when the SES client throws', async () => {
      sendMock.mockRejectedValue(new Error('SES unavailable'));

      const result = await provider.sendRawEmail({
        to: 'a@example.com',
        subject: 'Subject',
        html: '<p>Hi</p>',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to send email');
    });
  });

  describe('sendTemplateEmail', () => {
    it('should compile the template then send the resulting html', async () => {
      const result = await provider.sendTemplateEmail({
        to: 'a@example.com',
        subject: 'Welcome',
        templatePath,
        templateData: {
          userName: 'Jane',
          activationUrl: 'https://example.com/activate',
          appName: 'MyApp',
        },
        partialsDir,
      });

      expect(result.error).toBeUndefined();
      expect(sendMock).toHaveBeenCalledTimes(1);
      const commandArg = sendMock.mock.calls[0][0];
      expect(commandArg.input.Message.Body.Html.Data).toContain('Jane');
    });

    it('should propagate the compile failure without attempting to send', async () => {
      const result = await provider.sendTemplateEmail({
        to: 'a@example.com',
        subject: 'Welcome',
        templatePath: path.resolve(__dirname, '../templates/does-not-exist.ejs'),
        templateData: {},
      });

      expect(result.error).toBeDefined();
      expect(sendMock).not.toHaveBeenCalled();
    });
  });
});
