import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SplashScreen } from './components/SplashScreen';
import { GitHubInputScreen } from './components/GitHubInputScreen';
import { ReceiptScreen } from './components/ReceiptScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { githubApi, GitHubApiError, type StatusEvent } from './services/githubApi';
import type { GitHubStats } from './types/github';

type Screen = 'splash' | 'github-input' | 'loading' | 'receipt' | 'error';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [error, setError] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<StatusEvent | null>(null);

  const handleSplashTouch = () => {
    setCurrentScreen('github-input');
  };

  const handleGithubSubmit = async (username: string) => {
    setCurrentScreen('loading');
    setError('');
    setCurrentUsername(username);
    setCurrentStatus(null);
    
    try {
      // SSE를 사용하여 실시간 상태 업데이트와 함께 데이터 수집
      await githubApi.getStatsWithSSE(username, {
        onStatusUpdate: (event: StatusEvent) => {
          setCurrentStatus(event);
        },
        onComplete: (data: GitHubStats) => {
          setGithubStats(data);
          setCurrentScreen('receipt');
        },
        onError: (errorMessage: string) => {
          setError(errorMessage);
          setCurrentScreen('error');
        }
      });
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
    setCurrentUsername('');
    setCurrentStatus(null);
  };

  const handleRetry = () => {
    setCurrentScreen('github-input');
    setError('');
    setCurrentStatus(null);
  };

  const handleCancelLoading = () => {
    setCurrentScreen('github-input');
    setCurrentStatus(null);
  };

  return (
    <div className="min-h-screen bg-white font-pretendard">
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastClassName="font-mono text-sm"
        bodyClassName="text-gray-800"
      />
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
          <LoadingScreen
            key="loading"
            username={currentUsername}
            currentStatus={currentStatus}
            onCancel={handleCancelLoading}
          />
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
