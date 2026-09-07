import React, { useState } from 'react';
import axios from 'axios';
import Select, { StylesConfig } from 'react-select';
import makeAnimated from 'react-select/animated';
import logger from '../utils/logger.ts';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { DateTime } from 'luxon';
import { forwardRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import '../styles/MultipleBookingForm.css';
import { useAuth } from './useAuth.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDateInput = forwardRef(({ onClick }: any, ref: any) => (
    <div className="mbf-date-input" onClick={onClick} ref={ref}>
        <span className="mbf-date-input-text">Seleccionar fecha</span>
        <FontAwesomeIcon icon={faCalendarAlt} className="mbf-date-input-icon" />
    </div>
));

const animatedComponents = makeAnimated();

type SelectOption = { value: string; label: string };

const customSelectStylesSingle: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        minHeight: '52px',
        borderRadius: '14px',
        border: state.isFocused ? '1px solid rgba(125, 211, 252, 0.42)' : '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(125, 211, 252, 0.12)' : 'none',
        background: 'rgba(255, 255, 255, 0.06)',
        '&:hover': { borderColor: 'rgba(125, 211, 252, 0.3)' },
        fontSize: '0.95rem',
        color: 'var(--ctq-text)',
    }),
    singleValue: (base) => ({
        ...base,
        color: 'var(--ctq-text)',
        fontWeight: 600,
    }),
    placeholder: (base) => ({
        ...base,
        color: 'var(--ctq-text-muted)',
    }),
    input: (base) => ({
        ...base,
        color: 'var(--ctq-text)',
    }),
    indicatorSeparator: (base) => ({
        ...base,
        backgroundColor: 'rgba(148, 163, 184, 0.16)',
    }),
    dropdownIndicator: (base, state) => ({
        ...base,
        color: state.isFocused ? 'var(--ctq-accent)' : 'rgba(148, 163, 184, 0.9)',
        '&:hover': { color: 'var(--ctq-accent)' },
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({
        ...base,
        borderRadius: '14px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(17, 37, 68, 0.98) 0%, rgba(10, 27, 51, 0.99) 100%)',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        boxShadow: '0 22px 40px rgba(4, 10, 22, 0.28)',
    }),
    menuList: (base) => ({
        ...base,
        padding: '6px',
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
            ? 'rgba(244, 232, 90, 0.95)'
            : state.isFocused
                ? 'rgba(125, 211, 252, 0.14)'
                : 'transparent',
        color: state.isSelected ? '#0f172a' : 'var(--ctq-text)',
        fontSize: '0.92rem',
        borderRadius: '10px',
        fontWeight: state.isSelected ? 800 : 600,
        cursor: 'pointer',
    }),
};

// ── Checkbox pill helper ────────────────────────────────────
interface CheckboxPillProps {
    label: string;
    checked: boolean;
    onChange: () => void;
    selectAll?: boolean;
}
const CheckboxPill: React.FC<CheckboxPillProps> = ({ label, checked, onChange, selectAll }) => (
    <span
        className={`mbf-checkbox-pill${selectAll ? ' mbf-checkbox-pill--selectall' : ''}${checked ? ' mbf-checkbox-pill--active' : ''}`}
        onClick={onChange}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => e.key === ' ' && onChange()}
    >
        {checked && <span className="mbf-checkbox-tick">✓</span>}
        {label}
    </span>
);

const MultipleBookingForm: React.FC = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const isProfessor = user?.role === 'profesor';
    const professorName = user?.name?.trim() || '';
    const professorMotive = professorName ? `Clases - ${professorName}` : '';

    const [courts, setCourts] = useState<string[]>([]);
    const [dates, setDates] = useState<string[]>([]);
    const [turns, setTurns] = useState<string[]>([]);
    const [motive, setMotive] = useState<string>('');
    const [motiveDetail, setMotiveDetail] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const availableCourts = ['Cancha 1', 'Cancha 2', 'Cancha 3'];
    const availableTurns = [
        '08:15-10:00', '10:15-12:00', '12:15-14:00',
        '14:15-16:00', '16:15-18:00', '18:15-20:00',
        '20:15-22:00', '22:15-00:00',
    ];
    const availableMotives = isProfessor
        ? professorMotive ? [professorMotive] : []
        : ['Campeonato', 'Clases', 'Mantencion', 'Clima', 'Reserva'];
    const normalizedMotiveDetail = motiveDetail.trim();
    const effectiveMotive = isProfessor
        ? professorMotive
        : [motive, normalizedMotiveDetail].filter(Boolean).join(' - ');

    const amTurns   = availableTurns.filter(t => { const [s] = t.split('-'); return s >= '08:15' && s <= '14:00'; });
    const pmTurns   = availableTurns.filter(t => { const [s] = t.split('-'); return s >= '14:15' && s <= '20:00'; });
    const nightTurns = availableTurns.filter(t => { const [s] = t.split('-'); return s >= '20:15'; });

    const formatOptions = (options: string[]): SelectOption[] =>
        options.map(opt => ({ value: opt, label: opt }));

    const apiUrl = import.meta.env.VITE_API_URL;

    const total = courts.length * dates.length * turns.length;

    // ── Court helpers ─────────────────────────────────────────
    const toggleCourt = (court: string) => {
        setCourts(prev =>
            prev.includes(court) ? prev.filter(c => c !== court) : [...prev, court]
        );
    };
    // ── Turn helpers ──────────────────────────────────────────
    const toggleTurn = (turn: string) => {
        setTurns(prev =>
            prev.includes(turn) ? prev.filter(t => t !== turn) : [...prev, turn]
        );
    };
    const allTurnsSelected = turns.length === availableTurns.length;
    const toggleAllTurns = () => setTurns(allTurnsSelected ? [] : [...availableTurns]);

    // ── Reserve ───────────────────────────────────────────────
    const handleReserve = async () => {
        if (!token)
            return Swal.fire({ icon: 'warning', title: 'Sesión inválida', text: 'Vuelve a iniciar sesión para reservar.' });
        if (isProfessor && !professorName)
            return Swal.fire({ icon: 'warning', title: 'Profesor sin nombre', text: 'La cuenta debe tener un nombre asociado.' });
        if (!courts.length)
            return Swal.fire({ icon: 'warning', title: 'Sin canchas', text: 'Selecciona al menos una cancha.' });
        if (!dates.length)
            return Swal.fire({ icon: 'warning', title: 'Sin fechas', text: 'Selecciona al menos una fecha.' });
        if (!turns.length)
            return Swal.fire({ icon: 'warning', title: 'Sin turnos', text: 'Selecciona uno o más turnos.' });
        if (!effectiveMotive)
            return Swal.fire({ icon: 'warning', title: 'Sin motivo', text: 'Selecciona un motivo para la reserva.' });
        if (total > 100)
            return Swal.fire({ icon: 'warning', title: 'Demasiadas reservas', text: `Estás intentando crear ${total} reservas. Reduce la selección.` });

        setIsLoading(true);
        const payload = { courts, dates, turns, motive: effectiveMotive };
        try {
            logger.debug(payload);
            await axios.post(`${apiUrl}/booking/multiple`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            await Swal.fire({ icon: 'success', title: 'Reservas creadas', text: '¡Las reservas fueron creadas exitosamente!', confirmButtonColor: '#3085d6' });
            setCourts([]);
            setDates([]);
            setTurns([]);
            setMotive('');
            setMotiveDetail('');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al crear las reservas.', confirmButtonColor: '#d33' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateSelect = (date: Date | null) => {
        if (!date) return;
        const selected = DateTime.fromJSDate(date).startOf('day');
        const today = DateTime.now().startOf('day');
        if (selected < today) {
            Swal.fire({ icon: 'info', title: 'Fecha inválida', text: 'No puedes seleccionar una fecha pasada.' });
            return;
        }
        const formatted = selected.toISODate();
        if (dates.includes(formatted as string)) return;
        if (dates.length >= 10) {
            Swal.fire({ icon: 'warning', title: 'Límite alcanzado', text: 'Solo puedes seleccionar hasta 10 fechas.' });
            return;
        }
        const sorted = [...dates, formatted].sort((a, b) =>
            DateTime.fromISO(a as string).toMillis() - DateTime.fromISO(b as string).toMillis()
        );
        setDates(sorted as string[]);
    };

    return (
        <div className="mbf-container">
            {/* Hero */}
            <div className="mbf-hero">
                <div className="mbf-hero-text">
                    <h2>Reserva Múltiple</h2>
                    <p>Crea reservas para varias canchas, fechas y turnos a la vez</p>
                </div>
                {total > 0 && (                    <span className="mbf-hero-badge">{total} reserva{total !== 1 ? 's' : ''}</span>
                )}
            </div>

            {/* Config card */}
            <div className="mbf-card">
                <p className="mbf-card-title">Configuración</p>

                {/* Canchas */}
                <div className="mbf-field">
                    <span className="mbf-label">Canchas</span>
                    <div className="mbf-checkbox-group mbf-courts-grid">
                        {availableCourts.map(court => (
                            <CheckboxPill
                                key={court}
                                label={court}
                                checked={courts.includes(court)}
                                onChange={() => toggleCourt(court)}
                            />
                        ))}
                    </div>
                </div>

                {/* Fechas */}
                <div className="mbf-field">
                    <span className="mbf-label">Fechas</span>
                    <DatePicker
                        onChange={handleDateSelect}
                        minDate={new Date()}
                        dateFormat="yyyy-MM-dd"
                        wrapperClassName="mbf-datepicker-wrapper"
                        customInput={<CustomDateInput />}
                    />
                    <p className="mbf-date-counter">{dates.length} / 10 fechas seleccionadas</p>
                    <div className="mbf-chips-container">
                        {dates.map((date) => (
                            <span
                                key={date}
                                className="mbf-chip"
                                onClick={() => setDates(dates.filter(d => d !== date))}
                            >
                                {date}
                                <span className="mbf-chip-close">×</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Turnos */}
                <div className="mbf-field">
                    <span className="mbf-label">Turnos</span>

                    <div className="mbf-turns-group">
                        <div className="mbf-checkbox-group">
                            <CheckboxPill
                                label="Todos los turnos"
                                checked={allTurnsSelected}
                                onChange={toggleAllTurns}
                                selectAll
                            />
                        </div>
                    </div>

                    {/* AM */}
                    <div className="mbf-turns-group">
                        <span className="mbf-turns-group-label">AM · 08:15–14:00</span>
                        <div className="mbf-checkbox-grid">
                            {amTurns.map(t => (
                                <CheckboxPill key={t} label={t} checked={turns.includes(t)} onChange={() => toggleTurn(t)} />
                            ))}
                        </div>
                    </div>

                    {/* PM */}
                    <div className="mbf-turns-group">
                        <span className="mbf-turns-group-label">PM · 14:15–20:00</span>
                        <div className="mbf-checkbox-grid">
                            {pmTurns.map(t => (
                                <CheckboxPill key={t} label={t} checked={turns.includes(t)} onChange={() => toggleTurn(t)} />
                            ))}
                        </div>
                    </div>

                    {/* Noche */}
                    <div className="mbf-turns-group">
                        <span className="mbf-turns-group-label">Noche · 20:15–00:00</span>
                        <div className="mbf-checkbox-grid">
                            {nightTurns.map(t => (
                                <CheckboxPill key={t} label={t} checked={turns.includes(t)} onChange={() => toggleTurn(t)} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Motivo */}
                <div className="mbf-field">
                    <span className="mbf-label">Motivo</span>
                    <Select<SelectOption, false>
                        components={animatedComponents}
                        options={formatOptions(availableMotives)}
                        value={motive ? { value: motive, label: motive } : isProfessor && effectiveMotive
                            ? { value: effectiveMotive, label: effectiveMotive }
                            : null}
                        onChange={(selected) => {
                            setMotive(selected?.value || '');
                            setMotiveDetail('');
                        }}
                        isDisabled={isProfessor}
                        menuPortalTarget={document.body}
                        styles={customSelectStylesSingle}
                        placeholder="Selecciona un motivo..."
                    />
                    {!isProfessor && motive && (
                        <div className="mbf-motive-detail">
                            <label className="mbf-label" htmlFor="motive-detail">
                                Detalle del motivo <span className="mbf-label-optional">(opcional)</span>
                            </label>
                            <input
                                id="motive-detail"
                                className="mbf-text-input"
                                type="text"
                                value={motiveDetail}
                                maxLength={80}
                                onChange={(event) => setMotiveDetail(event.target.value)}
                                placeholder="Ej.: A. Silva vs J. Millar"
                                autoComplete="off"
                            />
                            <div className="mbf-motive-meta">
                                <span>Se guardará como: <strong>{effectiveMotive}</strong></span>
                                <span>{motiveDetail.length}/80</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="mbf-actions">
                <button type="button" className="mbf-btn-cancel" onClick={() => navigate('/dashboard')}>
                    Cancelar
                </button>
                <button type="button" className="mbf-btn-submit" onClick={handleReserve} disabled={isLoading}>
                    {isLoading ? (
                        <><FontAwesomeIcon icon={faSpinner} spin /> Reservando...</>
                    ) : (
                        'Reservar'
                    )}
                </button>
            </div>
        </div>
    );
};

export default MultipleBookingForm;
