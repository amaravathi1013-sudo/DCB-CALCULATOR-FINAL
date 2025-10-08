import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Wallet } from "lucide-react";

// Removed initial duplicate component definition

// Logic & state below component definition for clarity
type DepositResult = { totalPrincipal: number; interestAmount: number; maturityValue: number; apy: number };
type TableRow = { month: number; contribution: number; interest: number; balance: number };
type PaymentMethod = "monthly-interest" | "maturity";

const compoundsPerYear = (comp: string): number => {
  switch (comp) {
    case "daily": return 365;
    case "monthly": return 12;
    case "quarterly": return 4;
    case "half-yearly": return 2;
    case "yearly": return 1;
    case "no-compound": return 0; // simple interest
    default: return 12;
  }
};

function useDepositState() {
  const [principal, setPrincipal] = useState("");
  const [monthly, setMonthly] = useState("");
  const [months, setMonths] = useState("");
  const [rate, setRate] = useState("");
  const [comp, setComp] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("maturity");
  const [result, setResult] = useState<DepositResult | null>(null);
  const [table, setTable] = useState<TableRow[]>([]);

  const handleReset = () => {
    setPrincipal(""); setMonthly(""); setMonths(""); setRate(""); setComp(""); setPaymentMethod("maturity"); setResult(null); setTable([]);
  };

  const handleCalc = () => {
    const P = parseFloat(principal) || 0;
    const D = parseFloat(monthly) || 0;
    const nMonths = Math.max(0, parseInt(months) || 0);
    const rNominal = (parseFloat(rate) || 0) / 100;
    const m = compoundsPerYear(comp);
    const years = nMonths / 12;
    const N = m * years;

    // APY
    const apy = m > 0 ? Math.pow(1 + rNominal / m, m) - 1 : rNominal; // simple interest case

    // Effective monthly rate j for table and future value calculations
    const j = m > 0 ? Math.pow(1 + rNominal / m, m / 12) - 1 : rNominal / 12;

    let maturityValue = 0;
    let totalPrincipal = P + D * nMonths;
    let interestAmount = 0;
    const rows: TableRow[] = [];
    let balance = P;
    let cumInterest = 0;

    if (paymentMethod === "monthly-interest") {
      // Interest paid out monthly, calculated using:
      // Interest (for 1 month) = (Principal * Time * InterestRate) / (1200 + InterestRate)
      // Here Time = 1 (month), InterestRate is the annual percentage rate
      const ratePct = (parseFloat(rate) || 0);
      for (let month = 1; month <= nMonths; month++) {
        const base = balance + D; // deposit credited at start of month
        const interest = (base * 1 * ratePct) / (1200 + ratePct);
        cumInterest += interest;   // paid out, not compounded
        balance = base;            // balance stays without adding interest
        rows.push({ month, contribution: D, interest: cumInterest, balance });
      }
      maturityValue = balance; // principal + contributions only
      interestAmount = cumInterest; // total interest paid out across months
    } else {
      if (m === 0) {
        // No-compound: simple interest calculation to maturity
        // Per-month simple interest rate
        const jSimple = rNominal / 12;
        for (let month = 1; month <= nMonths; month++) {
          const base = balance + D;         // deposit at start
          const interest = base * jSimple;  // simple monthly interest, not compounded
          cumInterest += interest;
          balance = base;                   // balance excludes interest
          rows.push({ month, contribution: D, interest: cumInterest, balance });
        }
        maturityValue = balance + cumInterest;
        interestAmount = cumInterest;
      } else {
        // Maturity with compounding according to selected frequency
        // Lump sum future value over n months
        const fvLump = P * Math.pow(1 + j, nMonths);
        // Monthly deposit grows as an annuity-due (deposit at the start of month)
        const fvMonthly = D > 0 && j !== 0 ? D * ((Math.pow(1 + j, nMonths) - 1) / j) * (1 + j) : D * nMonths;
        maturityValue = fvLump + fvMonthly;
        interestAmount = Math.max(0, maturityValue - totalPrincipal);

        for (let month = 1; month <= nMonths; month++) {
          const base = balance + D;    // deposit at start
          const interest = base * j;   // monthly interest
          balance = base + interest;   // interest retained (compounded)
          cumInterest += interest;
          rows.push({ month, contribution: D, interest: cumInterest, balance });
        }
      }
    }

    setTable(rows);
    setResult({ totalPrincipal, interestAmount, maturityValue, apy });
  };

  return {
    principal, setPrincipal,
    monthly, setMonthly,
    months, setMonths,
    rate, setRate,
    comp, setComp,
    paymentMethod, setPaymentMethod,
    result, table,
    handleReset, handleCalc,
  } as const;
}

// Removed duplicate wrapper component named Deposit

export default (function DepositPage() {
  // recompose the page using the hook (avoids large refactor above)
  const {
    principal, setPrincipal,
    monthly, setMonthly,
    months, setMonths,
    rate, setRate,
    comp, setComp,
    paymentMethod, setPaymentMethod,
    result, table,
    handleReset, handleCalc,
  } = useDepositState();

  // Re-render the original JSX with state bound
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Deposit Calculator</h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="w-6 h-6" />Term Deposit Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2"><Label>Principal Amount</Label><Input type="number" placeholder="Enter amount" value={principal} onChange={(e)=>setPrincipal(e.target.value)} /></div>
              <div className="space-y-2"><Label>Monthly Deposit</Label><Input type="number" placeholder="Optional" value={monthly} onChange={(e)=>setMonthly(e.target.value)} /></div>
              <div className="space-y-2"><Label>Period (months)</Label><Input type="number" placeholder="e.g. 144" value={months} onChange={(e)=>setMonths(e.target.value)} /></div>
              <div className="space-y-2"><Label>Annual Interest Rate (%)</Label><Input type="number" step="0.01" placeholder="Enter rate" value={rate} onChange={(e)=>setRate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Compounding</Label><Select value={comp} onValueChange={setComp}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="half-yearly">Half Yearly</SelectItem><SelectItem value="yearly">Yearly</SelectItem><SelectItem value="no-compound">No Compound</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Payment Method</Label><Select value={paymentMethod} onValueChange={(v)=>setPaymentMethod(v as PaymentMethod)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="monthly-interest">Monthly Interest Payment</SelectItem><SelectItem value="maturity">On Maturity</SelectItem></SelectContent></Select></div>
              <div className="flex gap-3"><Button variant="secondary" onClick={handleReset}>Reset</Button><Button variant="financial" className="ml-auto" onClick={handleCalc}>Calculate</Button></div>
            </div>
            {result && (<div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="p-4 rounded-lg bg-muted"><p className="text-sm text-muted-foreground mb-1">Total Principal</p><p className="text-2xl font-bold text-primary">₹{result.totalPrincipal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div><div className="p-4 rounded-lg bg-muted"><p className="text-sm text-muted-foreground mb-1">Interest Amount</p><p className="text-2xl font-bold text-destructive">₹{result.interestAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div><div className="p-4 rounded-lg bg-accent"><p className="text-sm text-accent-foreground mb-1">Maturity Value</p><p className="text-2xl font-bold">₹{result.maturityValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div><div className="p-4 rounded-lg bg-primary/10 border border-primary/20"><p className="text-sm text-muted-foreground mb-1">APY</p><p className="text-2xl font-bold text-primary">{(result.apy * 100).toFixed(4)}%</p></div></div>{table.length > 0 && (<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2 px-3 font-semibold">Month</th><th className="text-right py-2 px-3 font-semibold">Contribution</th><th className="text-right py-2 px-3 font-semibold">Interest</th><th className="text-right py-2 px-3 font-semibold">Balance</th></tr></thead><tbody>{table.map((row)=>(<tr key={row.month} className="border-b hover:bg-muted/50 transition-colors"><td className="py-2 px-3">{row.month}</td><td className="text-right py-2 px-3">₹{row.contribution.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td className="text-right py-2 px-3">₹{row.interest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td className="text-right py-2 px-3 font-semibold">₹{row.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>))}</tbody></table></div>)}</div>)}
          </CardContent>
        </Card>
      </main>
    </div>
  );
});
