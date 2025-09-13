import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { VirtualKeyboard } from './VirtualKeyboard';

interface GitHubInputScreenProps {
  onSubmit: (username: string) => void;
}

export const GitHubInputScreen: React.FC<GitHubInputScreenProps> = ({ onSubmit }) => {
  const [username, setUsername] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 컴포넌트 마운트 시 자동으로 키보드 표시
    const timer = setTimeout(() => {
      setIsKeyboardVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleInputFocus = () => {
    setIsKeyboardVisible(true);
  };

  const handleKeyPress = (key: string) => {
    setUsername(prev => prev + key);
  };

  const handleBackspace = () => {
    setUsername(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    // 여기서 실제 GitHub API 호출이나 다른 로직을 수행할 수 있습니다
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    setIsLoading(false);
    onSubmit(username.trim());
  };

  const handleEnter = () => {
    handleSubmit();
  };

  return (
    <div className="kiosk-container bg-white relative">
      {/* 헤더 */}
      <div className="pt-16 pb-8 px-8 text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-primary-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            GitHub 아이디 입력
          </h1>
          <p className="text-lg text-gray-600">
            GitHub 사용자명을 입력해주세요
          </p>
        </motion.div>
      </div>

      {/* 입력 영역 */}
      <div className="px-8 mb-8">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative"
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
              onFocus={handleInputFocus}
              placeholder="예: octocat"
              className="w-full h-16 px-6 text-2xl font-medium bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:bg-white transition-all duration-200 outline-none touch-button"
              style={{ caretColor: '#f97316' }}
        
            />
            {username && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setUsername('')}
                style={{ transform: 'translateY(-50%)' }}
                className="absolute right-4 top-[25%] w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-400 "
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </div>
          
          {/* GitHub 사용자명 힌트 */}
          {/* <div className="mt-4 text-sm text-gray-500 space-y-1">
            <p>• 영문자, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능</p>
            <p>• 대소문자 구분하지 않음</p>
          </div> */}
        </motion.div>
      </div>

      {/* 확인 버튼 */}
      <div className="px-8 mb-8">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!username.trim() || isLoading}
          className={`
            w-full h-16 rounded-2xl font-bold text-xl transition-all duration-200 touch-button
            ${username.trim() && !isLoading
              ? 'bg-primary-500 text-white shadow-lg hover:bg-primary-600 active:shadow-md'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mr-3"
              />
              확인 중...
            </div>
          ) : (
            '확인'
          )}
        </motion.button>
      </div>

      {/* 가상 키보드 */}
      <VirtualKeyboard
        isVisible={isKeyboardVisible}
        onKeyPress={handleKeyPress}
        onBackspace={handleBackspace}
        onEnter={handleEnter}
      />
    </div>
  );
};
