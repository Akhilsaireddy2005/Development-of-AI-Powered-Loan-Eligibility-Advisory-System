import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Upload, Bot, User, CheckCircle, AlertCircle, CreditCard, Sparkles, ShieldCheck, FileCheck2, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserData {
  name: string;
  age: string;
  income: string;
  loanType: string;
  loanAmount: string;
  emis: string;
  creditScore: string;
  panNumber: string;
}

interface Message {
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

interface FileUpload {
  salarySlip: File | null;
  aadhaarCard: File | null;
}

interface CardData {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

const ChatBot = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState<UserData>({
    name: '',
    age: '',
    income: '',
    loanType: '',
    loanAmount: '',
    emis: '',
    creditScore: '',
    panNumber: ''
  });
  const [files, setFiles] = useState<FileUpload>({
    salarySlip: null,
    aadhaarCard: null
  });
  const [cardData, setCardData] = useState<CardData>({
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  const [eligibility, setEligibility] = useState<null | 'eligible' | 'ineligible'>(null);
  const [eligibilityReasons, setEligibilityReasons] = useState<string[]>([]);

  const evaluateEligibility = (data: UserData) => {
    const reasons: string[] = [];
    const credit = parseInt(data.creditScore || '0');
    const income = parseInt(data.income || '0');
    const emisTotal = parseInt(data.emis || '0');
    const loanAmt = parseInt(data.loanAmount || '0');
    const age = parseInt(data.age || '0');
    const type = (data.loanType || '').toLowerCase();

    // Base checks
    if (Number.isNaN(income) || income <= 0) reasons.push('Monthly income is required');
    if (Number.isNaN(loanAmt) || loanAmt <= 0) reasons.push('Loan amount must be greater than 0');

    // Age range
    const maxAge = type === 'home loan' ? 65 : 60;
    if (age < 21 || age > maxAge) {
      reasons.push(`Age must be between 21 and ${maxAge}`);
    }

    // Type-specific rules
    const rules: Record<string, { minIncome: number; minCredit: number; maxDTI: number; loanMultiple: number }>
      = {
        'personal loan': { minIncome: 15000, minCredit: 720, maxDTI: 0.45, loanMultiple: 24 },
        'home loan': { minIncome: 25000, minCredit: 700, maxDTI: 0.50, loanMultiple: 60 },
        'car loan': { minIncome: 20000, minCredit: 700, maxDTI: 0.50, loanMultiple: 36 },
        'business loan': { minIncome: 30000, minCredit: 750, maxDTI: 0.45, loanMultiple: 48 },
      };
    const appliedRules = rules[type] || { minIncome: 15000, minCredit: 700, maxDTI: 0.45, loanMultiple: 24 };

    if (income < appliedRules.minIncome) {
      reasons.push(`Income below minimum for ${data.loanType || 'selected type'} (₹${appliedRules.minIncome.toLocaleString()})`);
    }
    if (credit < appliedRules.minCredit) {
      reasons.push(`Credit score below ${appliedRules.minCredit}`);
    }

    const dti = income > 0 ? emisTotal / income : 1;
    if (dti > appliedRules.maxDTI) {
      reasons.push(`EMI-to-income ratio above ${(appliedRules.maxDTI * 100).toFixed(0)}%`);
    }

    // Loan to income sanity using multiples of monthly income
    const suggestedMaxLoan = income * appliedRules.loanMultiple;
    if (loanAmt > suggestedMaxLoan) {
      reasons.push(`Requested amount exceeds suggested maximum for profile (₹${suggestedMaxLoan.toLocaleString()})`);
    }

    return { eligible: reasons.length === 0, reasons, metrics: { dti, maxDTI: appliedRules.maxDTI, suggestedMaxLoan } } as const;
  };
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: "Hello! I'm your AI Loan Eligibility Advisor. I'll help you check your loan eligibility by collecting some information and analyzing your documents. Let's start with your basic details.",
      timestamp: new Date()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    { field: 'name', label: 'Full Name', type: 'text', question: "What's your full name?" },
    { field: 'age', label: 'Age', type: 'number', question: "How old are you?" },
    { field: 'income', label: 'Monthly Income (₹)', type: 'number', question: "What's your monthly income in rupees?" },
    { field: 'loanType', label: 'Loan Type', type: 'select', question: "What type of loan are you applying for?", options: ['Personal Loan', 'Home Loan', 'Car Loan', 'Business Loan'] },
    { field: 'loanAmount', label: 'Loan Amount (₹)', type: 'number', question: "How much loan amount do you need?" },
    { field: 'emis', label: 'Existing EMIs (₹)', type: 'number', question: "What's your total existing EMI amount per month?" },
    { field: 'creditScore', label: 'Credit Score', type: 'number', question: "What's your current credit score (300-850)?" },
    { field: 'panNumber', label: 'PAN Number', type: 'text', question: "What's your PAN number?" }
  ];

  const handleInputChange = (field: keyof UserData, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    const currentField = steps[currentStep].field as keyof UserData;
    const value = userData[currentField];
    
    if (!value) {
      toast({
        title: "Required Field",
        description: "Please fill in this field before proceeding.",
        variant: "destructive"
      });
      return;
    }

    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      content: value,
      timestamp: new Date()
    }]);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Add next bot question
      setTimeout(() => {
        setMessages(prev => [...prev, {
          type: 'bot',
          content: steps[currentStep + 1].question,
          timestamp: new Date()
        }]);
      }, 500);
    } else {
      // Move to document upload phase
      setTimeout(() => {
        setMessages(prev => [...prev, {
          type: 'bot',
          content: "Great! Now I need you to upload your documents for verification. Please upload your Salary Slip and Aadhaar Card.",
          timestamp: new Date()
        }]);
        setCurrentStep(currentStep + 1);
      }, 500);
    }
  };

  const handleFileUpload = (type: 'salarySlip' | 'aadhaarCard', file: File) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    toast({
      title: "File Uploaded",
      description: `${type === 'salarySlip' ? 'Salary Slip' : 'Aadhaar Card'} uploaded successfully!`,
    });
  };

  const processApplication = async () => {
    if (!files.salarySlip || !files.aadhaarCard) {
      toast({
        title: "Missing Documents",
        description: "Please upload both Salary Slip and Aadhaar Card.",
        variant: "destructive"
      });
      return;
    }

    if (!cardData.cardholderName || !cardData.cardNumber || !cardData.expiryMonth || !cardData.expiryYear || !cardData.cvv) {
      toast({
        title: "Missing Card Details",
        description: "Please fill in all debit card fields.",
        variant: "destructive"
      });
      return;
    }

    // Basic validations
    const digitsOnly = cardData.cardNumber.replace(/\s+/g, '');
    if (digitsOnly.length < 12 || digitsOnly.length > 19 || /\D/.test(digitsOnly)) {
      toast({
        title: "Invalid Card Number",
        description: "Enter a valid card number.",
        variant: "destructive"
      });
      return;
    }
    if (!/^\d{3,4}$/.test(cardData.cvv)) {
      toast({
        title: "Invalid CVV",
        description: "CVV must be 3 or 4 digits.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setMessages(prev => [...prev, {
      type: 'bot',
      content: "Processing your application... Running OCR on documents, validating information, and checking loan eligibility...",
      timestamp: new Date()
    }]);

    // Simulate processing
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'bot',
        content: "✅ Documents processed successfully! Analyzing your loan eligibility...",
        timestamp: new Date()
      }]);
      
      setTimeout(() => {
        const result = evaluateEligibility(userData);
        setEligibility(result.eligible ? 'eligible' : 'ineligible');
        setEligibilityReasons(result.reasons);
        const details = result.eligible
          ? "🎉 Congratulations! You are eligible for the loan."
          : `❌ Not eligible currently due to: ${result.reasons.join('; ')}.`;
        setMessages(prev => [...prev, {
          type: 'bot',
          content: `${details} (DTI: ${(result.metrics.dti * 100).toFixed(0)}% / Allowed: ${(result.metrics.maxDTI * 100).toFixed(0)}%${userData.loanAmount ? ` / Suggested Max Loan: ₹${(result.metrics.suggestedMaxLoan).toLocaleString()}` : ''})`,
          timestamp: new Date()
        }]);
        setIsProcessing(false);
      }, 2000);
    }, 3000);
  };

  const currentQuestion = currentStep < steps.length ? steps[currentStep] : null;

  // Progress calculation including two extra phases: documents and card details
  const questionsCompleted = Math.min(currentStep, steps.length);
  const documentsCompleted = files.salarySlip && files.aadhaarCard ? 1 : 0;
  const cardCompleted = (cardData.cardholderName && cardData.cardNumber && cardData.expiryMonth && cardData.expiryYear && cardData.cvv) ? 1 : 0;
  const totalUnits = steps.length + 2;
  const progressValue = Math.min(((questionsCompleted + documentsCompleted + cardCompleted) / totalUnits) * 100, 100);

  const goToField = (field: keyof UserData) => {
    const stepIndex = steps.findIndex(s => s.field === field);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
      // Optional helper message
      setMessages(prev => [...prev, {
        type: 'bot',
        content: `Sure, let's update your ${steps[stepIndex].label.toLowerCase()}.`,
        timestamp: new Date()
      }]);
    }
  };

  return (
    <div className="relative min-h-screen bg-[image:var(--gradient-bg)] p-4 overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      </div>
      <div className="mx-auto max-w-5xl relative">
        <div className="mb-8">
          <Card className="border-0 shadow-[var(--shadow-card)] bg-white/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur ring-1 ring-primary/10">
            <div className="p-6 md:p-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-primary mb-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-xs font-medium">Smart, secure, and fast</span>
                </div>
                <h1 className="mb-2 text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Loan Eligibility Advisor
          </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Seamlessly check your eligibility with a guided chat and secure document analysis.
                </p>
              </div>
              <div className="mt-6">
                <Progress value={progressValue} className="h-3 bg-secondary" />
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  Progress: {Math.round(progressValue)}%
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat Interface */}
          <Card className="flex flex-col h-[600px] border-0 shadow-[var(--shadow-card)] bg-white/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
            <div className="flex items-center gap-2 border-b p-4 bg-background/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
              <Bot className="h-6 w-6 text-primary" />
              <h2 className="font-semibold">Loan Advisor Bot</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-secondary/30">
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    message.type === 'bot' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                  }`}>
                    {message.type === 'bot' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-xs rounded-xl p-3 md:p-4 border ${
                    message.type === 'bot' 
                      ? 'bg-card text-foreground' 
                      : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-transparent'
                  } ${message.type === 'bot' ? 'shadow-[var(--shadow-card)]' : 'shadow-[var(--shadow-glow)]'}`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-card text-muted-foreground rounded-xl p-3 md:p-4 border shadow-[var(--shadow-card)]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
                      <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75"></div>
                      <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            {currentQuestion && (
              <div className="border-t p-4">
                <div className="space-y-4">
                  <Label>{currentQuestion.label}</Label>
                  {currentQuestion.type === 'select' ? (
                    <Select
                      value={userData[currentQuestion.field as keyof UserData]}
                      onValueChange={(val) => handleInputChange(currentQuestion.field as keyof UserData, val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Select ${currentQuestion.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                      {currentQuestion.options?.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={currentQuestion.type}
                      placeholder={`Enter your ${currentQuestion.label.toLowerCase()}`}
                      value={userData[currentQuestion.field as keyof UserData]}
                      onChange={(e) => handleInputChange(currentQuestion.field as keyof UserData, e.target.value)}
                    />
                  )}
                  <Button onClick={handleNext} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
                    {currentStep < steps.length - 1 ? 'Next' : 'Proceed to Documents'}
                  </Button>
                </div>
              </div>
            )}

            {/* Document Upload Phase */}
            {currentStep >= steps.length && (
              <div className="border-t p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="border-dashed border-2 hover:border-primary transition-colors">
                    <div className="p-4">
                      <Label className="flex items-center gap-2"><Upload className="h-4 w-4" /> Salary Slip</Label>
                      <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('salarySlip', e.target.files[0])}
                        className="text-xs"
                      />
                      {files.salarySlip && <CheckCircle className="h-4 w-4 text-success" />}
                    </div>
                  </div>
                  </Card>
                  <Card className="border-dashed border-2 hover:border-primary transition-colors">
                    <div className="p-4">
                      <Label className="flex items-center gap-2"><Upload className="h-4 w-4" /> Aadhaar Card</Label>
                      <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('aadhaarCard', e.target.files[0])}
                        className="text-xs"
                      />
                      {files.aadhaarCard && <CheckCircle className="h-4 w-4 text-success" />}
                    </div>
                  </div>
                  </Card>
                </div>

                <Card className="border-0 shadow-[var(--shadow-card)] bg-white/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Debit Card Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cardholder Name</Label>
                        <Input
                          type="text"
                          placeholder="As printed on card"
                          value={cardData.cardholderName}
                          onChange={(e) => setCardData(prev => ({ ...prev, cardholderName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Card Number</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="1234 5678 9012 3456"
                          maxLength={23}
                          value={cardData.cardNumber}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
                            const spaced = digits.replace(/(.{4})/g, '$1 ').trim();
                            setCardData(prev => ({ ...prev, cardNumber: spaced }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Month</Label>
                        <Select
                          value={cardData.expiryMonth}
                          onValueChange={(val) => setCardData(prev => ({ ...prev, expiryMonth: val }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Year</Label>
                        <Select
                          value={cardData.expiryYear}
                          onValueChange={(val) => setCardData(prev => ({ ...prev, expiryYear: val }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="YY" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => String((new Date().getFullYear() % 100) + i).padStart(2, '0')).map(y => (
                              <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>CVV</Label>
                        <Input
                          type="password"
                          inputMode="numeric"
                          placeholder="•••"
                          maxLength={4}
                          value={cardData.cvv}
                          onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        />
                      </div>
                      {/* Live Card Preview */}
                      <div className="md:col-span-2">
                        <div className="relative rounded-2xl p-5 text-primary-foreground bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow)]">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-primary-foreground/90">
                              <ShieldCheck className="h-5 w-5" />
                              <span className="text-xs">Secure Debit • Tokenized</span>
                            </div>
                            <CreditCard className="h-6 w-6 opacity-90" />
                          </div>
                          <div className="space-y-4">
                            <div className="tracking-widest text-lg">
                              {cardData.cardNumber || '1234 5678 9012 3456'}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <div className="opacity-80">Cardholder</div>
                                <div className="font-medium">{cardData.cardholderName || 'Your Name'}</div>
                              </div>
                              <div className="text-right">
                                <div className="opacity-80">Expiry</div>
                                <div className="font-medium">{cardData.expiryMonth && cardData.expiryYear ? `${cardData.expiryMonth}/${cardData.expiryYear}` : 'MM/YY'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                <Button onClick={processApplication} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90" disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Analyze Eligibility'}
                </Button>
              </div>
            )}
          </Card>

          {/* Application Summary */}
          <Card className="h-[600px] overflow-y-auto border-0 shadow-[var(--shadow-card)] bg-white/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
            <div className="border-b p-4 bg-background/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
              <h2 className="font-semibold">Application Summary</h2>
            </div>
            <div className="p-4 space-y-4">
              {/* Eligibility Banner */}
              {eligibility && (
                <div className={`rounded-lg p-3 flex items-center justify-between ${eligibility === 'eligible' ? 'bg-gradient-to-r from-success to-accent text-success-foreground' : 'bg-destructive/10 text-destructive'} border`}> 
                  <div className="flex items-center gap-2">
                    {eligibility === 'eligible' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span className="font-medium">{eligibility === 'eligible' ? 'Eligible' : 'Not Eligible'}</span>
                  </div>
                  <Badge variant={eligibility === 'eligible' ? 'secondary' : 'destructive'}>{eligibility === 'eligible' ? 'Approved Range' : 'Needs Improvement'}</Badge>
                </div>
              )}

              {eligibility && eligibilityReasons.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <div className="mt-2">Reasons:</div>
                  <ul className="list-disc pl-5">
                    {eligibilityReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.entries(userData).map(([key, value]) => (
                value && (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium max-w-[200px] truncate" title={String(value)}>{value}</span>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => goToField(key as keyof UserData)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                )
              ))}
              
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Document Status</h3>
                  <Badge variant="secondary" className="gap-1"><FileCheck2 className="h-3 w-3" /> Verified by AI</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Salary Slip</span>
                    {files.salarySlip ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Aadhaar Card</span>
                    {files.aadhaarCard ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <h3 className="font-medium mb-2">Payment Card</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cardholder</span>
                    <span className="text-sm font-medium">{cardData.cardholderName || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Card Number</span>
                    <span className="text-sm font-medium">
                      {cardData.cardNumber
                        ? `•••• •••• •••• ${cardData.cardNumber.replace(/\D/g, '').slice(-4)}`
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Expiry</span>
                    <span className="text-sm font-medium">{cardData.expiryMonth && cardData.expiryYear ? `${cardData.expiryMonth}/${cardData.expiryYear}` : '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CVV</span>
                    <span className="text-sm font-medium">{cardData.cvv ? '•••' : '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;