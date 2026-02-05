
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Heart, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  PhoneCall, 
  Stethoscope, 
  ArrowRight, 
  RotateCcw,
  Loader2,
  CheckCircle2,
  Activity
} from 'lucide-react';

// --- Types ---
interface AssessmentData {
  type: string;
  duration: string;
  impact: string;
  symptoms: string;
  readiness: number;
}

interface RecoveryResponse {
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Emergency';
  summary: string;
  routine: Array<{ time: string; activity: string; purpose: string }>;
  medicationConsultation: string[];
  helplines: Array<{ name: string; contact: string }>;
  longTermAdvice: string;
}

// --- Components ---

const ProgressBar = ({ current, total }: { current: number; total: number }) => (
  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-8">
    <div 
      className="bg-teal-500 h-full transition-all duration-500 ease-out"
      style={{ width: `${(current / total) * 100}%` }}
    />
  </div>
);

const App: React.FC = () => {
  const [step, setStep] = useState<'welcome' | 'questions' | 'loading' | 'results'>('welcome');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [assessment, setAssessment] = useState<AssessmentData>({
    type: '',
    duration: '',
    impact: '',
    symptoms: '',
    readiness: 5,
  });
  const [result, setResult] = useState<RecoveryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const questions = [
    {
      id: 'type',
      label: 'What is the primary substance or behavior you are concerned about?',
      description: 'Knowing the nature of the challenge helps in structuring the right biological and behavioral response.',
      options: ['Alcohol', 'Opioids/Narcotics', 'Nicotine', 'Prescription Meds', 'Digital/Gaming', 'Gambling', 'Stimulants', 'Other']
    },
    {
      id: 'duration',
      label: 'How long has this been a significant part of your life?',
      description: 'Duration helps us understand the level of chemical or neurobiological habituation.',
      options: ['Less than 6 months', '6 months - 2 years', '2 - 5 years', '5+ years']
    },
    {
      id: 'impact',
      label: 'How would you describe its current impact on your life?',
      description: 'We assess functionality across work, relationships, and health.',
      options: [
        'Minimal - I still meet all responsibilities',
        'Moderate - Frequent disruptions in work or social life',
        'Severe - Significant loss of health, job, or relationships',
        'Crisis - I feel I have lost control entirely'
      ]
    },
    {
      id: 'symptoms',
      label: 'When you try to stop, do you experience physical symptoms?',
      description: 'Physical withdrawal indicates physiological dependence which may require medical supervision.',
      options: [
        'No physical symptoms, just cravings',
        'Mild (Anxiety, sweating, restlessness)',
        'Significant (Tremors, nausea, insomnia)',
        'Severe (Seizures, hallucinations, extreme pain)'
      ]
    },
    {
      id: 'readiness',
      label: 'On a scale of 1-10, how ready are you to start a routine today?',
      description: 'Your motivation level dictates the intensity of the recovery plan.',
      isSlider: true
    }
  ];

  const handleStart = () => setStep('questions');

  const handleNext = (value: string | number) => {
    const key = questions[currentQuestion].id as keyof AssessmentData;
    setAssessment(prev => ({ ...prev, [key]: value }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      generateRecoveryPlan();
    }
  };

  const generateRecoveryPlan = async () => {
    setStep('loading');
    setError(null);

    try {
      const prompt = `Act as a senior clinical addiction specialist. Analyze this user profile and provide a structured recovery plan in JSON format:
        - Type of addiction: ${assessment.type}
        - Duration: ${assessment.duration}
        - Impact: ${assessment.impact}
        - Physical Symptoms: ${assessment.symptoms}
        - Readiness Level: ${assessment.readiness}/10
        
        The response must include:
        1. riskLevel: 'Low', 'Moderate', 'High', or 'Emergency'.
        2. summary: A 2-sentence empathetic clinical overview.
        3. routine: A daily schedule with time, activity, and purpose.
        4. medicationConsultation: Specific categories or FDA-approved meds (e.g., Naltrexone, Methadone, patches) the user should discuss with their doctor for this specific addiction.
        5. helplines: Relevant support organizations (SAMHSA, etc).
        6. longTermAdvice: A short paragraph on maintaining sobriety.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING },
              summary: { type: Type.STRING },
              routine: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    activity: { type: Type.STRING },
                    purpose: { type: Type.STRING }
                  },
                  required: ["time", "activity", "purpose"]
                }
              },
              medicationConsultation: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              helplines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    contact: { type: Type.STRING }
                  },
                  required: ["name", "contact"]
                }
              },
              longTermAdvice: { type: Type.STRING }
            },
            required: ["riskLevel", "summary", "routine", "medicationConsultation", "helplines", "longTermAdvice"]
          }
        }
      });

      const data = JSON.parse(response.text);
      setResult(data);
      setStep('results');
    } catch (err) {
      console.error(err);
      setError("We encountered an issue generating your plan. Please try again.");
      setStep('questions');
    }
  };

  const restart = () => {
    setStep('welcome');
    setCurrentQuestion(0);
    setAssessment({
      type: '',
      duration: '',
      impact: '',
      symptoms: '',
      readiness: 5,
    });
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-100">
      {/* Navbar */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-teal-700 text-xl cursor-pointer" onClick={restart}>
            <Activity className="w-6 h-6" />
            <span>Pathways</span>
          </div>
          <button 
            className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full"
            onClick={() => window.open('tel:988', '_self')}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Emergency Help: 988
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {step === 'welcome' && (
          <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex p-4 bg-teal-50 rounded-2xl text-teal-600">
              <Heart className="w-12 h-12 animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Recovery is a journey of a <span className="text-teal-600">thousand small steps.</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Answer 5 simple questions about your current situation. We'll use AI to help you build a personalized daily structure and identify medical resources for your path forward.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button 
                onClick={handleStart}
                className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-teal-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                Start Assessment <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto italic">
              Disclaimer: This tool provides general guidance. Always consult a medical professional for addiction treatment. If you are in immediate danger, call emergency services.
            </p>
          </div>
        )}

        {step === 'questions' && (
          <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
            <ProgressBar current={currentQuestion + 1} total={questions.length} />
            
            <div key={currentQuestion} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Step {currentQuestion + 1} of 5</span>
                <h2 className="text-2xl font-bold text-slate-800 leading-snug">
                  {questions[currentQuestion].label}
                </h2>
                <p className="text-slate-500 text-sm">
                  {questions[currentQuestion].description}
                </p>
              </div>

              {questions[currentQuestion].isSlider ? (
                <div className="space-y-8 py-6">
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={assessment.readiness} 
                    onChange={(e) => setAssessment(p => ({ ...p, readiness: parseInt(e.target.value) }))}
                    className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="flex justify-between text-sm font-bold text-slate-400">
                    <span>Just thinking about it (1)</span>
                    <span className="text-teal-600 text-xl font-black">{assessment.readiness}</span>
                    <span>Ready to change now (10)</span>
                  </div>
                  <button 
                    onClick={() => handleNext(assessment.readiness)}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                  >
                    Finish Assessment
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {questions[currentQuestion].options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleNext(option)}
                      className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-teal-500 hover:bg-teal-50 transition-all flex justify-between items-center group"
                    >
                      <span className="font-medium text-slate-700 group-hover:text-teal-900">{option}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <div className="mt-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === 'loading' && (
          <div className="max-w-2xl mx-auto text-center space-y-6 py-20">
            <Loader2 className="w-16 h-16 text-teal-600 animate-spin mx-auto" />
            <h2 className="text-2xl font-bold text-slate-800">Analyzing Your Path...</h2>
            <div className="space-y-2 max-w-sm mx-auto">
              <p className="text-slate-500 animate-pulse">Personalizing daily rituals...</p>
              <p className="text-slate-500 animate-pulse delay-75">Sourcing medical guidance...</p>
              <p className="text-slate-500 animate-pulse delay-150">Validating support resources...</p>
            </div>
          </div>
        )}

        {step === 'results' && result && (
          <div className="space-y-8 animate-in fade-in duration-1000">
            {/* Risk Indicator */}
            <div className={`p-6 rounded-3xl border-2 flex flex-col md:flex-row items-center gap-6 ${
              result.riskLevel === 'Emergency' || result.riskLevel === 'High' 
              ? 'bg-rose-50 border-rose-100' 
              : 'bg-teal-50 border-teal-100'
            }`}>
              <div className={`p-4 rounded-2xl ${
                result.riskLevel === 'Emergency' || result.riskLevel === 'High' ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'
              }`}>
                <ShieldAlert className="w-10 h-10" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2">
                  Recovery Status: <span className={
                    result.riskLevel === 'Emergency' || result.riskLevel === 'High' ? 'text-rose-600' : 'text-teal-600'
                  }>{result.riskLevel}</span>
                </h2>
                <p className="text-slate-600 mt-1">{result.summary}</p>
              </div>
              <button 
                onClick={restart}
                className="p-3 text-slate-400 hover:text-slate-900 transition-colors"
                title="Redo Assessment"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Routine Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-6 h-6 text-teal-600" />
                  <h3 className="text-xl font-bold text-slate-800">Personalized Daily Routine</h3>
                </div>
                <div className="space-y-4">
                  {result.routine.map((item, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex gap-4">
                        <div className="min-w-[80px] font-mono font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg h-fit text-center text-sm">
                          {item.time}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            {item.activity}
                            <CheckCircle2 className="w-4 h-4 text-slate-200 group-hover:text-teal-400 transition-colors" />
                          </h4>
                          <p className="text-sm text-slate-500 leading-relaxed">{item.purpose}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-4">
                  <h3 className="text-xl font-bold">Long-term Success</h3>
                  <p className="text-slate-400 leading-relaxed">{result.longTermAdvice}</p>
                </div>
              </div>

              {/* Sidebar: Medication & Helplines */}
              <div className="space-y-8">
                {/* Medication */}
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <Stethoscope className="w-5 h-5" />
                    <h3 className="font-bold">Medical Guidance</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Ask your doctor about these options:</p>
                  <ul className="space-y-3">
                    {result.medicationConsultation.map((med, idx) => (
                      <li key={idx} className="flex gap-3 text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        {med}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Helplines */}
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 text-amber-700 mb-2">
                    <PhoneCall className="w-5 h-5" />
                    <h3 className="font-bold">Support Resources</h3>
                  </div>
                  <div className="space-y-3">
                    {result.helplines.map((help, idx) => (
                      <a
                        key={idx}
                        href={`tel:${help.contact}`}
                        className="block w-full bg-white hover:bg-amber-100 border border-amber-200 p-4 rounded-xl transition-colors"
                      >
                        <div className="font-bold text-slate-900 text-sm">{help.name}</div>
                        <div className="text-amber-700 text-lg font-mono font-bold mt-1">{help.contact}</div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400 leading-normal">
                  NOTE: This AI-generated plan is meant for behavioral support. Addiction is complex and often requires clinical detox. If you experience severe withdrawal, go to the nearest emergency room immediately.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-12 mt-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-slate-400 font-bold grayscale opacity-50">
            <Activity className="w-5 h-5" />
            <span>Pathways Recovery Companion</span>
          </div>
          <p className="text-sm text-slate-500">© 2024 Empowerment Health Group. All information is confidential and remains in your browser.</p>
        </div>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
