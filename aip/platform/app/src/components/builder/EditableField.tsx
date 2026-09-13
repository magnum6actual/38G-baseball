'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
}

export function EditableField({
  value,
  onChange,
  placeholder = 'Click to edit',
  multiline = false,
  rows = 3,
  className,
  displayClassName,
  inputClassName,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    const baseInputClass = cn(
      'w-full bg-white border-2 border-[#FFD700] outline-none px-1 text-[11px]',
      inputClassName
    );

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          rows={rows}
          className={cn(baseInputClass, 'resize-none')}
        />
      );
    }

    return (
      <input
        type="text"
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={baseInputClass}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setIsEditing(true); } }}
      onClick={() => setIsEditing(true)}
      className={cn(
        'cursor-pointer hover:bg-[#FFD700]/20 transition-colors px-1 min-h-[1.2em]',
        !value && 'text-gray-400 italic',
        displayClassName,
        className
      )}
    >
      {value || placeholder}
    </div>
  );
}
