import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('app/globals.css', 'utf8');
const dashboard = readFileSync('components/AdminDashboard.tsx', 'utf8');

// Source/token-math regression, not a browser/pixel audit. This bounded reader
// handles the sheet's root/theme, layer, media, class and :is() rules. Tailwind
// text utilities derive from @theme tokens and slash alpha; no palette is copied.
// Unsupported selectors/conditions on relevant admin declarations fail closed.
function splitOutside(value, separator) {
  let depth = 0;
  return value.split('').reduce((parts, char) => {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === separator && depth === 0) parts.push('');
    else parts[parts.length - 1] += char;
    return parts;
  }, ['']);
}

function readRules(source) {
  const rules = [];
  source = source.replace(/\/\*[\s\S]*?\*\//g, '');
  function walk(start, end, context = { media: [], layer: null }) {
    let head = start;
    let quote = '';
    let parens = 0;
    for (let i = start; i < end; i++) {
      const char = source[i];
      if (char === '\\') { i++; continue; }
      if (quote) { if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '(') parens++;
      if (char === ')') parens--;
      if (parens) continue;
      if (char === ';') { head = i + 1; continue; }
      if (char !== '{') continue;
      const selector = source.slice(head, i).trim();
      let close = i + 1;
      let depth = 1;
      let innerQuote = '';
      for (; close < end && depth; close++) {
        const next = source[close];
        if (next === '\\') { close++; continue; }
        if (innerQuote) { if (next === innerQuote) innerQuote = ''; continue; }
        if (next === '"' || next === "'") { innerQuote = next; continue; }
        if (next === '{') depth++;
        if (next === '}') depth--;
      }
      assert.equal(depth, 0, `Unclosed CSS block: ${selector}`);
      if (selector.startsWith('@media ')) {
        walk(i + 1, close - 1, { ...context, media: [...context.media, selector.slice(7).trim()] });
      } else if (selector.startsWith('@layer ')) {
        walk(i + 1, close - 1, { ...context, layer: selector.slice(7).trim() });
      } else if (!selector.startsWith('@') || selector === '@theme') {
        const declarations = source.slice(i + 1, close - 1).split(';').filter(s => s.includes(':')).map(s => {
          const colon = s.indexOf(':');
          const value = s.slice(colon + 1).trim();
          return { property: s.slice(0, colon).trim(), value: value.replace(/\s*!important$/, ''), important: /!important$/.test(value) };
        });
        rules.push({ ...context, selector: selector === '@theme' ? ':root' : selector,
          layer: selector === '@theme' ? 'theme' : context.layer, declarations });
      }
      i = close - 1;
      head = close;
    }
  }
  walk(0, source.length);
  return rules;
}

function expandIs(selector) {
  const match = selector.match(/:is\(([^()]*)\)/);
  return match ? splitOutside(match[1], ',').flatMap(part => expandIs(selector.replace(match[0], part.trim()))) : [selector];
}

function specificity(selector) {
  // All supported selectors have no IDs; :is() takes its most specific branch.
  return Math.max(...expandIs(selector).map(part => {
    const classes = (part.match(/\.[\w\\/-]+|:[\w-]+/g) ?? []).length;
    const types = (part.replace(/\.[\w\\/-]+|:[\w-]+/g, '').match(/\b[a-z]+\b/g) ?? []).length;
    return classes * 100 + types;
  }));
}

function matches(selector, target) {
  return expandIs(selector).some(part => {
    part = part.replaceAll('\\/', '/').trim();
    if (part === ':root') return target.root;
    if (part === 'body') return target.tag === 'body';
    if (part === '*') return true;
    if (part.startsWith('.admin-dashboard ')) {
      if (!target.admin) return false;
      part = part.slice('.admin-dashboard '.length);
    } else if (part === '.admin-dashboard') {
      return target.classes.includes('admin-dashboard');
    } else if (!/^(?:\.(?:admin-panel|text-[\w/-]+)|(?:a|button):focus-visible)$/.test(part)) {
      return false; // Other page components cannot match these admin fixtures.
    }
    assert.match(part, /^(?:\.[\w/-]+|[a-z]+)(?::focus-visible)?$/, `Unsupported admin selector: ${selector}`);
    const focus = part.endsWith(':focus-visible');
    if (focus && !target.focus) return false;
    part = part.replace(':focus-visible', '');
    return part.startsWith('.') ? target.classes.includes(part.slice(1)) : target.tag === part;
  });
}

function active(rule, theme) {
  return rule.media.every(condition => {
    assert.match(condition, /^\(prefers-color-scheme: (light|dark)\)$/, `Unsupported contrast media: ${condition}`);
    return condition === `(prefers-color-scheme: ${theme})`;
  });
}

function cascade(rules, theme, target, property) {
  const layers = ['theme', 'base', 'components', 'utilities'];
  let winner;
  for (const rule of rules) {
    if (!rule.declarations.some(d => d.property === property || (property === 'outline-color' && d.property === 'outline') || (property === 'background-color' && d.property === 'background'))) continue;
    const selectors = splitOutside(rule.selector, ',').filter(selector => matches(selector.trim(), target));
    if (!selectors.length || !active(rule, theme)) continue;
    for (const declaration of rule.declarations) {
      let { value } = declaration;
      if (declaration.property !== property) {
        if (property === 'outline-color' && declaration.property === 'outline') {
          const outline = value.match(/^([\d.]+)px solid (.+)$/);
          assert.ok(outline && Number(outline[1]) > 0, `Unsupported/invisible focus outline: ${value}`);
          value = outline[2];
        } else if (!(property === 'background-color' && declaration.property === 'background')) continue;
      }
      const layer = rule.layer === null ? layers.length : layers.indexOf(rule.layer);
      assert.ok(layer >= 0, `Unsupported cascade layer: ${rule.layer}`);
      const rank = [Number(declaration.important), declaration.important ? -layer : layer, Math.max(...selectors.map(specificity))];
      const difference = winner ? rank.map((n, i) => n - winner.rank[i]).find(n => n !== 0) ?? 0 : 1;
      if (difference >= 0) winner = { value, rank };
    }
  }
  return winner?.value;
}

const element = (classes = [], tag = 'span', admin = true, focus = false) => ({ classes, tag, admin, focus, root: false });

function tokensFor(rules, theme) {
  const names = new Set(rules.flatMap(rule => rule.declarations.filter(d => d.property.startsWith('--color-')).map(d => d.property)));
  const root = { ...element([], 'html', false), root: true };
  return Object.fromEntries([...names].map(name => [name, cascade(rules, theme, root, name)]));
}

function resolve(value, tokens) {
  assert.equal(typeof value, 'string', 'Missing color declaration/token');
  return value.replace(/var\((--[\w-]+)\)/g, (_, name) => resolve(tokens[name], tokens));
}

function rgb(hex) {
  assert.match(hex, /^#[\da-f]{6}$/i, `Unsupported color (extend reader before accepting): ${hex}`);
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function contrast(foreground, background, alpha = 1) {
  const luminance = color => color.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const bg = rgb(background);
  const fg = rgb(foreground).map((c, i) => alpha * c + (1 - alpha) * bg[i]);
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function treatments(source, theme, surface) {
  const rules = readRules(source);
  const tokens = tokensFor(rules, theme);
  const target = surface === 'card' ? element(['admin-panel'], 'section') : element([], 'body', false);
  const background = resolve(cascade(rules, theme, target, 'background-color'), tokens);
  return {
    text(utility, admin = true) {
      const match = utility.match(/^text-([\w-]+)(?:\/(\d+))?$/);
      assert.ok(match, `Unsupported text utility: ${utility}`);
      const override = cascade(rules, theme, element([utility], 'span', admin), 'color');
      return contrast(resolve(override ?? `var(--color-${match[1]})`, tokens), background, override ? 1 : Number(match[2] ?? 100) / 100);
    },
    focus(tag) {
      const outline = cascade(rules, theme, element([], tag, true, true), 'outline-color');
      assert.ok(outline, `Missing focus indicator for ${tag}`);
      return contrast(resolve(outline === 'currentColor' ? 'var(--color-foreground)' : outline, tokens), background);
    },
  };
}

const textUtilities = [
  'text-muted-foreground', ...[50, 60, 70, 80, 90].map(alpha => `text-muted-foreground/${alpha}`),
  'text-foreground', 'text-foreground/80', 'text-emerald-400/90', 'text-rose-400/90', 'text-rose-300',
];

test('contrast math uses WCAG sRGB luminance and alpha compositing', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#ffffff', '#ffffff'), 1);
  assert.equal(contrast('#000000', '#ffffff', 0), 1);
  assert.ok(Math.abs(contrast('#000000', '#ffffff', 0.5) - 3.97665) < 0.00001);
});

test('tested treatments are used by the shipping dashboard, not an invented palette', () => {
  assert.match(css, /@import "tailwindcss"/);
  for (const utility of textUtilities) assert.ok(dashboard.includes(utility), `Missing dashboard treatment: ${utility}`);
  assert.match(dashboard, /className=[^\n]*admin-dashboard/);
  assert.match(dashboard, /admin-panel border border-border bg-card/);
});

for (const [name, theme] of [['Mocha', 'dark'], ['Latte', 'light']]) {
  for (const surface of ['card', 'background']) {
    const treatment = treatments(css, theme, surface);
    for (const utility of textUtilities) {
      test(`${name} admin ${utility} on ${surface} meets 4.5:1`, () => {
        const ratio = treatment.text(utility);
        assert.ok(ratio >= 4.5, `${name} ${utility} on ${surface}: ${ratio.toFixed(3)}:1 < 4.5:1`);
      });
    }
    for (const tag of ['button', 'a', 'summary', 'input']) {
      test(`${name} admin ${tag}:focus-visible on ${surface} meets 3:1`, () => {
        const ratio = treatment.focus(tag);
        assert.ok(ratio >= 3, `${name} ${tag} focus on ${surface}: ${ratio.toFixed(3)}:1 < 3:1`);
      });
    }
  }
}

test('cascade honors theme context, specificity, source order, layers and outline longhands', () => {
  const fixture = `${css}
    @layer base { .admin-dashboard .text-muted-foreground { color: #ffffff; } }
    @media (prefers-color-scheme: light) {
      .admin-dashboard :is(.text-muted-foreground, .text-rose-300) { color: #000000; }
      .text-muted-foreground { color: #ffffff; }
      .admin-dashboard .text-muted-foreground { color: #4c4f69; }
      .admin-dashboard :is(button, a, summary, input):focus-visible { outline-color: #000000; }
    }`;
  const rules = readRules(fixture);
  assert.equal(cascade(rules, 'light', element(['text-muted-foreground']), 'color'), '#4c4f69');
  assert.equal(cascade(rules, 'light', element(['text-rose-300']), 'color'), '#000000');
  assert.equal(cascade(rules, 'dark', element(['text-rose-300']), 'color'), undefined);
  assert.equal(cascade(rules, 'light', element([], 'input', true, true), 'outline-color'), '#000000');
  assert.equal(cascade(rules, 'light', element([], 'input', true, false), 'outline-color'), undefined);
  assert.equal(cascade(rules, 'light', element(['text-rose-300'], 'span', false), 'color'), undefined);
  assert.equal(cascade(readRules(`${fixture}\n.text-muted-foreground { color: #000000; }`), 'light', element(['text-muted-foreground'], 'span', false), 'color'), '#000000');
  assert.equal(cascade(readRules(`${fixture}\n.admin-dashboard .text-muted-foreground { color: #ffffff !important; }`), 'light', element(['text-muted-foreground']), 'color'), '#ffffff');
});

test('original Latte muted/status/focus regressions are detected without editing production', () => {
  // Remove only the light admin repairs, leaving the real theme tokens and
  // original dark/admin rules intact. No test-only "safe" colors replace them.
  const original = css.replace(/@media\s*\(prefers-color-scheme:\s*light\)\s*\{\s*\.admin-dashboard[\s\S]*?\n\}/, '');
  assert.notEqual(original, css, 'Expected the snapshot light admin repair block');
  for (const surface of ['card', 'background']) {
    const broken = treatments(original, 'light', surface);
    for (const utility of ['text-muted-foreground', 'text-muted-foreground/60', 'text-foreground/80', 'text-emerald-400/90', 'text-rose-400/90', 'text-rose-300']) {
      assert.ok(broken.text(utility) < 4.5, `Original Latte ${utility} on ${surface} must expose the regression`);
    }
    for (const tag of ['button', 'a', 'summary', 'input']) assert.ok(broken.focus(tag) < 3, `Original Latte ${tag} focus on ${surface} must expose the regression`);
  }
});
