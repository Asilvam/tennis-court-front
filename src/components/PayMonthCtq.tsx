import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCreditCard,
    faUserCheck,
    faExclamationTriangle,
    faUser,
    faUsers,
    faCalendarAlt,
    faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { getUserInfoFromLocalStorage } from '../utils/userUtils.ts';
import { customStyles } from '../utils/customStyles.ts';
import AppLoader from './AppLoader';
import logger from '../utils/logger.ts';

interface PlayerOption {
    value: string; // email
    label: string; // name
}

interface RegisterUser {
    namePlayer: string;
    email: string;
    updatePayment: boolean;
}

const PayMonthCtq: React.FC = () => {
    const userInfo = getUserInfoFromLocalStorage();
    const payerEmail = userInfo?.email || '';
    const apiUrl = import.meta.env.VITE_API_URL;

    // Loading & state
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [payerStatus, setPayerStatus] = useState<boolean | null>(null);
    const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);
    
    // Form fields
    const [paymentType, setPaymentType] = useState<'Titular' | 'Familiar'>('Titular');
    const [monthToPay, setMonthToPay] = useState<string>('');
    const [selectedCarga, setSelectedCarga] = useState<PlayerOption | null>(null);

    // Dynamic month generator (MM-YYYY)
    const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        // Generate months: current and next 5 months
        const months = [];
        const date = new Date();
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        for (let i = 0; i < 6; i++) {
            const currentYear = date.getFullYear();
            const currentMonthIndex = date.getMonth();
            const monthStr = String(currentMonthIndex + 1).padStart(2, '0');
            const yearStr = String(currentYear);
            
            const value = `${monthStr}-${yearStr}`; // MM-YYYY
            const label = `${monthNames[currentMonthIndex]} ${currentYear}`;
            
            months.push({ value, label });
            
            // Advance 1 month
            date.setMonth(date.getMonth() + 1);
        }
        
        setAvailableMonths(months);
        setMonthToPay(months[0].value); // Default to current month

        const fetchData = async () => {
            try {
                // 1. Fetch payer profile to show payment status banner
                const profileRes = await axios.get(`${apiUrl}/register/profile/${payerEmail}`);
                setPayerStatus(profileRes.data.updatePayment);

                // 2. Fetch all registered users to select familiar/cargas
                const usersRes = await axios.get<RegisterUser[]>(`${apiUrl}/register`);
                const options = usersRes.data
                    .filter(u => u.email !== payerEmail) // Exclude oneself
                    .map(u => ({
                        value: u.email,
                        label: u.namePlayer,
                    }));
                setPlayerOptions(options);
            } catch (err) {
                logger.error('Error fetching billing data:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Red',
                    text: 'No se pudieron cargar los datos de facturación.',
                    confirmButtonColor: '#0d47a1',
                });
            } finally {
                setLoading(false);
            }
        };

        if (payerEmail) {
            fetchData();
        }
    }, [payerEmail, apiUrl]);

    const handlePaySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (paymentType === 'Familiar' && !selectedCarga) {
            Swal.fire({
                icon: 'warning',
                title: 'Selecciona un Familiar',
                text: 'Por favor selecciona la carga familiar para realizar el pago.',
                confirmButtonColor: '#0d47a1',
            });
            return;
        }

        const amount = paymentType === 'Titular' ? 18000 : 5000;
        const selectedMonthLabel = availableMonths.find(m => m.value === monthToPay)?.label || monthToPay;

        const confirmResult = await Swal.fire({
            title: 'Confirmar Pago',
            html: `
                <div class="left-align" style="font-size: 15px;">
                    <p><strong>Membresía:</strong> ${paymentType === 'Titular' ? 'Titular ($18.000)' : 'Carga Familiar ($5.000)'}</p>
                    <p><strong>Mes a Pagar:</strong> ${selectedMonthLabel}</p>
                    ${paymentType === 'Familiar' ? `<p><strong>Beneficiario:</strong> ${selectedCarga?.label}</p>` : ''}
                    <p class="center-align" style="font-weight: bold; margin-top: 15px; font-size: 16px; color: #2e7d32;">
                        Total a pagar: $${amount.toLocaleString('es-CL')} CLP
                    </p>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Ir a pagar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0d47a1',
            cancelButtonColor: '#d33',
        });

        if (!confirmResult.isConfirmed) return;

        setProcessing(true);
        Swal.fire({
            title: 'Procesando...',
            text: 'Preparando checkout de Mercado Pago...',
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        try {
            const payload = {
                email: payerEmail,
                paymentType,
                amount,
                monthToPay,
                emailCarga: paymentType === 'Familiar' ? selectedCarga?.value : undefined,
            };

            const response = await axios.post(`${apiUrl}/month-pay-ctq/initiate`, payload);
            
            Swal.fire({
                title: 'Redirigiendo...',
                text: 'Te estamos redirigiendo a la pasarela segura de Mercado Pago.',
                showConfirmButton: false,
                timer: 1500,
                didOpen: () => Swal.showLoading(),
            });

            // Redirect to Mercado Pago checkout
            window.location.href = response.data.initPoint;
        } catch (err) {
            logger.error('Error initiating monthly payment:', err);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error de Checkout',
                text: 'Hubo un problema al conectar con la pasarela de pagos. Por favor intenta más tarde.',
                confirmButtonColor: '#0d47a1',
            });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <AppLoader text="Cargando portal de pagos..." />;
    }

    return (
        <div className="container" style={{ marginTop: '30px', maxWidth: '800px' }}>
            {/* Header / Account Status Banner */}
            <div className="card-panel z-depth-2" style={{
                borderRadius: '12px',
                borderLeft: '6px solid ' + (payerStatus ? '#4caf50' : '#ff9800'),
                padding: '20px',
                backgroundColor: '#ffffff'
            }}>
                <div className="row valign-wrapper" style={{ marginBottom: 0 }}>
                    <div className="col s2 center-align">
                        <FontAwesomeIcon 
                            icon={payerStatus ? faUserCheck : faExclamationTriangle} 
                            size="3x" 
                            color={payerStatus ? '#4caf50' : '#ff9800'} 
                        />
                    </div>
                    <div className="col s10">
                        <h5 style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                            Estado de Cuenta: {payerStatus ? 'Habilitada' : 'Pendiente de Pago'}
                        </h5>
                        <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>
                            {payerStatus 
                                ? '¡Excelente! Te encuentras al día con el club y puedes realizar reservas de canchas sin problemas.' 
                                : 'Tu mensualidad titular se encuentra pendiente. Regulariza tu pago hoy para volver a reservar canchas.'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Central Payment Form Card */}
            <div className="card z-depth-3" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <div className="blue darken-4 white-text" style={{ padding: '25px', position: 'relative' }}>
                    <h4 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                        <FontAwesomeIcon icon={faCreditCard} style={{ marginRight: '12px' }} />
                        Pagar Mensualidad
                    </h4>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '14px' }}>
                        Portal seguro de pago con Mercado Pago para miembros del Club de Tenis Quintero
                    </p>
                </div>

                <div className="card-content" style={{ padding: '30px' }}>
                    <form onSubmit={handlePaySubmit}>
                        
                        {/* Month selection */}
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ fontSize: '15px', color: '#333', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                                <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '8px', color: '#0d47a1' }} />
                                Selecciona el Mes a Pagar:
                            </label>
                            <div className="input-field" style={{ margin: 0 }}>
                                <select 
                                    className="browser-default" 
                                    value={monthToPay}
                                    onChange={(e) => setMonthToPay(e.target.value)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        height: '45px',
                                        borderRadius: '8px',
                                        border: '1px solid #ccc',
                                        padding: '0 10px',
                                        fontSize: '15px'
                                    }}
                                >
                                    {availableMonths.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Interactive Option Cards */}
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ fontSize: '15px', color: '#333', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                                Selecciona el Tipo de Pago:
                            </label>
                            
                            <div className="row" style={{ margin: 0 }}>
                                {/* Option 1: Titular */}
                                <div className="col s12 m6" style={{ padding: '0 8px 10px 8px' }}>
                                    <div 
                                        onClick={() => setPaymentType('Titular')}
                                        style={{
                                            border: paymentType === 'Titular' ? '3px solid #0d47a1' : '1px solid #e0e0e0',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            backgroundColor: paymentType === 'Titular' ? '#e3f2fd' : '#fff',
                                            transition: 'all 0.3s ease',
                                            boxShadow: paymentType === 'Titular' ? '0 4px 15px rgba(13, 71, 161, 0.2)' : 'none',
                                            transform: paymentType === 'Titular' ? 'scale(1.02)' : 'none'
                                        }}
                                        className="hoverable-card"
                                    >
                                        <FontAwesomeIcon icon={faUser} size="2x" color="#0d47a1" style={{ marginBottom: '10px' }} />
                                        <h6 style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#0d47a1' }}>Membresía Titular</h6>
                                        <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '10px 0', color: '#1b5e20' }}>
                                            $18.000 <span style={{ fontSize: '12px', color: '#777', fontWeight: 'normal' }}>CLP</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                                            Habilita tu propia cuenta titular para reservar canchas
                                        </p>
                                    </div>
                                </div>

                                {/* Option 2: Familiar (Carga) */}
                                <div className="col s12 m6" style={{ padding: '0 8px 10px 8px' }}>
                                    <div 
                                        onClick={() => setPaymentType('Familiar')}
                                        style={{
                                            border: paymentType === 'Familiar' ? '3px solid #0d47a1' : '1px solid #e0e0e0',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            backgroundColor: paymentType === 'Familiar' ? '#e3f2fd' : '#fff',
                                            transition: 'all 0.3s ease',
                                            boxShadow: paymentType === 'Familiar' ? '0 4px 15px rgba(13, 71, 161, 0.2)' : 'none',
                                            transform: paymentType === 'Familiar' ? 'scale(1.02)' : 'none'
                                        }}
                                        className="hoverable-card"
                                    >
                                        <FontAwesomeIcon icon={faUsers} size="2x" color="#0d47a1" style={{ marginBottom: '10px' }} />
                                        <h6 style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#0d47a1' }}>Carga (Familiar)</h6>
                                        <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '10px 0', color: '#1b5e20' }}>
                                            $5.000 <span style={{ fontSize: '12px', color: '#777', fontWeight: 'normal' }}>CLP</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                                            Habilita la cuenta de tu familiar/carga asociada
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dropdown for Cargas Selection */}
                        {paymentType === 'Familiar' && (
                            <div style={{ marginBottom: '25px', animation: 'fadeIn 0.3s ease-in' }}>
                                <label style={{ fontSize: '15px', color: '#333', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                                    Selecciona el Familiar a Habilitar:
                                </label>
                                <Select
                                    value={selectedCarga}
                                    onChange={(opt) => setSelectedCarga(opt as PlayerOption)}
                                    options={playerOptions}
                                    placeholder="Escribe el nombre del socio..."
                                    isSearchable
                                    isClearable
                                    styles={customStyles}
                                    noOptionsMessage={() => "No se encontraron socios"}
                                />
                            </div>
                        )}

                        {/* Summary panel */}
                        <div style={{
                            backgroundColor: '#f5f5f5',
                            borderRadius: '8px',
                            padding: '15px 20px',
                            marginBottom: '30px',
                            border: '1px dashed #ccc'
                        }}>
                            <h6 style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#555' }}>Resumen de Operación</h6>
                            <div className="row" style={{ margin: 0, fontSize: '14px' }}>
                                <div className="col s6" style={{ padding: 0, color: '#666' }}>Detalle de Pago:</div>
                                <div className="col s6 right-align" style={{ padding: 0, fontWeight: 'bold' }}>
                                    Mensualidad {paymentType === 'Titular' ? 'Socio Titular' : 'Carga Familiar'}
                                </div>
                            </div>
                            {paymentType === 'Familiar' && selectedCarga && (
                                <div className="row" style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                                    <div className="col s6" style={{ padding: 0, color: '#666' }}>Socio Beneficiario:</div>
                                    <div className="col s6 right-align" style={{ padding: 0, fontWeight: 'bold', color: '#0d47a1' }}>
                                        {selectedCarga.label}
                                    </div>
                                </div>
                            )}
                            <div className="row" style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                                <div className="col s6" style={{ padding: 0, color: '#666' }}>Mes de Cobertura:</div>
                                <div className="col s6 right-align" style={{ padding: 0, fontWeight: 'bold' }}>
                                    {availableMonths.find(m => m.value === monthToPay)?.label}
                                </div>
                            </div>
                        </div>

                        {/* Action Submit Button */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="btn-large waves-effect waves-light blue darken-4"
                            style={{
                                width: '100%',
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontWeight: 'bold',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            {processing ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    Procesando pago...
                                </>
                            ) : (
                                <>
                                    Pagar con Mercado Pago
                                </>
                            )}
                        </button>

                    </form>
                </div>
            </div>
            
            {/* Simple CSS animation injected locally */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .hoverable-card:hover {
                    box-shadow: 0 6px 15px rgba(0,0,0,0.1) !important;
                    transform: translateY(-2px) !important;
                }
            `}} />
        </div>
    );
};

export default PayMonthCtq;
