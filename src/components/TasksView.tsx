import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, Circle, Edit2, Trash2, Plus, X, CheckSquare, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, CyberIcon } from './UI';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: any;
  updatedAt: any;
}

interface TasksViewProps {
  userId: string;
}

export const TasksView: React.FC<TasksViewProps> = ({ userId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingMode, setEditingMode] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'users', userId, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(t);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/tasks`)
    );
    return () => unsubscribe();
  }, [userId]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await addDoc(collection(db, 'users', userId, 'tasks'), {
        title: newTaskTitle.trim(),
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewTaskTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/tasks`);
    }
  };

  const toggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId, 'tasks', taskId), {
        completed: !currentCompleted,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/tasks/${taskId}`);
    }
  };

  const startEditing = (task: Task) => {
    setEditingMode(task.id);
    setEditTitle(task.title);
  };

  const saveEdit = async (taskId: string) => {
    if (!editTitle.trim()) {
      setEditingMode(null);
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', userId, 'tasks', taskId), {
        title: editTitle.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingMode(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/tasks/${taskId}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/tasks/${taskId}`);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="flex flex-col h-full bg-tema-negro/40 backdrop-blur-xl overflow-hidden p-8 lg:p-12 relative">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto relative z-10 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-8 border-b border-tema-electrico/10">
          <div className="flex items-center gap-6 mb-4 md:mb-0">
             <CyberIcon color="#00b4d8" size="lg">
                <CheckSquare size={32} />
             </CyberIcon>
             <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-tema-texto tracking-tight uppercase leading-none">TAREAS PENDIENTES</h2>
                <p className="text-[10px] text-tema-neon font-bold tracking-widest uppercase mt-2">Sistema Gestor de Objetivos Operativos</p>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-tema-texto/40 font-bold uppercase tracking-widest mb-1">COMPLETADAS</span>
              <span className="text-2xl font-bold text-tema-matriz leading-none">{completedCount}</span>
            </div>
            <div className="w-px h-8 bg-tema-electrico/20" />
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-tema-texto/40 font-bold uppercase tracking-widest mb-1">PENDIENTES</span>
              <span className="text-2xl font-bold text-yellow-500 leading-none">{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Add Task Input */}
        <div className="mb-8">
          <form onSubmit={addTask} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Plus className="text-tema-neon group-focus-within:rotate-90 transition-transform duration-300" size={20} />
            </div>
            <input 
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="ASIGNAR NUEVA TAREA..."
              className="w-full bg-tema-negro/60 border border-tema-electrico/20 text-tema-texto text-sm font-bold tracking-wide rounded-2xl py-6 pl-14 pr-6 focus:border-tema-neon focus:shadow-[0_0_20px_rgba(3,154,220,0.1)] focus:outline-none transition-all placeholder:text-tema-texto/20 uppercase"
            />
            <button 
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-tema-negro bg-tema-neon px-4 py-2 rounded-xl disabled:opacity-30 disabled:hover:scale-100 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(3,154,220,0.3)] uppercase tracking-wider"
            >
              AGREGAR
            </button>
          </form>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto ocultar-barra-desplazamiento relative">
           <AnimatePresence>
             {tasks.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-tema-electrico/20 rounded-3xl bg-tema-texto/5"
                >
                  <CheckSquare size={48} className="text-tema-texto/20 mb-4" />
                  <p className="text-sm font-bold text-tema-texto/40 uppercase tracking-widest">N/A OBJETIVOS DEFINIDOS</p>
                </motion.div>
             ) : (
               <div className="space-y-4 pb-12">
                 {tasks.map((task) => (
                   <motion.div 
                     key={task.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className={cn(
                       "panel-de-vidrio p-5 flex items-center justify-between group transition-all duration-300",
                       task.completed ? "opacity-60 border-tema-texto/10" : "hover:border-tema-neon/30 hover:shadow-[0_0_20px_rgba(3,154,220,0.05)] border-l-4 border-l-tema-neon border-y border-r border-tema-electrico/10"
                     )}
                   >
                     <div className="flex items-center gap-5 flex-1 mr-6">
                        <button 
                          onClick={() => toggleTask(task.id, task.completed)}
                          className={cn(
                            "flex items-center justify-center transition-colors active:scale-90",
                            task.completed ? "text-tema-matriz" : "text-tema-texto/20 hover:text-tema-neon"
                          )}
                        >
                          {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        
                        <div className="flex-1">
                          {editingMode === task.id ? (
                            <input 
                              autoFocus
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(task.id);
                                if (e.key === 'Escape') setEditingMode(null);
                              }}
                              className="w-full bg-tema-negro border border-tema-electrico/30 rounded py-1.5 px-3 text-sm text-tema-texto focus:border-tema-neon focus:outline-none transition-colors"
                            />
                          ) : (
                            <p className={cn(
                              "text-sm font-medium tracking-wide transition-all",
                              task.completed ? "text-tema-texto/40 line-through" : "text-tema-texto"
                            )}>
                              {task.title}
                            </p>
                          )}
                          <p className="text-[10px] text-tema-texto/30 font-mono mt-1 font-bold">
                             {task.createdAt ? format(task.createdAt.toDate(), 'dd/MMM/yy HH:mm') : '...'}
                          </p>
                        </div>
                     </div>

                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingMode === task.id ? (
                          <>
                            <button onClick={() => saveEdit(task.id)} className="p-2 text-tema-neon hover:bg-tema-neon/10 rounded-lg transition-colors">
                              <Save size={16} />
                            </button>
                            <button onClick={() => setEditingMode(null)} className="p-2 text-tema-texto/40 hover:text-tema-texto hover:bg-tema-texto/10 rounded-lg transition-colors">
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditing(task)} className="p-2 text-tema-texto/40 hover:text-tema-neon hover:bg-tema-neon/10 rounded-lg transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => deleteTask(task.id)} className="p-2 text-tema-texto/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                     </div>
                   </motion.div>
                 ))}
               </div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
