import React, { useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import logger from '../utils/logger.ts';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { DateTime } from 'luxon';
import { forwardRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDateInput = forwardRef(({ onClick }: any, ref: any) => (
    <div
        onClick={onClick}
        ref={ref}
        style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '0 12px',
            width: '350px',
            minHeight: '44px', // 👈 igual que el Select
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#fff',
            boxSizing: 'border-box',
        }}
    >
    <span style={{ flex: 1, fontSize: '16px', color: '#333' }}>
      Seleccionar fecha
    </span>
        <i className="material-icons" style={{ marginLeft: '2rem', color: '#555' }}>
            calendar_today
        </i>
    </div>
));

const animatedComponents = makeAnimated();

const MultipleBookingForm: React.FC = () => {
    const navigate = useNavigate();

    const [courts, setCourts] = useState<string[]>([]);
    const [dates, setDates] = useState<string[]>([]);
    const [turns, setTurns] = useState<string[]>([]);
    const [motive, setMotive] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const availableCourts = ['Cancha 1', 'Cancha 2', 'Cancha 3'];
    const availableTurns = [
        '08:15-10:00', '10:15-12:00', '12:15-14:00',
        '14:15-16:00', '16:15-18:00', '18:15-20:00', '20:15-22:00'
    ];
    const availableMotives = ['Campeonato', 'Clases', 'Mantenimiento', 'Clima', 'Reserva'];

    const apiUrl = import.meta.env.VITE_API_URL;

    const formatOptions = (options: string[]) =>
        options.map(opt => ({ value: opt, label: opt }));

    const handleReserve = async () => {
        if (!courts.length) {
            return Swal.fire({ icon: 'warning', title: 'Sin canchas', text: 'Selecciona al menos una cancha.' });
        }
        if (!dates.length) {
            return Swal.fire({ icon: 'warning', title: 'Sin fechas', text: 'Selecciona al menos una fecha.' });
        }
        if (!turns.length) {
            return Swal.fire({ icon: 'warning', title: 'Sin turnos', text: 'Selecciona uno o más turnos.' });
        }
        if (!motive) {
            return Swal.fire({ icon: 'warning', title: 'Sin motivo', text: 'Selecciona un motivo para la reserva.' });
        }

        const total = courts.length * dates.length * turns.length;
        if (total > 100) {
            return Swal.fire({
                icon: 'warning',
                title: 'Demasiadas reservas',
                text: `Estás intentando crear ${total} reservas. Reduce la selección.`,
            });
        }

        setIsLoading(true);
        const payload = { courts, dates, turns, motive };

        try {
            logger.debug(payload);
            await axios.post(`${apiUrl}/booking/multiple`, payload);

            await Swal.fire({
                icon: 'success',
                title: 'Reservas creadas',
                text: '¡Las reservas fueron creadas exitosamente!',
                confirmButtonColor: '#3085d6',
            });

            setCourts([]);
            setDates([]);
            setTurns([]);
            setMotive([]);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al crear las reservas.',
                confirmButtonColor: '#d33'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateSelect = (date: Date | null) => {
        if (!date) return;

        const selected = DateTime.fromJSDate(date).startOf('day');
        const today = DateTime.now().startOf('day');

        if (selected < today) {
            Swal.fire({
                icon: 'info',
                title: 'Fecha inválida',
                text: 'No puedes seleccionar una fecha pasada.',
            });
            return;
        }

        const formatted = selected.toISODate();
        if (dates.includes(formatted as string)) return;

        if (dates.length >= 10) {
            Swal.fire({
                icon: 'warning',
                title: 'Límite alcanzado',
                text: 'Solo puedes seleccionar hasta 10 fechas.',
            });
            return;
        }

        const updatedDates = [...dates, formatted];
        const sorted = updatedDates.sort((a, b) =>
            DateTime.fromISO(a as string).toMillis() - DateTime.fromISO(b as string).toMillis()
        );

        setDates(sorted as string[]);
    };


    const handleBackToDashboard = () => navigate('/dashboard');

    return (
        <div className="container" style={{ maxWidth: 600 }}>
            <form style={{ fontSize: '16px' }}>
                {/* Canchas */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="active">Selecciona Canchas</label>
                    <Select
                        isMulti
                        components={animatedComponents}
                        options={formatOptions(availableCourts)}
                        value={formatOptions(courts)}
                        onChange={(selected) => setCourts(selected.map(s => s.value))}
                        menuPortalTarget={document.body}
                        styles={{
                            control: base => ({ ...base, minHeight: '44px' }),
                            menuPortal: base => ({ ...base, zIndex: 9999 }),
                        }}
                    />
                </div>

                {/* Fechas */}
                <div style={{ marginBottom: '1.5rem', width:'100%' }}>
                    <DatePicker
                        onChange={handleDateSelect}
                        minDate={new Date()}
                        dateFormat="yyyy-MM-dd"
                        wrapperClassName="date-picker-wrapper"
                        customInput={<CustomDateInput />}
                    />

                    <p style={{ fontSize: '14px', marginTop: '0.5rem' }}>
                        {dates.length} / 10 fechas seleccionadas
                    </p>

                    {/* Chips de fechas */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            marginTop: '0.5rem',
                            minHeight: '48px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '6px',
                            border: '1px solid #ccc',
                            maxHeight: '300px',
                            overflowY: 'auto',
                        }}
                    >
                        {dates.map((date) => (
                            <span
                                key={date}
                                className="chip"
                                onClick={() => {
                                    const updated = dates.filter(d => d !== date);
                                    setDates(updated);
                                }}
                                style={{ cursor: 'pointer', fontSize: '14px' }}
                            >
                                {date} <i className="close material-icons">close</i>
                            </span>
                        ))}
                    </div>
                </div>


                {/* Turnos */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="active">Selecciona Turnos</label>
                    <Select
                        isMulti
                        components={animatedComponents}
                        options={formatOptions(availableTurns)}
                        value={formatOptions(turns)}
                        onChange={(selected) => setTurns(selected.map(s => s.value))}
                        menuPortalTarget={document.body}
                        styles={{
                            control: base => ({ ...base, minHeight: '44px' }),
                            menuPortal: base => ({ ...base, zIndex: 9999 })
                        }}
                    />
                </div>

                {/* Motivo */}
                <div style={{ marginBottom: '2rem' }}>
                    <label className="active">Motivo</label>
                    <Select
                        components={animatedComponents}
                        options={formatOptions(availableMotives)}
                        value={motive ? { value: motive, label: motive } : null}
                        onChange={(selected) => setMotive(selected?.value || '')}
                        menuPortalTarget={document.body}
                        styles={{
                            control: base => ({ ...base, minHeight: '44px' }),
                            menuPortal: base => ({ ...base, zIndex: 9999 })
                        }}
                    />
                </div>
            </form>

            {/* Botones */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    marginTop: '1.5rem',
                }}
            >
                <button
                    type="button"
                    className="btn waves-effect waves-light blue darken-4"
                    onClick={handleReserve}
                    disabled={isLoading}
                    style={{ minWidth: '140px' }}
                >
                    {isLoading ? (
                        <>
                            <i className="material-icons left">hourglass_empty</i> Reservando...
                        </>
                    ) : (
                        'Reservar'
                    )}
                </button>

                <button
                    type="button"
                    className="btn waves-effect waves-light blue darken-1"
                    onClick={handleBackToDashboard}
                    style={{ minWidth: '140px' }}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default MultipleBookingForm;
