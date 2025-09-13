import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SplashScreen } from './components/SplashScreen';
import { GitHubInputScreen } from './components/GitHubInputScreen';
import { ReceiptScreen } from './components/ReceiptScreen';
import { githubApi, GitHubApiError } from './services/githubApi';
import type { GitHubStats } from './types/github';

type Screen = 'splash' | 'github-input' | 'loading' | 'receipt' | 'error';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [error, setError] = useState<string>('');

  const handleSplashTouch = () => {
    setCurrentScreen('github-input');
  };

  const handleGithubSubmit = async (username: string) => {
    setCurrentScreen('loading');
    setError('');
    
    try {
      const stats = await githubApi.getStats(username);
      setGithubStats(stats);
      setCurrentScreen('receipt');
    } catch (error) {
      console.error('GitHub API 오류:', error);
      
      if (error instanceof GitHubApiError) {
        setError(error.message);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
      
      setCurrentScreen('error');
    }
  };

  const handleReset = () => {
    setCurrentScreen('splash');
    setGithubStats(null);
    setError('');
  };

  const handleRetry = () => {
    setCurrentScreen('github-input');
    setError('');
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
        
        {currentScreen === 'loading' && (
          <div key="loading" className="kiosk-container flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <h1 className="text-2xl font-bold mb-4 text-gray-900">데이터 분석 중...</h1>
              <p className="text-gray-600">GitHub에서 정보를 가져오고 있습니다</p>
            </div>
          </div>
        )}
        
        {currentScreen === 'receipt' && githubStats && (
          <ReceiptScreen
            key="receipt"
            githubStats={githubStats}
            onReset={handleReset}
          />
        )}
        
        {currentScreen === 'error' && (
          <div key="error" className="kiosk-container flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4 text-gray-900">오류가 발생했습니다</h1>
              <p className="text-gray-600 mb-8">{error}</p>
              <div className="space-y-4">
                <button
                  onClick={handleRetry}
                  className="w-full bg-primary-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-600 transition-colors touch-button"
                >
                  다시 시도
                </button>
                <button
                  onClick={handleReset}
                  className="w-full bg-gray-300 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-400 transition-colors touch-button"
                >
                  처음으로
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
