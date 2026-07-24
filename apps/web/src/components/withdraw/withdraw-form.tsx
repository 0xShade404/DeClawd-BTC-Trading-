'use client';

import * as React from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { PenLine, ShieldCheck, Loader2 } from 'lucide-react';
import type { LedgerAccountType } from '@declawd/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCreateWithdrawal } from '@/lib/hooks/use-withdrawals';
import { useLedgerAccounts } from '@/lib/hooks/use-ledger-accounts';
import { formatUsd } from '@/lib/utils';

const SOURCE_OPTIONS: { value: LedgerAccountType; label: string }[] = [
  { value: 'TRADING_POOL', label: 'Trading Pool' },
  { value: 'PROTECTED_VAULT', label: 'Protected Vault' },
];

/**
 * Builds the human-readable message the connected wallet signs to authorize
 * a withdrawal. Mirrors the format the backend expects to verify
 * (see @declawd/shared createWithdrawalSchema: {sourceAccount, amountUsd,
 * destinationAddress, signature, message}).
 */
function buildWithdrawalMessage(params: {
  amountUsd: string;
  sourceAccount: LedgerAccountType;
  destinationAddress: string;
  nonce: string;
}): string {
  const sourceLabel = params.sourceAccount === 'TRADING_POOL' ? 'Trading Pool' : 'Protected Vault';
  return `DeClawd wants you to sign this message to authorize a withdrawal of ${params.amountUsd} USDC from your ${sourceLabel} to ${params.destinationAddress}. Nonce: ${params.nonce}`;
}

type Step = 'form' | 'signing' | 'submitting' | 'done';

export function WithdrawForm() {
  const { address, isConnected } = useAccount();
  const { data: accounts } = useLedgerAccounts();
  const { signMessageAsync } = useSignMessage();
  const createWithdrawal = useCreateWithdrawal();

  const [sourceAccount, setSourceAccount] = React.useState<LedgerAccountType>('TRADING_POOL');
  const [amount, setAmount] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [step, setStep] = React.useState<Step>('form');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (address && !destination) setDestination(address);
  }, [address, destination]);

  const sourceBalance = accounts?.find((a) => a.type === sourceAccount)?.balanceUsd;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      setError('Connect a wallet before requesting a withdrawal.');
      return;
    }
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(destination)) {
      setError('Enter a valid destination address (0x...).');
      return;
    }

    const nonce = crypto.randomUUID();
    const message = buildWithdrawalMessage({
      amountUsd: amount,
      sourceAccount,
      destinationAddress: destination,
      nonce,
    });

    try {
      setStep('signing');
      const signature = await signMessageAsync({ message });

      setStep('submitting');
      await createWithdrawal.mutateAsync({
        sourceAccount,
        amountUsd: amountNum,
        destinationAddress: destination,
        signature,
        message,
      });

      setStep('done');
      setAmount('');
    } catch (err) {
      setStep('form');
      setError(err instanceof Error ? err.message : 'Withdrawal request failed. Please try again.');
    }
  }

  const busy = step === 'signing' || step === 'submitting';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a withdrawal</CardTitle>
        <CardDescription>
          Funds are sent directly to the destination address you authorize below. DeClawd never
          moves funds without your signature.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="source" className="text-sm font-medium">
              Source
            </label>
            <Select
              id="source"
              value={sourceAccount}
              onValueChange={(v) => setSourceAccount(v as LedgerAccountType)}
              options={SOURCE_OPTIONS}
            />
            {sourceBalance != null && (
              <span className="text-xs text-muted-foreground">
                Available: {formatUsd(Number(sourceBalance))}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount (USDC)
            </label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="destination" className="text-sm font-medium">
              Destination address
            </label>
            <Input
              id="destination"
              type="text"
              placeholder="0x..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={busy}
            />
            <span className="text-xs text-muted-foreground">
              Defaults to your connected wallet. Double-check before submitting.
            </span>
          </div>

          <div className="glass flex items-start gap-3 rounded-lg p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-bitcoin-500" />
            <span>
              You&apos;ll be asked to sign a message with your connected wallet to authorize this
              withdrawal. This is not a blockchain transaction and costs no gas &mdash; it simply
              proves you control the destination wallet. DeClawd never asks for a seed phrase or
              private key.
            </span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {step === 'done' && (
            <Badge variant="success" className="w-fit">
              Withdrawal requested
            </Badge>
          )}

          <Button type="submit" disabled={!isConnected || busy} className="gap-2">
            {step === 'signing' && (
              <>
                <PenLine className="h-4 w-4" /> Waiting for signature...
              </>
            )}
            {step === 'submitting' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
              </>
            )}
            {step === 'form' || step === 'done' ? 'Sign & request withdrawal' : null}
          </Button>

          {!isConnected && (
            <p className="text-center text-xs text-muted-foreground">
              Connect a wallet from the header to request a withdrawal.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
