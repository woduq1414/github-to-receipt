import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SplashScreen } from './components/SplashScreen';
import { GitHubInputScreen } from './components/GitHubInputScreen';

type Screen = 'splash' | 'github-input' | 'receipt';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [githubUsername, setGithubUsername] = useState<string>('');

  const handleSplashTouch = () => {
    setCurrentScreen('github-input');
  };

  const handleGithubSubmit = (username: string) => {
    setGithubUsername(username);
    setCurrentScreen('receipt');
    console.log('GitHub 사용자명:', username);
  };

  return (
    <div className="min-h-screen bg-white font-pretendard">
      <AnimatePresence mode="wait">
        {currentScreen === 'splash' && (
          <SplashScreen
            key="splash"
            onTouch={handleSplashTouch}
          />
        )}
        
        {currentScreen === 'github-input' && (
          <GitHubInputScreen
            key="github-input"
            onSubmit={handleGithubSubmit}
          />
        )}
        
        {currentScreen === 'receipt' && (
          <div key="receipt" className="kiosk-container flex items-center justify-center">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold mb-4">영수증 생성 중...</h1>
              <p className="text-gray-600">사용자: {githubUsername}</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
