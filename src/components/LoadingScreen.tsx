import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { StatusEvent } from '../services/githubApi';

interface LoadingScreenProps {
    username: string;
    currentStatus: StatusEvent | null;
    onCancel?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    username,
    currentStatus,
    onCancel
}) => {
    const [dots, setDots] = useState('');

    // 애니메이션 점들
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => {
                if (prev === '...') return '';
                return prev + '.';
            });
        }, 500);

        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (type: string) => {
        switch (type) {
            case 'start':
                return '🚀';
            case 'api_call':
                return '📡';
            case 'processing':
                return '⚙️';
            case 'complete':
                return '✅';
            case 'error':
                return '❌';
            default:
                return '🔄';
        }
    };

    const getProgressColor = (progress: number) => {
        if (progress < 10) return 'bg-blue-300';
        if (progress < 25) return 'bg-blue-400';
        if (progress < 50) return 'bg-primary-400';
        if (progress < 75) return 'bg-primary-500';
        if (progress < 90) return 'bg-green-400';
        return 'bg-green-500';
    };

    return (
        <div className="kiosk-container bg-gradient-to-br from-primary-500 to-primary-600 flex flex-col items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl"
            >
                {/* 헤더 */}
                <div className="text-center mb-6">

                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        GitHub 데이터 수집 중{dots}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        사용자: <span className="font-bold">{username}</span>
                    </p>
                </div>

                {/* 진행 상황 */}
                {currentStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        {/* 진행률 바 */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">진행률</span>
                                <span className="text-sm font-bold text-gray-900">
                                    {currentStatus.progress}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${currentStatus.progress}%` }}
                                    transition={{ 
                                        duration: 0.8, 
                                        ease: "easeInOut",
                                        type: "spring",
                                        damping: 20,
                                        stiffness: 100
                                    }}
                                    className={`h-3 rounded-full transition-colors duration-300 ${getProgressColor(currentStatus.progress)}`}
                                />
                            </div>
                        </div>

                        {/* 현재 상태 메시지 */}
                        <div

                            className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg"
                        >
                            <motion.div
                                key={currentStatus.message}
                                initial={{ opacity: 0.8, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                            >

                                <span className="text-sm text-gray-700 flex-1">
                                {getStatusIcon(currentStatus.type)} {currentStatus.message}
                                </span>
                            </motion.div>
                        </div>

                        {/* 타임스탬프 */}
                        <div className="text-xs text-gray-500 text-right mt-2">
                            {new Date(currentStatus.timestamp).toLocaleTimeString('ko-KR')}
                        </div>
                    </motion.div>
                )}

                {/* 로딩 애니메이션 */}
                <div className="flex justify-center mb-6">
                    <div className="flex space-x-1">
                        {[0, 1, 2].map((index) => (
                            <motion.div
                                key={index}
                                animate={{
                                    y: [0, -10, 0],
                                    opacity: [0.5, 1, 0.5]
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: index * 0.2,
                                    ease: "easeInOut"
                                }}
                                className="w-3 h-3 bg-primary-500 rounded-full"
                            />
                        ))}
                    </div>
                </div>

                {/* API 호출 단계 표시 */}
                {/* <div className="space-y-2 mb-6">
          <div className="text-sm font-medium text-gray-700 mb-3">처리 단계:</div>
          
          {[
            { key: 'start', label: '사용자 정보 조회', icon: '👤' },
            { key: 'api_call', label: 'GitHub API 호출', icon: '📡' },
            { key: 'processing', label: '데이터 분석', icon: '⚙️' },
            { key: 'complete', label: '완료', icon: '✅' }
          ].map((step, index) => {
            const isActive = currentStatus && 
              (step.key === 'start' && currentStatus.progress >= 0) ||
              (step.key === 'api_call' && currentStatus.progress >= 10) ||
              (step.key === 'processing' && currentStatus.progress >= 90) ||
              (step.key === 'complete' && currentStatus.progress >= 100);
            
            const isCompleted = currentStatus &&
              (step.key === 'start' && currentStatus.progress > 10) ||
              (step.key === 'api_call' && currentStatus.progress > 90) ||
              (step.key === 'processing' && currentStatus.progress >= 100);

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0.3 }}
                animate={{ 
                  opacity: isCompleted ? 1 : isActive ? 0.8 : 0.3,
                  scale: isActive ? 1.05 : 1
                }}
                className={`flex items-center space-x-2 p-2 rounded ${
                  isCompleted ? 'bg-green-50 text-green-700' :
                  isActive ? 'bg-blue-50 text-blue-700' : 
                  'bg-gray-50 text-gray-500'
                }`}
              >
                <span className="text-lg">{step.icon}</span>
                <span className="text-sm">{step.label}</span>
                {isCompleted && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto text-green-500"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div> */}

                {/* 취소 버튼 */}
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                        취소
                    </button>
                )}


            </motion.div>
        </div>
    );
};
