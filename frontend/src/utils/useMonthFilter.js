import { useEffect, useState } from 'react'
import { getAvailableMonths } from './api'

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const lastDayOfMonth = (ym) => {
  const [y, mo] = ym.split('-').map(Number)
  return new Date(y, mo, 0).getDate()
}

// Dérive les bornes date_from/date_to (1er et dernier jour du mois) à partir d'un "YYYY-MM"
const monthBounds = (ym) => {
  if (!ym) return { dateFrom: null, dateTo: null }
  return {
    dateFrom: `${ym}-01`,
    dateTo: `${ym}-${String(lastDayOfMonth(ym)).padStart(2, '0')}`,
  }
}

export default function useMonthFilter() {
  const [availableMonths, setAvailableMonths] = useState([])
  const [month, setMonth] = useState(null)

  const refreshMonths = () => {
    getAvailableMonths().then(months => {
      setAvailableMonths(months)
      setMonth(current => {
        if (current && months.includes(current)) return current
        const nowYm = currentMonth()
        return months.includes(nowYm) ? nowYm : (months[0] || null)
      })
    })
  }

  useEffect(refreshMonths, [])

  const { dateFrom, dateTo } = monthBounds(month)

  return { month, setMonth, availableMonths, dateFrom, dateTo, refreshMonths }
}
