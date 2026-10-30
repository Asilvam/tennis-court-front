import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const compiled = await build({
    entryPoints: [
        fileURLToPath(
            new URL('../src/utils/categoryEditor.ts', import.meta.url),
        ),
    ],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
});
const { categoryDraftChanged, categorySavePayload, createCategoryDraft } =
    await import(
        `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`
    );

const data = {
    player: {
        email: 'member@test.invalid',
        name: 'Socio Prueba',
        active: true,
    },
    revision: 'a'.repeat(64),
    categories: [
        { category: '2', points: 180, isActive: true },
        { category: '1', points: 90, isActive: false },
        { category: 'Dobles', points: 30, isActive: true },
    ],
};
test('loads one principal and additional categories without pending edits', () => {
    const draft = createCategoryDraft(data.categories);
    assert.deepEqual(draft.activeCategories, ['2', 'Dobles']);
    assert.equal(categoryDraftChanged(data.categories, draft), false);
});
test('switching category does not transfer or reset points', () => {
    const draft = { activeCategories: ['1', 'Dobles'], pointInputs: {} };
    assert.equal(categoryDraftChanged(data.categories, draft), true);
    assert.deepEqual(categorySavePayload(data, draft), {
        revision: data.revision,
        activeCategories: ['1', 'Dobles'],
        pointAdjustments: [],
    });
    assert.equal(data.categories[0].points, 180);
});
test('sends only explicit points adjustments, including zero', () => {
    assert.deepEqual(
        categorySavePayload(data, {
            activeCategories: [],
            pointInputs: { 2: '0', 1: '90' },
        }).pointAdjustments,
        [{ category: '2', points: 0 }],
    );
});
test('rejects invalid numeric input, even when adjustment section is closed', () => {
    for (const value of ['', '-1', '1.5', 'NaN', '1e3', '9007199254740992']) {
        assert.throws(() =>
            categorySavePayload(data, {
                activeCategories: ['2'],
                pointInputs: { 2: value },
            }),
        );
    }
});
test('resolving old multiple-principal data becomes an explicit pending change', () => {
    const rows = [
        { category: '1', points: 10, isActive: true },
        { category: '2', points: 20, isActive: true },
    ];
    const draft = createCategoryDraft(rows);
    assert.deepEqual(draft.activeCategories, ['1']);
    assert.equal(categoryDraftChanged(rows, draft), true);
});
test('unknown historical categories do not become edits or point adjustments', () => {
    const rows = [
        ...data.categories,
        { category: 'Legacy', points: 15, isActive: true },
    ];
    assert.equal(categoryDraftChanged(rows, createCategoryDraft(rows)), false);
});
