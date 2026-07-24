import axios from 'axios';

/**
 * Fetches an image from a URL and converts it to a base64 data URI.
 * Returns null if the fetch fails or the URL is invalid.
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    const contentType = (response.headers['content-type'] as string | undefined) ?? 'image/png';
    const mimeType = contentType.split(';')[0].trim();

    const base64 = Buffer.from(response.data).toString('base64');

    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Scans an HTML string for <img> tags whose `src` attribute is an external URL
 * (i.e. not already a base64 data URI) and replaces each `src` with a base64
 * data URI fetched from that URL.
 *
 * Images that cannot be fetched are left unchanged.
 */
export async function convertHtmlImagesToBase64(html: string): Promise<string> {
  // Match src="..." or src='...' inside <img> tags, capturing the URL value
  const imgSrcRegex = /(<img[^>]*?\ssrc=)(["'])(?!data:)([^"']+)\2/gi;

  const matches: Array<{
    fullMatch: string;
    prefix: string;
    quote: string;
    url: string;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = imgSrcRegex.exec(html)) !== null) {
    matches.push({
      fullMatch: match[0],
      prefix: match[1],
      quote: match[2],
      url: match[3],
    });
  }

  if (matches.length === 0) {
    return html;
  }

  // Fetch all images in parallel
  const base64Values = await Promise.all(matches.map(({ url }) => fetchImageAsBase64(url)));

  let result = html;

  for (let i = 0; i < matches.length; i++) {
    const { fullMatch, prefix, quote, url } = matches[i];
    const base64 = base64Values[i];

    if (base64) {
      const replacement = `${prefix}${quote}${base64}${quote}`;
      result = result.replace(fullMatch, replacement);
    } else {
      // Leave the original src unchanged if fetch failed
      // (already present in `result`, so no action needed)
      void url;
    }
  }

  return result;
}
