import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import type { StylesConfig } from 'react-select';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { shift } from '@floating-ui/react';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import { DateTime } from 'luxon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import { LoadingSpinner } from './LoadingSpinner';
import { useAuth } from './useAuth.ts';
import { AdaptiveSelect, type SelectOption } from './AdaptiveSelect';
import { OptionPicker } from './OptionPicker';
import { useVisibleViewport } from '../hooks/useVisibleViewport';
import { useUnsavedEditorChanges } from '../hooks/useUnsavedCategoryChanges';
import '../styles/MultipleBookingForm.css';

const CustomDateInput = forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => (
    <button
        {...props}
        ref={ref}
        type="button"
        className="mbf-date-input"
        aria-label="Seleccionar fechas"
    >
        <span>Seleccionar fechas</span>
        <FontAwesomeIcon icon={faCalendarAlt} />
    </button>
));
CustomDateInput.displayName = 'MultiBookingDateInput';

const customSelectStylesSingle: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        minHeight: 48,
        borderRadius: 6,
        borderColor: state.isFocused ? 'var(--ctq-accent)' : 'var(--ctq-border-soft)',
        boxShadow: 'none',
        background: 'rgba(255, 255, 255, 0.06)',
        fontSize: 16,
        '&:hover': { borderColor: 'var(--ctq-accent)' },
    }),
    singleValue: (base) => ({ ...base, color: 'var(--ctq-text)' }),
    placeholder: (base) => ({ ...base, color: 'var(--ctq-text-muted)' }),
    input: (base) => ({ ...base, color: 'var(--ctq-text)', fontSize: 16 }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: 'var(--ctq-border-soft)' }),
    dropdownIndicator: (base) => ({ ...base, color: 'var(--ctq-accent)' }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({
        ...base,
        background: 'var(--ctq-accent-deep)',
        border: '1px solid var(--ctq-border-soft)',
        borderRadius: 6,
        overflow: 'hidden',
    }),
    option: (base, state) => ({
        ...base,
        minHeight: 44,
        fontSize: 16,
        backgroundColor: state.isSelected
            ? 'var(--ctq-yellow)'
            : state.isFocused
              ? 'rgba(125, 211, 252, 0.14)'
              : 'transparent',
        color: state.isSelected ? '#0f172a' : 'var(--ctq-text)',
    }),
};

interface CheckboxPillProps {
    label: string;
    checked: boolean;
    onChange: () => void;
    selectAll?: boolean;
}
const CheckboxPill = ({ label, checked, onChange, selectAll }: CheckboxPillProps) => (
    <label
        className={`mbf-checkbox-pill${selectAll ? ' mbf-checkbox-pill--selectall' : ''}${checked ? ' mbf-checkbox-pill--active' : ''}`}
    >
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span>{label}</span>
    </label>
);

const availableCourts = ['Cancha 1', 'Cancha 2', 'Cancha 3'];
const availableTurns = [
    '08:15-10:00',
    '10:15-12:00',
    '12:15-14:00',
    '14:15-16:00',
    '16:15-18:00',
    '18:15-20:00',
    '20:15-22:00',
    '22:15-00:00',
];
const turnGroups = [
    { label: 'AM', turns: availableTurns.slice(0, 3) },
    { label: 'PM', turns: availableTurns.slice(3, 6) },
    { label: 'Noche', turns: availableTurns.slice(6) },
];
const dateLabel = (date: string) => DateTime.fromISO(date).toFormat('dd/MM/yyyy');

const MultipleBookingForm: React.FC = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const isProfessor = user?.role === 'profesor';
    const professorName = user?.name?.trim() || '';
    const professorMotive = professorName ? `Clases - ${professorName}` : '';
    const [courts, setCourts] = useState<string[]>([]);
    const [dates, setDates] = useState<string[]>([]);
    const [turns, setTurns] = useState<string[]>([]);
    const [motive, setMotive] = useState('');
    const [motiveDetail, setMotiveDetail] = useState('');
    const [phase, setPhase] = useState<'confirming' | 'sending' | null>(null);
    const [motivePickerQuery, setMotivePickerQuery] = useState<string | null>(null);
    const submitting = useRef(false);
    const calendar = useRef<DatePicker>(null);
    const visibleViewport = useVisibleViewport();
    const pickingMotive = motivePickerQuery !== null;
    const isLoading = phase !== null;
    useUnsavedEditorChanges(false, isLoading);

    useEffect(() => {
        if (!pickingMotive) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [pickingMotive]);

    const closeMotivePicker = () => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setMotivePickerQuery(null);
        requestAnimationFrame(() =>
            document.getElementById('multibooking-motive-trigger')?.focus({ preventScroll: true }),
        );
    };
    const openMotivePicker = useCallback((query: string) => {
        calendar.current?.setOpen(false);
        setMotivePickerQuery(query);
    }, []);
    const availableMotives = isProfessor
        ? professorMotive
            ? [professorMotive]
            : []
        : ['Campeonato', 'Clases', 'Mantencion', 'Clima', 'Reserva'];
    const effectiveMotive = isProfessor
        ? professorMotive
        : [motive, motiveDetail.trim()].filter(Boolean).join(' - ');
    const total = courts.length * dates.length * turns.length;
    const allTurnsSelected = turns.length === availableTurns.length;
    const toggleCourt = (court: string) =>
        setCourts((previous) =>
            previous.includes(court)
                ? previous.filter((value) => value !== court)
                : [...previous, court],
        );
    const toggleTurn = (turn: string) =>
        setTurns((previous) =>
            previous.includes(turn)
                ? previous.filter((value) => value !== turn)
                : [...previous, turn],
        );
    const toggleAllTurns = () => setTurns(allTurnsSelected ? [] : [...availableTurns]);

    const handleReserve = async () => {
        if (submitting.current) return;
        submitting.current = true;
        try {
            const warning = !token
                ? ['Sesión inválida', 'Vuelve a iniciar sesión para reservar.']
                : isProfessor && !professorName
                  ? ['Profesor sin nombre', 'La cuenta debe tener un nombre asociado.']
                  : !courts.length
                    ? ['Sin canchas', 'Selecciona al menos una cancha.']
                    : !dates.length
                      ? ['Sin fechas', 'Selecciona al menos una fecha.']
                      : !turns.length
                        ? ['Sin turnos', 'Selecciona uno o más turnos.']
                        : !effectiveMotive
                          ? ['Sin motivo', 'Selecciona un motivo para la reserva.']
                          : total > 100
                            ? [
                                  'Demasiadas reservas',
                                  `Estás intentando crear ${total} reservas. Reduce la selección.`,
                              ]
                            : null;
            if (warning) {
                await Swal.fire({
                    icon: 'warning',
                    title: warning[0],
                    text: warning[1],
                    confirmButtonText: 'Aceptar',
                });
                return;
            }
            const payload = {
                courts: [...courts],
                dates: [...dates],
                turns: [...turns],
                motive: effectiveMotive,
            };
            setPhase('confirming');
            const answer = await Swal.fire({
                icon: 'question',
                title: 'Confirmar reservas',
                text: `${total} reservas. Canchas: ${payload.courts.join(', ')}. Fechas: ${payload.dates.map(dateLabel).join(', ')}. Turnos: ${payload.turns.join(', ')}. Motivo: ${payload.motive}.`,
                showCancelButton: true,
                confirmButtonText: `Crear ${total} reservas`,
                cancelButtonText: 'Revisar',
                focusCancel: true,
                allowOutsideClick: false,
            });
            if (!answer.isConfirmed) return;
            setPhase('sending');
            await axios.post(`${import.meta.env.VITE_API_URL}/booking/multiple`, payload, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30000,
            });
            setCourts([]);
            setDates([]);
            setTurns([]);
            setMotive('');
            setMotiveDetail('');
            await Swal.fire({
                icon: 'success',
                title: 'Reservas creadas',
                text: 'Las reservas fueron creadas exitosamente.',
                confirmButtonText: 'Aceptar',
            });
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) return;
            await Swal.fire({
                icon: 'error',
                title: 'No se pudo confirmar la operación',
                text: 'Revisa las reservas antes de volver a enviar. Se conservó tu selección.',
                confirmButtonText: 'Aceptar',
            });
        } finally {
            submitting.current = false;
            setPhase(null);
        }
    };

    const handleDatesChange = (selected: Date[] | null) => {
        if (isLoading) return;
        const next = selected || [];
        if (next.length > 10) {
            void Swal.fire({
                icon: 'warning',
                title: 'Límite alcanzado',
                text: 'Solo puedes seleccionar hasta 10 fechas.',
                confirmButtonText: 'Aceptar',
            });
            return;
        }
        const today = DateTime.now().startOf('day');
        const normalized = next.map((date) => DateTime.fromJSDate(date).startOf('day'));
        if (normalized.some((date) => !date.isValid || date < today)) {
            void Swal.fire({
                icon: 'info',
                title: 'Fecha inválida',
                text: 'No puedes seleccionar una fecha pasada.',
                confirmButtonText: 'Aceptar',
            });
            return;
        }
        setDates([...new Set(normalized.map((date) => date.toISODate()!))].sort());
    };

    return (
        <>
            <main
                className="mbf-container"
                aria-hidden={pickingMotive || undefined}
                aria-busy={isLoading}
            >
                <header className="mbf-hero">
                    <h1>Reserva múltiple</h1>
                    {total > 0 && (
                        <span className="mbf-hero-badge">
                            {total} reserva{total !== 1 ? 's' : ''}
                        </span>
                    )}
                </header>
                <fieldset className="mbf-fields" disabled={isLoading}>
                    <legend className="mbf-sr-only">Configuración de reservas</legend>
                    <div className="mbf-form-layout">
                        <section className="mbf-section" aria-labelledby="mbf-configuration-title">
                            <h2 id="mbf-configuration-title">Canchas y fechas</h2>
                            <div className="mbf-field">
                                <span className="mbf-label" id="mbf-courts-label">
                                    Canchas
                                </span>
                                <div
                                    className="mbf-courts-grid"
                                    role="group"
                                    aria-labelledby="mbf-courts-label"
                                >
                                    {availableCourts.map((court) => (
                                        <CheckboxPill
                                            key={court}
                                            label={court}
                                            checked={courts.includes(court)}
                                            onChange={() => toggleCourt(court)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="mbf-field">
                                <label className="mbf-label" htmlFor="multibooking-dates">
                                    Fechas
                                </label>
                                <DatePicker
                                    ref={calendar}
                                    id="multibooking-dates"
                                    locale={es}
                                    selectsMultiple
                                    selectedDates={dates.map((date) =>
                                        DateTime.fromISO(date).toJSDate(),
                                    )}
                                    onChange={handleDatesChange}
                                    minDate={new Date()}
                                    disabled={isLoading}
                                    dateFormat="dd/MM/yyyy"
                                    shouldCloseOnSelect={false}
                                    preventOpenOnFocus
                                    popperPlacement="bottom"
                                    popperModifiers={[shift({ padding: 8, crossAxis: true })]}
                                    previousMonthAriaLabel="Mes anterior"
                                    nextMonthAriaLabel="Mes siguiente"
                                    previousMonthButtonLabel="Mes anterior"
                                    nextMonthButtonLabel="Mes siguiente"
                                    chooseDayAriaLabelPrefix="Elegir"
                                    disabledDayAriaLabelPrefix="No disponible"
                                    calendarClassName="mbf-calendar"
                                    popperClassName="mbf-calendar-popper"
                                    wrapperClassName="mbf-datepicker-wrapper"
                                    customInput={<CustomDateInput />}
                                >
                                    <div className="mbf-calendar-actions">
                                        <button
                                            type="button"
                                            onClick={() => calendar.current?.setOpen(false)}
                                        >
                                            Listo
                                        </button>
                                    </div>
                                </DatePicker>
                                <p className="mbf-date-counter" aria-live="polite">
                                    {dates.length} / 10 fechas seleccionadas
                                </p>
                                <div className="mbf-chips-container">
                                    {dates.map((date) => (
                                        <button
                                            key={date}
                                            type="button"
                                            className="mbf-chip"
                                            aria-label={`Quitar fecha ${dateLabel(date)}`}
                                            title={`Quitar fecha ${dateLabel(date)}`}
                                            onClick={() => {
                                                setDates((previous) =>
                                                    previous.filter((value) => value !== date),
                                                );
                                                requestAnimationFrame(() =>
                                                    document
                                                        .getElementById('multibooking-dates')
                                                        ?.focus({ preventScroll: true }),
                                                );
                                            }}
                                        >
                                            <time dateTime={date}>{dateLabel(date)}</time>
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                        <section className="mbf-section" aria-labelledby="mbf-turns-title">
                            <h2 id="mbf-turns-title">Turnos y motivo</h2>
                            <div className="mbf-field">
                                <CheckboxPill
                                    label="Todos los turnos"
                                    checked={allTurnsSelected}
                                    onChange={toggleAllTurns}
                                    selectAll
                                />
                                {turnGroups.map((group) => (
                                    <div className="mbf-turns-group" key={group.label}>
                                        <span className="mbf-label" id={`mbf-turns-${group.label}`}>
                                            {group.label}
                                        </span>
                                        <div
                                            className="mbf-checkbox-grid"
                                            role="group"
                                            aria-labelledby={`mbf-turns-${group.label}`}
                                        >
                                            {group.turns.map((turn) => (
                                                <CheckboxPill
                                                    key={turn}
                                                    label={turn}
                                                    checked={turns.includes(turn)}
                                                    onChange={() => toggleTurn(turn)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mbf-field">
                                <span className="mbf-label">Motivo</span>
                                <AdaptiveSelect
                                    inputId="multibooking-motive"
                                    label="Motivo"
                                    viewport={visibleViewport}
                                    onOpenPicker={openMotivePicker}
                                    options={availableMotives.map((value) => ({
                                        value,
                                        label: value,
                                    }))}
                                    value={
                                        motive
                                            ? { value: motive, label: motive }
                                            : isProfessor && effectiveMotive
                                              ? { value: effectiveMotive, label: effectiveMotive }
                                              : null
                                    }
                                    onChange={(option) => {
                                        setMotive(option?.value || '');
                                        setMotiveDetail('');
                                    }}
                                    isDisabled={isProfessor || isLoading}
                                    styles={customSelectStylesSingle}
                                    placeholder="Selecciona un motivo..."
                                />
                                {!isProfessor && motive && (
                                    <div className="mbf-motive-detail">
                                        <label className="mbf-label" htmlFor="motive-detail">
                                            Detalle del motivo <span>(opcional)</span>
                                        </label>
                                        <input
                                            id="motive-detail"
                                            className="mbf-text-input browser-default"
                                            type="text"
                                            value={motiveDetail}
                                            maxLength={80}
                                            onChange={(event) =>
                                                setMotiveDetail(event.target.value)
                                            }
                                            placeholder="Ej.: A. Silva vs J. Millar"
                                            autoComplete="off"
                                        />
                                        <div className="mbf-motive-meta">
                                            <span>
                                                Motivo: <strong>{effectiveMotive}</strong>
                                            </span>
                                            <span>{motiveDetail.length}/80</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </fieldset>
                <section className="mbf-summary" aria-labelledby="mbf-summary-title">
                    <h2 id="mbf-summary-title">Resumen</h2>
                    <dl className="mbf-summary-grid">
                        <div>
                            <dt>Canchas</dt>
                            <dd>{courts.length}</dd>
                        </div>
                        <div>
                            <dt>Fechas</dt>
                            <dd>{dates.length}</dd>
                        </div>
                        <div>
                            <dt>Turnos</dt>
                            <dd>{turns.length}</dd>
                        </div>
                        <div className="mbf-summary-total">
                            <dt>Reservas</dt>
                            <dd aria-live="polite">{total}</dd>
                        </div>
                    </dl>
                    {total > 100 && (
                        <p className="mbf-summary-warning">Supera el límite de 100 reservas.</p>
                    )}
                    {effectiveMotive && <p className="mbf-summary-motive">{effectiveMotive}</p>}
                    <div className="mbf-actions">
                        <button
                            type="button"
                            className="mbf-btn-cancel"
                            disabled={isLoading}
                            onClick={() => navigate('/dashboard')}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="mbf-btn-submit"
                            disabled={isLoading}
                            onClick={() => void handleReserve()}
                        >
                            {phase === 'sending' ? (
                                <>
                                    <LoadingSpinner size={20} label="Reservando" /> Reservando...
                                </>
                            ) : phase === 'confirming' ? (
                                'Confirmando...'
                            ) : (
                                'Reservar'
                            )}
                        </button>
                    </div>
                </section>
            </main>
            {pickingMotive &&
                createPortal(
                    <div
                        className="responsive-picker-overlay"
                        style={{
                            top: visibleViewport.top,
                            left: visibleViewport.left,
                            width: visibleViewport.width,
                            height: visibleViewport.height,
                        }}
                        onClick={closeMotivePicker}
                    >
                        <div
                            className="responsive-picker-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Elegir motivo"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <OptionPicker
                                id="multibooking-motive-search"
                                title="Elegir motivo"
                                placeholder="Buscar motivo"
                                options={availableMotives.map((value) => ({ value, label: value }))}
                                value={motive}
                                initialQuery={motivePickerQuery ?? ''}
                                onSelect={(option) => {
                                    setMotive(option.value);
                                    setMotiveDetail('');
                                    closeMotivePicker();
                                }}
                                onCancel={closeMotivePicker}
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};

export default MultipleBookingForm;
