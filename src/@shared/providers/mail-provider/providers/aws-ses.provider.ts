import { Inject, Injectable } from "@nestjs/common";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import * as ejs from "ejs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Result } from "@/@shared/classes/result";
import { DefaultException } from "@/@shared/errors/abstract-application-exception";
import {
  ICompileTemplateOptions,
  IMailProviderOptions,
  ISendRawEmailOptions,
  ISendTemplateEmailOptions,
  MAIL_PROVIDER_OPTIONS,
  TMailProvider,
} from "../models/mail-provider.struct";

/**
 * AwsSesMailProvider
 *
 * Sends emails through AWS SES. Compiles EJS templates with partial support.
 * Returns Result<T> — never throws.
 */
@Injectable()
export class AwsSesMailProvider implements TMailProvider {
  private client: SESClient;

  constructor(
    @Inject(MAIL_PROVIDER_OPTIONS)
    private readonly options: IMailProviderOptions,
  ) {
    this.client = new SESClient({
      region: this.options.region,
      credentials:
        this.options.accessKeyId && this.options.secretAccessKey
          ? {
              accessKeyId: this.options.accessKeyId,
              secretAccessKey: this.options.secretAccessKey,
            }
          : undefined,
    });
  }

  async compileTemplate(
    opts: ICompileTemplateOptions,
  ): Promise<Result<string>> {
    try {
      const absolutePath = path.isAbsolute(opts.templatePath)
        ? opts.templatePath
        : path.resolve(opts.templatePath);

      const template = await fs.readFile(absolutePath, "utf-8");

      // Resolve partials relative to either the explicit partialsDir or the
      // template file's directory.
      const root = opts.partialsDir
        ? path.resolve(opts.partialsDir)
        : path.dirname(absolutePath);

      const html = ejs.render(template, opts.templateData, {
        filename: absolutePath,
        root,
      });

      return Result.success(html);
    } catch (error: any) {
      return Result.fail(
        new DefaultException(
          `Failed to compile email template: ${error.message}`,
          "MailTemplateCompileException",
          500,
        ),
      );
    }
  }

  async sendRawEmail(opts: ISendRawEmailOptions): Promise<Result<void>> {
    try {
      const toAddresses = Array.isArray(opts.to) ? opts.to : [opts.to];
      const ccAddresses = opts.cc
        ? Array.isArray(opts.cc)
          ? opts.cc
          : [opts.cc]
        : undefined;
      const bccAddresses = opts.bcc
        ? Array.isArray(opts.bcc)
          ? opts.bcc
          : [opts.bcc]
        : undefined;

      await this.client.send(
        new SendEmailCommand({
          Source: opts.from ?? this.options.defaultFrom,
          Destination: {
            ToAddresses: toAddresses,
            CcAddresses: ccAddresses,
            BccAddresses: bccAddresses,
          },
          Message: {
            Subject: { Data: opts.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: opts.html, Charset: "UTF-8" },
            },
          },
        }),
      );

      return Result.success();
    } catch (error: any) {
      return Result.fail(
        new DefaultException(
          `Failed to send email: ${error.message}`,
          "MailSendException",
          500,
        ),
      );
    }
  }

  async sendTemplateEmail(
    opts: ISendTemplateEmailOptions,
  ): Promise<Result<void>> {
    const compiled = await this.compileTemplate({
      templatePath: opts.templatePath,
      templateData: opts.templateData,
      partialsDir: opts.partialsDir,
    });
    if (compiled.error) return Result.fail(compiled.error);

    return this.sendRawEmail({
      to: opts.to,
      subject: opts.subject,
      html: compiled.getValue()!,
      from: opts.from,
      cc: opts.cc,
      bcc: opts.bcc,
      attachments: opts.attachments,
    });
  }
}
