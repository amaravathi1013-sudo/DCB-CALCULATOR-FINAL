import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addMonths, addYears, differenceInMonths, differenceInDays, parse, isValid } from "date-fns";
import { CalendarIcon, ArrowLeft, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AmortizationRow {
  installmentNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalInstallment: number;
  principalBalance: number;
}

interface CalculationResults {
  instalmentAmount: number;
  emiPerMonth: number;
  principalDemand: number;
  interestDemand: number;
  overduePrincipal: number;
  overdueInterest: number;
  installmentsToBePaid: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  totalPrincipalBalance: number;
  totalInterestBalance: number;
  overdueSinceDate: Date | null;
  overdueDays: number | null;
  demand: number;
  collection: number;
  balance: number;
  amortizationSchedule: AmortizationRow[];
}

const DCBCalculator = () => {
  // Form state
  const [loanAmount, setLoanAmount] = useState("");
  const [sanctionDate, setSanctionDate] = useState<Date>();
  const [interestRate, setInterestRate] = useState("");
  const [numInstalments, setNumInstalments] = useState("");
  const [instalmentFreq, setInstalmentFreq] = useState("");
  const [loanPeriod, setLoanPeriod] = useState("");
  const [interestAppFreq, setInterestAppFreq] = useState("");
  const [instalmentStartDate, setInstalmentStartDate] = useState<Date>();
  const [upToDate, setUpToDate] = useState<Date>();
  
  // Three options for input
  const [inputOption, setInputOption] = useState<"instalments" | "outstanding" | "collection">("instalments");
  const [instalmentsPaid, setInstalmentsPaid] = useState("");
  const [principalOutstanding, setPrincipalOutstanding] = useState("");
  const [interestOutstanding, setInterestOutstanding] = useState("");
  const [principalCollection, setPrincipalCollection] = useState("");
  const [interestCollection, setInterestCollection] = useState("");

  // Results state
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isAmortizationOpen, setIsAmortizationOpen] = useState(false);
  const [sanctionOpen, setSanctionOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [uptoOpen, setUptoOpen] = useState(false);
  const [sanctionText, setSanctionText] = useState("");
  const [startText, setStartText] = useState("");
  const [uptoText, setUptoText] = useState("");

  const parseDateInput = (value: string): Date | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const d = parse(trimmed, "dd/MM/yyyy", new Date());
    return isValid(d) ? d : undefined;
  };

  const formatToDDMMYYYY = (d?: Date): string => (d ? format(d, "dd/MM/yyyy") : "");

  const formatDateTyping = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    let out = day;
    if (digits.length > 2) out += "/" + month;
    if (digits.length > 4) out += "/" + year;
    return out;
  };

  const getMonthsToAdd = (frequency: string): number => {
    switch (frequency) {
      case "daily": return 1; // used only for due date progression when needed
      case "monthly": return 1;
      case "quarterly": return 3;
      case "half-yearly": return 6;
      case "yearly": return 12;
      default: return 1;
    }
  };

  const getRatePerPeriod = (annualRate: number, interestFrequency: string, instalmentMonths: number): number => {
    // Effective interest over one instalment period based on selected compounding frequency
    const tYears = instalmentMonths / 12;
    if (interestFrequency === "no-compound") {
      return annualRate * tYears; // simple interest over instalment period
    }
    let periodsPerYear = 1;
    switch (interestFrequency) {
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
    return Math.pow(1 + annualRate / periodsPerYear, periodsPerYear * tYears) - 1;
  };

  const handleCalculate = () => {
    // Validation
    if (!loanAmount || !sanctionDate || !interestRate || !numInstalments || 
        !instalmentFreq || !loanPeriod || !interestAppFreq || !instalmentStartDate || !upToDate) {
      toast.error("Please fill all required fields");
      return;
    }

    const principal = parseFloat(loanAmount);
    const annualRate = parseFloat(interestRate) / 100;
    const totalInstalments = parseInt(numInstalments);
    const monthsToAdd = getMonthsToAdd(instalmentFreq);
    
    // Calculate effective interest rate per instalment period
    const ratePerPeriod = getRatePerPeriod(annualRate, interestAppFreq, monthsToAdd);
    
    // Calculate EMI/Instalment Amount using reducing balance formula
    // EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
    const instalmentAmount = (principal * ratePerPeriod * Math.pow(1 + ratePerPeriod, totalInstalments)) / 
                             (Math.pow(1 + ratePerPeriod, totalInstalments) - 1);
   // Normalize to monthly EMI value for display regardless of instalment frequency
   const emiPerMonth = instalmentAmount / monthsToAdd;
    
    // Generate amortization schedule based on calculated instalment amount
    const amortizationSchedule: AmortizationRow[] = [];
    let remainingBalance = principal;
    
    for (let i = 0; i < totalInstalments; i++) {
      const dueDate = addMonths(instalmentStartDate, i * monthsToAdd);
      const interestAmount = remainingBalance * ratePerPeriod;
      const principalAmount = instalmentAmount - interestAmount;
      
      amortizationSchedule.push({
        installmentNumber: i + 1,
        dueDate,
        principalAmount,
        interestAmount,
        totalInstallment: instalmentAmount,
        principalBalance: remainingBalance - principalAmount,
      });
      
      remainingBalance -= principalAmount;
    }

    // Calculate how many instalments should have been paid by upToDate
    const instalmentsDue = amortizationSchedule.filter(row => row.dueDate <= upToDate).length;
    
    let instalmentsPaidNum = 0;
    let principalOut = 0;
    let interestOut = 0;
    let principalColl = 0;
    let interestColl = 0;
    
    if (inputOption === "instalments") {
      instalmentsPaidNum = parseInt(instalmentsPaid) || 0;
    } else if (inputOption === "outstanding") {
      principalOut = parseFloat(principalOutstanding) || 0;
      interestOut = parseFloat(interestOutstanding) || 0;
      // Calculate instalments paid from outstanding principal
      const paidPrincipal = principal - principalOut;
      instalmentsPaidNum = amortizationSchedule.findIndex(row => row.principalBalance < principalOut);
      if (instalmentsPaidNum === -1) instalmentsPaidNum = 0;
    } else {
      principalColl = parseFloat(principalCollection) || 0;
      interestColl = parseFloat(interestCollection) || 0;
      principalOut = principal - principalColl;
      instalmentsPaidNum = amortizationSchedule.findIndex(row => row.principalBalance < principalOut);
      if (instalmentsPaidNum === -1) instalmentsPaidNum = 0;
    }

    // Calculate overdue
    const overdueInstalments = Math.max(0, instalmentsDue - instalmentsPaidNum);
    const paidInstalments = amortizationSchedule.slice(0, instalmentsPaidNum);
    const overdueSchedule = amortizationSchedule.slice(instalmentsPaidNum, instalmentsDue);
    
    const paidPrincipal = paidInstalments.reduce((sum, row) => sum + row.principalAmount, 0);
    const paidInterest = paidInstalments.reduce((sum, row) => sum + row.interestAmount, 0);
    
    let overduePrincipal = overdueSchedule.reduce((sum, row) => sum + row.principalAmount, 0);
    let overdueInterest = overdueSchedule.reduce((sum, row) => sum + row.interestAmount, 0);
    
    const totalInterest = amortizationSchedule.reduce((sum, row) => sum + row.interestAmount, 0);
    const remainingPrincipal = principal - paidPrincipal - overduePrincipal;
    const remainingInterest = totalInterest - paidInterest - overdueInterest;

    // Demand up to the given date = principal due + interest due up to upToDate
    const dueRows = amortizationSchedule.filter(row => row.dueDate <= upToDate);
    const principalDemand = dueRows.reduce((sum, row) => sum + row.principalAmount, 0);
    const interestDemand = dueRows.reduce((sum, row) => sum + row.interestAmount, 0);
    const demand = principalDemand + interestDemand;
    const collection = paidPrincipal + paidInterest;
    const balance = demand - collection;

    // Total Loan Balance section
    // Total principal balance = loan sanction amount - principal paid
    let totalPrincipalBalance = principal - paidPrincipal;
    // Total interest balance = interest demand up to cut off date - interest paid
    let totalInterestBalance = interestDemand - paidInterest;

    // Apply user-specified behaviors based on input option
    if (inputOption === "outstanding") {
      // Total Principal Balance equals user-entered Principal Outstanding
      totalPrincipalBalance = principalOut;
      // Total Interest Balance equals user-entered Interest Outstanding
      totalInterestBalance = interestOut;
      // Overdue Principal = Total Principal Balance − Actual Outstanding Principal (from schedule)
      overduePrincipal = Math.max(0, totalPrincipalBalance - remainingPrincipal);
      // Overdue Interest is always set equal to Total Interest Balance as requested
      overdueInterest = totalInterestBalance;
    }
    if (inputOption === "collection") {
      // 2) Overdues equal to demand up to date minus collections
      overduePrincipal = Math.max(0, principalDemand - principalColl);
      overdueInterest = Math.max(0, interestDemand - interestColl);
    }

    // Find overdue since date (first unpaid instalment that was due)
    const overdueSinceDate = overdueInstalments > 0 && instalmentsPaidNum < amortizationSchedule.length
      ? amortizationSchedule[instalmentsPaidNum].dueDate
      : null;
    const overdueDays = overdueSinceDate && upToDate ? Math.max(0, differenceInDays(upToDate, overdueSinceDate)) : null;

    setResults({
      instalmentAmount,
      emiPerMonth,
      principalDemand,
      interestDemand,
      overduePrincipal,
      overdueInterest,
      // As requested, instalments to be paid equals overdue instalments due up to the given date
      installmentsToBePaid: overdueInstalments,
      outstandingPrincipal: remainingPrincipal,
      outstandingInterest: remainingInterest,
      totalPrincipalBalance,
      totalInterestBalance,
      overdueSinceDate,
      overdueDays,
      demand,
      collection,
      balance,
      amortizationSchedule,
    });

    toast.success("Calculation completed successfully");
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
              DCB Calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Demand, Collection & Balance Analysis
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loanAmount">Loan Sanction Amount</Label>
                  <Input
                    id="loanAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Loan Sanction Date</Label>
                  <div className="relative">
                    <Input
                      placeholder="DD/MM/YYYY"
                      value={sanctionText || formatToDDMMYYYY(sanctionDate)}
                      onChange={(e) => setSanctionText(formatDateTyping(e.target.value))}
                      onBlur={(e) => {
                        const d = parseDateInput(e.target.value);
                        if (d) {
                          setSanctionDate(d);
                          setSanctionText(formatToDDMMYYYY(d));
                        } else {
                          setSanctionText(formatToDDMMYYYY(sanctionDate));
                        }
                      }}
                    />
                    <Popover open={sanctionOpen} onOpenChange={setSanctionOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={sanctionDate}
                          onSelect={(d) => {
                            if (d) {
                              setSanctionDate(d);
                              setSanctionText(formatToDDMMYYYY(d));
                              setSanctionOpen(false);
                            }
                          }}
                          captionLayout="dropdown"
                          fromYear={1970}
                          toYear={2100}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interestRate">Rate of Interest (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    placeholder="Enter rate"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numInstalments">Number of Instalments</Label>
                  <Input
                    id="numInstalments"
                    type="number"
                    placeholder="Enter number"
                    value={numInstalments}
                    onChange={(e) => setNumInstalments(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Instalment Frequency</Label>
                  <Select value={instalmentFreq} onValueChange={setInstalmentFreq}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loanPeriod">Loan Period (Years)</Label>
                  <Input
                    id="loanPeriod"
                    type="number"
                    placeholder="Enter years"
                    value={loanPeriod}
                    onChange={(e) => setLoanPeriod(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Interest Application Frequency</Label>
                  <Select value={interestAppFreq} onValueChange={setInterestAppFreq}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
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
                    <Input
                      placeholder="DD/MM/YYYY"
                      value={startText || formatToDDMMYYYY(instalmentStartDate)}
                      onChange={(e) => setStartText(formatDateTyping(e.target.value))}
                      onBlur={(e) => {
                        const d = parseDateInput(e.target.value);
                        if (d) {
                          setInstalmentStartDate(d);
                          setStartText(formatToDDMMYYYY(d));
                        } else {
                          setStartText(formatToDDMMYYYY(instalmentStartDate));
                        }
                      }}
                    />
                    <Popover open={startOpen} onOpenChange={setStartOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={instalmentStartDate}
                          onSelect={(d) => {
                            if (d) {
                              setInstalmentStartDate(d);
                              setStartText(formatToDDMMYYYY(d));
                              setStartOpen(false);
                            }
                          }}
                          captionLayout="dropdown"
                          fromYear={1970}
                          toYear={2100}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Up to Date (Calculation Date)</Label>
                  <div className="relative">
                    <Input
                      placeholder="DD/MM/YYYY"
                      value={uptoText || formatToDDMMYYYY(upToDate)}
                      onChange={(e) => setUptoText(formatDateTyping(e.target.value))}
                      onBlur={(e) => {
                        const d = parseDateInput(e.target.value);
                        if (d) {
                          setUpToDate(d);
                          setUptoText(formatToDDMMYYYY(d));
                        } else {
                          setUptoText(formatToDDMMYYYY(upToDate));
                        }
                      }}
                    />
                    <Popover open={uptoOpen} onOpenChange={setUptoOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={upToDate}
                          onSelect={(d) => {
                            if (d) {
                              setUpToDate(d);
                              setUptoText(formatToDDMMYYYY(d));
                              setUptoOpen(false);
                            }
                          }}
                          captionLayout="dropdown"
                          fromYear={1970}
                          toYear={2100}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Input Type</Label>
                  <Select value={inputOption} onValueChange={(value: any) => setInputOption(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instalments">Number of Instalments Paid</SelectItem>
                      <SelectItem value="outstanding">Outstanding Amounts</SelectItem>
                      <SelectItem value="collection">Collection Amounts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {inputOption === "instalments" && (
                  <div className="space-y-2">
                    <Label htmlFor="instalmentsPaid">Instalments Paid as on Date</Label>
                    <Input
                      id="instalmentsPaid"
                      type="number"
                      placeholder="Enter number"
                      value={instalmentsPaid}
                      onChange={(e) => setInstalmentsPaid(e.target.value)}
                    />
                  </div>
                )}

                {inputOption === "outstanding" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="principalOutstanding">Principal Outstanding</Label>
                      <Input
                        id="principalOutstanding"
                        type="number"
                        placeholder="Enter amount"
                        value={principalOutstanding}
                        onChange={(e) => setPrincipalOutstanding(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interestOutstanding">Interest Outstanding</Label>
                      <Input
                        id="interestOutstanding"
                        type="number"
                        placeholder="Enter amount"
                        value={interestOutstanding}
                        onChange={(e) => setInterestOutstanding(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {inputOption === "collection" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="principalCollection">Principal Collection</Label>
                      <Input
                        id="principalCollection"
                        type="number"
                        placeholder="Enter amount"
                        value={principalCollection}
                        onChange={(e) => setPrincipalCollection(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interestCollection">Interest Collection</Label>
                      <Input
                        id="interestCollection"
                        type="number"
                        placeholder="Enter amount"
                        value={interestCollection}
                        onChange={(e) => setInterestCollection(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <Button
                  onClick={handleCalculate}
                  className="w-full"
                  variant="financial"
                  size="lg"
                >
                  Calculate DCB
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calculation Results</CardTitle>
              </CardHeader>
              <CardContent>
                {results ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-muted-foreground mb-1">Instalment Amount</p>
                      <p className="text-3xl font-bold text-primary">
                        ₹{results.instalmentAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    {/* EMI (per month) removed per request */}

                    {/* Total Loan Balance Section */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Total Principal Balance</p>
                        <p className="text-2xl font-bold text-primary">
                          ₹{results.totalPrincipalBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Total Interest Balance</p>
                        <p className="text-2xl font-bold text-primary">
                          ₹{results.totalInterestBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Overdue Principal</p>
                        <p className="text-2xl font-bold text-destructive">
                          ₹{results.overduePrincipal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Overdue Interest</p>
                        <p className="text-2xl font-bold text-destructive">
                          ₹{results.overdueInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Actual Outstanding Principal</p>
                        <p className="text-2xl font-bold text-primary">
                          ₹{results.outstandingPrincipal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Actual Interest Demand</p>
                        <p className="text-2xl font-bold text-primary">
                          ₹{results.outstandingInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-accent">
                      <p className="text-sm text-accent-foreground mb-1">Instalments to be Paid</p>
                      <p className="text-3xl font-bold">{results.installmentsToBePaid}</p>
                    </div>

                    {results.overdueSinceDate && (
                      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-destructive/10 via-accent/10 to-secondary/10">
                        <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-destructive/20 blur-2xl" />
                        <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-secondary/20 blur-2xl" />
                        <div className="relative p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-widest text-muted-foreground">Overdue Since</p>
                              <p className="mt-1 text-2xl font-extrabold text-destructive">
                                {format(results.overdueSinceDate, "PPP")}
                              </p>
                            </div>
                            {typeof results.overdueDays === 'number' && (
                              <span className="inline-flex items-center gap-2 rounded-full bg-destructive/15 px-3 py-1 text-destructive text-sm font-semibold ring-1 ring-destructive/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v2h20V6a2 2 0 0 0-2-2h-1V3a1 1 0 0 0-1-1H6Zm16 8H2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10Zm-6 3a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0v-6Zm-4 0a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0v-6Zm-4 0a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0v-6Z"/></svg>
                                {results.overdueDays} days
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Fill in the form and click Calculate to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {results && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>DCB Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold">Category</th>
                            <th className="text-right py-3 px-4 font-semibold">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-4">Demand</td>
                            <td className="text-right py-3 px-4 font-semibold text-primary">
                              ₹{results.demand.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-4">Collection</td>
                            <td className="text-right py-3 px-4 font-semibold text-secondary">
                              ₹{results.collection.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="bg-accent hover:bg-accent/80 transition-colors">
                            <td className="py-3 px-4 font-semibold">Balance</td>
                            <td className="text-right py-3 px-4 font-bold text-lg">
                              ₹{results.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Collapsible
                      open={isAmortizationOpen}
                      onOpenChange={setIsAmortizationOpen}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full flex items-center justify-between p-0 hover:bg-transparent"
                        >
                          <CardTitle>Amortization Schedule</CardTitle>
                          {isAmortizationOpen ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-6">
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
                                {results.amortizationSchedule.map((row) => (
                                  <tr
                                    key={row.installmentNumber}
                                    className="border-b hover:bg-muted/50 transition-colors"
                                  >
                                    <td className="py-2 px-3">{row.installmentNumber}</td>
                                    <td className="py-2 px-3">{format(row.dueDate, "PP")}</td>
                                    <td className="text-right py-2 px-3">
                                      ₹{row.principalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="text-right py-2 px-3">
                                      ₹{row.interestAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="text-right py-2 px-3 font-semibold">
                                      ₹{row.totalInstallment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="text-right py-2 px-3 text-muted-foreground">
                                      ₹{row.principalBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardHeader>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DCBCalculator;
