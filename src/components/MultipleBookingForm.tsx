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
        minHeight: '46px',
        borderRadius: '12px',
        border: state.isFocused ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(29,78,216,0.15)' : 'none',
        '&:hover': { borderColor: '#94a3b8' },
        fontSize: '0.95rem',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '12px', overflow: 'hidden' }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#1565c0' : state.isFocused ? '#eff6ff' : '#fff',
        color: state.isSelected ? '#fff' : '#334155',
        fontSize: '0.92rem',
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

    const [courts, setCourts] = useState<string[]>([]);
    const [dates, setDates] = useState<string[]>([]);
    const [turns, setTurns] = useState<string[]>([]);
    const [motive, setMotive] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const availableCourts = ['Cancha 1', 'Cancha 2', 'Cancha 3'];
    const availableTurns = [
        '08:15-10:00', '10:15-12:00', '12:15-14:00',
        '14:15-16:00', '16:15-18:00', '18:15-20:00',
        '20:15-22:00', '22:15-00:00',
    ];
    const availableMotives = ['Campeonato', 'Clases', 'Mantencion', 'Clima', 'Reserva'];

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
        if (!courts.length)
            return Swal.fire({ icon: 'warning', title: 'Sin canchas', text: 'Selecciona al menos una cancha.' });
        if (!dates.length)
            return Swal.fire({ icon: 'warning', title: 'Sin fechas', text: 'Selecciona al menos una fecha.' });
        if (!turns.length)
            return Swal.fire({ icon: 'warning', title: 'Sin turnos', text: 'Selecciona uno o más turnos.' });
        if (!motive)
            return Swal.fire({ icon: 'warning', title: 'Sin motivo', text: 'Selecciona un motivo para la reserva.' });
        if (total > 100)
            return Swal.fire({ icon: 'warning', title: 'Demasiadas reservas', text: `Estás intentando crear ${total} reservas. Reduce la selección.` });

        setIsLoading(true);
        const payload = { courts, dates, turns, motive };
        try {
            logger.debug(payload);
            await axios.post(`${apiUrl}/booking/multiple`, payload);
            await Swal.fire({ icon: 'success', title: 'Reservas creadas', text: '¡Las reservas fueron creadas exitosamente!', confirmButtonColor: '#3085d6' });
            setCourts([]);
            setDates([]);
            setTurns([]);
            setMotive('');
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
                        <div className="mbf-checkbox-group">
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
                        value={motive ? { value: motive, label: motive } : null}
                        onChange={(selected) => setMotive(selected?.value || '')}
                        menuPortalTarget={document.body}
                        styles={customSelectStylesSingle}
                        placeholder="Selecciona un motivo..."
                    />
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
