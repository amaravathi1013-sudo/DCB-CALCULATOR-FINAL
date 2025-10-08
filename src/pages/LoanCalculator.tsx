import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Calculator, Calendar as CalendarIcon } from "lucide-react";
import { format, parse, isValid, addMonths } from "date-fns";

const LoanCalculator = () => {
  const [loanAmount, setLoanAmount] = useState("");
  const [sanctionDate, setSanctionDate] = useState<Date>();
  const [interestRate, setInterestRate] = useState("");
  const [numInstalments, setNumInstalments] = useState("");
  const [instalmentFreq, setInstalmentFreq] = useState("");
  const [loanPeriod, setLoanPeriod] = useState("");
  const [interestAppFreq, setInterestAppFreq] = useState("");
  const [instalmentStartDate, setInstalmentStartDate] = useState<Date>();

  const [sanctionOpen, setSanctionOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [sanctionText, setSanctionText] = useState("");
  const [startText, setStartText] = useState("");

  const parseDate = (value: string): Date | undefined => {
    const d = parse(value.trim(), "dd/MM/yyyy", new Date());
    return isValid(d) ? d : undefined;
  };
  const fmt = (d?: Date) => (d ? format(d, "dd/MM/yyyy") : "");
  const mask = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    let out = dd;
    if (digits.length > 2) out += "/" + mm;
    if (digits.length > 4) out += "/" + yyyy;
    return out;
  };

  const getMonthsToAdd = (frequency: string) => {
    switch (frequency) {
      case "monthly": return 1;
      case "quarterly": return 3;
      case "half-yearly": return 6;
      case "yearly": return 12;
      default: return 1;
    }
  };
  const getRatePerPeriod = (annual: number, freq: string, instMonths: number) => {
    // Effective interest over one instalment period based on selected compounding frequency
    // annual is nominal annual rate in decimal (e.g., 0.12)
    const tYears = instMonths / 12; // instalment period length in years
    if (freq === "no-compound") {
      // Simple interest over the instalment period
      return annual * tYears;
    }
    let periodsPerYear = 1;
    switch (freq) {
      case "daily":
        periodsPerYear = 365;
        break;
      case "monthly":
        periodsPerYear = 12;
        break;
      case "quarterly":
        periodsPerYear = 4;
        break;
      case "half-yearly":
        periodsPerYear = 2;
        break;
      case "yearly":
        periodsPerYear = 1;
        break;
      default:
        periodsPerYear = 1;
    }
    // Effective rate for the instalment period with compounding
    return Math.pow(1 + annual / periodsPerYear, periodsPerYear * tYears) - 1;
  };

  const [emi, setEmi] = useState<number | null>(null);
  const [lastDate, setLastDate] = useState<Date | null>(null);
  type Row = { installmentNumber: number; dueDate: Date; principalAmount: number; interestAmount: number; totalInstallment: number; principalBalance: number };
  const [schedule, setSchedule] = useState<Row[]>([]);

  const handleCalculate = () => {
    if (!loanAmount || !sanctionDate || !interestRate || !numInstalments || !instalmentFreq || !interestAppFreq || !instalmentStartDate) return;
    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate) / 100;
    const n = parseInt(numInstalments);
    const months = getMonthsToAdd(instalmentFreq);
    const r = getRatePerPeriod(annualRate, interestAppFreq, months);
    const instalmentAmount = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setEmi(instalmentAmount);
    setLastDate(addMonths(instalmentStartDate, (n - 1) * months));

    // Build amortization schedule
    const rows: Row[] = [];
    let balance = principal;
    for (let i = 0; i < n; i++) {
      const dueDate = addMonths(instalmentStartDate, i * months);
      const interestAmount = balance * r;
      const principalAmount = instalmentAmount - interestAmount;
      const nextBalance = balance - principalAmount;
      rows.push({
        installmentNumber: i + 1,
        dueDate,
        principalAmount,
        interestAmount,
        totalInstallment: instalmentAmount,
        principalBalance: nextBalance,
      });
      balance = nextBalance;
    }
    setSchedule(rows);
  };
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Loan Calculator
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-6 h-6" />
              Term Loan Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Loan Sanction Amount</Label>
                <Input type="number" placeholder="Enter amount" value={loanAmount} onChange={(e)=>setLoanAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Loan Sanction Date</Label>
                <div className="relative">
                  <Input placeholder="DD/MM/YYYY" value={sanctionText || fmt(sanctionDate)} onChange={(e)=>setSanctionText(mask(e.target.value))} onBlur={(e)=>{const d = parseDate(e.target.value); if (d){setSanctionDate(d); setSanctionText(fmt(d));} else {setSanctionText(fmt(sanctionDate));}}} />
                  <Popover open={sanctionOpen} onOpenChange={setSanctionOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2"><CalendarIcon className="h-4 w-4" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar mode="single" selected={sanctionDate} onSelect={(d)=>{if(d){setSanctionDate(d); setSanctionText(fmt(d)); setSanctionOpen(false);}}} captionLayout="dropdown" fromYear={1970} toYear={2100} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rate of Interest (%)</Label>
                <Input type="number" step="0.01" placeholder="Enter rate" value={interestRate} onChange={(e)=>setInterestRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Number of Instalments</Label>
                <Input type="number" placeholder="Enter number" value={numInstalments} onChange={(e)=>setNumInstalments(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Instalment Frequency</Label>
                <Select value={instalmentFreq} onValueChange={setInstalmentFreq}>
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half-yearly">Half Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loan Period (Years)</Label>
                <Input type="number" placeholder="Enter years" value={loanPeriod} onChange={(e)=>setLoanPeriod(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Interest Application Frequency</Label>
                <Select value={interestAppFreq} onValueChange={setInterestAppFreq}>
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half-yearly">Half Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="no-compound">No Compound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instalment Start Date</Label>
                <div className="relative">
                  <Input placeholder="DD/MM/YYYY" value={startText || fmt(instalmentStartDate)} onChange={(e)=>setStartText(mask(e.target.value))} onBlur={(e)=>{const d = parseDate(e.target.value); if (d){setInstalmentStartDate(d); setStartText(fmt(d));} else {setStartText(fmt(instalmentStartDate));}}} />
                  <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2"><CalendarIcon className="h-4 w-4" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar mode="single" selected={instalmentStartDate} onSelect={(d)=>{if(d){setInstalmentStartDate(d); setStartText(fmt(d)); setStartOpen(false);}}} captionLayout="dropdown" fromYear={1970} toYear={2100} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Button className="w-full" variant="financial" size="lg" onClick={handleCalculate}>Calculate</Button>
            </div>

            {emi !== null && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Instalment Amount</p>
                  <p className="text-3xl font-bold text-primary">₹{emi.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                </div>
                {lastDate && (
                  <div className="p-4 rounded-lg bg-accent">
                    <p className="text-sm text-accent-foreground mb-1">Last Instalment Date</p>
                    <p className="text-xl font-semibold">{format(lastDate, 'dd/MM/yyyy')}</p>
                  </div>
                )}

                {/* Amortization Schedule */}
                {schedule.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-semibold">Inst. #</th>
                          <th className="text-left py-2 px-3 font-semibold">Due Date</th>
                          <th className="text-right py-2 px-3 font-semibold">Principal</th>
                          <th className="text-right py-2 px-3 font-semibold">Interest</th>
                          <th className="text-right py-2 px-3 font-semibold">Total</th>
                          <th className="text-right py-2 px-3 font-semibold">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((row) => (
                          <tr key={row.installmentNumber} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-2 px-3">{row.installmentNumber}</td>
                            <td className="py-2 px-3">{format(row.dueDate, 'dd/MM/yyyy')}</td>
                            <td className="text-right py-2 px-3">₹{row.principalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="text-right py-2 px-3">₹{row.interestAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="text-right py-2 px-3 font-semibold">₹{row.totalInstallment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="text-right py-2 px-3 text-muted-foreground">₹{row.principalBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LoanCalculator;
