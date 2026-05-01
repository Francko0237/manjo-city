import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Feed from './pages/Feed';
import Info from './pages/Info';
import About from './pages/About';
import Events from './pages/Events';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Groups from './pages/Groups';
import UsersList from './pages/UsersList';
import PublicProfile from './pages/PublicProfile';
import DevInfo from './pages/DevInfo';
import Reviews from './pages/Reviews';
import './index.css';


function App() {
  useEffect(() => {
    const trackVisit = async () => {
      // On vérifie si on a déjà compté cette session
      if (!sessionStorage.getItem('manjo_visit_tracked')) {
        try {
          await supabase.from('site_visits').insert([{}]);
          sessionStorage.setItem('manjo_visit_tracked', 'true');
        } catch (error) {
          console.error("Erreur de suivi des visiteurs:", error);
        }
      }
    };
    
    trackVisit();
  }, []);

  return (
    <Router>
      <div className="App">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/info" element={<Info />} />
            <Route path="/about" element={<About />} />
            <Route path="/events" element={<Events />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/devinfo" element={<DevInfo />} />
            <Route path="/avis" element={<Reviews />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
