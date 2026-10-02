import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, Facebook, Clock } from 'lucide-react';
import '../styles/footer.css';


const Footer = () => {
  return (
    <footer className="site-footer">
      {/* Divider wave */}
      <div className="footer-wave">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none"><path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60 Z" fill="#2d4a22"/></svg>
      </div>

      <div className="footer-body">
        <div className="container footer-grid">

          {/* Col 1 – Identité */}
          <div className="footer-col footer-brand">
            <div className="footer-logo">🐘 Manjo<span>City</span></div>
            <p>La Cité de l'Éléphant, commune du Moungo. Terre de traditions, d'agriculture et d'avenir au Cameroun.</p>
          </div>
          {/* Col 3 – Contact */}
          <div className="footer-col">
            <h4>Informations de Manjo</h4>
            <ul className="footer-contact">
              <li>
                <MapPin size={16}/>
                <span>Manjo, Département du Moungo,<br/>Région du Littoral, Cameroun</span>
              </li>
              <li>
                <Globe size={16}/>
                <a href="https://www.manjo.cm" target="_blank" rel="noopener noreferrer">www.manjo.cm</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} Commune de Manjo — Tous droits réservés. Région du Littoral, Moungo, Cameroun.</p>
          
        </div>
      </div>
    </footer>
  );
};

export default Footer;
