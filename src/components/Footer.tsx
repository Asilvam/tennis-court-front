import '../styles/Footer.css';

const Footer = () => (
  <footer className="ctq-footer">
    <div className="ctq-footer__inner">
      <span>Club de Tenis Quintero · {new Date().getFullYear()}</span>
      <div className="ctq-footer__build" aria-label="Versión de la aplicación">
        <span>v{__CTQ_BUILD_INFO__.version}</span>
        <span>Compilación {__CTQ_BUILD_INFO__.revision ?? 'sin identificador'}</span>
        {import.meta.env.DEV && <span>Local</span>}
      </div>
    </div>
  </footer>
);

export default Footer;
