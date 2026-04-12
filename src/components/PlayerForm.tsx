
import React, { useState, ChangeEvent, FormEvent, Fragment, useRef } from 'react';
import axios from 'axios';
import { SingleValue } from 'react-select';
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { MdPerson, MdPersonAdd, MdArrowBack } from "react-icons/md";
import logger from "../utils/logger.ts";
import '../styles/PlayerForm.css';
import Swal from "sweetalert2";

interface FormData {
    namePlayer: string;
    email: string;
    cellular: string;
    pwd: string;
    retypePwd: string;
    urlEmail: string;
    partnerType: 'Titular' | 'Familiar' | '';
}

const initialFormData: FormData = {
    namePlayer: '',
    cellular: '',
    email: '',
    pwd: '',
    retypePwd: '',
    urlEmail: `${import.meta.env.VITE_API_URL}/auth`,
    partnerType: 'Titular',
};

interface PartnerOption {
    value: 'Titular' | 'Familiar';
    label: string;
}

// const partnerTypeOptions: readonly PartnerOption[] = [
//     { value: 'Titular', label: 'Socio Titular' },
//     { value: 'Familiar', label: 'Socio Familiar' }
// ];

interface FormErrors {
    email?: string;
    password?: string;
    cellular?: string;
    partnerType?: string;
}

const PlayerForm: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [generateLoading, setGenerateLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    const emailInputRef = useRef<HTMLInputElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        // Clear validation error when user starts typing
        if (name in errors) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
        if (name === "pwd" || name === "retypePwd") {
            setErrors(prev => ({ ...prev, password: undefined }));
        }
    };

    const handlePartnerTypeChange = (selectedOption: SingleValue<PartnerOption>) => {
        setFormData(prevState => ({
            ...prevState,
            partnerType: selectedOption ? selectedOption.value : ''
        }));
        if (errors.partnerType) {
            setErrors(prev => ({ ...prev, partnerType: undefined }));
        }
    };

    const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validatePassword = (): boolean => {
        if (formData.pwd !== formData.retypePwd) {
            setErrors(prev => ({ ...prev, password: 'Las contraseñas no coinciden.' }));
            resetPasswordFields();
            return false;
        }
        return true;
    };

    const resetPasswordFields = () => {
        setFormData(prevState => ({
            ...prevState,
            pwd: '',
            retypePwd: ''
        }));
        if (passwordInputRef.current) {
            passwordInputRef.current.focus();
        }
    };

    const clearForm = () => {
        setFormData(initialFormData);
        setErrors({});
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setGenerateLoading(true);
        setErrors({}); // Reset errors on new submission

        if (!formData.partnerType) {
            setErrors(prev => ({ ...prev, partnerType: 'Debes seleccionar un tipo de socio.' }));
            setGenerateLoading(false);
            return;
        }

        // Validaciones previas
        if (!validateEmail(formData.email)) {
            setErrors(prev => ({ ...prev, email: 'Email inválido.' }));
            emailInputRef.current?.focus();
            return setGenerateLoading(false);
        }

        if (!validatePassword()) {
            return setGenerateLoading(false);
        }

        const { retypePwd, ...formDataToSend } = formData;

        try {
            const response = await axios.post(`${apiUrl}/register`, formDataToSend);
            logger.info(response);
            await Swal.fire({
                icon: 'success',
                title: '¡Jugador creado exitosamente!',
                text: 'Revisa tu correo para activar tu cuenta.',
            });

            clearForm();
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const message = error.response?.data?.message || '';

                if (status === 400) {
                    if (message.includes('email')) {
                        setErrors(prev => ({ ...prev, email: 'Este correo ya está registrado.' }));
                        emailInputRef.current?.focus();
                    } else if (message.includes('cellular')) {
                        setErrors(prev => ({ ...prev, cellular: 'Este número ya está registrado.' }));
                    } else {
                        await Swal.fire({
                            icon: 'error',
                            title: 'Oops...',
                            text: message || 'Datos inválidos.',
                        });
                    }
                } else {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: 'Algo salió mal, por favor intenta nuevamente.',
                    });
                }
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Error desconocido.',
                });
            }

            logger.error('Failed to submit form:', error);
        }
        finally {
            setGenerateLoading(false);
        }
    };


    return (
        <div className="container player-form-container">
            <div className="row">
                <div className="col s12 m12 l12">
                    <div className="card z-depth-3 player-form-card">
                        <div className="player-form-header-icon">
                            <MdPerson />
                        </div>
                        <div className="card-content player-form-card-content">
                            <form onSubmit={handleSubmit}>
                                <div className="row">
                                    {/* Name Player */}
                                    <div className="input-field col s12">
                                        <input
                                            id="namePlayer"
                                            type="text"
                                            name="namePlayer"
                                            value={formData.namePlayer}
                                            onChange={handleChange}
                                            autoFocus
                                            required
                                            className="validate"
                                        />
                                        <label htmlFor="namePlayer">Nombre y Apellido</label>
                                    </div>

                                    {/* Cellular */}
                                    <div className="input-field col s12">
                                        <input
                                            id="cellular"
                                            type="tel"
                                            name="cellular"
                                            value={formData.cellular}
                                            onChange={handleChange}
                                            required
                                            className="validate"
                                        />
                                        <label htmlFor="cellular">Nº Celular</label>
                                        {errors.cellular && <span className="helper-text red-text">{errors.cellular}</span>}
                                    </div>
                                </div>

                                <div className="row">
                                    {/* Email */}
                                    <div className="input-field col s12">
                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            ref={emailInputRef}
                                            required
                                            className="validate"
                                        />
                                        <label htmlFor="email">Correo Electrónico</label>
                                        {errors.email && <span className="helper-text red-text">{errors.email}</span>}
                                    </div>
                                </div>

                                <div className="row">
                                    {/* Password */}
                                    <div className="input-field col s12">
                                        <input
                                            id="pwd"
                                            type="password"
                                            name="pwd"
                                            value={formData.pwd}
                                            onChange={handleChange}
                                            ref={passwordInputRef}
                                            required
                                            className="validate"
                                        />
                                        <label htmlFor="pwd">Contraseña</label>
                                    </div>

                                    {/* Retype Password */}
                                    <div className="input-field col s12">
                                        <input
                                            id="retypePwd"
                                            type="password"
                                            name="retypePwd"
                                            value={formData.retypePwd}
                                            onChange={handleChange}
                                            required
                                            className="validate"
                                        />
                                        <label htmlFor="retypePwd">Confirmar Contraseña</label>
                                        {errors.password && <span className="helper-text red-text">{errors.password}</span>}
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="row player-form-actions-row">
                                    <div className="col s12 player-form-actions">
                                        <a
                                            href="/"
                                            className="btn-flat waves-effect waves-blue player-form-btn-cancel"
                                        >
                                            <MdArrowBack style={{ marginRight: '8px', fontSize: '1.2rem' }} /> Cancelar
                                        </a>
                                        <button
                                            type="submit"
                                            className="btn waves-effect waves-light blue darken-3 player-form-btn-submit"
                                            disabled={generateLoading}
                                        >
                                            {generateLoading ? (
                                                <Fragment><FontAwesomeIcon icon={faSpinner} spin fixedWidth className="player-form-spinner" /> Creando...</Fragment>
                                            ) : (
                                                <Fragment><MdPersonAdd style={{ marginRight: '8px', fontSize: '1.2rem' }} /> Crear Jugador</Fragment>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerForm;
