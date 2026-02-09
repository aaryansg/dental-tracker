import React, { useState, useEffect } from 'react';
import {
  FaTooth,
  FaTeeth,
  FaFire,
  FaCalendarCheck,
  FaHistory,
  FaChartLine,
  FaCheckCircle,
  FaTimesCircle,
  FaClock
} from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import Sidebar from './Sidebar';
import { habitsAPI } from '../api/api';
import '../styles/Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayHabit, setTodayHabit] = useState({
    brushed: false,
    flossed: false,
    brushing_time: null
  });
  const [streakData, setStreakData] = useState({
    current_streak: 0,
    brushing_consistency: 0,
    flossing_consistency: 0,
    avg_brushing_time: 0,
    total_tracked_days: 0,
    longest_streak: 0
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [habitRes, streakRes, historyRes] = await Promise.all([
        habitsAPI.getTodayHabit(),
        habitsAPI.getStreak(),
        habitsAPI.getHistory(7)
      ]);

      setTodayHabit(habitRes.data);
      setStreakData(streakRes.data);
      setHistory(historyRes.data?.history || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const updateHabit = async (field, value) => {
    const updatedHabit = { ...todayHabit, [field]: value };
    setTodayHabit(updatedHabit);

    try {
      await habitsAPI.updateHabit(updatedHabit);
      toast.success('Habit updated successfully!');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating habit:', error);
      toast.error('Failed to update habit');
    }
  };

  const handleBrushingTimeUpdate = async (minutes) => {
    const seconds = minutes * 60;
    await updateHabit('brushing_time', seconds);
  };

  // Prepare chart data
  const chartData = {
    labels: history.map((day, index) => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }).reverse(),
    datasets: [
      {
        label: 'Brushed',
        data: history.map(day => day.brushed ? 1 : 0).reverse(),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Flossed',
        data: history.map(day => day.flossed ? 1 : 0).reverse(),
        borderColor: '#38a169',
        backgroundColor: 'rgba(56, 161, 105, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        min: 0,
        max: 1,
        ticks: {
          stepSize: 1,
          callback: (value) => value === 1 ? 'Yes' : 'No'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="main-content">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your dental dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="main-content">
        <header className="dashboard-header">
          <h1>Oral Health Dashboard</h1>
          <p className="dashboard-subtitle">
            Track your progress and maintain healthy habits
          </p>
        </header>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card streak-stat">
            <div className="stat-icon-wrapper">
              <FaFire className="stat-icon" />
            </div>
            <div className="stat-content">
              <h3>{streakData.current_streak} days</h3>
              <p>Current Streak</p>
              <span className="stat-subtext">
                Longest: {streakData.longest_streak} days
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <FaTooth className="stat-icon" />
            </div>
            <div className="stat-content">
              <h3>{Math.round(streakData.brushing_consistency)}%</h3>
              <p>Brushing Consistency</p>
              <span className="stat-subtext">
                Last 30 days
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <FaTeeth className="stat-icon" />
            </div>
            <div className="stat-content">
              <h3>{Math.round(streakData.flossing_consistency)}%</h3>
              <p>Flossing Consistency</p>
              <span className="stat-subtext">
                Last 30 days
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <FaClock className="stat-icon" />
            </div>
            <div className="stat-content">
              <h3>{Math.round(streakData.avg_brushing_time / 60)}m</h3>
              <p>Avg Brushing Time</p>
              <span className="stat-subtext">
                Recommended: 2 minutes
              </span>
            </div>
          </div>
        </div>

        {/* Today's Habits */}
        <div className="section">
          <h2 className="section-title">
            <FaCalendarCheck className="section-icon" />
            Today's Habits
          </h2>

          <div className="habit-cards">
            <div className={`habit-card ${todayHabit.brushed ? 'completed' : ''}`}>
              <div className="habit-header">
                <h3>Brushing</h3>
                <div className={`habit-status ${todayHabit.brushed ? 'completed' : 'pending'}`}>
                  {todayHabit.brushed ? (
                    <>
                      <FaCheckCircle /> Completed
                    </>
                  ) : (
                    <>
                      <FaTimesCircle /> Pending
                    </>
                  )}
                </div>
              </div>

              <p className="habit-description">
                Brush your teeth twice a day for optimal oral health
              </p>

              <div className="habit-actions">
                <button
                  className={`btn ${todayHabit.brushed ? 'btn-success' : 'btn-primary'}`}
                  onClick={() => updateHabit('brushed', !todayHabit.brushed)}
                >
                  {todayHabit.brushed ? 'Mark as Not Done' : 'Mark as Brushed'}
                </button>

                {todayHabit.brushed && (
                  <div className="brushing-time-selector">
                    <p>How long did you brush?</p>
                    <div className="time-options">
                      {[1, 2, 3, 4, 5].map((minutes) => (
                        <button
                          key={minutes}
                          className={`time-option ${todayHabit.brushing_time === minutes * 60 ? 'selected' : ''
                            }`}
                          onClick={() => handleBrushingTimeUpdate(minutes)}
                        >
                          {minutes} min
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`habit-card ${todayHabit.flossed ? 'completed' : ''}`}>
              <div className="habit-header">
                <h3>Flossing</h3>
                <div className={`habit-status ${todayHabit.flossed ? 'completed' : 'pending'}`}>
                  {todayHabit.flossed ? (
                    <>
                      <FaCheckCircle /> Completed
                    </>
                  ) : (
                    <>
                      <FaTimesCircle /> Pending
                    </>
                  )}
                </div>
              </div>

              <p className="habit-description">
                Floss daily to remove plaque between teeth
              </p>

              <div className="habit-actions">
                <button
                  className={`btn ${todayHabit.flossed ? 'btn-success' : 'btn-primary'}`}
                  onClick={() => updateHabit('flossed', !todayHabit.flossed)}
                >
                  {todayHabit.flossed ? 'Mark as Not Done' : 'Mark as Flossed'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Overview Chart */}
        <div className="section">
          <h2 className="section-title">
            <FaChartLine className="section-icon" />
            Weekly Overview
          </h2>

          <div className="chart-container">
            <div className="chart-wrapper">
              <Line data={chartData} options={chartOptions} />
            </div>

            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color brushed"></div>
                <span>Brushing Days</span>
              </div>
              <div className="legend-item">
                <div className="legend-color flossed"></div>
                <span>Flossing Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent History */}
        <div className="section">
          <h2 className="section-title">
            <FaHistory className="section-icon" />
            Recent History
          </h2>

          <div className="history-table">
            <div className="table-header">
              <span>Date</span>
              <span>Brushed</span>
              <span>Flossed</span>
              <span>Brushing Time</span>
            </div>

            {history.slice(0, 5).map((day, index) => (
              <div key={index} className="table-row">
                <span>
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <span>
                  {day.brushed ? (
                    <span className="status-success">✓</span>
                  ) : (
                    <span className="status-missing">✗</span>
                  )}
                </span>
                <span>
                  {day.flossed ? (
                    <span className="status-success">✓</span>
                  ) : (
                    <span className="status-missing">✗</span>
                  )}
                </span>
                <span>
                  {day.brushing_time
                    ? `${Math.round(day.brushing_time / 60)}m`
                    : '-'
                  }
                </span>
              </div>
            ))}

            {history.length === 0 && (
              <div className="no-history">
                <p>No history available. Start tracking your habits today!</p>
              </div>
            )}
          </div>
        </div>

        {/* Motivation Section */}
        <div className="motivation-section">
          <div className="motivation-content">
            <h3>Keep up the great work! 🦷</h3>
            <p>
              {streakData.current_streak > 7
                ? `Amazing! You're on a ${streakData.current_streak}-day streak! 
                   Consistency is key to maintaining excellent oral health.`
                : streakData.current_streak > 0
                  ? `Great job! You're on a ${streakData.current_streak}-day streak. 
                   Keep going to build a strong dental care routine.`
                  : 'Start your streak today! Mark your habits to begin tracking your progress.'
              }
            </p>

            {streakData.brushing_consistency < 80 && (
              <div className="tip-card">
                <h4>💡 Tip of the Day</h4>
                <p>
                  Try setting a daily reminder to brush your teeth at the same times each day.
                  Consistency helps build lasting habits!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;