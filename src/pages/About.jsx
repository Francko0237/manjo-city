import React from 'react';
import '../styles/about.css';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const timeline = [
  { period: '19ème siècle', icon: '🌱', title: 'Fondation par la Famille NGOE', desc: "Au cours du 19ème siècle, la commune de Manjo a été fondée par les descendants de la famille NGOE installés sur les versants fertiles du Mont Manengouba, attirés par des terres riches et un climat propice à l'agriculture." },
  { period: 'XIXe s.', icon: '👥', title: 'Les Deux Clans Fondateurs', desc: "La structure sociale de Manjo s'est formée autour de deux clans principaux : les Mouamenam (septième fils Menamengoe) et les Manehas (onzième fils Ehas Ngoe). Ces deux clans constituent aujourd'hui les cantons traditionnels." },
  { period: 'XIXe–XXe s.', icon: '🏘️', title: "L'Émergence de Manewang", desc: "Le développement urbain de Manjo a commencé avec la création du quartier Manewang par Ewang, descendant de la lignée Ngoe. Ce quartier est devenu le premier noyau de l'agglomération." },
  { period: '1er mars 1959', icon: '📜', title: 'Reconnaissance Officielle', desc: "Une étape décisive : Manjo est officiellement érigée en commune par le décret présidentiel N°59/23, marquant le début de l'administration municipale moderne." },
  { period: 'XXe siècle', icon: '🌍', title: 'Ère de Diversification', desc: "Manjo connaît une importante diversification ethnique avec l'arrivée des Bamilékés, Bassa, Bassa'a et Bororos, venus chercher de meilleures terres agricoles. La commune devient un vrai carrefour multiculturel." },
  { period: 'Aujourd\'hui', icon: '🚀', title: 'Renouveau & Modernisation', desc: "Sous la direction de Me. Ekosso Njanjo Teclaire, la commune poursuit sa politique de développement : infrastructures, hôpital de district, éclairage solaire, marché moderne, et 50 000 habitants fiers de leur commune." },
];

const About = () => {
  return (
    <div className="about-page">

      {/* PAGE HERO */}
      <section className="about-hero" style={{ position: 'relative' }}>
        <Link to="/" className="btn-back-hero">
          <ArrowLeft size={18} /> Retour à l'accueil
        </Link>
        <div className="about-hero-overlay"></div>
        <div className="container">
          <div className="about-hero-content">
            <div className="section-subtitle" style={{color: '#f5d08a'}}>Notre Identité</div>
            <h1>L'Histoire de Manjo</h1>
            <p>De la forêt aux éléphants jusqu'à la commune moderne, retracez cinq siècles d'histoire, de traditions et de développement.</p>
          </div>
        </div>
      </section>

      {/* INTRO QUOTE */}
      <section className="about-intro">
        <div className="container">
          <blockquote className="origin-quote">
            <span className="quote-elephant">🐘</span>
            <p>
              Le nom <strong>Manjo</strong> provient de l'expression Mbo'o <em>"Muan E Njo"</em>,
              signifiant <strong>éléphanteau</strong>. Cette appellation évoque l'abondance d'éléphants
              qui peuplaient autrefois cette région verdoyante du Moungo.
            </p>
          </blockquote>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="about-timeline-section">
        <div className="container">
          <div className="section-subtitle text-center">Chronologie</div>
          <h2 className="text-center">Les Moments Clés</h2>

          <div className="about-timeline">
            {timeline.map((item, i) => (
              <div key={i} className={`about-tl-item ${i % 2 === 0 ? 'left' : 'right'}`}>
                <div className="about-tl-card">
                  <div className="about-tl-icon">{item.icon}</div>
                  <div className="about-tl-period">{item.period}</div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
                <div className="about-tl-connector">
                  <div className="about-tl-dot"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GEOGRAPHIC INFO */}
      <section className="about-geo">
        <div className="container about-geo-grid">
          <div>
            <div className="section-subtitle">Géographie</div>
            <h2>Manjo & son Territoire</h2>
            <p>Nichée au pied du Mont Manengouba, Manjo bénéficie de sols volcaniques d'une fertilité exceptionnelle. Ses terres produisent parmi les meilleurs café, cacao, poivre (proches de ceux de Penja), bananes et produits maraîchers.</p>
            <p style={{marginTop: '1rem'}}>La commune est traversée par la Route Nationale 5 (RN5), l'axe Douala–Nkongsamba, faisant de Manjo un carrefour commercial naturel de la région.</p>
          </div>
          <div className="geo-facts">
            <div className="geo-fact"><strong>Région</strong><span>Littoral</span></div>
            <div className="geo-fact"><strong>Département</strong><span>Moungo</span></div>
            <div className="geo-fact"><strong>Axe routier</strong><span>RN5 Douala–Nkongsamba</span></div>
            <div className="geo-fact"><strong>Mont proche</strong><span>Manengouba</span></div>
            <div className="geo-fact"><strong>Population</strong><span>~50 000 habitants</span></div>
            <div className="geo-fact"><strong>Statut</strong><span>Commune depuis 1959</span></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{textAlign: 'center', padding: '4rem 0', background: 'var(--color-bg-alt)'}}>
        <div className="container">
          <h2>Contribuer au Développement de Manjo</h2>
          <p className="mt-2" style={{maxWidth: '600px', margin: '1rem auto', color: 'var(--color-text-light)'}}>Découvrez nos projets en cours et participez à l'avenir de notre commune.</p>
          <Link to="/events" className="btn btn-primary" style={{marginTop: '1.5rem'}}>Voir les Projets</Link>
        </div>
      </section>

    </div>
  );
};

export default About;
