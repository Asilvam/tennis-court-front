import React, { useState } from 'react';
import axios from 'axios';
import 'materialize-css/dist/css/materialize.min.css';
import M from 'materialize-css';
import logger from "../utils/logger.ts";

const MultipleBookingForm: React.FC = () => {
    const [courts, setCourts] = useState<string[]>([]);
    const [dates, setDates] = useState<string[]>([]);
    const [turns, setTurns] = useState<string[]>([]);
    const [motive, setMotive] = useState<string>('');

    const availableCourts = ['Cancha 1', 'Cancha 2', 'Cancha 3'];
    const availableTurns = ['16:15-18:00', '18:15-20:00', '20:15-22:00'];

    const apiUrl = import.meta.env.VITE_API_URL;

    React.useEffect(() => {
        M.FormSelect.init(document.querySelectorAll('select'));
        M.Datepicker.init(document.querySelectorAll('.datepicker'), {
            format: 'yyyy-mm-dd',
            autoClose: true,
            onSelect: (date: Date) => {
                const formattedDate = date.toISOString().split('T')[0];
                if (!dates.includes(formattedDate)) {
                    setDates([...dates, formattedDate]);
                }
            },
        });
    }, [dates]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            courts,
            dates,
            turns,
            motive,
        };

        try {
            logger.log(payload);
            await axios.post(`${apiUrl}/booking/multiple`, payload);
            M.toast({ html: 'Reservas creadas exitosamente!', classes: 'green' });
        } catch (err) {
            M.toast({ html: 'Error al crear reservas', classes: 'red' });
        }
    };

    return (
        <div className="container">
            <h4>Crear Múltiples Reservas</h4>
            <form onSubmit={handleSubmit}>
                <div className="input-field">
                    <select multiple onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                        setCourts(selected);
                    }}>
                        <option disabled>Selecciona Canchas</option>
                        {availableCourts.map((court) => (
                            <option key={court} value={court}>{court}</option>
                        ))}
                    </select>
                    <label>Selecciona Canchas</label>
                </div>

                <div className="input-field">
                    <input type="text" className="datepicker" placeholder="Selecciona Fechas" />
                    <label>Fechas</label>
                    <div>
                        {dates.map((date, index) => (
                            <span key={index} className="chip">
                {date}
              </span>
                        ))}
                    </div>
                </div>

                <div className="input-field">
                    <select multiple onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                        setTurns(selected);
                    }}>
                        <option disabled>Selecciona Turnos</option>
                        {availableTurns.map((turn) => (
                            <option key={turn} value={turn}>{turn}</option>
                        ))}
                    </select>
                    <label>Turnos</label>
                </div>

                <div className="input-field">
                    <input
                        type="text"
                        value={motive}
                        onChange={(e) => setMotive(e.target.value)}
                        required
                    />
                    <label className={motive ? 'active' : ''}>Motivo</label>
                </div>

                <button className="btn waves-effect waves-light" type="submit">
                    Crear Reservas
                </button>
            </form>
        </div>
    );
};

export default MultipleBookingForm;
