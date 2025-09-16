import React, {useState, ChangeEvent, FormEvent, Fragment, useRef} from 'react';
import axios from 'axios';
import Select, { SingleValue } from 'react-select';
import Swal from "sweetalert2";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import logger from "../utils/logger.ts";

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

const partnerTypeOptions: readonly PartnerOption[] = [
    { value: 'Titular', label: 'Socio Titular' },
    { value: 'Familiar', label: 'Socio Familiar' }
];

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
        const {name, value} = e.target;
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
        <Fragment>
            <div className="container">
                <form onSubmit={handleSubmit} className="row">
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
                        />
                        <label htmlFor="namePlayer">Nombre Jugador</label>
                    </div>

                    {/* Partner Type */}
                    {/*<div className="col s12" style={{ marginBottom: '1rem', zIndex: 100 }}>*/}
                    {/*    <Select<PartnerOption>*/}
                    {/*        inputId="partnerType"*/}
                    {/*        name="partnerType"*/}
                    {/*        options={partnerTypeOptions}*/}
                    {/*        value={partnerTypeOptions.find(option => option.value === formData.partnerType) || null}*/}
                    {/*        onChange={handlePartnerTypeChange}*/}
                    {/*        placeholder="Selecciona un Tipo de Socio..."*/}
                    {/*        noOptionsMessage={() => 'No hay opciones'}*/}
                    {/*        styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}*/}
                    {/*    />*/}
                    {/*    {errors.partnerType && <span className="red-text" style={{ fontSize: '12px' }}>{errors.partnerType}</span>}*/}
                    {/*</div>*/}

                    {/* Cellular */}
                    <div className="input-field col s12">
                        <input
                            id="cellular"
                            type="text"
                            name="cellular"
                            value={formData.cellular}
                            onChange={handleChange}
                            required
                        />
                        <label htmlFor="cellular">Nº Celular</label>
                        {errors.cellular && <span className="red-text">{errors.cellular}</span>}
                    </div>


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
                        />
                        <label htmlFor="email">Email</label>
                        {errors.email && <span className="red-text">{errors.email}</span>}
                    </div>


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
                        />
                        <label htmlFor="pwd">Password</label>
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
                        />
                        <label htmlFor="retypePwd">Retype Password</label>
                        {errors.password && <span className="red-text">{errors.password}</span>}
                    </div>

                    {/* Buttons */}
                    <div className="col s12" style={{marginTop: '20px'}}>
                        <button type="submit" className="btn blue darken-4" disabled={generateLoading}>
                            {generateLoading && <FontAwesomeIcon icon={faSpinner} spin fixedWidth/>} Crear Jugador
                        </button>
                        <a href="/" className="btn blue darken-1" style={{marginLeft: '15px'}}>
                            Cancelar
                        </a>
                    </div>
                </form>
            </div>
        </Fragment>
    );
};

export default PlayerForm;
