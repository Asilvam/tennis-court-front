import { useEffect, useRef, useState } from 'react';
import Select, { type StylesConfig } from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import type { VisibleViewport } from '../hooks/useVisibleViewport';
import '../styles/option-picker.css';

export interface SelectOption {
    value: string;
    label: string;
}

interface AdaptiveSelectProps {
    inputId: string;
    label: string;
    options: SelectOption[];
    value: SelectOption | null;
    placeholder: string;
    viewport: VisibleViewport;
    onChange: (option: SelectOption | null) => void;
    onOpenPicker: (query: string) => void;
    isDisabled?: boolean;
    styles?: StylesConfig<SelectOption, false>;
    classNamePrefix?: string;
}

function needsPicker(viewport: VisibleViewport, optionCount: number, anchor?: DOMRect) {
    const touch = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    if (viewport.width <= 640) return true;
    if (!touch) return false;
    const requiredSpace = Math.min(optionCount, 3) * 48 + 16;
    const keyboardReducedViewport = window.innerHeight - viewport.height > 120;
    return viewport.width < 1000 || viewport.height < 600 || keyboardReducedViewport ||
        Boolean(anchor && viewport.top + viewport.height - anchor.bottom < requiredSpace);
}

export function AdaptiveSelect({
    inputId, label, options, value, placeholder, viewport, onChange, onOpenPicker,
    isDisabled = false, styles, classNamePrefix,
}: AdaptiveSelectProps) {
    const container = useRef<HTMLDivElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [query, setQuery] = useState('');
    const compact = needsPicker(viewport, options.length);

    // Keep the search when an iPad keyboard removes the room for a floating menu.
    useEffect(() => {
        if (!menuOpen || !needsPicker(viewport, options.length, container.current?.getBoundingClientRect())) return;
        setMenuOpen(false);
        setQuery('');
        onOpenPicker(query);
    }, [menuOpen, onOpenPicker, options.length, query, viewport]);

    return (
        <div ref={container} id={`${inputId}-trigger`} className="adaptive-select" tabIndex={-1}>
            {compact ? (
                <button
                    id={inputId}
                    type="button"
                    className={`adaptive-select-trigger${value ? '' : ' adaptive-select-trigger--empty'}`}
                    aria-label={label}
                    aria-haspopup="dialog"
                    disabled={isDisabled}
                    onClick={() => onOpenPicker('')}
                >
                    <span>{value?.label || placeholder}</span>
                    <FontAwesomeIcon icon={faChevronDown} />
                </button>
            ) : (
                <Select<SelectOption, false>
                    inputId={inputId}
                    aria-label={label}
                    value={value}
                    options={options}
                    placeholder={placeholder}
                    isDisabled={isDisabled}
                    isSearchable
                    inputValue={query}
                    onInputChange={(next, action) => {
                        if (action.action === 'input-change') setQuery(next);
                    }}
                    onChange={option => { setQuery(''); onChange(option); }}
                    menuIsOpen={menuOpen}
                    onMenuOpen={() => setMenuOpen(true)}
                    onMenuClose={() => { setMenuOpen(false); setQuery(''); }}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    menuPlacement="auto"
                    maxMenuHeight={240}
                    styles={styles}
                    className="react-select-container"
                    classNamePrefix={classNamePrefix}
                />
            )}
        </div>
    );
}
