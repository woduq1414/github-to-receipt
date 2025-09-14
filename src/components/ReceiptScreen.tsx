import { motion } from 'framer-motion';
import type { GitHubStats } from '../types/github';
import { useMemo, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { toast } from 'react-toastify';

interface ReceiptScreenProps {
  githubStats: GitHubStats;
  onReset: () => void;
}

export const ReceiptScreen: React.FC<ReceiptScreenProps> = ({ githubStats, onReset }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // QR 코드 생성
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const githubUrl = `https://github.com/${githubStats.username}`;
        const qrUrl = await QRCode.toDataURL(githubUrl, {
          width: 120,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('QR 코드 생성 실패:', error);
      }
    };

    generateQRCode();
  }, [githubStats.username]);

  // 데이터 가공
  const processedData = useMemo(() => {
    const sortedCommits = [...githubStats.daily_commits].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // GitHub 스타일 contribution graph 생성
    const contributionGrid: Array<Array<{ date: string; count: number }>> = [];
    const commitMap = new Map(sortedCommits.map(c => [c.date, c.count]));

    // 가장 최근 날짜부터 시작해서 6개월 전까지
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 180);

    // 시작 날짜를 일요일로 조정
    const firstSunday = new Date(startDate);
    firstSunday.setDate(startDate.getDate() - startDate.getDay());

    // 주별로 그리드 생성 (세로 7개, 가로 약 26주)
    const totalDays = Math.ceil((endDate.getTime() - firstSunday.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(totalDays / 7);

    for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
      const currentWeek: Array<{ date: string; count: number }> = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const currentDate = new Date(firstSunday);
        currentDate.setDate(firstSunday.getDate() + (weekIndex * 7) + dayIndex);

        // 미래 날짜는 제외
        if (currentDate > endDate) break;

        const dateString = currentDate.toISOString().split('T')[0];
        currentWeek.push({
          date: dateString,
          count: commitMap.get(dateString) || 0
        });
      }
      if (currentWeek.length > 0) {
        contributionGrid.push(currentWeek);
      }
    }

    // 서버에서 계산된 전체 기간 통계 사용
    const bestDay = {
      date: githubStats.best_day.date,
      count: githubStats.best_day.count
    };

    const maxStreak = githubStats.max_streak;
    const activeDays = githubStats.active_days;

    // 월 라벨 위치 계산
    const monthLabels: Array<{ month: string; position: number }> = [];

    contributionGrid.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay) {
        const date = new Date(firstDay.date);
        const dayOfMonth = date.getDate();

        // 월의 첫 번째 주인 경우 라벨 추가
        if (dayOfMonth <= 7) {
          const monthStr = String(date.getMonth() + 1).padStart(2, '0') + '월';
          // 중복 제거
          if (!monthLabels.some(label => label.month === monthStr)) {
            monthLabels.push({
              month: monthStr,
              position: weekIndex
            });
          }
        }
      }
    });

    return {
      contributionGrid,
      bestDay,
      maxStreak,
      activeDays,
      monthLabels
    };
  }, [githubStats]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDateTime = () => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return `Since ${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.`;
  };

  const handleSaveReceipt = async () => {
    if (isPrinting) return;
    
    try {
      setIsPrinting(true);
      
      const element = document.getElementById('ReceiptScreen');
      if (!element) {
        console.error('영수증 요소를 찾을 수 없습니다.');
        toast.error('영수증 요소를 찾을 수 없습니다.');
        return;
      }

      // 요소의 실제 크기와 위치 가져오기
      const rect = element.getBoundingClientRect();

      // html-to-image를 사용하여 PNG로 변환
      const dataUrl = await toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2, // 고해상도를 위해 픽셀 비율 증가
        width: rect.width,
        height: rect.height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${rect.width}px`,
          height: `${rect.height}px`
        },
        cacheBust: true // 캐시 방지
      });

      // 서버로 이미지 전송
      const filename = `github-receipt-${githubStats.username}-${new Date().toISOString().split('T')[0]}.png`;
      
      const response = await fetch('http://localhost:8000/api/receipt/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: dataUrl,
          filename: filename
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(
          `🖨️ 영수증이 성공적으로 출력되었습니다!\n원본: ${result.original_size} → 리사이즈: ${result.resized_size}`,
          { 
            autoClose: 6000,
            style: { whiteSpace: 'pre-line' }
          }
        );
      } else {
        // 프린터 연결 실패인 경우에도 성공으로 처리 (파일은 저장됨)
        if (result.message && result.message.includes('프린터 연결 실패')) {
          toast.warning(
            `⚠️ ${result.message}\n파일은 서버에 저장되었습니다.\n원본: ${result.original_size} → 리사이즈: ${result.resized_size}`,
            { 
              autoClose: 8000,
              style: { whiteSpace: 'pre-line' }
            }
          );
        } else {
          throw new Error(result.message || '서버에서 오류가 발생했습니다.');
        }
      }

    } catch (error) {
      console.error('영수증 출력 중 오류가 발생했습니다:', error);
      toast.error(
        `❌ 영수증 출력에 실패했습니다.\n\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n다시 시도해주세요.`,
        { 
          autoClose: 8000,
          style: { whiteSpace: 'pre-line' }
        }
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const getContributionLevel = (count: number) => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
  };

  return (
    <div className="kiosk-container overflow-y-auto bg-gradient-to-br from-primary-500 to-primary-600  ">
      <div className='flex flex-col justify-center items-center'>
        <motion.div
          id="ReceiptScreen"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm  bg-white mt-[1rem]"
          style={{ minHeight: '100vh', fontFamily: 'Monaco, Consolas, monospace' }}
        >
          {/* 영수증 헤더 */}
          <div className="text-center py-4 border-b-2 border-dashed border-gray-400 w-[93%] mx-auto">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-lg font-bold mb-1">GITHUB2RECEIPT</div>
              <div className="text-sm">개발자 활동 영수증</div>
              <div className="text-xs mt-2">{formatDateTime()}</div>
            </motion.div>
          </div>

          {/* 사용자 정보 */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-[93%] mx-auto p-4 border-b-2 border-dashed border-gray-400"
          >
            <div className="flex flex-col items-center space-y-2">
              {/* 프로필 사진 */}
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                src={githubStats.avatar_url}
                alt={`${githubStats.username} 프로필`}
                className="w-16 h-16 rounded-full border-2 border-gray-300"
                style={{ filter: 'grayscale(1)' }}
              />

              {/* 기본 정보 */}
              <div className="text-center space-y-1">
                <div className="text-sm font-bold">{githubStats.name}</div>
                <div className="text-xs">@{githubStats.username}</div>
                <div className="text-xs text-gray-600">{formatJoinDate(githubStats.created_at)}</div>
              </div>

              {/* 통계 정보 */}
              <div className="flex justify-between w-full space-x-4 text-xs mt-2">
                <div className="text-center flex flex-col items-center w-1/3">
                  <div className="font-bold mb-1">{githubStats.public_repos}</div>
                  <div className="text-gray-600">레포지토리</div>
                </div>
                <div className="text-center flex flex-col items-center w-1/3">
                  <div className="font-bold mb-1">{githubStats.followers.toLocaleString()}</div>
                  <div className="text-gray-600">팔로워</div>
                </div>
                <div className="text-center flex flex-col items-center w-1/3">
                  <div className="font-bold mb-1">{githubStats.following.toLocaleString()}</div>
                  <div className="text-gray-600">팔로잉</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 구매 목록 스타일의 통계 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="p-4 border-b-2 border-dashed border-gray-400 w-[93%] mx-auto"
          >
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>총 커밋 수</span>
                <span className="font-bold">{githubStats.total_commits.toLocaleString()}개</span>
              </div>
              <div className="flex justify-between">
                <span>활동일 수</span>
                <span className="font-bold">{processedData.activeDays}일</span>
              </div>
              <div className="flex justify-between">
                <span>최대 스트릭</span>
                <span className="font-bold">{processedData.maxStreak}일</span>
              </div>
              <div className="flex justify-between">
                <span>일일 최고 기록</span>
                <span className="font-bold">{processedData.bestDay.count}개({formatDate(processedData.bestDay.date)})</span>
              </div>
            </div>
          </motion.div>

          {/* 상위 레포지토리 섹션 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-4 border-b-2 border-dashed border-gray-400 w-[93%] mx-auto"
          >
            <div className="text-center text-xs font-bold mb-3">상위 레포지토리 (최대 10개)</div>
            <div className="space-y-2">
              {githubStats.top_repositories.slice(0, Math.min(10, githubStats.top_repositories.length)).reverse().map((repo, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className={`text-xs  border-gray-300 pb-1 ${index === Math.min(10, githubStats.top_repositories.length) - 1 ? '' : 'border-b'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold ">{repo.name}</div>
                      <div className="text-gray-600 text-xs">
                        {repo.primary_language || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0 mb-1 ">
                      <div className="font-bold flex items-center gap-1"><span className="text-xl">★</span> {repo.stargazers_count.toLocaleString()}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {githubStats.top_repositories.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-2">
                  공개 레포지토리가 없습니다.
                </div>
              )}
            </div>
          </motion.div>

          {/* GitHub 스타일 Contribution Graph */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="p-4 border-b-2 border-dashed border-gray-400 flex flex-col items-center w-[93%] mx-auto"
          >
            <div className="text-center text-xs font-bold mb-3">지난 6개월 활동 그래프</div>

            {/* 월 라벨 */}
            <div className="relative text-xs mb-1 h-4">
              {processedData.monthLabels.map((label, index) => (
                <span
                  key={index}
                  className="absolute text-gray-600 w-[3rem]"
                  style={{ left: `${-(Math.floor(processedData.contributionGrid.length / 2) - label.position + 1.5) * 0.8}rem` }}
                >
                  {label.month}
                </span>
              ))}
            </div>

            {/* Contribution Grid */}
            <div className="flex gap-px justify-start overflow-x-auto pb-2" style={{ fontSize: '0' }}>
              {processedData.contributionGrid.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-px">
                  {week.map((day, dayIndex) => {
                    const level = getContributionLevel(day.count);
                    let bgColor = 'bg-gray-100'; // 0 commits

                    if (level === 1) bgColor = 'bg-gray-300'; // 1-2 commits
                    else if (level === 2) bgColor = 'bg-gray-500'; // 3-5 commits  
                    else if (level === 3) bgColor = 'bg-gray-700'; // 6-10 commits
                    else if (level === 4) bgColor = 'bg-black'; // 11+ commits

                    return (
                      <div
                        key={dayIndex}
                        className={`w-[0.80rem] h-[0.8rem] ${bgColor}`}
                        title={`${day.date}: ${day.count} commits`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-center mt-2 space-x-1 text-xs">
              <span className='text-xs'>적음</span>
              <div className="w-2.5 h-2.5 bg-gray-100"></div>
              <div className="w-2.5 h-2.5 bg-gray-300"></div>
              <div className="w-2.5 h-2.5 bg-gray-500"></div>
              <div className="w-2.5 h-2.5 bg-gray-700"></div>
              <div className="w-2.5 h-2.5 bg-black"></div>
              <span className='text-xs ml-1'>많음</span>
            </div>
          </motion.div>



          {/* GitHub QR 코드 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="p-4 text-center "
          >

            {qrCodeUrl && (
              <div className="flex flex-col items-center space-y-2">
                <img
                  src={qrCodeUrl}
                  alt="GitHub QR Code"
                  className="w-12 h-12"
                />
                <div className="text-xs text-gray-600">
                  github.com/{githubStats.username}
                </div>
              </div>
            )}
          </motion.div>

        </motion.div>
      </div>

      {/* 버튼들 - ReceiptScreen 밖에 배치 */}
      <div className="p-4 space-y-3">
        <button
          onClick={handleSaveReceipt}
          disabled={isPrinting}
          className="w-full bg-gray-600 text-white py-3 font-bold text-sm hover:bg-gray-700 transition-colors touch-button disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPrinting ? (
            <div className="flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
              />
              📤 프린터로 전송 중...
            </div>
          ) : (
            '🖨️ 영수증 출력하기'
          )}
        </button>
        <button
          onClick={onReset}
          className="w-full bg-black text-white py-3 font-bold text-sm hover:bg-gray-800 transition-colors touch-button"
        >
          새로운 사용자 조회
        </button>
      </div>
    </div>
  );
};
