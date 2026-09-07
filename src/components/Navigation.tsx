import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { existTokenInLocalStorage, removeTokenFromLocalStorage } from '../utils/tokenUtils';
import {
    getUserInfoFromLocalStorage,
    removeUserInfoFromLocalStorage,
} from '../utils/userUtils.ts';
import '../styles/Navigation.css';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const M: any;

const Navigation: React.FC = () => {
    const sidenavRef = useRef<HTMLUListElement>(null);
    const navigate = useNavigate();

    const tokenExists = existTokenInLocalStorage();
    const userInfo = getUserInfoFromLocalStorage();
    const isUserRoleAdmin = userInfo?.role === 'admin';
    const isUserRoleProfesor = userInfo?.role === 'profesor';
    const namePlayer = userInfo?.name || '';

    useEffect(() => {
        const dropdownElems = document.querySelectorAll('.dropdown-trigger');
        M.Dropdown.init(dropdownElems, { alignment: 'right' });

        const sidenavInstance = M.Sidenav.init(sidenavRef.current, {});
        const closeSidenavOnClick = () => sidenavInstance?.close();

        sidenavInstance.el.addEventListener('click', closeSidenavOnClick);

        return () => {
            sidenavInstance.el.removeEventListener('click', closeSidenavOnClick);
            sidenavInstance?.destroy();
        };
    }, []);

    const handleLogout = () => {
        if (tokenExists) {
            removeTokenFromLocalStorage();
            removeUserInfoFromLocalStorage();
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
        { to: '/dashboard', label: 'Reserva Cancha', show: tokenExists },
        // { to: '/scoreboard', label: 'Scorer Court', show: tokenExists },
        { to: '/ranking', label: 'Ranking CTQ', show: tokenExists },
        { to: '/profile', label: 'Mi Perfil', show: tokenExists },
        { to: '/myhistory', label: 'Mi historial', show: tokenExists },
        { to: '/updatematch', label: 'Agregar Resultado', show: tokenExists },
        { to: '/adminregister', label: 'Admin usuarios', show: tokenExists && isUserRoleAdmin },
        { to: '/adminreserves', label: 'Admin reservas', show: tokenExists && isUserRoleAdmin },
        { to: '/multibooking', label: 'Multi-Booking', show: tokenExists && (isUserRoleAdmin || isUserRoleProfesor) },
        { to:'/resetpassword', label: 'Reset Pass', show: tokenExists && isUserRoleAdmin},
    ];

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
