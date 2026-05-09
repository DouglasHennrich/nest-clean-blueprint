import { Result } from "@/@shared/classes/result";

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

export interface IEmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface ISendTemplateEmailOptions {
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
  attachments?: IEmailAttachment[];
}

export interface ICompileTemplateOptions {
  templatePath: string;
  templateData: Record<string, any>;
  partialsDir?: string;
}

export interface ISendRawEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: IEmailAttachment[];
}

export abstract class TMailProvider {
  abstract sendTemplateEmail(
    options: ISendTemplateEmailOptions,
  ): Promise<Result<void>>;

  abstract sendRawEmail(options: ISendRawEmailOptions): Promise<Result<void>>;

  abstract compileTemplate(
    options: ICompileTemplateOptions,
  ): Promise<Result<string>>;
}

export const MAIL_PROVIDER_OPTIONS = "MAIL_PROVIDER_OPTIONS";

export interface IMailProviderOptions {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  defaultFrom: string;
}
