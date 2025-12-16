import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  Brain
} from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Benvenuto a Kurstaki Strike!',
    description: 'Impara a difendere la tua pianta di cannabis dai parassiti usando il Bac