import { motion } from 'framer-motion';
import type { GitHubStats } from '../types/github';
import { useMemo } from 'react';

interface ReceiptScreenProps {
  githubStats: GitHubStats;
  onReset: () => void;
}

export const ReceiptScreen: React.FC<ReceiptScreenProps> = ({ githubStats, onReset }) => {
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

  const getContributionLevel = (count: number) => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
  };

  return (
    <div className="kiosk-container bg-white overflow-y-auto font-mono">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm mx-auto bg-white"
        style={{ minHeight: '100vh', fontFamily: 'Monaco, Consolas, monospace' }}
      >
        {/* 영수증 헤더 */}
        <div className="text-center py-4 border-b-2 border-dashed border-gray-800">
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
          className="p-4 border-b-2 border-dashed border-gray-800"
        >
          <div className="text-center space-y-1">
            <div className="text-sm font-bold">{githubStats.name}</div>
            <div className="text-xs">@{githubStats.username}</div>
            <div className="text-xs">공개 레포지토리 : {githubStats.public_repos}개</div>
          </div>
        </motion.div>

        {/* 구매 목록 스타일의 통계 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 border-b-2 border-dashed border-gray-800"
        >
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>총 커밋수</span>
              <span className="font-bold">{githubStats.total_commits.toLocaleString()}개</span>
            </div>
            <div className="flex justify-between">
              <span>활동일수</span>
              <span className="font-bold">{processedData.activeDays}일</span>
            </div>
            <div className="flex justify-between">
              <span>최대연속일</span>
              <span className="font-bold">{processedData.maxStreak}일</span>
            </div>
            <div className="flex justify-between">
              <span>최고기록</span>
              <span className="font-bold">{processedData.bestDay.count}개 ({formatDate(processedData.bestDay.date)})</span>
            </div>
          </div>
        </motion.div>

        {/* 상위 레포지토리 섹션 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 border-b-2 border-dashed border-gray-800"
        >
          <div className="text-center text-xs font-bold mb-3">상위 레포지토리 (최대 10개)</div>
          <div className="space-y-2">
            {githubStats.top_repositories.slice(0, 10).reverse().map((repo, index) => (
              <motion.div
                key={index}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="text-xs border-b border-gray-300 pb-1"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{repo.name}</div>
                    <div className="text-gray-600 text-xs">
                      {repo.primary_language || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0 mb-1">
                    <div className="font-bold"><span className="text-xl">★</span> {repo.stargazers_count.toLocaleString()}</div>
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
          className="p-4 border-b-2 border-dashed border-gray-800 flex flex-col items-center"
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
            <span>적음</span>
            <div className="w-2.5 h-2.5 bg-gray-100"></div>
            <div className="w-2.5 h-2.5 bg-gray-300"></div>
            <div className="w-2.5 h-2.5 bg-gray-500"></div>
            <div className="w-2.5 h-2.5 bg-gray-700"></div>
            <div className="w-2.5 h-2.5 bg-black"></div>
            <span>많음</span>
          </div>
        </motion.div>

        {/* 영수증 푸터 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="p-4 text-center border-b-2 border-dashed border-gray-800"
        >
          <div className="text-xs space-y-1">
            <div>감사합니다!</div>
            <div>GitHub2Receipt v1.0.0</div>
            <div>문의: github2receipt@example.com</div>
          </div>
        </motion.div>

        {/* 새로운 조회 버튼 */}
        <div className="p-4">
          <button
            onClick={onReset}
            className="w-full bg-black text-white py-3 font-bold text-sm hover:bg-gray-800 transition-colors touch-button"
          >
            새로운 사용자 조회
          </button>
        </div>
      </motion.div>
    </div>
  );
};
