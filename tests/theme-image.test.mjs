import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveThemeImage } from '../lib/theme-image.ts';

test('theme sources preserve all single-image fallbacks', () => {
  assert.deepEqual(resolveThemeImage({}), { light: undefined, dark: undefined });
  for (const field of ['image', 'imageLight', 'imageDark']) {
    assert.deepEqual(resolveThemeImage({ [field]: '/only.png' }), { light: '/only.png', dark: '/only.png' });
  }
  assert.deepEqual(resolveThemeImage({ imageLight: '/light.png', imageDark: '/dark.png' }), { light: '/light.png', dark: '/dark.png' });
  assert.deepEqual(resolveThemeImage({ image: '/base.png', imageDark: '/dark.png' }), { light: '/base.png', dark: '/dark.png' });
  assert.deepEqual(resolveThemeImage({ image: '/base.png', imageLight: '/light.png' }), { light: '/light.png', dark: '/base.png' });
});
