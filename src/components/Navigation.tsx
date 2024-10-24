import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { existTokenInLocalStorage, removeTokenFromLocalStorage } from '../utils/tokenUtils';
import {
    getUserInfoFromLocalStorage,
    removeUserInfoFromLocalStorage,
} from '../utils/userUtils.ts';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const M: any;

const Navigation: React.FC = () => {
    const sidenavRef = useRef<HTMLUListElement>(null);
    const navigate = useNavigate();

    const tokenExists = existTokenInLocalStorage();
    const userInfo = getUserInfoFromLocalStorage();
    const isUserRoleAdmin = userInfo?.role === 'admin';


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
                title: 'Logged out successfully!',
                showConfirmButton: false,
                timer: 1500,
            });
            navigate('/');
        }
    };

    const navItems = [
        { to: '/dashboard', label: 'Reserves Courts', show: tokenExists },
        { to: '/myhistory', label: 'My History', show: tokenExists },
        { to: '/adminregister', label: 'Admin Users', show: tokenExists && isUserRoleAdmin },
    ];

    return (
        <>
            {/* Navigation bar */}
            <nav className="green darken-4">
                <div className="nav-wrapper">
                    <Link to="/" className="brand-logo" style={{ marginLeft: '20px' }}>
                        Tennis Club
                    </Link>
                    <a href="/" data-target="mobile-nav" className="sidenav-trigger">
                        <i className="material-icons">menu</i>
                    </a>
                    <ul className="right hide-on-med-and-down">
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
            <ul id="dropdown1" className="dropdown-content">
                {navItems.map(
                    (item, index) =>
                        item.show && (
                            <li key={index}>
                                <Link to={item.to}>{item.label}</Link>
                            </li>
                        )
                )}
                {tokenExists && (
                    <>
                        <li className="divider"></li>
                        <li>
                            <a href="#!" onClick={handleLogout}>
                                Logout
                            </a>
                        </li>
                    </>
                )}
            </ul>

            {/* Mobile Navigation (sidenav) */}
            <ul className="sidenav green darken-4" id="mobile-nav" ref={sidenavRef}>
                {!tokenExists && (
                    <li>
                        <Link to="/login" className="white-text" onClick={() => sidenavRef.current?.classList.remove('open')}>
                            Login
                        </Link>
                    </li>
                )}
                {navItems.map(
                    (item, index) =>
                        item.show && (
                            <li key={index}>
                                <Link to={item.to} className="white-text" onClick={() => sidenavRef.current?.classList.remove('open')}>
                                    {item.label}
                                </Link>
                            </li>
                        )
                )}
                {tokenExists && (
                    <li>
                        <a href="#!" className="white-text" onClick={handleLogout}>
                            Logout
                        </a>
                    </li>
                )}
            </ul>
        </>
    );
};

export default Navigation;
