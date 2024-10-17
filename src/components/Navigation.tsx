import React, {useEffect, useRef} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {existTokenInLocalStorage, removeTokenFromLocalStorage} from '../utils/tokenUtils';
import Swal from 'sweetalert2';

declare const M: any;

const Navigation: React.FC = () => {
    const sidenavRef = useRef<HTMLUListElement>(null); // Reference to the sidenav element
    const navigate = useNavigate();

    useEffect(() => {
        const dropdownElems = document.querySelectorAll('.dropdown-trigger');
        M.Dropdown.init(dropdownElems, {alignment: 'right'});
        const sidenavInstance = M.Sidenav.init(sidenavRef.current, {});
        const closeSidenavOnClick = () => sidenavInstance?.close();
        sidenavInstance.el.addEventListener('click', closeSidenavOnClick);
        return () => {
            sidenavInstance.el.removeEventListener('click', closeSidenavOnClick);
            sidenavInstance?.destroy();
        };
    }, []);

    const handleLogout = () => {
        if (existTokenInLocalStorage()) {
            removeTokenFromLocalStorage();
            Swal.fire({
                icon: 'success',
                title: 'Logged out successfully!',
                showConfirmButton: false,
                timer: 1500,
            });
        }
        navigate('/');
    };

    const tokenExists = existTokenInLocalStorage();
    return (
        <>
            {/* Navigation bar */}
            <nav className="green darken-4">
                <div className="nav-wrapper">
                    <Link to="/" className="brand-logo" style={{marginLeft: '20px'}}>
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
                <li>
                    <Link to="/dashboard">
                        Dashboard Courts
                    </Link>
                </li>
                <li>
                    <Link to="/">
                        My Reserves
                    </Link>
                </li>
                <li className="divider"></li>
                <li>
                    <a href="#!" onClick={handleLogout}>
                        Logout
                    </a>
                </li>
            </ul>
            {/* Mobile Navigation (sidenav) */}
            <ul className="sidenav green darken-4" id="mobile-nav" ref={sidenavRef}>
                {!tokenExists && (
                    <li>
                        <Link to="/login" className="white-text"
                              onClick={() => sidenavRef.current?.classList.remove('open')}>
                            Login
                        </Link>
                    </li>
                )}
                {tokenExists && (
                <li>
                    <Link to="/dashboard" className="white-text"
                          onClick={() => sidenavRef.current?.classList.remove('open')}>
                        Dashboard Courts
                    </Link>
                </li>)}
                {tokenExists && (
                <li>
                    <Link to="/" className="white-text"
                          onClick={() => sidenavRef.current?.classList.remove('open')}>
                        My Reserves
                    </Link>
                </li>)}
                {tokenExists && (
                <li>
                    <a href="#!" className="white-text" onClick={handleLogout}>
                        Logout
                    </a>
                </li>)}
            </ul>
        </>
    );
};

export default Navigation;
