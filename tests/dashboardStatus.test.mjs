import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { build } from 'esbuild';

const source = await readFile(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('Dashboard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const helpers = ['getStatusCategory', 'getStatusEmoji', 'getCourtNotice', 'renderCourtName', 'renderCourtStatus'];
const declarations = ast.statements.filter(statement => ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.some(declaration => helpers.includes(declaration.name.getText(ast))));
assert.equal(declarations.length, helpers.length);
const result = await build({ stdin: { contents: declarations.map(statement => statement.getText(ast)).join('\n') + '\nexport { renderCourtStatus, getCourtNotice, renderCourtName };', loader: 'tsx', resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', jsx: 'automatic', plugins: [{ name: 'jsx-fixture', setup(builder) {
    builder.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: 'jsx', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: "export const Fragment='Fragment';export const jsx=(type,props)=>({type,props});export const jsxs=jsx;", loader: 'js' }));
  } }] });
const { renderCourtStatus, getCourtNotice, renderCourtName } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : '';

test('long championship text is preserved without truncation or a player matchup', () => {
  const message = 'Campeonato - Finalísima Copa Davis Chile vs Nueva Zelanda';
  const tree = renderCourtStatus(message, true);
  const notice = getCourtNotice(message, true);
  assert.equal(`${notice.reason} - ${notice.detail}`, message);
  assert.equal(text(nodes(tree).find(node => node.props?.className === 'status-reason')), 'Campeonato');
  assert.equal(text(nodes(tree).find(node => node.props?.className === 'status-text')), 'Finalísima Copa Davis Chile vs Nueva Zelanda');
  assert.equal(nodes(tree).filter(node => node.props?.className === 'status-vs').length, 0);
});
test('blocked notices containing commas are never split into two or four players', () => {
  for (const message of ['Actividad del club, socios e invitados', 'Campeonato - Primera, Segunda, Tercera, Cuarta']) {
    const tree = renderCourtStatus(message, true);
    const notice = getCourtNotice(message, true);
    assert.equal(notice.reason ? `${notice.reason} - ${notice.detail}` : notice.detail, message);
    assert.equal(nodes(tree).filter(node => node.props?.className === 'status-player').length, 0);
  }
});
test('class notices retain their complete text and existing decorative icon', () => {
  const tree = renderCourtStatus('Clases - José Christian Ordenes Vegas, grupo avanzado');
  assert.equal(text(nodes(tree).find(node => node.props?.className === 'status-text')), 'José Christian Ordenes Vegas, grupo avanzado');
  assert.ok(nodes(tree).some(node => node.props?.['aria-hidden'] === 'true'));
});
test('doubles has two explicit teams with one player per line and an independent versus', () => {
  const players = ['V. Bugueño', 'J. Ordenes', 'M. Fonseca', 'V. Illesca'];
  const tree = renderCourtStatus(players.join(', '));
  const teams = nodes(tree).filter(node => node.props?.className === 'status-team');
  assert.equal(teams.length, 2);
  assert.deepEqual(teams.map(node => node.props['aria-label']), ['Team 1', 'Team 2']);
  assert.deepEqual(teams.map(node => nodes(node).filter(child => child.props?.className === 'status-player').map(text)), [players.slice(0, 2), players.slice(2)]);
  assert.equal(nodes(tree).filter(node => node.props?.className === 'status-vs').length, 1);
  assert.ok(!text(tree).includes('/'));
});
test('full doubles names are preserved in order, not shortened by the frontend', () => {
  const players = ['Alejandro Nombre Compuesto Apellido Largo', 'José Christian Ordenes Vegas', 'María Lourdes Oyarzun', 'Vicente ApellidoSinEspaciosMuyLargo'];
  assert.deepEqual(nodes(renderCourtStatus(players.join(', '))).filter(node => node.props?.className === 'status-player').map(text), players);
});
test('singles remains two players with a single versus and no team wrappers', () => {
  const tree = renderCourtStatus('J. Millar, B. Millar');
  assert.deepEqual(nodes(tree).filter(node => node.props?.className === 'status-player').map(text), ['J. Millar', 'B. Millar']);
  assert.equal(nodes(tree).filter(node => node.props?.className === 'status-team').length, 0);
});
test('non-match statuses remain literal, including unknown and empty strings', () => {
  for (const message of ['Pendiente de pago', '', 'Uno, Dos, Tres'])
    assert.ok(text(renderCourtStatus(message)).includes(message));
});

test('notice heading orders reason before emoji and does not repeat the prefix in its detail', () => {
  const tree = renderCourtStatus('Clases - José Christian Ordenes Vegas', true);
  const heading = nodes(tree).find(node => node.props?.className === 'status-notice-heading');
  assert.deepEqual(heading.props.children.map(node => node.props.className), ['status-reason', 'status-notice-emoji']);
  assert.equal(text(heading.props.children[0]), 'Clases');
  assert.equal(text(nodes(tree).find(node => node.props?.className === 'status-text')), 'José Christian Ordenes Vegas');
});
test('only the first reason separator is removed; detail hyphens and commas are preserved', () => {
  const notice = getCourtNotice('Campeonato - Final - Primera, Segunda', true);
  assert.equal(notice.reason, 'Campeonato');
  assert.equal(notice.detail, 'Final - Primera, Segunda');
  assert.ok(notice.emoji);
});
test('unknown notices keep literal text, and a reason without detail does not create an empty detail', () => {
  assert.deepEqual(getCourtNotice('Actividad especial, socios invitados', true), { reason: '', detail: 'Actividad especial, socios invitados', emoji: '' });
  assert.equal(getCourtNotice('J. Millar, B. Millar'), null);
  assert.equal(nodes(renderCourtStatus('Clases - ', true)).some(node => node.props?.className === 'status-text'), false);
  assert.ok(text(renderCourtStatus('Reserva en revisión')).includes('Reserva en revisión'));
});
test('all court labels retain the complete name as a single rotatable string', () => {
  for (const number of [1, 2, 3]) {
    const label = renderCourtName(`Cancha ${number}`);
    assert.equal(text(label), `Cancha ${number}`);
    assert.equal(text(nodes(label).find(node => node.props?.className === 'court-label')), `Cancha ${number}`);
    assert.equal(nodes(label).filter(node => ['court-word', 'court-number'].includes(node.props?.className)).length, 0);
  }
});
test('dashboard passes the backend notice flag to the renderer', () => {
  assert.match(source, /renderCourtStatus\(slot\.data, slot\.isBlockedByAdmin\)/);
});
