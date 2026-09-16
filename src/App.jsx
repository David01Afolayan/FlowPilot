import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const storageKey = 'flowpilot-finance-data'
const themeKey = 'flowpilot-theme'
const settingsKey = 'flowpilot-settings'

const monthOptions = ['All months', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const incomeCategories = ['Income', 'Salary', 'Freelance', 'Investments', 'Bonus']
const categoryDefaults = [
  { category: 'Housing', limit: 1800, color: '#7c3aed' },
  { category: 'Food', limit: 1100, color: '#22c55e' },
  { category: 'Transport', limit: 600, color: '#f59e0b' },
  { category: 'Utilities', limit: 500, color: '#06b6d4' },
  { category: 'Fun', limit: 700, color: '#f43f5e' },
]
const expenseCategories = categoryDefaults.map(({ category }) => category)
const defaultTransactions = [
  { id: 1, name: 'Rent payment', category: 'Housing', type: 'expense', amount: 1450, date: 'Today', month: 'June', account: 'Checking' },
  { id: 2, name: 'Salary deposit', category: 'Income', type: 'income', amount: 3200, date: 'Yesterday', month: 'June', account: 'Checking' },
  { id: 3, name: 'Groceries', category: 'Food', type: 'expense', amount: 128, date: 'Mon, 9:41 AM', month: 'June', account: 'Checking' },
  { id: 4, name: 'Train pass', category: 'Transport', type: 'expense', amount: 72, date: 'Sun, 3:10 PM', month: 'May', account: 'Checking' },
  { id: 5, name: 'Freelance work', category: 'Income', type: 'income', amount: 680, date: 'Sat', month: 'May', account: 'Checking' },
]
const defaultGoals = [{ id: 1, name: 'Emergency fund', target: 25000, current: 18500, deadline: '2027-12-31' }]
const defaultAccounts = [
  { id: 1, name: 'Checking', type: 'Cash', balance: 12400 },
  { id: 2, name: 'Savings', type: 'Savings', balance: 18500 },
  { id: 3, name: 'Investments', type: 'Investment', balance: 22100 },
]
const defaultDebts = [{ id: 1, name: 'Credit card', balance: 3200, apr: 21.9, minimum: 120 }]

const formatMoney = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const readStorage = (key, fallback) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key))
    return parsed ?? fallback
  } catch {
    return fallback
  }
}
const normalizeTransactions = (value) => {
  if (!Array.isArray(value)) return defaultTransactions
  const next = value.map((item) => ({
    id: item.id ?? Date.now() + Math.random(),
    name: typeof item.name === 'string' ? item.name.trim() : '',
    category: typeof item.category === 'string' ? item.category : 'Food',
    type: item.type === 'income' ? 'income' : 'expense',
    amount: Number(item.amount),
    date: item.date || 'Just now',
    month: item.month || 'June',
    account: item.account || 'Checking',
    recurring: Boolean(item.recurring),
  })).filter((item) => item.name && Number.isFinite(item.amount) && item.amount > 0)
  return next.length ? next : defaultTransactions
}

function App() {
  const fileInputRef = useRef(null)
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem(themeKey) === 'dark')
  const [selectedMonth, setSelectedMonth] = useState('All months')
  const [activeSection, setActiveSection] = useState('overview')
  const [transactions, setTransactions] = useState(() => normalizeTransactions(readStorage(storageKey, defaultTransactions)))
  const [budgets, setBudgets] = useState(() => readStorage('flowpilot-budgets', categoryDefaults))
  const [goals, setGoals] = useState(() => readStorage('flowpilot-goals', defaultGoals))
  const [accounts, setAccounts] = useState(() => readStorage('flowpilot-accounts', defaultAccounts))
  const [recurring, setRecurring] = useState(() => readStorage('flowpilot-recurring', []))
  const [debts, setDebts] = useState(() => readStorage('flowpilot-debts', defaultDebts))
  const [auditLog, setAuditLog] = useState(() => readStorage('flowpilot-audit', []))
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', type: 'expense', category: 'Food', amount: '', account: 'Checking', recurring: false })
  const [goalForm, setGoalForm] = useState({ name: '', target: '', current: '', deadline: '' })
  const [accountForm, setAccountForm] = useState({ name: '', type: 'Cash', balance: '' })
  const [showRecurring, setShowRecurring] = useState(false)
  const [notice, setNotice] = useState('')
  const [debtForm, setDebtForm] = useState({ name: '', balance: '', apr: '', minimum: '' })

  useEffect(() => localStorage.setItem(storageKey, JSON.stringify(transactions)), [transactions])
  useEffect(() => localStorage.setItem(themeKey, isDarkMode ? 'dark' : 'light'), [isDarkMode])
  useEffect(() => localStorage.setItem('flowpilot-budgets', JSON.stringify(budgets)), [budgets])
  useEffect(() => localStorage.setItem('flowpilot-goals', JSON.stringify(goals)), [goals])
  useEffect(() => localStorage.setItem('flowpilot-accounts', JSON.stringify(accounts)), [accounts])
  useEffect(() => localStorage.setItem('flowpilot-recurring', JSON.stringify(recurring)), [recurring])
  useEffect(() => localStorage.setItem('flowpilot-debts', JSON.stringify(debts)), [debts])
  useEffect(() => localStorage.setItem('flowpilot-audit', JSON.stringify(auditLog)), [auditLog])
  useEffect(() => localStorage.setItem(settingsKey, JSON.stringify({ version: 2 })), [])

  const filteredTransactions = useMemo(() => transactions.filter((item) => {
    const monthMatch = selectedMonth === 'All months' || item.month === selectedMonth
    const typeMatch = typeFilter === 'all' || item.type === typeFilter
    const searchMatch = !query || `${item.name} ${item.category} ${item.account}`.toLowerCase().includes(query.toLowerCase())
    return monthMatch && typeMatch && searchMatch
  }), [transactions, selectedMonth, typeFilter, query])

  const summary = useMemo(() => {
    const income = filteredTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expenses = filteredTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    return { income, expenses, savings: income - expenses, netWorth: accounts.reduce((sum, item) => sum + Number(item.balance), 0) }
  }, [filteredTransactions, accounts])

  const budgetData = budgets.map((entry) => ({
    ...entry,
    spent: filteredTransactions.filter((item) => item.type === 'expense' && item.category === entry.category).reduce((sum, item) => sum + item.amount, 0),
  }))
  const percentageUsed = summary.income > 0 ? Math.min((summary.expenses / summary.income) * 100, 100) : 0
  const insights = [
    summary.expenses > summary.income ? 'Your expenses are higher than income for this period.' : `You saved ${formatMoney(Math.max(summary.savings, 0))} in the selected period.`,
    budgetData.find((item) => item.spent > item.limit)?.category ? `${budgetData.find((item) => item.spent > item.limit).category} is over budget. Consider reducing spending there.` : 'All categories are currently within budget.',
    recurring.length ? `${recurring.length} recurring item${recurring.length > 1 ? 's are' : ' is'} scheduled for your next review.` : 'Add recurring bills to forecast your cash flow.',
  ]
  const monthlyNet = summary.savings
  const forecast = [30, 60, 90].map((days) => ({ days, balance: summary.netWorth + monthlyNet * (days / 30) }))
  const subscriptions = transactions.filter((item) => item.type === 'expense' && (item.recurring || /subscription|netflix|spotify|gym|membership/i.test(item.name)))
  const budgetAlerts = budgetData.filter((item) => item.spent >= item.limit * 0.8)
  const annualIncome = summary.income * 12
  const estimatedTax = Math.max(annualIncome * 0.2, 0)
  const totalDebt = debts.reduce((sum, debt) => sum + Number(debt.balance), 0)
  const debtPayoffMonths = Math.ceil(totalDebt / Math.max(summary.savings, 1))
  const logAction = (action) => setAuditLog((previous) => [{ id: Date.now(), action, date: new Date().toLocaleString() }, ...previous].slice(0, 30))

  const scrollToSection = (id) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const setFormValue = (event) => setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }))
  const handleTypeChange = (event) => {
    const type = event.target.value
    setFormData((previous) => ({ ...previous, type, category: (type === 'income' ? incomeCategories : expenseCategories).includes(previous.category) ? previous.category : (type === 'income' ? 'Income' : 'Food') }))
  }
  const resetForm = () => setFormData({ name: '', type: 'expense', category: 'Food', amount: '', account: 'Checking', recurring: false })
  const handleSubmit = (event) => {
    event.preventDefault()
    const amount = Number(formData.amount)
    if (!formData.name.trim() || !amount || amount <= 0) {
      setNotice('Add a name and a positive amount to continue.')
      return
    }
    const month = selectedMonth === 'All months' ? new Date().toLocaleString('en-US', { month: 'long' }) : selectedMonth
    const item = { ...formData, id: editingId ?? Date.now(), name: formData.name.trim(), amount, date: editingId ? 'Updated just now' : 'Just now', month }
    setTransactions((previous) => editingId ? previous.map((entry) => entry.id === editingId ? item : entry) : [item, ...previous])
    logAction(editingId ? `Updated transaction: ${item.name}` : `Added transaction: ${item.name}`)
    if (formData.recurring && !editingId) setRecurring((previous) => [...previous, { ...item, frequency: 'Monthly' }])
    setNotice(editingId ? 'Transaction updated.' : 'Transaction added.')
    setEditingId(null)
    resetForm()
  }
  const editTransaction = (item) => {
    setEditingId(item.id)
    setFormData({ name: item.name, type: item.type, category: item.category, amount: item.amount, account: item.account, recurring: item.recurring })
    scrollToSection('quick-add-section')
  }
  const deleteTransaction = (id) => {
    const deleted = transactions.find((item) => item.id === id)
    setTransactions((previous) => previous.filter((item) => item.id !== id))
    if (deleted) logAction(`Deleted transaction: ${deleted.name}`)
    setNotice('Transaction deleted.')
  }
  const updateBudget = (category, value) => setBudgets((previous) => previous.map((item) => item.category === category ? { ...item, limit: Number(value) || 0 } : item))
  const addGoal = (event) => {
    event.preventDefault()
    if (!goalForm.name.trim() || Number(goalForm.target) <= 0) return setNotice('Enter a goal name and target.')
    setGoals((previous) => [...previous, { ...goalForm, id: Date.now(), target: Number(goalForm.target), current: Number(goalForm.current) || 0 }])
    setGoalForm({ name: '', target: '', current: '', deadline: '' })
    setNotice('Savings goal created.')
  }
  const addAccount = (event) => {
    event.preventDefault()
    if (!accountForm.name.trim()) return
    setAccounts((previous) => [...previous, { ...accountForm, id: Date.now(), balance: Number(accountForm.balance) || 0 }])
    setAccountForm({ name: '', type: 'Cash', balance: '' })
  }
  const addDebt = (event) => {
    event.preventDefault()
    if (!debtForm.name.trim() || Number(debtForm.balance) <= 0) return setNotice('Enter a debt name and balance.')
    setDebts((previous) => [...previous, { ...debtForm, id: Date.now(), balance: Number(debtForm.balance), apr: Number(debtForm.apr) || 0, minimum: Number(debtForm.minimum) || 0 }])
    setDebtForm({ name: '', balance: '', apr: '', minimum: '' })
    setNotice('Debt added to payoff planner.')
  }
  const printReport = () => window.print()
  const downloadReport = () => {
    const rows = [['Name', 'Type', 'Category', 'Amount', 'Month', 'Account'], ...transactions.map((item) => [item.name, item.type, item.category, item.amount, item.month, item.account])]
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'flowpilot-transactions.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
  const importTransactions = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = String(reader.result).split(/\r?\n/).slice(1).filter(Boolean)
      const imported = rows.map((row, index) => {
        const [name, type, category, amount, month, account] = row.split(',')
        return { id: Date.now() + index, name, type: type === 'income' ? 'income' : 'expense', category: category || 'Food', amount: Number(amount), month: month || 'June', account: account || 'Checking', date: 'Imported' }
      }).filter((item) => item.name && item.amount > 0)
      setTransactions((previous) => [...imported, ...previous])
      setNotice(`${imported.length} transactions imported.`)
    }
    reader.readAsText(file)
  }

  const navItems = [['Overview', 'overview'], ['Transactions', 'transactions-section'], ['Budgets', 'budgets-section'], ['Goals', 'goals-section'], ['Forecast', 'forecast-section'], ['Debts', 'debt-section'], ['Reports', 'reports-section'], ['Accounts', 'accounts-section']]
  return (
    <div className={`dashboard-shell ${isDarkMode ? 'dark' : ''}`}>
      <aside className="sidebar">
        <div className="brand-block"><div className="brand-mark">F</div><div><p className="eyebrow">Portfolio</p><h2>FlowPilot</h2></div></div>
        <nav className="nav">{navItems.map(([label, target]) => <button key={target} type="button" className={`nav-item ${activeSection === target ? 'active' : ''}`} onClick={() => scrollToSection(target)}>{label}</button>)}</nav>
        <div className="mini-card"><p>Emergency fund</p><h3>{formatMoney(goals[0]?.current || 0)}</h3><div className="progress-track"><span style={{ width: `${Math.min(((goals[0]?.current || 0) / (goals[0]?.target || 1)) * 100, 100)}%` }} /></div><small>{Math.round(((goals[0]?.current || 0) / (goals[0]?.target || 1)) * 100)}% of target</small></div>
      </aside>
      <main className="content">
        <header className="topbar"><div><p className="eyebrow muted">Good morning</p><h1>Financial Dashboard</h1></div><div className="topbar-actions"><label className="month-picker"><span>Month</span><select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{monthOptions.map((month) => <option key={month}>{month}</option>)}</select></label><button type="button" className="theme-toggle" onClick={() => setIsDarkMode((value) => !value)}>{isDarkMode ? '☀️ Light' : '🌙 Dark'}</button><button type="button" className="ghost-button" onClick={downloadReport}>Export CSV</button><button type="button" className="primary-button" onClick={() => { resetForm(); scrollToSection('quick-add-section') }}>+ Add entry</button></div></header>
        {notice && <div className="notice" role="status">{notice}<button type="button" onClick={() => setNotice('')}>×</button></div>}
        <section id="overview" className="summary-grid">{[['Monthly income', summary.income], ['Expenses', summary.expenses], ['Savings', summary.savings], ['Net worth', summary.netWorth]].map(([label, value]) => <article className="summary-card" key={label}><p>{label}</p><div className="summary-row"><h3>{formatMoney(value)}</h3><span className={`chip ${value >= 0 ? 'positive' : 'negative'}`}>{value >= 0 ? 'On track' : 'Review'}</span></div></article>)}</section>
        <section id="reports-section" className="panel-grid"><article className="panel chart-panel"><div className="panel-header"><div><p className="eyebrow muted">Spending trend</p><h3>Cash flow report</h3></div><span className="chip positive">{Math.round(percentageUsed)}% used</span></div><div className="chart-bars" aria-label="Cash flow chart">{budgetData.map((item) => <div className="bar-group" key={item.category}><span className="bar" title={`${item.category}: ${formatMoney(item.spent)}`} style={{ height: `${Math.max(Math.min((item.spent / Math.max(item.limit, 1)) * 100, 100), 8)}%` }} /><small>{item.category.slice(0, 3)}</small></div>)}</div></article><article className="panel insights-panel"><div className="panel-header"><div><p className="eyebrow muted">Smart insights</p><h3>What needs attention</h3></div></div><ul className="insight-list">{insights.map((insight) => <li key={insight}>✦ {insight}</li>)}</ul></article></section>
        <section id="quick-add-section" className="quick-add-panel panel"><div className="panel-header"><div><p className="eyebrow muted">{editingId ? 'Editing transaction' : 'Add entry'}</p><h3>{editingId ? 'Update transaction' : 'Quick transaction'}</h3></div>{editingId && <button type="button" className="text-button" onClick={() => { setEditingId(null); resetForm() }}>Cancel</button>}</div><form className="transaction-form" onSubmit={handleSubmit}><div className="field-group"><label>Name<input name="name" value={formData.name} onChange={setFormValue} placeholder="Freelance client" /></label><label>Type<select name="type" value={formData.type} onChange={handleTypeChange}><option value="expense">Expense</option><option value="income">Income</option></select></label></div><div className="field-group"><label>Category<select name="category" value={formData.category} onChange={setFormValue}>{(formData.type === 'income' ? incomeCategories : expenseCategories).map((category) => <option key={category}>{category}</option>)}</select></label><label>Amount<input type="number" name="amount" min="1" value={formData.amount} onChange={setFormValue} placeholder="250" /></label></div><div className="field-group"><label>Account<select name="account" value={formData.account} onChange={setFormValue}>{accounts.map((account) => <option key={account.id}>{account.name}</option>)}</select></label><label className="checkbox-field"><input type="checkbox" name="recurring" checked={formData.recurring} onChange={(event) => setFormData((previous) => ({ ...previous, recurring: event.target.checked }))} /> Repeat monthly</label></div><button type="submit" className="primary-button submit-button">{editingId ? 'Save changes' : 'Add transaction'}</button></form></section>
        <section className="bottom-grid"><article id="budgets-section" className="panel budgets-panel"><div className="panel-header"><div><p className="eyebrow muted">Planning</p><h3>Editable budgets</h3></div></div><div className="budget-list">{budgetData.map((item) => { const percent = item.limit ? (item.spent / item.limit) * 100 : 0; return <div key={item.category} className="budget-item"><div className="budget-meta"><div><h4>{item.category}</h4><small>{formatMoney(item.spent)} spent of <input className="inline-input" type="number" value={item.limit} onChange={(event) => updateBudget(item.category, event.target.value)} /></small></div><span className={percent > 100 ? 'negative' : ''}>{Math.round(percent)}%</span></div><div className="track"><span style={{ width: `${Math.min(percent, 100)}%`, background: item.color }} /></div></div> })}</div></article><article id="transactions-section" className="panel transactions-panel"><div className="panel-header"><div><p className="eyebrow muted">Manage</p><h3>Transactions</h3></div><button type="button" className="text-button" onClick={() => setQuery('')}>Clear search</button></div><div className="filter-row"><input aria-label="Search transactions" placeholder="Search transactions..." value={query} onChange={(event) => setQuery(event.target.value)} /><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></div><ul className="transaction-list">{filteredTransactions.map((item) => <li key={item.id} className="transaction-item"><div className="transaction-main"><span className="transaction-badge">{item.type === 'income' ? 'I' : item.category[0]}</span><div><strong>{item.name}</strong><small>{item.category} · {item.account}{item.recurring ? ' · Monthly' : ''}</small></div></div><div className="transaction-side"><strong className={item.type === 'expense' ? 'negative' : 'positive'}>{item.type === 'expense' ? '-' : '+'}{formatMoney(item.amount)}</strong><small>{item.date}</small><div className="item-actions"><button type="button" onClick={() => editTransaction(item)}>Edit</button><button type="button" onClick={() => deleteTransaction(item.id)}>Delete</button></div></div></li>)}</ul>{!filteredTransactions.length && <p className="empty-state">No transactions match these filters.</p>}</article></section>
        <section id="goals-section" className="panel feature-grid"><article><div className="panel-header"><div><p className="eyebrow muted">Plan ahead</p><h3>Savings goals</h3></div></div><div className="goal-list">{goals.map((goal) => <div className="goal-item" key={goal.id}><div className="budget-meta"><div><h4>{goal.name}</h4><small>{formatMoney(goal.current)} of {formatMoney(goal.target)}{goal.deadline ? ` · due ${goal.deadline}` : ''}</small></div><strong>{Math.round((goal.current / goal.target) * 100)}%</strong></div><div className="track"><span style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%`, background: '#22c55e' }} /></div></div>)}</div><form className="compact-form" onSubmit={addGoal}><input placeholder="Goal name" value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} /><input type="number" placeholder="Target" value={goalForm.target} onChange={(event) => setGoalForm({ ...goalForm, target: event.target.value })} /><input type="number" placeholder="Saved" value={goalForm.current} onChange={(event) => setGoalForm({ ...goalForm, current: event.target.value })} /><button className="primary-button" type="submit">Add goal</button></form></article><article><div className="panel-header"><div><p className="eyebrow muted">Automation</p><h3>Recurring transactions</h3></div><button className="text-button" type="button" onClick={() => setShowRecurring((value) => !value)}>{showRecurring ? 'Hide' : 'Show all'}</button></div>{recurring.length ? <ul className="simple-list">{(showRecurring ? recurring : recurring.slice(0, 3)).map((item) => <li key={item.id}><span>{item.name}<small>{item.category} · {item.frequency}</small></span><strong>{formatMoney(item.amount)}</strong></li>)}</ul> : <p className="empty-state">Mark a transaction as recurring to see it here.</p>}<h4 className="subheading">Detected subscriptions</h4>{subscriptions.length ? <ul className="simple-list">{subscriptions.slice(0, 3).map((item) => <li key={`sub-${item.id}`}><span>{item.name}<small>Renewal estimate · monthly</small></span><strong>{formatMoney(item.amount)}</strong></li>)}</ul> : <p className="empty-state">No subscription-like transactions detected.</p>}</article></section>
        <section id="forecast-section" className="panel feature-grid"><article><div className="panel-header"><div><p className="eyebrow muted">Plan ahead</p><h3>Cash forecast</h3></div><span className="chip neutral">Local estimate</span></div><div className="forecast-grid">{forecast.map((item) => <div className="forecast-card" key={item.days}><span>{item.days} days</span><strong>{formatMoney(item.balance)}</strong><small>Projected net worth</small></div>)}</div><p className="helper-text">Forecast uses the current period's net savings and recurring items. Connect a bank provider later for live balances.</p></article><article><div className="panel-header"><div><p className="eyebrow muted">Notifications</p><h3>Budget alerts</h3></div></div>{budgetAlerts.length ? <ul className="simple-list">{budgetAlerts.map((item) => <li key={item.category}><span>{item.category}<small>{Math.round((item.spent / item.limit) * 100)}% of budget used</small></span><strong className={item.spent > item.limit ? 'negative' : ''}>{item.spent > item.limit ? 'Over' : 'Watch'}</strong></li>)}</ul> : <p className="empty-state">You have no budget alerts.</p>}</article></section>
        <section id="debt-section" className="panel feature-grid"><article><div className="panel-header"><div><p className="eyebrow muted">Payoff strategy</p><h3>Debt planner</h3></div><span className="chip neutral">{debtPayoffMonths === 1 ? '1 month' : `${debtPayoffMonths} months`} at current savings</span></div><div className="summary-row"><div><small>Total debt</small><h3>{formatMoney(totalDebt)}</h3></div><div><small>Suggested method</small><strong className="positive">Avalanche</strong></div></div><ul className="simple-list">{debts.map((debt) => <li key={debt.id}><span>{debt.name}<small>{debt.apr}% APR · minimum {formatMoney(debt.minimum)}</small></span><strong>{formatMoney(debt.balance)}</strong></li>)}</ul><form className="compact-form" onSubmit={addDebt}><input placeholder="Debt name" value={debtForm.name} onChange={(event) => setDebtForm({ ...debtForm, name: event.target.value })} /><input type="number" placeholder="Balance" value={debtForm.balance} onChange={(event) => setDebtForm({ ...debtForm, balance: event.target.value })} /><input type="number" placeholder="APR %" value={debtForm.apr} onChange={(event) => setDebtForm({ ...debtForm, apr: event.target.value })} /><button className="primary-button" type="submit">Add debt</button></form></article><article><div className="panel-header"><div><p className="eyebrow muted">Annual planning</p><h3>Tax snapshot</h3></div></div><div className="forecast-card"><span>Estimated annual income</span><strong>{formatMoney(annualIncome)}</strong><small>At a 20% planning rate</small></div><div className="forecast-card"><span>Estimated tax reserve</span><strong>{formatMoney(estimatedTax)}</strong><small>Set aside for planning only</small></div><p className="helper-text">This is an estimate, not tax advice. Add a tax professional's rules before filing.</p></article></section>
        <section className="panel feature-grid"><article><div className="panel-header"><div><p className="eyebrow muted">History</p><h3>Audit trail</h3></div></div>{auditLog.length ? <ul className="simple-list">{auditLog.slice(0, 5).map((entry) => <li key={entry.id}><span>{entry.action}<small>{entry.date}</small></span></li>)}</ul> : <p className="empty-state">Changes to your data will appear here.</p>}</article><article><div className="panel-header"><div><p className="eyebrow muted">Reports</p><h3>Print or save PDF</h3></div></div><p className="helper-text">Use your browser's print dialog to save a clean PDF of the dashboard.</p><button className="primary-button" type="button" onClick={printReport}>Print report</button></article></section>
        <section id="accounts-section" className="panel accounts-panel"><div className="panel-header"><div><p className="eyebrow muted">Portfolio</p><h3>Accounts & investments</h3></div><span className="chip positive">Local mode</span></div><div className="account-grid">{accounts.map((account) => <div className="account-card" key={account.id}><span>{account.type}</span><h4>{account.name}</h4><strong>{formatMoney(account.balance)}</strong></div>)}</div><form className="compact-form" onSubmit={addAccount}><input placeholder="Account name" value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} /><select value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })}><option>Cash</option><option>Savings</option><option>Credit card</option><option>Investment</option><option>Crypto</option></select><input type="number" placeholder="Balance" value={accountForm.balance} onChange={(event) => setAccountForm({ ...accountForm, balance: event.target.value })} /><button className="primary-button" type="submit">Add account</button></form><div className="import-export"><button className="ghost-button" type="button" onClick={() => fileInputRef.current?.click()}>Import CSV</button><input ref={fileInputRef} type="file" accept=".csv" hidden onChange={importTransactions} /><span>Cloud sync and bank connections can be added when an authentication/API backend is configured.</span></div></section>
      </main>
    </div>
  )
}

export default App
