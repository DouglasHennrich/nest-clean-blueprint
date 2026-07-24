interface IFileMetadataModel {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'confirmpassword',
  'currentpassword',
  'newpassword',
  'passwordconfirmation',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'creditcard',
  'cardnumber',
  'cvv',
  'cvc',
  'ssn',
  'cpf',
]);

export class Sanitize {
  /**
   * Recursively masks sensitive fields in an object and returns a JSON string.
   */
  static data(data: any): string | undefined {
    try {
      if (
        !data ||
        (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)
      ) {
        return undefined;
      }

      const sanitized = this.recursive(data);
      return JSON.stringify(sanitized);
    } catch {
      return undefined;
    }
  }

  /**
   * Specifically for masking headers and returning a JSON string.
   */
  static headers(headers: any): string | undefined {
    return this.data(headers);
  }

  /**
   * Extracts metadata from a single multer file object and returns a JSON string.
   */
  static file(file: any): string | undefined {
    try {
      const metadata = this.extractFileMetadata(file);
      return metadata ? JSON.stringify(metadata) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Handles arrays or keyed objects of files, extracting metadata for each.
   */
  static files(files: any): string | undefined {
    try {
      if (!files || (Array.isArray(files) && files.length === 0)) {
        return undefined;
      }

      if (Array.isArray(files)) {
        const sanitizedFiles = files
          .map((f) => this.extractFileMetadata(f))
          .filter((f) => f !== undefined);
        return sanitizedFiles.length > 0 ? JSON.stringify(sanitizedFiles) : undefined;
      }

      if (typeof files === 'object') {
        const result: Record<string, any> = {};
        let hasData = false;

        for (const key of Object.keys(files)) {
          const value = files[key];
          if (Array.isArray(value)) {
            const extracted = value
              .map((f) => this.extractFileMetadata(f))
              .filter((f) => f !== undefined);
            if (extracted.length > 0) {
              result[key] = extracted;
              hasData = true;
            }
          } else {
            const extracted = this.extractFileMetadata(value);
            if (extracted) {
              result[key] = extracted;
              hasData = true;
            }
          }
        }
        return hasData ? JSON.stringify(result) : undefined;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Internal helper for recursive masking.
   */
  private static recursive(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map((item: unknown) => this.recursive(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        sanitized[key] = SENSITIVE_KEYS.has(lowerKey) ? '[REDACTED]' : this.recursive(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Extracts metadata from a file object.
   */
  private static extractFileMetadata(file: any): IFileMetadataModel | undefined {
    if (!file || typeof file !== 'object' || !file.fieldname) {
      return undefined;
    }

    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      filename: file.filename,
    };
  }
}
