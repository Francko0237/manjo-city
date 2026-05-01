import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Tag, ChevronDown, X, Maximize2, ArrowLeft } from 'lucide-react';

import { Link } from 'react-router-dom';
import '../styles/events.css';

// Group items by year and month
const groupByYearMonth = (items, dateField) => {
  const groups = {};
  items.forEach(item => {
    const d = new Date(item[dateField]);
    const year = d.getFullYear();
    const month = d.toLocaleString('fr-FR', { month: 'long' });
    const key = `${year}__${month}`;
    if (!groups[key]) groups[key] = { year, month, items: [] };
    groups[key].items.push(item);
  });
// Sort descending by year then month
  return Object.values(groups).sort((a, b) => b.year - a.year || new Date(`01 ${b.month} ${b.year}`) - new Date(`01 ${a.month} ${a.year}`));
};

const getStatusBadge = (item, type) => {
  if (type === 'events') {
    const isFinished = item.date_fin 
      ? new Date() > new Date(item.date_fin)
      : new Date() > new Date(item.date); // Fallback si pas de date de fin
    
    return (
      <span style={{ 
        marginLeft: '0.5rem', 
        padding: '0.2rem 0.5rem', 
        borderRadius: '12px', 
        fontSize: '0.7rem', 
        fontWeight: 'bold', 
        background: isFinished ? '#f1f5f9' : '#dcfce7', 
        color: isFinished ? '#64748b' : '#166534' 
      }}>
        {isFinished ? 'Terminé' : 'En cours / À venir'}
      </span>
    );
  } else if (type === 'projects') {
    let bg = '#f1f5f9', color = '#64748b', text = 'Inconnu';
    if (item.status === 'bientot') { bg = '#fef9c3'; color = '#b45309'; text = 'Bientôt'; }
    else if (item.status === 'en_cours') { bg = '#dbeafe'; color = '#1d4ed8'; text = 'En cours'; }
    else if (item.status === 'termine') { bg = '#dcfce7'; color = '#166534'; text = 'Terminé'; }
    
    return (
      <span style={{ 
        marginLeft: '0.5rem', 
        padding: '0.2rem 0.5rem', 
        borderRadius: '12px', 
        fontSize: '0.7rem', 
        fontWeight: 'bold', 
        background: bg, 
        color: color 
      }}>
        {text}
      </span>
    );
  }
  return null;
};

const EventCard = ({ item, type, onSelect }) => (
  <div className="event-card" onClick={() => onSelect(item)}>
    {item.image_url && (
      <div className="event-card-img">
        <img src={item.image_url} alt={item.title} />
        <div className="event-card-type-badge">{type === 'events' ? '📅 Événement' : '🏗️ Projet'}</div>
        <div className="event-card-overlay">
          <Maximize2 size={24} color="white" />
        </div>
      </div>
    )}
    {!item.image_url && (
      <div className="event-card-no-img">
        <span>{type === 'events' ? '📅' : '🏗️'}</span>
      </div>
    )}
    <div className="event-card-body">
      <h3 style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        {item.title}
        {getStatusBadge(item, type)}
      </h3>
      {item.date && (
        <div className="event-card-date">
          <Calendar size={14} />
          {new Date(item.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {item.date_fin && ` - ${new Date(item.date_fin).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        </div>
      )}
      {!item.date && item.created_at && (
        <div className="event-card-date">
          <Tag size={14} />
          Publié le {new Date(item.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      )}
      <p className="event-card-desc">{item.description}</p>
      <button className="btn-text">En savoir plus <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></button>
    </div>
  </div>
);

const YearMonthSection = ({ year, month, items, type, onSelect }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="ym-section">
      <button className="ym-header" onClick={() => setOpen(o => !o)}>
        <span className="ym-month">{month.charAt(0).toUpperCase() + month.slice(1)}</span>
        <span className="ym-year-badge">{year}</span>
        <ChevronDown size={18} className={`ym-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="ym-cards">
          {items.map(item => <EventCard key={item.id} item={item} type={type} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
};

const Modal = ({ item, type, onClose }) => {
  if (!item) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={24} /></button>
        <div className="modal-body">
          {item.image_url && (
            <div className="modal-image">
              <img src={item.image_url} alt={item.title} />
            </div>
          )}
          <div className="modal-text">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="modal-badge" style={{ margin: 0 }}>{type === 'events' ? '📅 Événement' : '🏗️ Projet'}</div>
              {getStatusBadge(item, type)}
            </div>
            <h2>{item.title}</h2>
            <div className="modal-date">
              <Calendar size={16} />
              {item.date 
                ? (
                    <>
                      {new Date(item.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      {item.date_fin && ` - ${new Date(item.date_fin).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                    </>
                  )
                : `Publié le ${new Date(item.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`
              }
            </div>
            <div className="modal-description">
              {item.description.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Events = () => {
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: evts } = await supabase.from('events').select('*').order('date', { ascending: false });
      const { data: prjs } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (evts) setEvents(evts);
      if (prjs) setProjects(prjs);
      setLoading(false);
    };
    fetchData();
  }, []);

  const evtGroups = groupByYearMonth(events, 'date');
  const prjGroups = groupByYearMonth(projects, 'created_at');

  return (
    <div className="events-page">
      {/* Hero */}
      <section className="events-hero" style={{ position: 'relative' }}>
        <Link to="/" className="btn-back-hero">
          <ArrowLeft size={18} /> Retour à l'accueil
        </Link>
        <div className="events-hero-overlay"></div>
        <div className="container events-hero-content">
          <div className="section-subtitle" style={{color: '#f5d08a'}}>Commune de Manjo</div>
          <h1>Événements & Projets</h1>
          <p>Suivez les initiatives, les projets de développement et les événements qui façonnent l'avenir de Manjo.</p>
        </div>
      </section>

      {/* Tabs */}
      <div className="events-tabs-bar">
        <div className="container events-tabs">
          <button className={`events-tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
            📅 Événements ({events.length})
          </button>
          <button className={`events-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
            🏗️ Projets ({projects.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="container events-body">
        {loading ? (
          <div className="events-loading">
            <div className="loading-spinner"></div>
            <p>Chargement des données…</p>
          </div>
        ) : (
          <>
            {activeTab === 'events' && (
              <div>
                {evtGroups.length === 0
                  ? <div className="events-empty">📅 Aucun événement publié pour le moment.</div>
                  : evtGroups.map(g => <YearMonthSection key={`${g.year}-${g.month}`} {...g} type="events" onSelect={setSelectedItem} />)
                }
              </div>
            )}
            {activeTab === 'projects' && (
              <div>
                {prjGroups.length === 0
                  ? <div className="events-empty">🏗️ Aucun projet publié pour le moment.</div>
                  : prjGroups.map(g => <YearMonthSection key={`${g.year}-${g.month}`} {...g} type="projects" onSelect={setSelectedItem} />)
                }
              </div>
            )}
          </>
        )}
      </div>

      <Modal 
        item={selectedItem} 
        type={activeTab} 
        onClose={() => setSelectedItem(null)} 
      />
    </div>
  );
};

export default Events;
