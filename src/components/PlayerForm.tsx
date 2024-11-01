import React, {useState, ChangeEvent, FormEvent, Fragment, useRef} from 'react';
import axios from 'axios';
import Swal from "sweetalert2";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

interface FormData {
    namePlayer: string;
    email: string;
    cellular: string;
    pwd: string;
    retypePwd: string;
    urlEmail: string;
}

const initialFormData: FormData = {
    namePlayer: '',
    cellular: '',
    email: '',
    pwd: '',
    retypePwd: '',
    urlEmail: `${import.meta.env.VITE_API_URL}/auth`
};

const PlayerForm: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [generateLoading, setGenerateLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const emailInputRef = useRef<HTMLInputElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        setEmailError(null);
        if (name === "pwd" || name === "retypePwd") {
            setPasswordError(null);
        }
    };

    const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validatePassword = (): boolean => {
        if (formData.pwd !== formData.retypePwd) {
            setPasswordError('Passwords do not match!');
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

    const clearForm = () => setFormData(initialFormData);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setGenerateLoading(true);

        if (!validateEmail(formData.email)) {
            setEmailError('Invalid email');
            emailInputRef.current?.focus();
            setGenerateLoading(false);
            return;
        }

        if (!validatePassword()) {
            setGenerateLoading(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { retypePwd, ...formDataToSend } = formData;

        try {
            const response = await axios.post(`${apiUrl}/register`, formDataToSend);
            if (response.data.status === 400) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: response.data.message,
                });
                setGenerateLoading(false);
                return;
            }

            await Swal.fire({
                icon: 'success',
                title: 'Player created successfully!',
            });

            clearForm();
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Something went wrong!',
            });
            console.error('Failed to submit form:', error);
        }
        setGenerateLoading(false);
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
                        <label htmlFor="cellular">Nª Celular</label>
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
                        {emailError && <span className="red-text">{emailError}</span>}
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
                        {passwordError && <span className="red-text">{passwordError}</span>}
                    </div>

                    {/* Buttons */}
                    <div className="col s12" style={{marginTop: '20px'}}>
                        <button type="submit" className="btn green darken-4" disabled={generateLoading}>
                            {generateLoading && <FontAwesomeIcon icon={faSpinner} spin fixedWidth/>} Crear Jugador
                        </button>
                        <a href="/" className="btn grey darken-1" style={{marginLeft: '15px'}}>
                            Cancelar
                        </a>
                    </div>
                </form>
            </div>
        </Fragment>
    )
        ;
};

export default PlayerForm;
