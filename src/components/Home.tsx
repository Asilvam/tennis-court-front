import React, {useEffect, useMemo, useState} from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { MdEventAvailable, MdLeaderboard, MdLogin, MdPersonAdd, MdReceiptLong } from 'react-icons/md';
import { existTokenInLocalStorage } from '../utils/tokenUtils.ts';
import { getUserInfoFromLocalStorage } from '../utils/userUtils.ts';
import '../styles/Home.css';
import NewsTicker from "./NewsTicker.tsx";

const heroFlags = [
    {
        src: '/images/new_logo_ctq.png',
        alt: 'Bandera Club de Tenis Quintero',
        variant: 'landscape',
    },
    {
        src: '/images/logo_circ_ctq.jpeg',
        alt: 'Insignia Club de Tenis Quintero',
        variant: 'circle',
    },
    {
        src: '/images/torneo.PNG',
        alt: 'Bandera Club de Tenis Quintero',
        variant: 'landscape',
    }
] as const;

const Home: React.FC = () => {
    const tokenExists = existTokenInLocalStorage();
    const userInfo = getUserInfoFromLocalStorage();
    const [activeFlagIndex, setActiveFlagIndex] = useState(0);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setActiveFlagIndex((currentIndex) => (currentIndex + 1) % heroFlags.length);
        }, 5000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const primaryActions = useMemo(() => {
        if (tokenExists) {
            return [
                { to: '/dashboard', label: 'Reservar cancha', icon: <MdEventAvailable />, tone: 'primary' },
                { to: '/ranking', label: 'Ver ranking', icon: <MdLeaderboard />, tone: 'secondary' },
                { to: '/myhistory', label: 'Mi historial', icon: <MdReceiptLong />, tone: 'secondary' },
            ];
        }

        return [
            { to: '/login', label: 'Iniciar sesión', icon: <MdLogin />, tone: 'primary' },
            { to: '/register', label: 'Crear cuenta', icon: <MdPersonAdd />, tone: 'secondary' },
            { to: '/ranking', label: 'Explorar ranking', icon: <MdLeaderboard />, tone: 'secondary' },
        ];
    }, [tokenExists]);

    const heroSubtitle = tokenExists
        ? `Hola${userInfo?.name ? `, ${userInfo.name}` : ''}. Tu acceso rápido al club está aquí.`
        : 'Reserva canchas, revisa novedades y sigue la actividad del club desde una sola experiencia.';

    return (
        <div className="home-page">
            <section className="home-hero">
                <div className="home-hero__content">
                    <div className="home-hero__flag" aria-label="Identidad visual del club">
                        <div className={`home-hero__flag-stage home-hero__flag-stage--${heroFlags[activeFlagIndex].variant}`}>
                            {heroFlags.map((flag, index) => (
                                <img
                                    key={flag.src}
                                    src={flag.src}
                                    alt={flag.alt}
                                    className={`home-hero__flag-image home-hero__flag-image--${flag.variant} ${index === activeFlagIndex ? 'is-active' : ''}`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="home-news-band">
                        <NewsTicker />
                    </div>
                    <h1 className="home-hero__title">Todo el club, listo para usar.</h1>
                    <p className="home-hero__subtitle">{heroSubtitle}</p>
                    <div className="home-hero__actions">
                        {primaryActions.map((action) => (
                            <Link
                                key={action.to}
                                to={action.to}
                                className={`home-action-btn home-action-btn--${action.tone}`}
                            >
                                <span className="home-action-btn__icon">{action.icon}</span>
                                <span>{action.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="home-section">
                <div className="home-section-shell">
                    <div className="home-contact home-contact--early">
                        <div className="home-contact__list">
                            <a className="home-contact__item" href="https://wa.me/56989622137" target="_blank" rel="noopener noreferrer">
                                <span className="home-contact__icon"><FaWhatsapp /></span>
                                <span className="home-contact__meta">
                                    <strong>Ricardo Said</strong>
                                    <small>Reservas y coordinación</small>
                                </span>
                                <span className="home-contact__value">+56 9 8962 2137</span>
                            </a>

                            <a className="home-contact__item" href="https://wa.me/56981914285" target="_blank" rel="noopener noreferrer">
                                <span className="home-contact__icon"><FaWhatsapp /></span>
                                <span className="home-contact__meta">
                                    <strong>Administrador App</strong>
                                    <small>Soporte y acceso</small>
                                </span>
                                <span className="home-contact__value">+56 9 8191 4285</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
