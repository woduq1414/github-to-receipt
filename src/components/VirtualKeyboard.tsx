import { motion } from 'framer-motion';
import { useState } from 'react';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  isVisible: boolean;
}

const KEYBOARD_LAYOUT = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const NUMBERS_ROW = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onEnter,
  isVisible,
}) => {
  const [isShiftActive, setIsShiftActive] = useState(false);

  const handleKeyPress = (key: string) => {
    const finalKey = isShiftActive ? key.toUpperCase() : key;
    onKeyPress(finalKey);
    if (isShiftActive) {
      setIsShiftActive(false); // 한 번 누르면 Shift 해제
    }
  };

  const KeyButton: React.FC<{ 
    children: React.ReactNode; 
    onClick: () => void; 
    className?: string;
    isSpecial?: boolean;
  }> = ({ children, onClick, className = '', isSpecial = false }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        touch-button bg-white border border-gray-200 rounded-lg font-medium text-gray-800
        shadow-sm active:shadow-none transition-all duration-150 select-none
        ${isSpecial ? 'text-sm px-3' : 'text-lg'} 
        ${className}
      `}
      style={{ touchAction: 'manipulation' }}
    >
      {children}
    </motion.button>
  );

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute bottom-0 left-0 right-0 bg-gray-100 p-4 shadow-lg border-t border-gray-200"
      style={{  margin: '0 auto' }}
    >
      <div className="space-y-3">
        {/* 숫자 행 */}
        <div className="grid grid-cols-10 gap-2">
          {NUMBERS_ROW.map((num) => (
            <KeyButton
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-12"
            >
              {num}
            </KeyButton>
          ))}
        </div>

        {/* 첫 번째 행 */}
        <div className="grid grid-cols-10 gap-2">
          {KEYBOARD_LAYOUT[0].map((key) => (
            <KeyButton
              key={key}
              onClick={() => handleKeyPress(key)}
              className="h-12"
            >
              {isShiftActive ? key.toUpperCase() : key}
            </KeyButton>
          ))}
        </div>

        {/* 두 번째 행 */}
        <div className="grid grid-cols-9 gap-2 px-5">
          {KEYBOARD_LAYOUT[1].map((key) => (
            <KeyButton
              key={key}
              onClick={() => handleKeyPress(key)}
              className="h-12"
            >
              {isShiftActive ? key.toUpperCase() : key}
            </KeyButton>
          ))}
        </div>

        {/* 세 번째 행 */}
        <div className="flex gap-2">
          <KeyButton
            onClick={() => setIsShiftActive(!isShiftActive)}
            className={`h-12 flex-1 max-w-[100px] ${
              isShiftActive ? 'bg-primary-100 text-primary-700 border-primary-300' : ''
            }`}
            isSpecial
          >
            ⇧
          </KeyButton>
          <div className="flex-1 grid grid-cols-7 gap-2">
            {KEYBOARD_LAYOUT[2].map((key) => (
              <KeyButton
                key={key}
                onClick={() => handleKeyPress(key)}
                className="h-12"
              >
                {isShiftActive ? key.toUpperCase() : key}
              </KeyButton>
            ))}
          </div>
          <KeyButton
            onClick={onBackspace}
            className="h-12 flex-1 max-w-[100px]"
            isSpecial
          >
            ⌫
          </KeyButton>
        </div>

        {/* 네 번째 행 - 스페이스바와 특수키들 */}
        <div className="flex gap-2">
          <KeyButton
            onClick={() => handleKeyPress('-')}
            className="h-12 flex-1 max-w-[100px]"
            isSpecial
          >
            -
          </KeyButton>
          <KeyButton
            onClick={() => handleKeyPress('_')}
            className="h-12 flex-1 max-w-[100px]"
            isSpecial
          >
            _
          </KeyButton>
          <KeyButton
            onClick={() => handleKeyPress(' ')}
            className="h-12 flex-1 min-w-[200px]"
            isSpecial
          >
            스페이스
          </KeyButton>
          <KeyButton
            onClick={() => handleKeyPress('.')}
            className="h-12 flex-1 max-w-[100px]"
            isSpecial
          >
            .
          </KeyButton>
          <KeyButton
            onClick={onEnter}
            className="h-12 flex-1 max-w-[200px] bg-primary-500  border-primary-500"
            isSpecial
          >
            완료
          </KeyButton>
        </div>
      </div>
    </motion.div>
  );
};
