import { toBlob } from 'html-to-image';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoutineShareService } from './routine-share.service';

vi.mock('html-to-image', () => ({
  toBlob: vi.fn(),
}));

describe('RoutineShareService', () => {
  const mockedToBlob = vi.mocked(toBlob);

  beforeEach(() => {
    mockedToBlob.mockReset();
    mockedToBlob.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  });

  it('captures a positioned clone of the card instead of its off-screen staging container', async () => {
    const staging = document.createElement('div');
    staging.style.position = 'fixed';
    staging.style.left = '-12000px';

    const card = document.createElement('article');
    card.className = 'share-card export-card';
    card.innerHTML = `
      <h2>D1 Push</h2>
      <article data-share-exercise>Incline bench press</article>
    `;
    staging.appendChild(card);
    document.body.appendChild(staging);

    try {
      const images = await new RoutineShareService().generatePngs(card, 'D1 Push');
      const captured = mockedToBlob.mock.calls[0][0] as HTMLElement;

      expect(images).toHaveLength(1);
      expect(captured.tagName).toBe('ARTICLE');
      expect(captured.style.left).toBe('0px');
      expect(captured.textContent).toContain('D1 Push');
      expect(captured.textContent).toContain('Incline bench press');
    } finally {
      staging.remove();
    }
  });
});
