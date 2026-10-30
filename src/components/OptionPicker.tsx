import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createFilter } from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck, faMagnifyingGlass, faTimes } from '@fortawesome/free-solid-svg-icons';
import type { SelectOption } from './AdaptiveSelect';
import '../styles/option-picker.css';

interface OptionPickerProps {
    id: string;
    title: string;
    placeholder: string;
    options: SelectOption[];
    value: string;
    initialQuery?: string;
    onSelect: (option: SelectOption) => void;
    onCancel: () => void;
}

const matches = createFilter<SelectOption>({ ignoreAccents: true, ignoreCase: true });

export function OptionPicker({ id, title, placeholder, options, value, initialQuery = '', onSelect, onCancel }: OptionPickerProps) {
    const [query, setQuery] = useState(initialQuery);
    const [activeIndex, setActiveIndex] = useState(0);
    const search = useRef<HTMLInputElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const results = useMemo(() => options.filter(option => matches({ ...option, data: option }, query)), [options, query]);
    const listId = `${id}-results`;

    useLayoutEffect(() => { search.current?.focus({ preventScroll: true }); }, []);
    useEffect(() => {
        const row = document.getElementById(`${id}-option-${activeIndex}`);
        if (!row || !list.current) return;
        const rowBounds = row.getBoundingClientRect();
        const listBounds = list.current.getBoundingClientRect();
        if (rowBounds.bottom > listBounds.bottom) list.current.scrollTop += rowBounds.bottom - listBounds.bottom;
        if (rowBounds.top < listBounds.top) list.current.scrollTop -= listBounds.top - rowBounds.top;
    }, [activeIndex, id, results]);

    const choose = (option: SelectOption) => {
        search.current?.blur();
        onSelect(option);
    };
    const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
        }
        if (event.key === 'Tab') {
            const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input')).filter(node => node.tabIndex >= 0);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
    };

    return (
        <div className="option-picker" onKeyDown={handleKeys}>
            <header className="option-picker-header">
                <button type="button" className="option-picker-icon-button" aria-label="Volver" title="Volver" onClick={onCancel}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                </button>
                <h3>{title}</h3>
            </header>
            <div className="option-picker-search">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <input
                    ref={search}
                    id={id}
                    className="browser-default option-picker-input"
                    type="search"
                    value={query}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-activedescendant={results[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={event => { setQuery(event.target.value); setActiveIndex(0); }}
                    onKeyDown={event => {
                        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                            event.preventDefault();
                            setActiveIndex(index => Math.max(0, Math.min(results.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
                        }
                        if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex]); }
                    }}
                />
                {query && (
                    <button type="button" className="option-picker-icon-button" aria-label="Limpiar busqueda" title="Limpiar busqueda" onClick={() => { setQuery(''); setActiveIndex(0); search.current?.focus({ preventScroll: true }); }}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                )}
            </div>
            <div ref={list} id={listId} className="option-picker-results" role="listbox" aria-label={title}>
                {results.map((option, index) => (
                    <button
                        key={option.value}
                        id={`${id}-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={option.value === value}
                        tabIndex={-1}
                        className={`option-picker-result${index === activeIndex ? ' option-picker-result--active' : ''}`}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => choose(option)}
                    >
                        <span>{option.label}</span>
                        {option.value === value && <FontAwesomeIcon icon={faCheck} />}
                    </button>
                ))}
                {!results.length && <p className="option-picker-empty" role="status">Sin resultados</p>}
            </div>
        </div>
    );
}
