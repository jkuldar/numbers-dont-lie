// Charts component using Chart.js
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export class Charts {
  constructor(container, api) {
    this.container = container;
    this.api = api;
    this.charts = {};
  }

  async load() {
    try {
      const [weightHistory, activityEntries, profile] = await Promise.all([
        this.api.getWeightHistory().catch(() => []),
        this.api.getActivityEntries().catch(() => []),
        this.api.getHealthProfile().catch(() => null),
      ]);

      this.render(weightHistory, activityEntries, profile);
    } catch (error) {
      console.error('Failed to load charts:', error);
    }
  }

  render(weightHistory, activityEntries, profile) {
    this.container.innerHTML = `
      <div class="charts-section">
        <h2>Progress & Trends</h2>
        
        <div class="chart-grid">
          <div class="chart-card">
            <h3>Weight Progress</h3>
            <canvas id="weight-chart"></canvas>
          </div>

          <div class="chart-card">
            <h3>Activity Trends</h3>
            <canvas id="activity-chart"></canvas>
          </div>

          <div class="chart-card">
            <h3>Wellness Score History</h3>
            <canvas id="wellness-chart"></canvas>
          </div>
        </div>
      </div>
    `;

    // Render charts
    this.renderWeightChart(weightHistory, profile);
    this.renderActivityChart(activityEntries);
    this.renderWellnessChart(profile);
  }

  renderWeightChart(weightHistory, profile) {
    const canvas = document.getElementById('weight-chart');
    if (!canvas) return;

    // Destroy previous chart
    if (this.charts.weight) {
      this.charts.weight.destroy();
    }

    // Sort by date
    const sorted = [...weightHistory].sort((a, b) => 
      new Date(a.recordedAt) - new Date(b.recordedAt)
    );

    const labels = sorted.map(entry => 
      new Date(entry.recordedAt).toLocaleDateString()
    );
    const weights = sorted.map(entry => entry.weightKg);

    // Add target line if available
    const targetWeight = profile?.targetWeightKg;
    const targetLine = targetWeight ? Array(labels.length).fill(targetWeight) : [];

    const ctx = canvas.getContext('2d');
    this.charts.weight = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Weight (kg)',
            data: weights,
            borderColor: 'rgb(108, 240, 194)',
            backgroundColor: 'rgba(108, 240, 194, 0.1)',
            tension: 0.3,
            fill: true,
          },
          ...(targetLine.length > 0 ? [{
            label: 'Target Weight',
            data: targetLine,
            borderColor: 'rgb(255, 107, 107)',
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
          }] : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: {
            labels: {
              color: '#e8ecf5',
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            ticks: { color: '#9aa0b5' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
          },
          x: {
            ticks: { color: '#9aa0b5' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
          },
        },
      },
    });
  }

  renderActivityChart(activityEntries) {
    const canvas = document.getElementById('activity-chart');
    if (!canvas) return;

    if (this.charts.activity) {
      this.charts.activity.destroy();
    }

    // Group by week
    const weeklyData = this.groupByWeek(activityEntries);
    const labels = Object.keys(weeklyData).slice(-8); // Last 8 weeks
    const counts = labels.map(week => weeklyData[week]);

    const ctx = canvas.getContext('2d');
    this.charts.activity = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Activities per week',
          data: counts,
          backgroundColor: 'rgba(108, 240, 194, 0.6)',
          borderColor: 'rgb(108, 240, 194)',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: {
            labels: { color: '#e8ecf5' },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { 
              color: '#9aa0b5',
              stepSize: 1,
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
          },
          x: {
            ticks: { color: '#9aa0b5' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
          },
        },
      },
    });
  }

  renderWellnessChart(profile) {
    const canvas = document.getElementById('wellness-chart');
    if (!canvas) return;

    if (this.charts.wellness) {
      this.charts.wellness.destroy();
    }

    // Mock wellness history (in real app, this would come from backend)
    const mockData = this.generateMockWellnessHistory(profile?.wellnessScore || 0);

    const ctx = canvas.getContext('2d');
    this.charts.wellness = new Chart(ctx, {
      type: 'line',
      data: {
        labels: mockData.labels,
        datasets: [{
          label: 'Wellness Score',
          data: mockData.scores,
          borderColor: 'rgb(108, 240, 194)',
          backgroundColor: 'rgba(108, 240, 194, 0.1)',
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: {
            labels: { color: '#e8ecf5' },
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { color: '#9aa0b5' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
          },
          x: {
            ticks: { color: '#9aa0b5' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
          },
        },
      },
    });
  }

  groupByWeek(activities) {
    const weeks = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.loggedAt);
      const week = this.getWeekLabel(date);
      weeks[week] = (weeks[week] || 0) + 1;
    });

    return weeks;
  }

  getWeekLabel(date) {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week}`;
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  }

  generateMockWellnessHistory(currentScore) {
    // Generate last 30 days of data
    const labels = [];
    const scores = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      // Simulate gradual improvement toward current score
      const variance = Math.random() * 10 - 5;
      const baseScore = currentScore - (i * 0.5);
      scores.push(Math.max(0, Math.min(100, baseScore + variance)));
    }

    return { labels, scores };
  }

  destroy() {
    Object.values(this.charts).forEach(chart => chart.destroy());
    this.charts = {};
  }
}
