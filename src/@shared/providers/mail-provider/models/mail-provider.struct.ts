import { Result } from '@/@shared/classes/result';

/**
 * Mail provider contracts.
 *
 * The provider supports three modes:
 *  - sendTemplateEmail: compile an EJS template (with optional partials) and send
 *  - sendRawEmail: send pre-rendered HTML
 *  - compileTemplate: compile a template without sending (useful for previews)
 *
 * Templates are .ejs files. Partials are referenced inside templates via:
 *   <%- include('partials/header') %>
 *
 * See docs/providers/mail-provider.md for the full guide.
 */

export interface IEmailAttachmentModel {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface ISendTemplateEmailOptionsModel {
  to: string | string[];
  subject: string;
  /** Path to the .ejs template file (absolute or relative to partialsDir). */
  templatePath: string;
  templateData: Record<string, any>;
  /** Directory used to resolve <%- include('partials/...') %> calls. */
  partialsDir?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: IEmailAttachmentModel[];
}

export interface ICompileTemplateOptionsModel {
  templatePath: string;
  templateData: Record<string, any>;
  partialsDir?: string;
}

export interface ISendRawEmailOptionsModel {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: IEmailAttachmentModel[];
}

export abstract class TMailProvider {
  abstract sendTemplateEmail(options: ISendTemplateEmailOptionsModel): Promise<Result<void>>;

  abstract sendRawEmail(options: ISendRawEmailOptionsModel): Promise<Result<void>>;

  abstract compileTemplate(options: ICompileTemplateOptionsModel): Promise<Result<string>>;
}

export const MAIL_PROVIDER_OPTIONS = 'MAIL_PROVIDER_OPTIONS';

export interface IMailProviderOptionsModel {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  defaultFrom: string;
}
