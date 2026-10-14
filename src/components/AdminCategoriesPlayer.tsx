import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faCheck,
    faPen,
    faRotateRight,
    faSave,
} from '@fortawesome/free-solid-svg-icons';
import { LoadingSpinner } from './LoadingSpinner';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import {
    additionalCategories,
    categoryDraftChanged,
    categoryLabel,
    categorySavePayload,
    createCategoryDraft,
    mainCategories,
} from '../utils/categoryEditor';
import type {
    CategoryDraft,
    CategoryEditorData,
} from '../utils/categoryEditor';
import { useUnsavedCategoryChanges } from '../hooks/useUnsavedCategoryChanges';
import { useVisibleViewport } from '../hooks/useVisibleViewport';
import '../styles/MemberCategories.css';

function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
            return 'Tu sesión venció. Inicia sesión nuevamente.';
        if (error.response?.status === 403)
            return 'Solo un administrador puede modificar categorías.';
        const message = error.response?.data?.message;
        if (typeof message === 'string') return message;
        if (Array.isArray(message)) return message.join(' ');
    }
    return error instanceof Error && !axios.isAxiosError(error)
        ? error.message
        : 'No se pudo completar la solicitud. Intenta nuevamente.';
}

export default function AdminCategoriesPlayer() {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [params] = useSearchParams();
    const email = params.get('email');
    const navigate = useNavigate();
    const viewport = useVisibleViewport();
    const [data, setData] = useState<CategoryEditorData | null>(null);
    const [draft, setDraft] = useState<CategoryDraft>({
        activeCategories: [],
        pointInputs: {},
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [adjusting, setAdjusting] = useState(false);
    const [error, setError] = useState('');
    const [conflict, setConflict] = useState(false);
    const [saved, setSaved] = useState(false);
    const dirty = data ? categoryDraftChanged(data.categories, draft) : false;
    useUnsavedCategoryChanges(dirty, saving);

    const applyData = (next: CategoryEditorData) => {
        setData(next);
        setDraft(createCategoryDraft(next.categories));
        setConflict(false);
        setAdjusting(false);
    };
    const load = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            setError('');
            if (!email) {
                setError('Selecciona un socio desde administración.');
                setLoading(false);
                return;
            }
            try {
                const response = await axios.get<CategoryEditorData>(
                    `${apiUrl}/player-category-points/${encodeURIComponent(email)}/editor`,
                    {
                        headers: {
                            Authorization: `Bearer ${getTokenFromLocalStorage()}`,
                        },
                        signal,
                    },
                );
                if (!signal?.aborted) {
                    applyData(response.data);
                    setSaved(false);
                }
            } catch (failure) {
                if (!axios.isCancel(failure)) setError(errorMessage(failure));
            } finally {
                if (!signal?.aborted) setLoading(false);
            }
        },
        [apiUrl, email],
    );

    useEffect(() => {
        const controller = new AbortController();
        setData(null);
        setDraft({ activeCategories: [], pointInputs: {} });
        void load(controller.signal);
        return () => controller.abort();
    }, [load]);

    const changeActive = (category: string, active = true) => {
        setSaved(false);
        setDraft((previous) => {
            const next = new Set(previous.activeCategories);
            if (mainCategories.includes(category) || !category)
                mainCategories.forEach((value) => next.delete(value));
            if (category) {
                if (active) next.add(category);
                else next.delete(category);
            }
            const pointInputs = { ...previous.pointInputs };
            for (const key of Object.keys(pointInputs))
                if (
                    !next.has(key) &&
                    !data?.categories.some((row) => row.category === key)
                )
                    delete pointInputs[key];
            return { activeCategories: [...next], pointInputs };
        });
    };

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!data || saving || !dirty || conflict) return;
        setError('');
        try {
            const payload = categorySavePayload(data, draft);
            setSaving(true);
            const response = await axios.put<CategoryEditorData>(
                `${apiUrl}/player-category-points/${encodeURIComponent(data.player.email)}/assignments`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${getTokenFromLocalStorage()}`,
                    },
                },
            );
            applyData(response.data);
            setSaved(true);
        } catch (failure) {
            setConflict(
                axios.isAxiosError(failure) && failure.response?.status === 409,
            );
            setError(errorMessage(failure));
        } finally {
            setSaving(false);
        }
    };
    const reload = () => {
        if (
            !dirty ||
            window.confirm(
                'Se descartarán tus cambios pendientes al recargar. ¿Continuar?',
            )
        )
            void load();
    };
    const primary =
        draft.activeCategories.find((category) =>
            mainCategories.includes(category),
        ) ?? '';
    const points = (category: string) =>
        draft.pointInputs[category] ??
        String(
            data?.categories.find((row) => row.category === category)?.points ??
                0,
        );
    const inactive =
        data?.categories.filter(
            (row) => !draft.activeCategories.includes(row.category),
        ) ?? [];
    const pointCategories = [
        ...new Set([
            ...(data?.categories.map((row) => row.category) ?? []),
            ...draft.activeCategories,
        ]),
    ].filter((category) =>
        [...mainCategories, ...additionalCategories].includes(category),
    );

    return (
        <main
            className={`member-categories${viewport.height < 480 ? ' mc-compact' : ''}`}
            style={
                {
                    '--mc-available-height': `${viewport.height - (document.querySelector('.ctq-nav')?.getBoundingClientRect().height ?? 0)}px`,
                } as CSSProperties
            }
        >
            <header className="mc-header">
                <button
                    type="button"
                    className="mc-icon-button"
                    aria-label="Volver a socios"
                    title="Volver a socios"
                    disabled={saving}
                    onClick={() => navigate('/adminregister')}
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>
                <div>
                    <h1>Categorías del socio</h1>
                    {data && (
                        <p>
                            {data.player.name}
                            <span>{data.player.email}</span>
                        </p>
                    )}
                </div>
            </header>
            {loading ? (
                <div className="mc-loading">
                    <LoadingSpinner size={64} label="Cargando categorías" />
                </div>
            ) : (
                <>
                    {error && (
                        <div className="mc-message mc-error" role="alert">
                            <span>{error}</span>
                            {(conflict || !data) && email && (
                                <button
                                    type="button"
                                    onClick={reload}
                                    disabled={saving}
                                >
                                    <FontAwesomeIcon icon={faRotateRight} />{' '}
                                    Recargar datos
                                </button>
                            )}
                        </div>
                    )}
                    {saved && (
                        <div className="mc-message mc-success" role="status">
                            <FontAwesomeIcon icon={faCheck} /> Cambios guardados
                        </div>
                    )}
                    {data && (
                        <form onSubmit={save}>
                            <div className="mc-edit-scroll">
                                {!data.player.active && (
                                    <div className="mc-message mc-warning">
                                        Socio inactivo. Actívalo desde
                                        administración para modificar sus
                                        categorías.
                                    </div>
                                )}
                                {data.categories.filter(
                                    (row) =>
                                        mainCategories.includes(row.category) &&
                                        row.isActive,
                                ).length > 1 && (
                                    <div className="mc-message mc-warning">
                                        Hay más de una categoría principal
                                        activa. Selecciona la que corresponde
                                        antes de guardar.
                                    </div>
                                )}
                                <fieldset
                                    className="mc-form-fields"
                                    disabled={saving || !data.player.active}
                                >
                                    <div className="mc-groups">
                                        <fieldset className="mc-group">
                                            <legend>Categoría principal</legend>
                                            {[...mainCategories, ''].map(
                                                (category) => (
                                                    <label
                                                        className={`mc-choice${primary === category ? ' mc-choice-selected' : ''}`}
                                                        key={category || 'none'}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="main-category"
                                                            value={category}
                                                            checked={
                                                                primary ===
                                                                category
                                                            }
                                                            onChange={() =>
                                                                changeActive(
                                                                    category,
                                                                )
                                                            }
                                                        />
                                                        <span>
                                                            {category
                                                                ? categoryLabel(
                                                                      category,
                                                                  )
                                                                : 'Sin categoría'}
                                                        </span>
                                                        {category && (
                                                            <small>
                                                                {points(
                                                                    category,
                                                                )}{' '}
                                                                pts
                                                            </small>
                                                        )}
                                                    </label>
                                                ),
                                            )}
                                        </fieldset>
                                        <fieldset className="mc-group">
                                            <legend>
                                                Categorías adicionales
                                            </legend>
                                            {additionalCategories.map(
                                                (category) => (
                                                    <label
                                                        className={`mc-choice${draft.activeCategories.includes(category) ? ' mc-choice-selected' : ''}`}
                                                        key={category}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={draft.activeCategories.includes(
                                                                category,
                                                            )}
                                                            onChange={(event) =>
                                                                changeActive(
                                                                    category,
                                                                    event.target
                                                                        .checked,
                                                                )
                                                            }
                                                        />
                                                        <span>
                                                            {categoryLabel(
                                                                category,
                                                            )}
                                                        </span>
                                                        <small>
                                                            {points(category)}{' '}
                                                            pts
                                                        </small>
                                                    </label>
                                                ),
                                            )}
                                        </fieldset>
                                    </div>
                                    <section className="mc-points-section">
                                        <div className="mc-section-heading">
                                            <h2>Puntos de ranking</h2>
                                            <button
                                                type="button"
                                                aria-expanded={adjusting}
                                                onClick={() =>
                                                    setAdjusting(
                                                        (value) => !value,
                                                    )
                                                }
                                            >
                                                <FontAwesomeIcon icon={faPen} />{' '}
                                                {adjusting
                                                    ? 'Cerrar ajuste'
                                                    : 'Ajustar puntos'}
                                            </button>
                                        </div>
                                        {adjusting ? (
                                            <div className="mc-points-list">
                                                {pointCategories.length ? (
                                                    pointCategories.map(
                                                        (category) => (
                                                            <label
                                                                className="mc-point-row"
                                                                key={category}
                                                            >
                                                                <span>
                                                                    {categoryLabel(
                                                                        category,
                                                                    )}
                                                                    <small>
                                                                        {draft.activeCategories.includes(
                                                                            category,
                                                                        )
                                                                            ? 'Activa'
                                                                            : 'Inactiva'}
                                                                    </small>
                                                                </span>
                                                                <input
                                                                    className="browser-default"
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]+"
                                                                    required
                                                                    aria-label={`Puntos ${categoryLabel(category)}`}
                                                                    value={points(
                                                                        category,
                                                                    )}
                                                                    onChange={(
                                                                        event,
                                                                    ) => {
                                                                        setSaved(
                                                                            false,
                                                                        );
                                                                        setDraft(
                                                                            (
                                                                                previous,
                                                                            ) => ({
                                                                                ...previous,
                                                                                pointInputs:
                                                                                    {
                                                                                        ...previous.pointInputs,
                                                                                        [category]:
                                                                                            event
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                            }),
                                                                        );
                                                                    }}
                                                                />
                                                            </label>
                                                        ),
                                                    )
                                                ) : (
                                                    <p className="mc-empty">
                                                        Sin categorías asignadas
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="mc-ranking-list">
                                                {draft.activeCategories
                                                    .length ? (
                                                    draft.activeCategories.map(
                                                        (category) => (
                                                            <div key={category}>
                                                                <span>
                                                                    {categoryLabel(
                                                                        category,
                                                                    )}
                                                                </span>
                                                                <strong>
                                                                    {points(
                                                                        category,
                                                                    )}{' '}
                                                                    <small>
                                                                        pts
                                                                    </small>
                                                                </strong>
                                                            </div>
                                                        ),
                                                    )
                                                ) : (
                                                    <p className="mc-empty">
                                                        Sin categorías activas
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </section>
                                </fieldset>
                                {inactive.length > 0 && (
                                    <details className="mc-history">
                                        <summary>
                                            Categorías anteriores e inactivas (
                                            {inactive.length})
                                        </summary>
                                        {inactive.map((row) => (
                                            <div key={row.category}>
                                                <span>
                                                    {categoryLabel(
                                                        row.category,
                                                    )}
                                                </span>
                                                <strong>
                                                    {points(row.category)} pts
                                                </strong>
                                            </div>
                                        ))}
                                    </details>
                                )}
                            </div>
                            <footer className="mc-actions">
                                <span aria-live="polite">
                                    {saving
                                        ? 'Guardando…'
                                        : dirty
                                          ? 'Cambios sin guardar'
                                          : saved
                                            ? 'Guardado'
                                            : 'Sin cambios pendientes'}
                                </span>
                                <div>
                                    <button
                                        className="mc-cancel"
                                        type="button"
                                        disabled={saving}
                                        onClick={() =>
                                            navigate('/adminregister')
                                        }
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="mc-save"
                                        type="submit"
                                        disabled={
                                            !dirty ||
                                            saving ||
                                            conflict ||
                                            !data.player.active
                                        }
                                    >
                                        <FontAwesomeIcon icon={faSave} />{' '}
                                        {saving
                                            ? 'Guardando…'
                                            : 'Guardar cambios'}
                                    </button>
                                </div>
                            </footer>
                        </form>
                    )}
                </>
            )}
        </main>
    );
}
