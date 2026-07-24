import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FAQS = [
  {
    q: 'Is DeClawd custodial?',
    a: 'No. DeClawd never holds your private keys or seed phrase. Wallet linking and withdrawals require you to sign a message or transaction with your own wallet (MetaMask, Coinbase Wallet, Rainbow, WalletConnect, or Rabby). DeClawd only ever relays instructions you have personally authorized.',
  },
  {
    q: 'How does the AI agent decide what to trade?',
    a: "Every trading cycle, DeClawd scans eligible BTC prediction markets on Polymarket, scores them with a probability model, and computes an expected value and confidence score. It only opens a position when the setup clears your configured risk limits and aggressiveness profile — you can see the exact reasoning behind every trade in your history.",
  },
  {
    q: 'What is the trading pool vs the protected vault?',
    a: 'The trading pool is the capital actively used by the AI agent to open new positions. The protected vault automatically receives a configurable share of realized profit (70% by default) and is never risked on new trades — it only grows.',
  },
  {
    q: 'How do withdrawals work?',
    a: 'Choose a source (trading pool or vault), an amount, and a destination address (defaults to your connected wallet). You sign a message authorizing the withdrawal, and DeClawd submits it for processing. There is no minimum withdrawal amount.',
  },
  {
    q: 'Can I pause the AI agent?',
    a: 'Yes — toggle it off any time from the Dashboard or Settings. Existing open positions are managed to close normally; the agent simply stops opening new ones.',
  },
  {
    q: 'What risk controls are available?',
    a: 'You can cap risk per trade as a percentage, set a maximum daily loss, cap the size of any single trade, choose an AI aggressiveness profile (conservative/balanced/aggressive), and restrict trading to specific hours or a custom schedule.',
  },
];

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Help &amp; FAQ</h1>
        <p className="text-sm text-muted-foreground">
          How DeClawd works, and answers to common questions.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-bitcoin-500" />
          <span>
            DeClawd is non-custodial: it can never move your funds without a signature from your
            own wallet. If anything ever asks you for a seed phrase or private key, it is not
            DeClawd.
          </span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {FAQS.map((faq) => (
          <Card key={faq.q}>
            <CardHeader>
              <CardTitle className="text-base">{faq.q}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{faq.a}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Still need help?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Reach out through the support channel linked in your notification settings, or email the
          DeClawd team from the address associated with your account.
        </CardContent>
      </Card>
    </div>
  );
}
