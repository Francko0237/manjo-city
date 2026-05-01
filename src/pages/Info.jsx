import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/home.css';
import {
  Users, MapPin, Calendar, Leaf, TrendingUp, ShieldCheck,
  Building2, Wheat, ArrowRight, Mountain, ArrowLeft
} from 'lucide-react';

const stats = [
  { icon: Users,    value: '50 000+', label: 'Habitants' },
  { icon: MapPin,   value: 'Moungo',  label: 'Département' },
  { icon: Calendar, value: '1959',    label: 'Commune depuis' },
  { icon: Mountain, value: 'Manengouba', label: 'Mont tutélaire' },
];

const timeline = [
  { date: '19ème siècle', title: 'Fondation', desc: "Fondée par les descendants de la famille NGOE sur les versants fertiles du Mont Manengouba, attirés par la richesse des terres." },
  { date: 'XIXe s.',      title: 'Deux clans fondateurs', desc: "Les clans Mouamenam (fils Menamengoe) et Manehas (fils Ehas Ngoe) forment les deux cantons traditionnels de la commune." },
  { date: '1959',         title: 'Reconnaissance officielle', desc: "Le 1er mars 1959, Manjo est officiellement érigée en commune par le décret présidentiel N°59/23." },
  { date: 'XXe s.',       title: 'Diversification', desc: "Arrivée des Bamilékés, Bassa, Bassa'a et Bororos. Manjo devient un carrefour multiculturel unique au Cameroun." },
  { date: "Aujourd'hui",  title: 'Modernisation', desc: "Sous la direction de Me. Ekosso Njanjo Teclaire, la commune poursuit sa politique de développement des infrastructures et de l'agriculture." },
];

const services = [
  { icon: ShieldCheck, title: "État Civil",         desc: "Actes de naissance, mariage, décès et documents officiels." },
  { icon: Leaf,        title: "Agriculture",        desc: "Soutien aux cultures de café, cacao, poivre et produits vivriers." },
  { icon: Building2,   title: "Urbanisme",          desc: "Permis de construire, plans d'urbanisation et aménagement du territoire." },
  { icon: TrendingUp,  title: "Développement",     desc: "Projets d'infrastructures routières et amélioration du cadre de vie." },
  { icon: Wheat,       title: "Affaires Économiques", desc: "Soutien au commerce local, marchés et activités économiques." },
  { icon: Users,       title: "Affaires Sociales",  desc: "Aide aux populations vulnérables et cohésion sociale." },
];

const Info = () => {
  return (
    <div className="home-page">

      {/* ── HERO ── */}
      <section className="info-hero">
        <Link to="/" className="btn-back-hero">
          <ArrowLeft size={18} /> Retour à l'accueil
        </Link>
        <div className="info-hero-overlay" />

        <div className="info-hero-content">
          <div className="glass-card info-hero-glass">
            <div className="hero-badge">🐘 Cité de l'Éléphant</div>
            <h1 className="info-hero-title">Bienvenue à<br /><span>Manjo</span></h1>
            <p className="info-hero-p">
              La commune du Moungo, carrefour multiculturel où traditions ancestrales et modernité coexistent harmonieusement.
            </p>
            <div className="info-hero-buttons">
              <Link to="/events" className="btn btn-primary">
                Projets &amp; Événements <ArrowRight size={16} style={{ display: 'inline', marginLeft: '4px' }} />
              </Link>
              <Link to="/about" className="btn btn-outline info-btn-outline">Notre Histoire</Link>
            </div>
          </div>
        </div>

        <div className="hero-scroll-hint">
          <div className="scroll-dot" />
        </div>
      </section>

      {/* ── STATS BAND ── */}
      <section className="stats-band">
        <div className="container stats-grid">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="stat-item">
                <div className="stat-icon"><Icon size={28} /></div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── MOT DU MAIRE ── */}
      <section className="section-mayor">
        <div className="container mayor-content">
          <div className="mayor-text">
            <div className="section-subtitle">Mot de la Mairesse</div>
            <h2>Me. Ekosso Njanjo Teclaire</h2>
            <p>
              Chers visiteurs, bienvenue sur le portail numérique de la commune de Manjo.
              Ce site a été pensé pour vous offrir un accès simple et rapide à toutes les
              informations utiles concernant la vie communale, les services de la mairie,
              les projets de développement, ainsi que les actualités locales.
            </p>
            <p style={{ marginTop: '1rem' }}>
              Nous croyons fermement que la transparence, la proximité et la modernisation
              sont les piliers d'une gouvernance locale efficace.
              <em> « Une commune qui informe est une commune qui avance. »</em>
            </p>
            <Link to="/about" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              En savoir plus <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mayor-photo-wrap">
            <div className="mayor-photo-card">
              <img src="/images/maire.png" alt="Me. Ekosso Njanjo Teclaire – Mairesse de Manjo" />
              <div className="mayor-photo-caption">
                <strong>Me. Ekosso Njanjo Teclaire</strong>
                <span>Mairesse de Manjo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HISTOIRE / TIMELINE ── */}
      <section className="section-history">
        <div className="container">
          <div className="section-subtitle text-center">Notre Passé</div>
          <h2 className="text-center">Des Éléphants au Développement Moderne</h2>
          <p className="text-center section-intro">
            La commune de Manjo tire son nom de l'expression Mbo'o "Muan E Njo" — signifiant <strong>éléphanteau</strong> —, évoquant l'abondance d'éléphants qui peuplaient autrefois cette région verdoyante.
          </p>
          <div className="timeline">
            {timeline.map((item, i) => (
              <div key={i} className={`timeline-item ${i % 2 === 0 ? 'left' : 'right'}`}>
                <div className="timeline-content glass-card">
                  <span className="timeline-date">{item.date}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
                <div className="timeline-dot" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="section-services">
        <div className="container">
          <div className="section-subtitle text-center">La Mairie à votre service</div>
          <h2 className="text-center">Nos Services Communaux</h2>
          <div className="services-grid">
            {services.map((srv, i) => {
              const Icon = srv.icon;
              return (
                <div key={i} className="service-card glass-card">
                  <div className="service-icon"><Icon size={32} /></div>
                  <h3>{srv.title}</h3>
                  <p>{srv.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-cta">
        <div className="container cta-content">
          <div className="glass-card cta-glass">
            <h2>Restez informé des projets de Manjo</h2>
            <p>Découvrez les dernières initiatives et événements locaux qui façonnent l'avenir de notre commune.</p>
            <Link to="/events" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Voir les projets &amp; événements <ArrowRight size={16} style={{ display: 'inline', marginLeft: '4px' }} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Info;
