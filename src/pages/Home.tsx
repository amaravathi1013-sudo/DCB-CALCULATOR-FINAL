import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Calculator, TrendingUp, Sparkles } from "lucide-react";

const Home = () => {
  const tools = [
    {
      title: "Deposit",
      icon: Wallet,
      path: "/deposit",
      description: "Manage your deposits",
      gradient: "from-primary to-primary/80",
    },
    {
      title: "Loan Calculator",
      icon: Calculator,
      path: "/loan-calculator",
      description: "Calculate loan payments",
      gradient: "from-secondary to-secondary/80",
    },
    {
      title: "DCB Calculator",
      icon: TrendingUp,
      path: "/dcb-calculator",
      description: "Demand, Collection & Balance",
      gradient: "from-primary via-primary/90 to-secondary",
    },
  ];

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || window.pageYOffset || 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const parallax1 = `translateY(${scrollY * 0.15}px)`;
  const parallax2 = `translateY(${scrollY * -0.1}px)`;

  return (
    <div className="min-h-screen bg-background">
      {/* Vibrant hero banner */}
      <div className="relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary/20 blur-3xl will-change-transform" style={{ transform: parallax1 }} />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-secondary/20 blur-3xl will-change-transform" style={{ transform: parallax2 }} />
        <header className="bg-gradient-to-r from-primary/10 via-accent to-secondary/10 border-b bg-fixed">
          <div className="container mx-auto px-4 py-10 flex items-center gap-8">
            <img
              src="/kdccb%20logo.jpg"
              alt="KDCCB Centenary"
              className="hidden sm:block w-28 h-28 rounded-full ring-4 ring-primary/30 bg-white shadow-lg object-contain will-change-transform"
              style={{ transform: parallax1 }}
              onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}}
            />
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent flex items-center gap-3">
                KDCCB Financial Tools <Sparkles className="w-7 h-7 text-secondary" />
              </h1>
              <p className="mt-3 text-base md:text-lg text-foreground/70 max-w-2xl">
                Professional, colorful and modern tools to manage deposits, calculate loans, and analyze DCB.
              </p>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold mb-2">Welcome to Financial Tools</h2>
          <p className="text-muted-foreground">Select a tool to get started with your financial calculations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.path} to={tool.path}>
                <Card className="h-full cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl" style={{boxShadow:"var(--shadow-card)"}}>
                  <CardContent className="p-8 flex flex-col items-center text-center gap-5">
                    <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                      <Icon className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-semibold mb-2">{tool.title}</h3>
                      <p className="text-sm md:text-base text-muted-foreground">{tool.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Home;
