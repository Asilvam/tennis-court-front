import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { removeTokenFromLocalStorage } from '../utils/tokenUtils';
import {
    removeUserInfoFromLocalStorage,
} from '../utils/userUtils.ts';
import '../styles/Navigation.css';
import { useAuth } from './useAuth';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const M: any;

const Navigation: React.FC = () => {
    const sidenavRef = useRef<HTMLUListElement>(null);
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuth();

    const tokenExists = isAuthenticated;
    const isUserRoleAdmin = user?.role === 'admin';
    const isUserRoleProfesor = user?.role === 'profesor';
    const namePlayer = user?.name || '';

    useEffect(() => {
        const dropdownElems = document.querySelectorAll('.ctq-nav .dropdown-trigger');
        const dropdownInstances = M.Dropdown.init(dropdownElems, {
            alignment: 'right',
            constrainWidth: false,
            coverTrigger: false,
        });

        const sidenavInstance = M.Sidenav.init(sidenavRef.current, {});
        const closeSidenavOnClick = () => sidenavInstance?.close();

        sidenavInstance.el.addEventListener('click', closeSidenavOnClick);

        return () => {
            dropdownInstances.forEach((instance: { destroy: () => void }) => instance.destroy());
            sidenavInstance.el.removeEventListener('click', closeSidenavOnClick);
            sidenavInstance?.destroy();
        };
    }, []);

    const handleLogout = () => {
        if (tokenExists) {
            removeTokenFromLocalStorage();
            removeUserInfoFromLocalStorage();
            logout();
            Swal.fire({
                icon: 'success',
                title: 'Logged out OK!',
                text: `Hasta luego ${namePlayer}!`,
                showConfirmButton: false,
                timer: 1500,
            });
            navigate('/');
        }
    };

    const navItems = [
        { to: '/monthlypayments', label: 'Mis mensualidades', show: tokenExists },
        { to: '/dashboard', label: 'Reserva Cancha', show: tokenExists },
        // { to: '/scoreboard', label: 'Scorer Court', show: tokenExists },
        { to: '/ranking', label: 'Ranking CTQ', show: tokenExists },
        { to: '/profile', label: 'Mi Perfil', show: tokenExists },
        { to: '/myhistory', label: 'Mi historial', show: tokenExists },
        { to: '/updatematch', label: 'Agregar Resultado', show: tokenExists },
        { to: '/adminregister', label: 'Admin usuarios', show: tokenExists && isUserRoleAdmin },
        { to: '/adminreserves', label: 'Admin reservas', show: tokenExists && isUserRoleAdmin },
        { to: '/adminpayments', label: 'Mensualidades', show: tokenExists && isUserRoleAdmin },
        { to: '/multibooking', label: 'Multi-Booking', show: tokenExists && (isUserRoleAdmin || isUserRoleProfesor) },
        { to:'/resetpassword', label: 'Reset Pass', show: tokenExists && isUserRoleAdmin},
    ].map(item => ({ ...item, show: item.show && (!user?.financiallyRestricted || item.to === '/monthlypayments') }));

    return (
        <>
            {/* Navigation bar */}
            <nav className="ctq-nav">
                <div className="nav-wrapper ctq-nav__wrapper">
                    <Link to="/" className="brand-logo ctq-nav__brand">
                       Club de Tenis Quintero
                    </Link>
                    <a href="/" data-target="mobile-nav" className="sidenav-trigger ctq-nav__trigger">
                        <i className="material-icons">menu</i>
                    </a>
                    <ul className="right hide-on-med-and-down ctq-nav__links">
                        {!tokenExists && (
                            <li>
                                <Link to="/login">Login</Link>
                            </li>
                        )}
                        <li>
                            <a className="dropdown-trigger" href="#!" data-target="dropdown1">
                                Menu<i className="material-icons right">arrow_drop_down</i>
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>

            {/* Dropdown Structure */}
            <ul id="dropdown1" className="dropdown-content ctq-nav__dropdown">
                {navItems.map(
                    (item, index) =>
                        item.show && (
                            <li key={index}>
                                <Link to={item.to} className="white-text ctq-nav__dropdown-link">{item.label}</Link>
                            </li>
                        )
                )}
                {tokenExists && (
                    <>
                        <li className="divider"></li>
                        <li>
                            <a href="#!" onClick={handleLogout} className="white-text ctq-nav__dropdown-link">
                                Logout
                            </a>
                        </li>
                    </>
                )}
            </ul>
            {/* Mobile Navigation (sidenav) */}
            <ul
                className="sidenav ctq-nav__sidenav"
                id="mobile-nav"
                ref={sidenavRef}
                style={{
                    width: '200px',
                    height: 'auto',
                    maxHeight: '90vh',  // Max height based on viewport height for dynamic sizing
                    overflowY: 'auto',  // Enable scrolling if content overflows
                    paddingTop: '10px',
                    paddingBottom: '10px',
                }}
            >
                {!tokenExists && (
                    <li>
                        <Link to="/login" className="white-text ctq-nav__sidenav-link"
                              onClick={() => sidenavRef.current?.classList.remove('open')}>
                            Login
                        </Link>
                    </li>
                )}
                {navItems.map(
                    (item, index) =>
                        item.show && (
                            <li key={index}>
                                <Link to={item.to} className="white-text ctq-nav__sidenav-link"
                                      onClick={() => sidenavRef.current?.classList.remove('open')}>
                                    {item.label}
                                </Link>
                            </li>
                        )
                )}
                {tokenExists && (
                    <li>
                        <a href="#!" className="white-text ctq-nav__sidenav-link" onClick={handleLogout}>
                            Logout
                        </a>
                    </li>
                )}
            </ul>
        </>
    );
};

export default Navigation;
