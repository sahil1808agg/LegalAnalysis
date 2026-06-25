'use client'

import { useState, useEffect, useRef } from 'react'

interface SignedUrlState {
  url: string | null
  loading: boolean
  error: string | null
}

export function useSignedUrl(contractId: string) {
  const [state, setState] = useState<SignedUrlState>({ url: null, loading: true, error: null })
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    setState({ url: null, loading: true, error: null })

    async function fetchUrl() {
      try {
        const res = await fetch(`/api/contracts/${contractId}/signed-url`)
        if (!isMountedRef.current) return

        if (res.status === 404) {
          setState({ url: null, loading: false, error: 'pdf_unavailable' })
          return
        }

        if (!res.ok) {
          setState({ url: null, loading: false, error: 'fetch_failed' })
          return
        }

        const data = await res.json()
        if (!isMountedRef.current) return
        setState({ url: data.signed_url, loading: false, error: null })
      } catch {
        if (isMountedRef.current) {
          setState({ url: null, loading: false, error: 'fetch_failed' })
        }
      }
    }

    fetchUrl()

    return () => {
      isMountedRef.current = false
    }
  }, [contractId])

  return state
}
