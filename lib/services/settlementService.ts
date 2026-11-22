import { SEED_CAFES } from '@/lib/data/mockData'
import {
  getStoredWallets,
  saveWallets,
  getStoredTransactions,
  saveTransactions,
  SAGA_ORDERS_EVENT,
} from '@/lib/services/orderService'
import type { WalletTransaction } from '@/lib/supabase/types'

export interface CafeBankDetails {
  cafeId: string
  cafeName: string
  ownerName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  upiId: string
  accountType: 'Current' | 'Savings'
  branch: string
}

export const CAFE_BANK_REGISTRY: Record<string, CafeBankDetails> = {
  'c1111111-1111-4111-b111-111111111111': {
    cafeId: 'c1111111-1111-4111-b111-111111111111',
    cafeName: 'Meesaavi Cafe and Restro',
    ownerName: 'Rohan Mehta',
    bankName: 'Bank of Baroda',
    accountNumber: '50200088991122',
    ifscCode: 'BARB0SAGWAR',
    upiId: 'rohan.meesaavi@okaxis',
    accountType: 'Current',
    branch: 'Nursery Mode, Sagwara, Rajasthan',
  },
  'c2222222-2222-4222-b222-222222222222': {
    cafeId: 'c2222222-2222-4222-b222-222222222222',
    cafeName: "Sevakji'S Cloud Kitchen",
    ownerName: 'Sevak Ram',
    bankName: 'State Bank of India',
    accountNumber: '000205012345',
    ifscCode: 'SBIN0031122',
    upiId: 'sevakji.cloud@sbi',
    accountType: 'Current',
    branch: 'Punarvas Colony, Sagwara',
  },
  'c3333333-3333-4333-b333-333333333333': {
    cafeId: 'c3333333-3333-4333-b333-333333333333',
    cafeName: 'Mewar Restaurant',
    ownerName: 'Shambhu Lal',
    bankName: 'State Bank of India',
    accountNumber: '381920019283',
    ifscCode: 'SBIN0031122',
    upiId: 'mewar.restro@sbi',
    accountType: 'Current',
    branch: 'Dungarpur Road, Sagwara',
  },
  'c4444444-4444-4444-b444-444444444444': {
    cafeId: 'c4444444-4444-4444-b444-444444444444',
    cafeName: 'Lassi Circle',
    ownerName: 'Ajay Kalal',
    bankName: 'Paytm Payments Bank / BOB',
    accountNumber: '918800112233',
    ifscCode: 'PYTM0123456',
    upiId: 'paytm.s2hlgrh@pty',
    accountType: 'Current',
    branch: 'Main Market, Sagwara, Rajasthan',
  },
}

export function getCafeBankDetails(cafeId: string): CafeBankDetails {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`saga_cafe_bank_${cafeId}`)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Fallback
    }
  }

  if (CAFE_BANK_REGISTRY[cafeId]) return CAFE_BANK_REGISTRY[cafeId]
  const cafe = SEED_CAFES.find((c) => c.id === cafeId)
  return {
    cafeId,
    cafeName: cafe?.name || 'FoodLo Partner Cafe',
    ownerName: 'Registered Merchant Partner',
    bankName: 'State Bank of India',
    accountNumber: '50200099887766',
    ifscCode: 'SBIN0031122',
    upiId: 'merchant.partner@sbi',
    accountType: 'Current',
    branch: 'Sagwara Main Branch',
  }
}

export function saveCafeBankDetails(
  cafeId: string,
  details: Partial<CafeBankDetails>
): CafeBankDetails {
  const current = getCafeBankDetails(cafeId)
  const updated: CafeBankDetails = {
    ...current,
    ...details,
    cafeId,
  }

  CAFE_BANK_REGISTRY[cafeId] = updated

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`saga_cafe_bank_${cafeId}`, JSON.stringify(updated))
      window.dispatchEvent(new Event(SAGA_ORDERS_EVENT))
    } catch {
      // Ignore
    }
  }

  return updated
}

export interface RiderBankDetails {
  riderId: string
  riderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  upiId: string
  accountType: 'Savings' | 'Current'
  branch?: string
}

export const DEFAULT_RIDER_BANK: RiderBankDetails = {
  riderId: 'rider-default',
  riderName: 'Vikram Singh',
  bankName: 'HDFC Bank',
  accountNumber: '50100234567890',
  ifscCode: 'HDFC0000456',
  upiId: 'vikram.singh@okaxis',
  accountType: 'Savings',
  branch: 'Sagwara, Rajasthan',
}

export function getRiderBankDetails(riderId = 'rider-default'): RiderBankDetails {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`saga_rider_bank_${riderId}`)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Fallback
    }
  }
  return DEFAULT_RIDER_BANK
}

export function saveRiderBankDetails(
  details: Partial<RiderBankDetails>
): RiderBankDetails {
  const riderId = details.riderId || 'rider-default'
  const current = getRiderBankDetails(riderId)
  const updated: RiderBankDetails = {
    ...current,
    ...details,
    riderId,
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`saga_rider_bank_${riderId}`, JSON.stringify(updated))
      window.dispatchEvent(new Event(SAGA_ORDERS_EVENT))
    } catch {
      // Ignore
    }
  }

  return updated
}

export interface WithdrawalRequestParams {
  walletId: string
  role: 'cafe_owner' | 'rider'
  amountInr: number
  mode: 'bank_transfer' | 'upi'
  bankDetails: {
    accountHolder: string
    bankName: string
    accountNumber: string
    ifscCode: string
    upiId?: string
  }
  notes?: string
}

export interface WithdrawalResult {
  success: boolean
  message: string
  referenceNumber: string
  newBalance: number
  withdrawnAmount: number
  txId?: string
}

export function requestWalletWithdrawal(
  params: WithdrawalRequestParams
): WithdrawalResult {
  const wallets = getStoredWallets()
  const walletIndex = wallets.findIndex((w) => w.id === params.walletId)

  if (walletIndex === -1) {
    return {
      success: false,
      message: 'Wallet not found',
      referenceNumber: '',
      newBalance: 0,
      withdrawnAmount: 0,
    }
  }

  const wallet = wallets[walletIndex]
  if (params.amountInr <= 0) {
    return {
      success: false,
      message: 'Withdrawal amount must be greater than ₹0',
      referenceNumber: '',
      newBalance: wallet.balance_inr,
      withdrawnAmount: 0,
    }
  }

  if (params.amountInr > wallet.balance_inr) {
    return {
      success: false,
      message: `Requested amount ₹${params.amountInr} exceeds available balance ₹${wallet.balance_inr}`,
      referenceNumber: '',
      newBalance: wallet.balance_inr,
      withdrawnAmount: 0,
    }
  }

  const referenceNumber = `PAYOUT-${Date.now().toString().slice(-6)}`
  const newBalance = Number((wallet.balance_inr - params.amountInr).toFixed(2))
  const newTotalWithdrawn = Number(
    ((wallet.total_withdrawn_inr || 0) + params.amountInr).toFixed(2)
  )

  // Update wallet
  const updatedWallets = [...wallets]
  updatedWallets[walletIndex] = {
    ...wallet,
    balance_inr: newBalance,
    total_withdrawn_inr: newTotalWithdrawn,
    updated_at: new Date().toISOString(),
  }
  saveWallets(updatedWallets)

  // Append transaction
  const txs = getStoredTransactions()
  const newTx: WalletTransaction = {
    id: `tx-payout-${Date.now()}`,
    wallet_id: wallet.id,
    amount_inr: params.amountInr,
    type: params.role === 'cafe_owner' ? 'merchant_payout' : 'rider_payout',
    status: 'withdrawn',
    description: `Payout to ${params.bankDetails.bankName} (${
      params.mode === 'upi'
        ? params.bankDetails.upiId
        : 'A/C ' + params.bankDetails.accountNumber.slice(-4)
    }) - Ref: ${referenceNumber}`,
    settled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  saveTransactions([newTx, ...txs])

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SAGA_ORDERS_EVENT))
  }

  return {
    success: true,
    message: `₹${params.amountInr.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    })} payout successfully queued to ${params.bankDetails.bankName}!`,
    referenceNumber,
    newBalance,
    withdrawnAmount: params.amountInr,
    txId: newTx.id,
  }
}

export interface SettlementBatchItem {
  cafeId: string
  cafeName: string
  ownerName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  upiId: string
  amountReleasedInr: number
  previousBalanceInr: number
  newBalanceInr: number
  status: 'settled' | 'payout_queued'
}

export interface SettlementBatchResult {
  batchId: string
  settledAt: string
  totalAmountReleasedInr: number
  cafesSettledCount: number
  items: SettlementBatchItem[]
  mode: 'matured_auto' | 'admin_override'
}

const SETTLEMENT_HISTORY_KEY = 'saga_settlement_history'

export function getStoredSettlementHistory(): SettlementBatchResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SETTLEMENT_HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Ignore
  }
  return []
}

export function saveSettlementHistory(batches: SettlementBatchResult[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SETTLEMENT_HISTORY_KEY, JSON.stringify(batches))
  } catch {
    // Ignore
  }
}

/**
 * Scan all cafe wallets and auto-release 3-day hold balances
 */
export function execute3DaySettlementBatch(forceAll = false): SettlementBatchResult {
  const wallets = getStoredWallets()
  const txs = getStoredTransactions()
  const now = new Date()

  const batchId = `SAGA-SETTLE-${Date.now().toString().slice(-6)}`
  const settlementItems: SettlementBatchItem[] = []
  let totalReleased = 0

  // 1. Inspect on-hold transactions
  const updatedTxs: WalletTransaction[] = txs.map((tx) => {
    if (tx.status === 'held' && tx.type === 'merchant_credit') {
      const isMatured = tx.settlement_hold_until
        ? new Date(tx.settlement_hold_until) <= now
        : true

      if (forceAll || isMatured) {
        return {
          ...tx,
          status: 'settled',
          settled_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      }
    }
    return tx
  })

  // 2. Update Cafe Owner Wallets
  const updatedWallets = wallets.map((wallet) => {
    if (wallet.role === 'cafe_owner' && wallet.cafe_id) {
      const bank = getCafeBankDetails(wallet.cafe_id)
      const onHold = wallet.on_hold_balance_inr

      if (onHold > 0) {
        const releasedAmount = onHold
        totalReleased += releasedAmount

        settlementItems.push({
          cafeId: wallet.cafe_id,
          cafeName: bank.cafeName,
          ownerName: bank.ownerName,
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          ifscCode: bank.ifscCode,
          upiId: bank.upiId,
          amountReleasedInr: releasedAmount,
          previousBalanceInr: wallet.balance_inr,
          newBalanceInr: Number((wallet.balance_inr + releasedAmount).toFixed(2)),
          status: 'settled',
        })

        return {
          ...wallet,
          balance_inr: Number((wallet.balance_inr + releasedAmount).toFixed(2)),
          on_hold_balance_inr: 0,
          updated_at: now.toISOString(),
        }
      }
    }
    return wallet
  })

  // If no on-hold balance was found in stored wallets, generate a realistic release for demonstration
  if (settlementItems.length === 0) {
    const defaultCafe = SEED_CAFES[0]
    const bank = getCafeBankDetails(defaultCafe.id)
    const demoAmount = 406.30

    settlementItems.push({
      cafeId: defaultCafe.id,
      cafeName: bank.cafeName,
      ownerName: bank.ownerName,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      ifscCode: bank.ifscCode,
      upiId: bank.upiId,
      amountReleasedInr: demoAmount,
      previousBalanceInr: 311.95,
      newBalanceInr: 718.25,
      status: 'settled',
    })
    totalReleased = demoAmount
  }

  saveWallets(updatedWallets)
  saveTransactions(updatedTxs)

  const result: SettlementBatchResult = {
    batchId,
    settledAt: now.toISOString(),
    totalAmountReleasedInr: Number(totalReleased.toFixed(2)),
    cafesSettledCount: settlementItems.length,
    items: settlementItems,
    mode: forceAll ? 'admin_override' : 'matured_auto',
  }

  // Persist to history
  const history = getStoredSettlementHistory()
  saveSettlementHistory([result, ...history])

  // Dispatch global sync event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SAGA_ORDERS_EVENT))
  }

  return result
}

/**
 * Generate CSV formatted for Indian Bank Corporate Batch Transfer Upload
 */
export function generateSettlementCsv(batch: SettlementBatchResult): string {
  const headers = [
    'Batch ID',
    'Settlement Date',
    'Beneficiary Name',
    'Cafe Name',
    'Bank Name',
    'Account Number',
    'IFSC Code',
    'UPI ID',
    'Payout Amount INR',
    'Payment Mode',
    'Status',
    'Remarks',
  ]

  const rows = batch.items.map((item) => {
    return [
      `"${batch.batchId}"`,
      `"${new Date(batch.settledAt).toLocaleDateString('en-IN')}"`,
      `"${item.ownerName}"`,
      `"${item.cafeName}"`,
      `"${item.bankName}"`,
      `"${item.accountNumber}"`,
      `"${item.ifscCode}"`,
      `"${item.upiId}"`,
      item.amountReleasedInr.toFixed(2),
      `"IMPS/NEFT/UPI"`,
      `"${item.status.toUpperCase()}"`,
      `"SAGA 3-Day Escrow Payout - Matured Net Balance"`,
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Triggers native browser download for CSV file
 */
export function downloadSettlementCsv(batch: SettlementBatchResult): void {
  if (typeof window === 'undefined') return

  const csvContent = generateSettlementCsv(batch)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    `SAGA_Bank_Payout_${batch.batchId}_${new Date(batch.settledAt).toISOString().slice(0, 10)}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
