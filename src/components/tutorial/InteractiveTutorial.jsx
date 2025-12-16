
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  MousePointer, 
  Zap, 
  Trophy, 
  CheckCircle, 
  ArrowRight,
  Bug,
  Shield,
  Sparkles,
  AlertTriangle,
  Brain,
  X,
  Droplets,
  Move,
  Crosshair, // Added new icon
  Heart,     // Added new icon
  Flame      // Added new icon
} from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Benvenuto a Kurstaki Strike!',
    description: 'Impara a difendere la tua pianta di cannabis dai parassiti usando il Bacillus thuringiensis kurstaki (BtK). Questo tutorial interattivo ti guiderà attraverso le basi del gioco e ti preparerà a proteggere il tuo raccolto. Clicca su "Avanti" per iniziare!',
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    buttonText: 'Avanti',
    buttonAction: 'next',
  },
  {
    id: 'objective',
    title: "L'Obiettivo",
    description: 'Il tuo compito è proteggere la tua pianta di cannabis dai parassiti che la attaccano. Dovrai identificare i parassiti e applicare il BtK strategicamente per neutralizzarli prima che causino troppi danni.',
    icon: <Target className="h-8 w-8 text-green-500" />,
    buttonText: 'Capito!',
    buttonAction: 'next',
  },
  {
    id: 'gameplay',
    title: 'Come Giocare',
    description: 'Clicca sui parassiti che appaiono sullo schermo per applicare il BtK. Ogni clic consuma una dose di BtK. Sii veloce e preciso! Alcuni parassiti potrebbero richiedere più di un clic.',
    icon: <MousePointer className="h-8 w-8 text-blue-500" />,
    buttonText: 'Prossimo',
    buttonAction: 'next',
  },
  {
    id: 'btk_supply',
    title: 'La Tua Scorta di BtK',
    description: 'Hai una quantità limitata di BtK. Tieni d\'occhio la barra della scorta. Una volta esaurita, non potrai più attaccare. Il BtK si ricarica lentamente nel tempo.',
    icon: <Shield className="h-8 w-8 text-yellow-500" />,
    buttonText: 'Ok, vado avanti',
    buttonAction: 'next',
  },
  {
    id: 'parasites',
    title: 'I Parassiti',
    description: 'Diversi tipi di parassiti attaccheranno la tua pianta. Alcuni sono più resistenti di altri. Impara a riconoscerli e a dare priorità ai più pericolosi.',
    icon: <Bug className="h-8 w-8 text-red-500" />,
    buttonText: 'Mostrami di più',
    buttonAction: 'next',
  },
  {
    id: 'damage',
    title: 'Danni alla Pianta',
    description: 'Se i parassiti raggiungono la tua pianta o non vengono eliminati in tempo, causeranno danni. Se la salute della tua pianta scende a zero, il gioco è finito!',
    icon: <AlertTriangle className="h-8 w-8 text-orange-500" />,
    buttonText: 'Devo proteggerla!',
    buttonAction: 'next',
  },
  {
    id: 'score',
    title: 'Punteggio Alto',
    description: 'Ogni parassita eliminato ti fa guadagnare punti. Prova a ottenere il punteggio più alto possibile e condividilo con i tuoi amici!',
    icon: <Trophy className="h-8 w-8 text-yellow-400" />,
    buttonText: 'Sono pronto!',
    buttonAction: 'next',
  },
  {
    id: 'practice',
    title: 'È Ora di Praticare!',
    description: 'Ottimo! Hai imparato le basi. Ora è il momento di mettere in pratica le tue abilità. Buona fortuna, difensore della pianta!',
    icon: <Brain className="h-8 w-8 text-purple-500" />,
    buttonText: 'Inizia il gioco!',
    buttonAction: 'complete',
  },
];

const Tutorial = ({ onComplete, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = TUTORIAL_STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStep.buttonAction === 'complete') {
      onComplete();
    } else {
      setCurrentStepIndex((prevIndex) => prevIndex + 1);
    }
  };

  const progress = ((currentStepIndex + 1) / TUTORIAL_STEPS.length) * 100;

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, y: -50, scale: 0.9, transition: { duration: 0.3, ease: "easeIn" } },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-md"
        >
          <Card className="border-primary-foreground shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="relative flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center space-x-3">
                {currentStep.icon}
                <CardTitle className="text-2xl font-bold text-primary dark:text-primary-foreground">
                  {currentStep.title}
                </CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="absolute top-4 right-4 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
              </Button>
            </CardHeader>
            <CardContent className="text-lg text-gray-700 dark:text-gray-300">
              <p className="mb-6">{currentStep.description}</p>
              <Progress value={progress} className="w-full mb-6 h-2" indicatorColor="bg-primary" />
              <div className="flex justify-between items-center">
                <Button 
                  onClick={handleNext} 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 text-lg px-6 py-3 rounded-lg flex items-center"
                >
                  {currentStep.buttonText}
                  {currentStep.buttonAction !== 'complete' && <ArrowRight className="ml-2 h-5 w-5" />}
                  {currentStep.buttonAction === 'complete' && <CheckCircle className="ml-2 h-5 w-5" />}
                </Button>
                {currentStepIndex > 0 && currentStep.buttonAction !== 'complete' && (
                  <Button 
                    variant="link" 
                    onClick={() => setCurrentStepIndex((prevIndex) => prevIndex - 1)}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Indietro
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Tutorial;
