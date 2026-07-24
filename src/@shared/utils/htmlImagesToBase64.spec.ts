import axios from 'axios';
import { convertHtmlImagesToBase64 } from './htmlImagesToBase64';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('convertHtmlImagesToBase64', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the html unchanged when there are no img tags', async () => {
    const html = '<div><p>no images here</p></div>';

    const result = await convertHtmlImagesToBase64(html);

    expect(result).toBe(html);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('should replace an external img src with a base64 data uri', async () => {
    mockedAxios.get.mockResolvedValue({
      data: Buffer.from('fake-image-bytes'),
      headers: { 'content-type': 'image/png' },
    });

    const html = '<img src="https://example.com/photo.png" alt="photo" />';

    const result = await convertHtmlImagesToBase64(html);

    const expectedBase64 = Buffer.from('fake-image-bytes').toString('base64');
    expect(result).toBe(`<img src="data:image/png;base64,${expectedBase64}" alt="photo" />`);
  });

  it('should leave the src unchanged when the src is already a data uri', async () => {
    const html = '<img src="data:image/png;base64,AAAA" />';

    const result = await convertHtmlImagesToBase64(html);

    expect(result).toBe(html);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('should leave the original src unchanged when the fetch fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network error'));

    const html = "<img src='https://example.com/broken.png' />";

    const result = await convertHtmlImagesToBase64(html);

    expect(result).toBe(html);
  });

  it('should handle multiple images independently', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: Buffer.from('img1'),
        headers: { 'content-type': 'image/jpeg' },
      })
      .mockRejectedValueOnce(new Error('fail'));

    const html = '<img src="https://example.com/a.jpg" /><img src="https://example.com/b.jpg" />';

    const result = await convertHtmlImagesToBase64(html);

    const expectedBase64 = Buffer.from('img1').toString('base64');
    expect(result).toContain(`src="data:image/jpeg;base64,${expectedBase64}"`);
    expect(result).toContain('src="https://example.com/b.jpg"');
  });

  it('should default to image/png when content-type header is missing', async () => {
    mockedAxios.get.mockResolvedValue({
      data: Buffer.from('bytes'),
      headers: {},
    });

    const html = '<img src="https://example.com/no-content-type" />';

    const result = await convertHtmlImagesToBase64(html);

    expect(result).toContain('data:image/png;base64,');
  });
});
