import { PlayerCategory } from '../constants/playerConstants.ts';

export interface CategoryRow {
    category: string;
    points: number;
    isActive: boolean;
}
export interface CategoryEditorData {
    player: { name: string; email: string; active: boolean };
    categories: CategoryRow[];
    revision: string;
}
export interface CategoryDraft {
    activeCategories: string[];
    pointInputs: Record<string, string>;
}
export const mainCategories = ['1', '2', '3', '4'];
export const additionalCategories = Object.values(PlayerCategory).filter(
    (category) => !mainCategories.includes(category),
);
export const categoryLabel = (category: string): string =>
    ({ '1': 'Primera', '2': 'Segunda', '3': 'Tercera', '4': 'Cuarta' })[
        category
    ] ?? category;

export function createCategoryDraft(rows: CategoryRow[]): CategoryDraft {
    const primary = mainCategories.find((category) =>
        rows.some((row) => row.category === category && row.isActive),
    );
    return {
        activeCategories: [
            ...(primary ? [primary] : []),
            ...additionalCategories.filter((category) =>
                rows.some((row) => row.category === category && row.isActive),
            ),
        ],
        pointInputs: {},
    };
}

export function categoryDraftChanged(
    rows: CategoryRow[],
    draft: CategoryDraft,
): boolean {
    const known = [...mainCategories, ...additionalCategories];
    const original = rows
        .filter((row) => row.isActive && known.includes(row.category))
        .map((row) => row.category)
        .sort();
    if (
        JSON.stringify(original) !==
        JSON.stringify([...draft.activeCategories].sort())
    )
        return true;
    return Object.entries(draft.pointInputs).some(
        ([category, value]) =>
            !/^\d+$/.test(value) ||
            Number(value) !==
                (rows.find((row) => row.category === category)?.points ?? 0),
    );
}

export function categorySavePayload(
    data: CategoryEditorData,
    draft: CategoryDraft,
) {
    const pointAdjustments = Object.entries(draft.pointInputs)
        .filter(
            ([category]) =>
                draft.activeCategories.includes(category) ||
                data.categories.some((row) => row.category === category),
        )
        .map(([category, value]) => {
            const points = Number(value);
            if (
                !/^\d+$/.test(value) ||
                !Number.isSafeInteger(points) ||
                points < 0
            )
                throw new Error(
                    `Ingresa puntos enteros no negativos para ${categoryLabel(category)}.`,
                );
            return { category, points };
        })
        .filter(
            (row) =>
                row.points !==
                (data.categories.find(
                    (original) => original.category === row.category,
                )?.points ?? 0),
        );
    return {
        revision: data.revision,
        activeCategories: draft.activeCategories,
        pointAdjustments,
    };
}
