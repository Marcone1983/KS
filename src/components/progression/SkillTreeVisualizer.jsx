import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

export default function SkillTreeVisualizer({ 
  skills = [], 
  unlockedSkills = {}, 
  onSkillClick 
}) {
  const getSkillLevel = (skillId) => unlockedSkills[skillId] || 0;

  const isSkillAvailable = (skill) => {
    return skill.prerequisites.every(prereqId => getSkillLevel(prereqId) > 0);
  };

  return (
    <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="availableGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {skills.map((skill, index) => {
        const level = getSkillLevel(skill.id);
        const isAvailable = isSkillAvailable(skill);
        const isMaxed = level >= skill.maxLevel;
        const x = 150 + (index % 3) * 200;
        const y = 100 + Math.floor(index / 3) * 150;

        skill.prerequisites.forEach(prereqId => {
          const prereqSkill = skills.find(s => s.id === prereqId);
          if (prereqSkill) {
            const prereqIndex = skills.indexOf(prereqSkill);
            const px = 150 + (prereqIndex % 3) * 200;
            const py = 100 + Math.floor(prereqIndex / 3) * 150;

            return (
              <motion.line
                key={`${skill.id}-${prereqId}`}
                x1={px}
                y1={py + 40}
                x2={x}
                y2={y - 40}
                stroke={level > 0 ? '#8b5cf6' : '#4b5563'}
                strokeWidth="3"
                strokeDasharray={level > 0 ? '0' : '5,5'}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            );
          }
        });

        return (
          <g key={skill.id}>
            <motion.circle
              cx={x}
              cy={y}
              r="35"
              fill={isMaxed ? 'url(#activeGradient)' : isAvailable ? 'url(#availableGradient)' : '#374151'}
              stroke={isMaxed ? '#fbbf24' : level > 0 ? '#8b5cf6' : '#6b7280'}
              strokeWidth="4"
              onClick={() => onSkillClick && onSkillClick(skill)}
              className="cursor-pointer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
            />
            
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              pointerEvents="none"
            >
              {level > 0 ? level : isAvailable ? '?' : '🔒'}
            </text>

            <text
              x={x}
              y={y + 55}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontWeight="600"
              pointerEvents="none"
            >
              {skill.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}