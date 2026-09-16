import { useEffect, useMemo, useState } from 'react'
import './App.css'

const storageKey = 'flowpilot-finance-data'
const themeKey = 'flowpilot-theme'

const navItems = [
  { label: 'Overview', target: 'overview' },
  { label: 'Transactions', target: 'transactions-section' },
  { label: 'Budgets', target: 'budgets-section' },
  { label: 'Investments', target: 'quick-add-section' },
  { label: 'Reports', target: 'cashflow-section' },
]

const monthOptions = ['All months', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const categoryLimits = [
  { category: 'Housing', limit: 1800, color: '#7c3aed' },
  { category: 'Food', limit: 1100, color: '#22c55e' },
  { category: 'Transport', limit: 600, color: '#f59e0b' },
  { category: 'Utilities', limit: 500, color: '#06b6d4' },
  { category: 'Fun', limit: 700, color: '#f43f5e' },
]

const incomeCategories = ['Income', 'Salary', 'Freelance', 'Investments', 'Bonus']
const expenseCategories = categoryLimits.map((category) => category.category)

const defaultTransactions = [
  { id: 1, name: 'Rent payment', category: 'Housing', type: 'expense', amount: 1450, date: 'Today', month: 'June' },
  { id: 2, name: 'Salary deposit', category: 'Income', type: 'income', amount: 3200, date: 'Yesterday', month: 'June' },
  { id: 3, name: 'Groceries', category: 'Food', type: 'expense', amount: 128, date: 'Mon, 9:41 AM', month: 'June' },
  { id: 4, name: 'Train pass', category: 'Transport', type: 'expense', amount: 72, date: 'Sun, 3:10 PM', month: 'May' },
  { id: 5, name: 'Freelance work', category: 'Income', type: 'income', amount: 680, date: 'Sat', month: 'May' },
]

const spendingTrend = [42, 68, 56, 84, 74, 92, 70]

const normalizeTransactions = (value) => {
  if (!Array.isArray(value)) return defaultTransactions

  const nextTransactions = value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: Number.isFinite(item.id) ? item.id : Date.now() + Math.random(),
      name: typeof item.name === 'string' ? item.name.trim() : '',
      category: typeof item.category === 'string' ? item.category.trim() : 'Food',
      type: item.type === 'income' ? 'income' : 'expense',
      amount: Number(item.amount),
      date: typeof item.date === 'string' ? item.date : 'Just now',
      month: typeof item.month === 'string' ? item.month : 'June',
    }))
    .filter((item) => item.name && Number.isFinite(item.amount) && item.amount > 0)

  return nextTransactions.length > 0 ? nextTransactions : defaultTransactions
}

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

function App() {
  const [activeSection, setActiveSection] = useState('overview')
  const [selectedMonth, setSelectedMonth] = useState('All months')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem(themeKey)
    return savedTheme ? savedTheme === 'dark' : false
  })

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem(storageKey)

    if (!saved) return defaultTransactions

    try {
      const parsed = JSON.parse(saved)
      return normalizeTransactions(parsed)
    } catch {
      return defaultTransactions
    }
  })

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    category: 'Food',
    amount: '',
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem(themeKey, isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'All months') return transactions
    return transactions.filter((item) => item.month === selectedMonth)
  }, [selectedMonth, transactions])

  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0)

    const expenses = filteredTransactions
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0)

    const savings = income - expenses
    const netWorth = 58400 + savings

    return { income, expenses, savings, netWorth }
  }, [filteredTransactions])

  const budgetData = useMemo(
    () =>
      categoryLimits.map((entry) => ({
        ...entry,
        spent: filteredTransactions
          .filter((item) => item.type === 'expense' && item.category === entry.category)
          .reduce((sum, item) => sum + item.amount, 0),
      })),
    [filteredTransactions],
  )

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleTypeChange = (event) => {
    const nextType = event.target.value

    setFormData((previous) => {
      const validCategories = nextType === 'income' ? incomeCategories : expenseCategories
      const nextCategory = validCategories.includes(previous.category) ? previous.category : validCategories[0]

      return { ...previous, type: nextType, category: nextCategory }
    })
  }

  const handleQuickAdd = (type) => {
    const nextType = type === 'income' ? 'income' : 'expense'
    const nextCategory = nextType === 'income' ? 'Income' : 'Food'

    setFormData({
      name: '',
      type: nextType,
      category: nextCategory,
      amount: '',
    })
    scrollToSection('quick-add-section')
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const amount = Number(formData.amount)
    if (!formData.name.trim() || !amount || amount <= 0) return

    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' })

    const nextTransaction = {
      id: Date.now(),
      name: formData.name.trim(),
      category: formData.category,
      type: formData.type,
      amount,
      date: 'Just now',
      month: selectedMonth === 'All months' ? currentMonth : selectedMonth,
    }

    setTransactions((previous) => [nextTransaction, ...previous])
    setFormData({
      name: '',
      type: 'expense',
      category: 'Food',
      amount: '',
    })
  }

  const percentageUsed = summary.income > 0 ? Math.min((summary.expenses / summary.income) * 100, 100) : 0

  return (
    <div className={`dashboard-shell ${isDarkMode ? 'dark' : ''}`}>
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">F</div>
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2>FlowPilot</h2>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.target}
              type="button"
              className={`nav-item ${activeSection === item.target ? 'active' : ''}`}
              onClick={() => scrollToSection(item.target)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mini-card">
          <p>Goal progress</p>
          <h3>{formatMoney(18500)}</h3>
          <div className="progress-track">
            <span style={{ width: '72%' }} />
          </div>
          <small>72% of {formatMoney(25000)} emergency fund</small>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow muted">Good morning</p>
            <h1>Financial Dashboard</h1>
          </div>

          <div className="topbar-actions">
            <label className="month-picker">
              <span>Month</span>
              <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </label>

            <button type="button" className="theme-toggle" onClick={() => setIsDarkMode((previous) => !previous)}>
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>

            <button type="button" className="ghost-button" onClick={() => scrollToSection('cashflow-section')}>
              Download report
            </button>
            <button type="button" className="primary-button" onClick={() => handleQuickAdd('income')}>
              + Add income
            </button>
          </div>
        </header>

        <section id="overview" className="summary-grid">
          <article className="summary-card">
            <p>Monthly income</p>
            <div className="summary-row">
              <h3>{formatMoney(summary.income)}</h3>
              <span className="chip positive">+4.8%</span>
            </div>
          </article>

          <article className="summary-card">
            <p>Expenses</p>
            <div className="summary-row">
              <h3>{formatMoney(summary.expenses)}</h3>
              <span className="chip neutral">-2.1%</span>
            </div>
          </article>

          <article className="summary-card">
            <p>Savings</p>
            <div className="summary-row">
              <h3>{formatMoney(summary.savings)}</h3>
              <span className="chip positive">+12.4%</span>
            </div>
          </article>

          <article className="summary-card">
            <p>Net worth</p>
            <div className="summary-row">
              <h3>{formatMoney(summary.netWorth)}</h3>
              <span className="chip positive">+8.2%</span>
            </div>
          </article>
        </section>

        <section className="panel-grid">
          <article id="cashflow-section" className="panel chart-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow muted">Spending trend</p>
                <h3>Cash flow</h3>
              </div>
              <span className="chip positive">+18.3%</span>
            </div>

            <div className="chart-bars" aria-label="Spending trend chart">
              {spendingTrend.map((value, index) => (
                <div key={index} className="bar-group">
                  <span className="bar" style={{ height: `${value}%` }} />
                  <small>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="panel donut-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow muted">Budget health</p>
                <h3>Allocation</h3>
              </div>
            </div>

            <div className="donut-wrap">
              <div className="donut-chart" style={{ background: `conic-gradient(#8b5cf6 0 ${Math.min(percentageUsed, 100)}%, #22c55e ${Math.min(percentageUsed, 100)}% 100%)` }}>
                <div className="donut-center">
                  <strong>{Math.round(percentageUsed)}%</strong>
                  <span>used</span>
                </div>
              </div>
              <ul className="legend">
                <li><span className="dot purple" /> Housing</li>
                <li><span className="dot green" /> Food</li>
                <li><span className="dot amber" /> Travel</li>
              </ul>
            </div>
          </article>
        </section>

        <section id="quick-add-section" className="quick-add-panel panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow muted">Add entry</p>
              <h3>Quick transaction</h3>
            </div>
          </div>

          <form className="transaction-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Freelance client"
                />
              </label>

              <label>
                Type
                <select name="type" value={formData.type} onChange={handleTypeChange}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
            </div>

            <div className="field-group">
              <label>
                Category
                <select name="category" value={formData.category} onChange={handleInputChange}>
                  {(formData.type === 'income' ? incomeCategories : expenseCategories).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                Amount
                <input
                  type="number"
                  name="amount"
                  min="1"
                  step="1"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="250"
                />
              </label>
            </div>

            <button type="submit" className="primary-button submit-button">Add transaction</button>
          </form>
        </section>

        <section className="bottom-grid">
          <article id="budgets-section" className="panel budgets-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow muted">Categories</p>
                <h3>Budgets</h3>
              </div>
              <button className="text-button" type="button">View all</button>
            </div>

            <div className="budget-list">
              {budgetData.map((item) => {
                const percentUsed = (item.spent / item.limit) * 100
                return (
                  <div key={item.category} className="budget-item">
                    <div className="budget-meta">
                      <div>
                        <h4>{item.category}</h4>
                        <small>
                          {formatMoney(item.spent)} / {formatMoney(item.limit)}
                        </small>
                      </div>
                      <span>{Math.round(percentUsed)}%</span>
                    </div>
                    <div className="track">
                      <span style={{ width: `${Math.min(percentUsed, 100)}%`, background: item.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </article>

          <article id="transactions-section" className="panel transactions-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow muted">Latest</p>
                <h3>Transactions</h3>
              </div>
              <button className="text-button" type="button">See all</button>
            </div>

            <ul className="transaction-list">
              {filteredTransactions.slice(0, 5).map((item) => (
                <li key={item.id} className="transaction-item">
                  <div className="transaction-main">
                    <span className="transaction-badge">{item.type === 'income' ? 'I' : item.category[0]}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.category}</small>
                    </div>
                  </div>
                  <div className="transaction-side">
                    <strong className={item.type === 'expense' ? 'negative' : 'positive'}>
                      {item.type === 'expense' ? `-${formatMoney(item.amount)}` : `+${formatMoney(item.amount)}`}
                    </strong>
                    <small>{item.date}</small>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App
