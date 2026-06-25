'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type ContractStatus = 'pending' | 'processing' | 'completed' | 'error'

interface StatusResult {
  status: ContractStatus
  errorMessage: string | null
}

const TERMINAL_STATUSES: ContractStatus[] = ['completed', 'error']
const POLL_INTERVAL_MS = 2000

export function useContractStatus(contractId: string, initialStatus: ContractStatus = 'pending') {
  const [status, setStatus] = useState<ContractStatus>(initialStatus)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/status`)
      if (!res.ok) return

      const data: StatusResult = await res.json()
      if (!isMountedRef.current) return

      setStatus(data.status)
      setErrorMessage(data.errorMessage)

      if (TERMINAL_STATUSES.includes(data.status)) {
        stopPolling()
      }
    } catch {
      // Network errors don't stop polling — transient failures should be retried
    }
  }, [contractId, stopPolling])

  useEffect(() => {
    isMountedRef.current = true

    if (TERMINAL_STATUSES.includes(initialStatus)) {
      return
    }

    fetchStatus()
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS)

    return () => {
      isMountedRef.current = false
      stopPolling()
    }
  }, [contractId, initialStatus, fetchStatus, stopPolling])

  return { status, errorMessage }
}
