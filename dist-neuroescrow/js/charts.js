/**
 * Charts Module for Accounting Dashboard
 * Uses Chart.js for income/expense visualization
 */

class ChartsModule {
    constructor() {
        this.charts = {};
    }

    /**
     * Create or update balance chart
     */
    renderBalanceChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = data.map(d => d.date);
        const income = data.map(d => d.income);
        const expense = data.map(d => d.expense);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Доход',
                        data: income,
                        backgroundColor: '#34c759',
                        borderRadius: 4,
                        borderSkipped: false,
                    },
                    {
                        label: 'Расход',
                        data: expense,
                        backgroundColor: '#ff3b30',
                        borderRadius: 4,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 16,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' USDT';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { size: 11 },
                            callback: function(value) {
                                return value.toFixed(0);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    /**
     * Create pie chart for transaction types
     */
    renderTypeChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const labels = Object.keys(data);
        const values = Object.values(data);
        const colors = ['#34c759', '#007aff', '#ff9500', '#ff3b30', '#af52de', '#5856d6'];

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 12,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    /**
     * Generate sample data for demo
     */
    generateSampleData(period = 'week') {
        const days = period === 'week' ? 7 : 30;
        const data = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
                income: Math.random() * 200 + 50,
                expense: Math.random() * 100 + 20
            });
        }
        
        return data;
    }

    /**
     * Generate sample type distribution
     */
    generateSampleTypes() {
        return {
            'Пополнение': 450,
            'Выплата': 280,
            'Эскроу': 150,
            'Возврат': 80,
            'Комиссия': 40
        };
    }
}

// Singleton instance
const charts = new ChartsModule();
