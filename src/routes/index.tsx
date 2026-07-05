import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShieldCheck, ScanLine, Camera, Cpu, LogIn, 
  CheckCircle2, QrCode, FileText, Lock, 
  Users, CheckCircle, AlertTriangle, TrendingUp,
  User, ShieldAlert, Facebook, Twitter, Linkedin, Instagram,
  MapPin, Phone, Mail
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: PublicLandingPage,
});

interface Stats {
  totalStudents: number;
  verifiedToday: number;
  paymentsValidated: number;
  alertsDetected: number;
}

function PublicLandingPage() {
  const [stats, setStats] = useState<Stats>({ 
    totalStudents: 0, verifiedToday: 0, paymentsValidated: 0, alertsDetected: 0 
  });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const iso = today.toISOString();

      const [studentsRes, verifiedRes, rejectedRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "verified").gte("created_at", iso),
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "rejected").gte("created_at", iso)
      ]);

      setStats({
        totalStudents: studentsRes.count ?? 0,
        verifiedToday: (verifiedRes.count ?? 0) + (rejectedRes.count ?? 0),
        paymentsValidated: verifiedRes.count ?? 0,
        alertsDetected: rejectedRes.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-500/20">
      
      {/* 1. Header (Navy Blue) */}
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-white flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-slate-900" />
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight">UNI-VERIFY</div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide">Vérification intelligente des pensions</div>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <a href="#" className="text-white relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-0.5 after:bg-blue-500">Accueil</a>
            <Link to="/verify" className="text-slate-300 hover:text-white transition-colors">Vérification</Link>
            <Link to="/dashboard" className="text-slate-300 hover:text-white transition-colors">Historique</Link>
            <a href="#about" className="text-slate-300 hover:text-white transition-colors">À propos</a>
            <a href="#contact" className="text-slate-300 hover:text-white transition-colors">Contact</a>
          </nav>
          
          <div>
            <Link to="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-6 font-bold">
                <User className="mr-2 h-4 w-4" />
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="bg-white overflow-hidden border-b border-slate-200">
        <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left Text */}
          <div className="flex-1 space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Vérification intelligente des <span className="text-blue-600">pensions étudiantes</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl">
              Grâce à la combinaison du QR Code et de la reconnaissance faciale, nous garantissons une vérification rapide, fiable et sécurisée.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/verify">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white h-14 px-8 text-lg rounded-md">
                  <QrCode className="mr-2 h-5 w-5" />
                  Scanner un QR Code
                </Button>
              </Link>
              <Link to="/face-verify">
                <Button size="lg" variant="outline" className="border-slate-300 text-slate-900 h-14 px-8 text-lg rounded-md hover:bg-slate-50">
                  <ScanLine className="mr-2 h-5 w-5 text-blue-600" />
                  Commencer la vérification
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-6 pt-4 text-sm font-medium text-slate-700">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Sécurisé</div>
              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Rapide</div>
              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Fiable</div>
            </div>
          </div>
          
          {/* Right Image area */}
          <div className="flex-1 relative w-full max-w-xl mx-auto lg:max-w-none">
            {/* The main background image generated by AI */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] w-full bg-slate-100">
              <img src="/hero_student.png" alt="Étudiant sur le campus" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
            </div>
            
            {/* Mockup Floating Cards built with CSS */}
            
            {/* Phone Mockup floating */}
            <div className="absolute -left-6 top-1/4 w-48 bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] p-4 border border-slate-100 rotate-[-2deg] animate-in slide-in-from-bottom-8 duration-700 delay-300">
              <div className="w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                <div className="h-8 bg-slate-100 flex items-center justify-center border-b border-slate-200">
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
                </div>
                <div className="p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-500 mb-2">REÇU DE PAIEMENT</p>
                  <div className="aspect-square bg-white border border-slate-200 rounded p-2 mb-3">
                    {/* Simulated QR Pattern */}
                    <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-1">
                      {[...Array(16)].map((_, i) => <div key={i} className={`bg-slate-900 ${i % 3 === 0 ? 'opacity-30' : ''}`}></div>)}
                    </div>
                  </div>
                  <div className="bg-green-100 text-green-700 text-[10px] font-bold py-1.5 rounded uppercase">Pension Payée</div>
                </div>
              </div>
            </div>
            
            {/* Face ID Mockup floating */}
            <div className="absolute -right-8 bottom-12 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] p-4 border border-white/10 w-64 rotate-[2deg] animate-in slide-in-from-right-8 duration-700 delay-500">
              <div className="flex items-start gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Identité validée</h4>
                  <p className="text-slate-300 text-xs mt-0.5">Bienvenue, Jean Dupont</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Matricule : 21MSI042</p>
                </div>
              </div>
              <div className="mt-3 relative h-20 bg-slate-800 rounded-lg overflow-hidden border border-cyan-500/30">
                {/* Face wireframe simulation */}
                <div className="absolute inset-0 border-2 border-cyan-500 opacity-50 m-2 rounded-md">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>
                </div>
                <div className="absolute inset-0 bg-cyan-500/10"></div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 3. Comment ça fonctionne & Fonctionnalités */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left: Steps */}
            <div className="flex-1 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-8">Comment ça fonctionne ?</h2>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                
                <div className="flex-1 relative text-center">
                  <div className="mx-auto w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 relative z-10">
                    <QrCode className="h-6 w-6 text-blue-600" />
                    <span className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-white">1</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Scanner le QR Code</h3>
                  <p className="text-xs text-slate-500">Scannez le QR code présent sur le reçu de paiement.</p>
                  <div className="hidden sm:block absolute top-7 left-1/2 w-full h-[2px] bg-slate-100 -z-0"></div>
                </div>
                
                <div className="flex-1 relative text-center">
                  <div className="mx-auto w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 relative z-10">
                    <Camera className="h-6 w-6 text-purple-600" />
                    <span className="absolute -bottom-2 -right-2 w-5 h-5 bg-purple-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-white">2</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Capturer le visage</h3>
                  <p className="text-xs text-slate-500">Capturez le visage de l'étudiant avec la caméra.</p>
                  <div className="hidden sm:block absolute top-7 left-1/2 w-full h-[2px] bg-slate-100 -z-0"></div>
                </div>
                
                <div className="flex-1 relative text-center">
                  <div className="mx-auto w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4 relative z-10">
                    <Cpu className="h-6 w-6 text-orange-600" />
                    <span className="absolute -bottom-2 -right-2 w-5 h-5 bg-orange-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-white">3</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Comparaison automatique</h3>
                  <p className="text-xs text-slate-500">Le système compare le visage avec la base de données.</p>
                  <div className="hidden sm:block absolute top-7 left-1/2 w-full h-[2px] bg-slate-100 -z-0"></div>
                </div>
                
                <div className="flex-1 relative text-center">
                  <div className="mx-auto w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 relative z-10">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="absolute -bottom-2 -right-2 w-5 h-5 bg-green-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-white">4</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Affichage du résultat</h3>
                  <p className="text-xs text-slate-500">Le résultat de la vérification s'affiche immédiatement à l'écran.</p>
                </div>

              </div>
            </div>
            
            {/* Right: Features */}
            <div className="flex-1 p-8 lg:p-10">
              <h2 className="text-xl font-bold text-slate-900 mb-8">Nos fonctionnalités</h2>
              <div className="grid grid-cols-2 gap-6">
                
                <div className="text-center p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                  <div className="mx-auto w-10 h-10 mb-3 text-blue-600 flex items-center justify-center">
                    <QrCode className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Vérification QR Code</h3>
                  <p className="text-xs text-slate-500">Lecture instantanée et sécurisée du QR code du reçu de paiement.</p>
                </div>
                
                <div className="text-center p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                  <div className="mx-auto w-10 h-10 mb-3 text-purple-600 flex items-center justify-center">
                    <ScanLine className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Reconnaissance faciale</h3>
                  <p className="text-xs text-slate-500">Validation automatique de l'identité de l'étudiant en quelques secondes.</p>
                </div>
                
                <div className="text-center p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                  <div className="mx-auto w-10 h-10 mb-3 text-green-600 flex items-center justify-center">
                    <FileText className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Historique des contrôles</h3>
                  <p className="text-xs text-slate-500">Consultez l'historique complet des vérifications effectuées.</p>
                </div>
                
                <div className="text-center p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                  <div className="mx-auto w-10 h-10 mb-3 text-orange-600 flex items-center justify-center">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Sécurité avancée</h3>
                  <p className="text-xs text-slate-500">Protection des données et prévention contre la fraude.</p>
                </div>

              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 4. Stats & Roles Section */}
      <section className="bg-slate-50 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left: Dynamic Stats (Navy Blue) */}
            <div className="lg:w-[55%] bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
              {/* Background accent lines */}
              <div className="absolute right-0 bottom-0 opacity-10">
                <TrendingUp className="w-64 h-64 -mb-16 -mr-16" />
              </div>
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h2 className="text-xl font-bold">Statistiques en temps réel</h2>
                <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">Vérifications • Aujourd'hui</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    <span className="text-3xl font-black">{stats.totalStudents.toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="text-xs text-slate-400">Étudiants enregistrés</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                    <span className="text-3xl font-black">{stats.verifiedToday.toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="text-xs text-slate-400">Vérifications aujourd'hui</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-3xl font-black">{stats.paymentsValidated.toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="text-xs text-slate-400">Paiements validés</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    <span className="text-3xl font-black">{stats.alertsDetected.toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="text-xs text-slate-400">Alertes détectées</p>
                </div>
              </div>
            </div>

            {/* Right: Login Roles (Light Gray) */}
            <div className="lg:w-[45%] bg-slate-200/60 rounded-2xl p-8 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Se connecter en tant que</h2>
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Membre */}
                <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-5 w-5 text-green-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Membre</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 flex-1">Scannez, vérifiez et validez les paiements des étudiants.</p>
                  <Link to="/login">
                    <Button variant="outline" className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 text-xs h-9">
                      Se connecter
                    </Button>
                  </Link>
                </div>
                
                {/* Administrateur */}
                <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-5 w-5 text-purple-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Administrateur</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 flex-1">Gérez les étudiants, les paiements et consultez les statistiques.</p>
                  <Link to="/login">
                    <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9">
                      Se connecter
                    </Button>
                  </Link>
                </div>
                
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 5. Footer (Navy Blue) */}
      <footer className="bg-[#0b1120] text-slate-300 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Logo & Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded bg-slate-800 flex items-center justify-center border border-slate-700">
                  <ShieldCheck className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <div className="font-bold text-xl tracking-tight text-white">UNI-VERIFY</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest">Faculté de Science d'Ebolowa</div>
                </div>
              </div>
              <p className="text-sm text-slate-400 max-w-sm mb-6">Vérification intelligente des pensions étudiantes.</p>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-slate-500" /> +237 6 78 90 12 34</div>
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-slate-500" /> contact@univerify.cm</div>
                <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-slate-500" /> Bamenda, Cameroun</div>
              </div>
            </div>
            
            {/* Liens Utiles */}
            <div>
              <h4 className="text-white font-bold mb-6">Liens utiles</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/" className="hover:text-blue-400 transition-colors">Accueil</Link></li>
                <li><Link to="/verify" className="hover:text-blue-400 transition-colors">Vérification</Link></li>
                <li><Link to="/dashboard" className="hover:text-blue-400 transition-colors">Historique</Link></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            
            {/* Réseaux et Copyright */}
            <div>
              <h4 className="text-white font-bold mb-6">Réseaux sociaux</h4>
              <div className="flex items-center gap-4 mb-8">
                <a href="#" className="h-8 w-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"><Facebook className="h-4 w-4" /></a>
                <a href="#" className="h-8 w-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors"><Twitter className="h-4 w-4" /></a>
                <a href="#" className="h-8 w-8 rounded-full bg-blue-700/20 text-blue-500 flex items-center justify-center hover:bg-blue-700 hover:text-white transition-colors"><Linkedin className="h-4 w-4" /></a>
                <a href="#" className="h-8 w-8 rounded-full bg-pink-600/20 text-pink-400 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors"><Instagram className="h-4 w-4" /></a>
              </div>
              
              <div className="text-xs text-slate-500 pt-4 border-t border-slate-800">
                <p className="mb-1">© {new Date().getFullYear()} UNI-VERIFY. Tous droits réservés.</p>
                <p>Conçu pour une gestion universitaire moderne.</p>
              </div>
            </div>
            
          </div>
        </div>
      </footer>
      
    </div>
  );
}
