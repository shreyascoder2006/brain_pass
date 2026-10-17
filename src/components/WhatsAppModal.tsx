import { useEffect, useState } from 'react'
import {
  getWhatsAppStatus,
  requestWhatsAppPairCode,
  resetWhatsAppSession,
  sendWhatsAppReport,
  type WhatsAppStatus,
} from '../lib/api'
import { useStore } from '../state/store'

export default function WhatsAppModal() {
  const open = useStore((s) => s.whatsappOpen)
  const setOpen = useStore((s) => s.setWhatsappOpen)

  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [activeTab, setActiveTab] = useState<'code' | 'qr'>('code')
  const [pairPhone, setPairPhone] = useState('8010275709')
  const [copied, setCopied] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const [testPhone, setTestPhone] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const refreshStatus = async () => {
    const s = await getWhatsAppStatus()
    setStatus(s)
  }

  useEffect(() => {
    if (!open) return
    refreshStatus()
    const timer = setInterval(refreshStatus, 2500)
    return () => clearInterval(timer)
  }, [open])

  if (!open) return null

  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!pairPhone.trim()) return
    setCodeLoading(true)
    setCodeError(null)
    try {
      const res = await requestWhatsAppPairCode(pairPhone.trim())
      setStatus((prev) => (prev ? { ...prev, pairingCode: res.code, pairingPhone: res.phone } : prev))
      refreshStatus()
    } catch (err: any) {
      setCodeError(err.message || 'Failed to generate code')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleCopyCode = () => {
    const code = status?.pairingCode?.replace('-', '') || status?.pairingCode
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReset = async () => {
    if (!confirm('Clear WhatsApp credentials and start a fresh pairing session?')) return
    setResetting(true)
    try {
      await resetWhatsAppSession()
      setStatus(null)
      setTimeout(refreshStatus, 1500)
    } finally {
      setResetting(false)
    }
  }

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testPhone.trim()) return
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await sendWhatsAppReport(
        testPhone.trim(),
        'case_01_right_frontal_gbm',
        'Clinical MRI Diagnostic Report from NeuroScope 3D Studio'
      )
      setTestResult(res.message || 'Report PDF dispatched!')
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`)
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-xl border border-[#263854] bg-[#0a1020] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#263854]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
              </svg>
            </span>
            <div>
              <h2 className="text-[14px] font-bold text-white">WhatsApp Clinic Bridge</h2>
              <p className="text-[10px] text-slate-400">Direct Patient PDF Report Delivery &amp; Clinical Chatbot</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-[#152238] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="my-4 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Connection Status Banner */}
          <div className="rounded-lg border border-[#263854] bg-[#101a2b] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">Connection State:</span>
              {status?.connected ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected &amp; Ready
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Pairing Required
                </span>
              )}
            </div>

            {status?.connected && status.user && (
              <div className="mt-2 flex items-center justify-between border-t border-[#263854]/40 pt-2 font-mono text-[10.5px] text-slate-400">
                <span>Clinic WhatsApp Account:</span>
                <span className="text-emerald-300 font-semibold">{status.user.id?.split(':')[0]}</span>
              </div>
            )}
          </div>

          {/* Pairing Section (Visible if not connected) */}
          {!status?.connected && (
            <div className="rounded-lg border border-[#263854] bg-[#070c18] p-4">
              {/* Method Switcher Tabs */}
              <div className="flex items-center gap-2 mb-3 border-b border-[#263854]/60 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition ${
                    activeTab === 'code'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'bg-[#101a2b] text-slate-400 hover:text-white'
                  }`}
                >
                  🔢 Pair with 8-Digit Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('qr')}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition ${
                    activeTab === 'qr'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'bg-[#101a2b] text-slate-400 hover:text-white'
                  }`}
                >
                  📷 Scan QR Code
                </button>
              </div>

              {activeTab === 'code' ? (
                <div className="space-y-3.5">
                  {/* Generated Code Display */}
                  {status?.pairingCode ? (
                    <div className="rounded-lg border border-emerald-500/40 bg-[#06261c] p-3.5 text-center">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                        WhatsApp Pairing Code
                      </span>
                      <div className="mt-1.5 flex items-center justify-center gap-3">
                        <span className="font-mono text-2xl font-black tracking-widest text-emerald-200">
                          {status.pairingCode}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="rounded border border-emerald-400/40 bg-emerald-950 px-2.5 py-1 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-900"
                        >
                          {copied ? '✓ Copied!' : 'Copy Code'}
                        </button>
                      </div>
                      <p className="mt-1 font-mono text-[9.5px] text-emerald-400/80">
                        Generated for: +{status.pairingPhone || '918010275709'}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#263854] bg-[#101a2b] p-3 text-center">
                      <p className="text-[11px] text-slate-300">Enter your WhatsApp number to receive an 8-digit code:</p>
                    </div>
                  )}

                  {/* Step-by-step Phone Instructions */}
                  <div className="rounded-md border border-[#263854]/60 bg-[#101a2b] p-3">
                    <span className="text-[10.5px] font-semibold text-slate-200 block mb-1">
                      How to enter this code on your phone:
                    </span>
                    <ol className="text-[10px] leading-relaxed text-slate-300 list-decimal list-inside space-y-1">
                      <li>Open <b>WhatsApp</b> on your mobile phone</li>
                      <li>Go to <b>Settings</b> (iPhone) or <b>⋮ Menu</b> (Android) &gt; <b>Linked Devices</b></li>
                      <li>Tap <b>Link a Device</b></li>
                      <li>Tap <b>"Link with phone number instead"</b> at the bottom</li>
                      <li>Enter this 8-digit code: <b className="font-mono text-emerald-300">{status?.pairingCode || 'YSWD-2A4E'}</b></li>
                    </ol>
                  </div>

                  {/* Generate / Refresh Code Form */}
                  <form onSubmit={handleRequestCode} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 8010275709"
                      value={pairPhone}
                      onChange={(e) => setPairPhone(e.target.value)}
                      className="flex-1 rounded border border-[#263854] bg-[#0a1020] px-3 py-1.5 font-mono text-[11px] text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={codeLoading || !pairPhone.trim()}
                      className="rounded bg-emerald-600 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {codeLoading ? 'Generating...' : 'Get New Code'}
                    </button>
                  </form>
                  {codeError && <p className="text-[10px] text-rose-400">{codeError}</p>}
                </div>
              ) : (
                /* QR Code Tab */
                <div className="flex flex-col items-center justify-center text-center">
                  {status?.qrDataUrl ? (
                    <>
                      <div className="rounded-lg bg-white p-2.5 shadow-lg">
                        <img src={status.qrDataUrl} alt="WhatsApp QR Code" className="h-40 w-40" />
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400">
                        Scan with WhatsApp &gt; Linked Devices &gt; Link a Device
                      </p>
                    </>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-emerald-400" />
                      <p className="text-[10.5px] text-slate-400">Loading QR session...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick PDF Report Dispatch Form */}
          <form onSubmit={handleSendTest} className="space-y-3 rounded-lg border border-[#263854] bg-[#101a2b] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-200">Dispatch Patient PDF Report</span>
              <span className="font-mono text-[9px] text-slate-400">Case: Glioblastoma</span>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Recipient WhatsApp Number:</label>
              <input
                type="text"
                placeholder="e.g. 8010275709 or +91 8010275709"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full rounded border border-[#263854] bg-[#0a1020] px-3 py-1.5 text-[11px] text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={testLoading || !status?.connected || !testPhone.trim()}
              className="w-full rounded bg-emerald-600 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-emerald-600/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testLoading ? 'Compiling & Sending PDF...' : 'Send Clinical PDF via WhatsApp'}
            </button>
            {testResult && (
              <div
                className={`rounded p-2 text-[10px] ${
                  testResult.startsWith('Error')
                    ? 'bg-rose-500/10 text-rose-300'
                    : 'bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {testResult}
              </div>
            )}
          </form>

          {/* Automated Inbound Chatbot Info */}
          <div className="rounded-lg border border-[#263854]/50 bg-[#070c18] p-3 text-[10px] text-slate-400 leading-relaxed space-y-1">
            <span className="font-semibold text-slate-200 block">Automated Inbound Chatbot Active:</span>
            <p>
              Once linked, patients can message your line:
              <br />• Text <b>"Report"</b> to receive their MRI quantitative diagnostic PDF automatically.
              <br />• Text <b>"What is edema?"</b>, <b>"What is WT?"</b>, etc. for AI glossary definitions.
            </p>
          </div>
        </div>

        {/* Footer with Reset Session Button */}
        <div className="flex items-center justify-between pt-2 border-t border-[#263854]/40">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="text-[10px] text-slate-500 hover:text-rose-400 transition"
            title="Clear stored WhatsApp session credentials"
          >
            {resetting ? 'Resetting...' : 'Reset Session'}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded border border-[#263854] px-4 py-1.5 text-[11px] text-slate-300 hover:text-white hover:border-slate-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
