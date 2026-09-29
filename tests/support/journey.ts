import fs from 'node:fs';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { Document, ImageRun, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

/**
 * Journey screenshots.
 *
 *   const j = journey(page, testInfo);
 *   await j.shot('devices listing');
 *   await j.shot('mock bank page', bankPage);   // different Page (popup)
 *   await j.viewportShot('device page');        // visible window only, not full page
 *
 * Test artifact: pass `{ fields }` (optional `title`, default: the test title), then `await j.writeArtifact()` from a
 * `test.afterEach` (so it is written on failure too) to get
 * `screenshots/<test-title>/artifact.docx` - title, tester details (MyKad ...)
 * and every screenshot, one Word file to hand over.
 *
 * Layout:  screenshots/<test-title>/<NN>-<state>.png   (all shots flat in
 * one folder per test). The folder is wiped at the start of each run so
 * shots never accumulate stale state; a retry writes `<NN>-<state>-retry<n>.png`.
 */

const ROOT = 'screenshots';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export type ArtifactMeta = {
  /** Defaults to the test title. */
  title?: string;
  /** Label -> value rows shown under the title, e.g. `{ MyKad: '050313030143' }`. */
  fields?: Record<string, string>;
};

const MAX_IMG_WIDTH = 600; // px; fits A4/Letter portrait with default margins
const MAX_IMG_HEIGHT = 880; // px; keeps one screenshot on one page (tall full-page shots scale down)

/**
 * Get the page into a state worth photographing:
 *  1. wait for the site's loading overlay (`div.layer-overlay`, black 70% + spinner)
 *     to go away - shots taken through it come out dimmed. Best effort: some
 *     states (the eKYC gate) keep it up, so give up after a while and shoot anyway;
 *  2. for full-page shots, scroll top -> bottom so lazy-loaded sections render
 *     (otherwise they capture as blank), then back to the top so the sticky
 *     header is stitched in at the top instead of partway down the image.
 */
async function settle(target: Page, fullPage: boolean) {
  await target
    .waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.layer-overlay')).every((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || r.width === 0 || r.height === 0;
        }),
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => {});
  if (fullPage) {
    await target.evaluate(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < h; y += Math.max(innerHeight - 100, 300)) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
    }).catch(() => {});
    await target.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  }
  await target.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await target.waitForTimeout(200);
}

/**
 * Full-width bars pinned to the bottom of the viewport (the cart summary +
 * "Next" bar) are `position: fixed`, so a full-page capture paints them once,
 * one viewport-height down, on top of whatever content is there - a band cut
 * across the page. For the capture only, put them back in normal flow so they
 * sit at the end of the page instead. `repin` undoes it (the test still has to
 * click that bar afterwards). Narrow floating widgets (chat bubble) are left
 * alone. Call with the page scrolled to the top so rects are viewport-relative.
 */
async function unpinBottomBars(target: Page) {
  await target
    .evaluate(() => {
      const style = document.createElement('style');
      style.id = '__journey_unpin';
      style.textContent = '[data-journey-unpin]{position:static !important;}';
      document.head.append(style);
      Array.from(document.querySelectorAll<HTMLElement>('body *')).forEach((el) => {
        if (getComputedStyle(el).position !== 'fixed') return;
        const r = el.getBoundingClientRect();
        if (r.top > innerHeight / 2 && r.width > innerWidth * 0.6) el.setAttribute('data-journey-unpin', '');
      });
    })
    .catch(() => {});
}

async function repin(target: Page) {
  await target
    .evaluate(() => {
      document.querySelectorAll('[data-journey-unpin]').forEach((el) => el.removeAttribute('data-journey-unpin'));
      document.getElementById('__journey_unpin')?.remove();
    })
    .catch(() => {});
}

/** PNG width/height live at fixed offsets in the IHDR chunk. */
const pngSize = (buf: Buffer) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });

/**
 * A tall full-page shot scaled to fit one Word page is unreadable (a 5000px
 * page ends up ~17% scale). Instead cut it into page-sized slices - captured
 * with Playwright's `clip`, so no image library is needed. Returns undefined
 * when the shot already fits on one page. Assumes deviceScaleFactor 1 (the
 * suite's config), so image px == CSS px.
 */
async function sliceForDoc(target: Page, shot: Buffer): Promise<Buffer[] | undefined> {
  const { width, height } = pngSize(shot);
  const sliceH = Math.floor(MAX_IMG_HEIGHT / Math.min(1, MAX_IMG_WIDTH / width));
  if (height <= sliceH) return undefined;
  const slices: Buffer[] = [];
  for (let y = 0; y < height; y += sliceH) {
    slices.push(await target.screenshot({ fullPage: true, clip: { x: 0, y, width, height: Math.min(sliceH, height - y) } }));
  }
  return slices;
}

export function journey(page: Page, testInfo: TestInfo, meta: ArtifactMeta = {}) {
  const testDir = path.join(ROOT, slug(testInfo.title));
  if (testInfo.retry === 0) fs.rmSync(testDir, { recursive: true, force: true });
  let step = 0;
  /** `slices`: page-sized pieces of a tall shot, for the docx only (the PNG on disk stays whole). */
  const taken: { name: string; file: string; slices?: Buffer[] }[] = [];

  const take = async (name: string, target: Page, fullPage: boolean) => {
    step += 1;
    const nn = String(step).padStart(2, '0');
    const suffix = testInfo.retry === 0 ? '' : `-retry${testInfo.retry}`;
    const file = path.join(testDir, `${nn}-${slug(name)}${suffix}.png`);
    await settle(target, fullPage);
    if (fullPage) await unpinBottomBars(target);
    try {
      const shot = await target.screenshot({ path: file, fullPage }); // creates testDir
      taken.push({ name, file, slices: fullPage ? await sliceForDoc(target, shot) : undefined });
    } finally {
      if (fullPage) await repin(target);
    }
  };

  return {
    async shot(name: string, target: Page = page) {
      await take(name, target, true);
    },

    /** Just the visible window - for long pages (device listing) where the
     *  item under test is on screen and a full-page capture would bury it. */
    async viewportShot(name: string, target: Page = page) {
      await take(name, target, false);
    },

    /** Write `artifact.docx`: title + fields + all screenshots so far. */
    async writeArtifact() {
      const title = meta.title ?? testInfo.title;
      const line = (label: string, value: string) =>
        new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)] });

      const fields = { ...meta.fields, Run: new Date().toISOString(), Result: testInfo.status ?? 'unknown' };
      const body: Paragraph[] = [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
        ...Object.entries(fields).map(([k, v]) => line(k, v)),
      ];
      taken.forEach(({ name, file, slices }, i) => {
        body.push(
          // keepNext: caption stays on the same page as its (first) image
          new Paragraph({ text: `${i + 1}. ${name}`, heading: HeadingLevel.HEADING_3, spacing: { before: 300 }, keepNext: true }),
        );
        (slices ?? [fs.readFileSync(file)]).forEach((data, part, all) => {
          const { width, height } = pngSize(data);
          const scale = Math.min(1, MAX_IMG_WIDTH / width, MAX_IMG_HEIGHT / height);
          if (all.length > 1) {
            body.push(new Paragraph({ children: [new TextRun({ text: `part ${part + 1} of ${all.length}`, italics: true, size: 18 })], keepNext: true }));
          }
          body.push(
            new Paragraph({
              children: [
                new ImageRun({
                  type: 'png',
                  data,
                  transformation: { width: Math.round(width * scale), height: Math.round(height * scale) },
                }),
              ],
            }),
          );
        });
      });

      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'artifact.docx'),
        await Packer.toBuffer(new Document({ sections: [{ children: body }] })),
      );
    },
  };
}
