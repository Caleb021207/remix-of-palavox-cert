
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from './auth/AuthModal';
import { useUILanguage } from '@/contexts/UILanguageContext';
import LanguageSelector from './LanguageSelector';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { t } = useUILanguage();
  const [showAuthModal, setShowAuthModal] = useState(false);

  console.log('Navbar: t object:', t);
  console.log('Navbar: t.navbar:', t?.navbar);

  const handleSignOut = async () => {
    await signOut();
  };

  // Add fallback values if translations are not loaded
  const navbarTexts = {
    takeTest: t?.navbar?.takeTest || "Take Test",
    welcome: t?.navbar?.welcome || "Welcome",
    signOut: t?.navbar?.signOut || "Sign Out",
    signIn: t?.navbar?.signIn || "Sign In"
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container-custom">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-palavox-purple">Palavox</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link to="/test">
                <Button variant="ghost" className="text-gray-600 hover:text-palavox-purple">
                  {navbarTexts.takeTest}
                </Button>
              </Link>

              {user && (
                <>
                  <Link to="/progress">
                    <Button variant="ghost" className="text-gray-600 hover:text-palavox-purple">
                      My Progress
                    </Button>
                  </Link>
                  <Link to="/teacher">
                    <Button variant="ghost" className="text-gray-600 hover:text-palavox-purple">
                      Teacher
                    </Button>
                  </Link>
                </>
              )}

              
              <LanguageSelector />
              
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {navbarTexts.welcome}, {user.email}
                  </span>
                  <Button 
                    variant="outline" 
                    onClick={handleSignOut}
                    className="border-palavox-purple text-palavox-purple hover:bg-palavox-purple hover:text-white"
                  >
                    {navbarTexts.signOut}
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  className="bg-palavox-purple hover:bg-palavox-purple/90 text-white"
                >
                  {navbarTexts.signIn}
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

export default Navbar;
